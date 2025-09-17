// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// DOM Elements
const elements = {
    loading: document.getElementById('loading'),
    taskTitle: document.getElementById('taskTitle'),
    taskDescription: document.getElementById('taskDescription'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    tasksList: document.getElementById('tasksList'),
    emptyState: document.getElementById('emptyState'),
    taskCount: document.getElementById('taskCount'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    editModal: document.getElementById('editModal'),
    editTitle: document.getElementById('editTitle'),
    editDescription: document.getElementById('editDescription'),
    editCompleted: document.getElementById('editCompleted'),
    closeModal: document.getElementById('closeModal'),
    saveEdit: document.getElementById('saveEdit'),
    cancelEdit: document.getElementById('cancelEdit'),
    confirmDialog: document.getElementById('confirmDialog'),
    confirmMessage: document.getElementById('confirmMessage'),
    confirmOk: document.getElementById('confirmOk'),
    confirmCancel: document.getElementById('confirmCancel'),
    toastContainer: document.getElementById('toastContainer')
};

// Application State
let tasks = [];
let currentFilter = 'all';
let editingTaskId = null;
let confirmCallback = null;

// Utility Functions
const showLoading = () => {
    elements.loading.classList.add('show');
};

const hideLoading = () => {
    elements.loading.classList.remove('show');
};

const showToast = (type, title, message, duration = 4000) => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <i class="toast-icon ${iconMap[type]}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove
    const timeoutId = setTimeout(() => removeToast(toast), duration);
    
    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(timeoutId);
        removeToast(toast);
    });
};

const removeToast = (toast) => {
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
};

const showConfirmDialog = (message, callback) => {
    elements.confirmMessage.textContent = message;
    elements.confirmDialog.classList.add('show');
    confirmCallback = callback;
};

const hideConfirmDialog = () => {
    elements.confirmDialog.classList.remove('show');
    confirmCallback = null;
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// API Functions
const apiRequest = async (url, options = {}) => {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
};

const fetchTasks = async () => {
    try {
        showLoading();
        const response = await apiRequest('/tasks');
        tasks = response.tasks || [];
        renderTasks();
        updateTaskCount();
    } catch (error) {
        showToast('error', 'Error', 'Failed to load tasks');
        console.error('Error fetching tasks:', error);
    } finally {
        hideLoading();
    }
};

const createTask = async (taskData) => {
    try {
        showLoading();
        const response = await apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
        
        tasks.unshift(response.task);
        renderTasks();
        updateTaskCount();
        showToast('success', 'Success', 'Task created successfully');
        
        // Clear form
        elements.taskTitle.value = '';
        elements.taskDescription.value = '';
        
    } catch (error) {
        showToast('error', 'Error', error.message || 'Failed to create task');
        console.error('Error creating task:', error);
    } finally {
        hideLoading();
    }
};

const updateTask = async (taskId, taskData) => {
    try {
        showLoading();
        const response = await apiRequest(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        });
        
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = response.task;
        }
        
        renderTasks();
        updateTaskCount();
        showToast('success', 'Success', 'Task updated successfully');
        
    } catch (error) {
        showToast('error', 'Error', error.message || 'Failed to update task');
        console.error('Error updating task:', error);
    } finally {
        hideLoading();
    }
};

const deleteTask = async (taskId) => {
    try {
        showLoading();
        await apiRequest(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        tasks = tasks.filter(task => task.id !== taskId);
        renderTasks();
        updateTaskCount();
        showToast('success', 'Success', 'Task deleted successfully');
        
    } catch (error) {
        showToast('error', 'Error', error.message || 'Failed to delete task');
        console.error('Error deleting task:', error);
    } finally {
        hideLoading();
    }
};

const toggleTaskCompletion = async (taskId) => {
    try {
        const response = await apiRequest(`/tasks/${taskId}/toggle`, {
            method: 'PATCH'
        });
        
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = response.completed;
        }
        
        renderTasks();
        updateTaskCount();
        showToast('success', 'Success', response.message);
        
    } catch (error) {
        showToast('error', 'Error', error.message || 'Failed to update task');
        console.error('Error toggling task completion:', error);
    }
};

// UI Functions
const getFilteredTasks = () => {
    switch (currentFilter) {
        case 'completed':
            return tasks.filter(task => task.completed);
        case 'pending':
            return tasks.filter(task => !task.completed);
        default:
            return tasks;
    }
};

const updateTaskCount = () => {
    const filteredTasks = getFilteredTasks();
    const count = filteredTasks.length;
    const taskText = count === 1 ? 'task' : 'tasks';
    elements.taskCount.textContent = `${count} ${taskText}`;
};

const createTaskElement = (task) => {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskElement.style.animationDelay = '0ms';
    
    taskElement.innerHTML = `
        <div class="task-header">
            <div class="task-content">
                <h3 class="task-title">${escapeHtml(task.title)}</h3>
                ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
            </div>
            <div class="task-actions">
                <button class="task-btn ${task.completed ? 'incomplete-btn' : 'complete-btn'}" 
                        onclick="toggleTaskCompletion(${task.id})"
                        title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                    <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                </button>
                <button class="task-btn edit-btn" 
                        onclick="openEditModal(${task.id})"
                        title="Edit task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="task-btn delete-btn" 
                        onclick="confirmDeleteTask(${task.id})"
                        title="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="task-meta">
            <div class="task-status">
                <span class="status-badge ${task.completed ? 'completed' : 'pending'}">
                    ${task.completed ? 'Completed' : 'Pending'}
                </span>
            </div>
            <div class="task-dates">
                Created: ${formatDate(task.created_at)}
            </div>
        </div>
    `;
    
    return taskElement;
};

const renderTasks = () => {
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
        elements.tasksList.innerHTML = '';
        elements.emptyState.style.display = 'block';
    } else {
        elements.emptyState.style.display = 'none';
        elements.tasksList.innerHTML = '';
        
        filteredTasks.forEach((task, index) => {
            const taskElement = createTaskElement(task);
            taskElement.style.animationDelay = `${index * 50}ms`;
            elements.tasksList.appendChild(taskElement);
        });
    }
};

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// Modal Functions
const openEditModal = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    editingTaskId = taskId;
    elements.editTitle.value = task.title;
    elements.editDescription.value = task.description || '';
    elements.editCompleted.checked = task.completed;
    elements.editModal.classList.add('show');
    
    // Focus on title input
    setTimeout(() => elements.editTitle.focus(), 100);
};

const closeEditModal = () => {
    elements.editModal.classList.remove('show');
    editingTaskId = null;
    
    // Clear form
    elements.editTitle.value = '';
    elements.editDescription.value = '';
    elements.editCompleted.checked = false;
};

const saveTaskEdit = async () => {
    const title = elements.editTitle.value.trim();
    
    if (!title) {
        showToast('warning', 'Warning', 'Task title is required');
        elements.editTitle.focus();
        return;
    }
    
    const taskData = {
        title: title,
        description: elements.editDescription.value.trim(),
        completed: elements.editCompleted.checked
    };
    
    await updateTask(editingTaskId, taskData);
    closeEditModal();
};

const confirmDeleteTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    showConfirmDialog(
        `Are you sure you want to delete "${task.title}"?`,
        () => deleteTask(taskId)
    );
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    fetchTasks();
    
    // Add task form
    elements.addTaskBtn.addEventListener('click', async () => {
        const title = elements.taskTitle.value.trim();
        
        if (!title) {
            showToast('warning', 'Warning', 'Task title is required');
            elements.taskTitle.focus();
            return;
        }
        
        const taskData = {
            title: title,
            description: elements.taskDescription.value.trim()
        };
        
        await createTask(taskData);
    });
    
    // Enter key support for task input
    elements.taskTitle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elements.addTaskBtn.click();
        }
    });
    
    // Filter buttons
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active filter
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentFilter = btn.dataset.filter;
            renderTasks();
            updateTaskCount();
        });
    });
    
    // Edit modal events
    elements.closeModal.addEventListener('click', closeEditModal);
    elements.cancelEdit.addEventListener('click', closeEditModal);
    elements.saveEdit.addEventListener('click', saveTaskEdit);
    
    // Edit modal form submission
    elements.editTitle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveTaskEdit();
        }
    });
    
    // Confirm dialog events
    elements.confirmOk.addEventListener('click', () => {
        if (confirmCallback) {
            confirmCallback();
        }
        hideConfirmDialog();
    });
    
    elements.confirmCancel.addEventListener('click', hideConfirmDialog);
    
    // Close modals on outside click
    elements.editModal.addEventListener('click', (e) => {
        if (e.target === elements.editModal) {
            closeEditModal();
        }
    });
    
    elements.confirmDialog.addEventListener('click', (e) => {
        if (e.target === elements.confirmDialog) {
            hideConfirmDialog();
        }
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.editModal.classList.contains('show')) {
                closeEditModal();
            }
            if (elements.confirmDialog.classList.contains('show')) {
                hideConfirmDialog();
            }
        }
    });
});

// Global functions (called from HTML onclick attributes)
window.toggleTaskCompletion = toggleTaskCompletion;
window.openEditModal = openEditModal;
window.confirmDeleteTask = confirmDeleteTask;