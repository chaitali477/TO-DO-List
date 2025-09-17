from flask import Flask, request, jsonify
from flask_cors import CORS
from db_config import get_db_connection
import mysql.connector
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend-backend communication

# Initialize database tables
def init_db():
    """Initialize the database and create tables if they don't exist"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Create tasks table
        create_table_query = """
        CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """
        cursor.execute(create_table_query)
        connection.commit()
        print("Database initialized successfully")
        
    except mysql.connector.Error as err:
        print(f"Error initializing database: {err}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# API Routes

@app.route('/api/tasks', methods=['GET'])
def get_all_tasks():
    """Get all tasks from the database"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM tasks ORDER BY created_at DESC")
        tasks = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'tasks': tasks,
            'count': len(tasks)
        }), 200
        
    except mysql.connector.Error as err:
        return jsonify({
            'success': False,
            'message': f'Database error: {err}'
        }), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('title'):
            return jsonify({
                'success': False,
                'message': 'Title is required'
            }), 400
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        insert_query = """
        INSERT INTO tasks (title, description, completed) 
        VALUES (%s, %s, %s)
        """
        task_data = (
            data['title'],
            data.get('description', ''),
            data.get('completed', False)
        )
        
        cursor.execute(insert_query, task_data)
        connection.commit()
        
        # Get the created task
        task_id = cursor.lastrowid
        cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
        new_task = cursor.fetchone()
        
        return jsonify({
            'success': True,
            'message': 'Task created successfully',
            'task': {
                'id': new_task[0],
                'title': new_task[1],
                'description': new_task[2],
                'completed': bool(new_task[3]),
                'created_at': new_task[4].isoformat() if new_task[4] else None,
                'updated_at': new_task[5].isoformat() if new_task[5] else None
            }
        }), 201
        
    except mysql.connector.Error as err:
        return jsonify({
            'success': False,
            'message': f'Database error: {err}'
        }), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update an existing task"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Check if task exists
        cursor.execute("SELECT id FROM tasks WHERE id = %s", (task_id,))
        if not cursor.fetchone():
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404
        
        # Update task
        update_query = """
        UPDATE tasks 
        SET title = %s, description = %s, completed = %s 
        WHERE id = %s
        """
        task_data = (
            data.get('title'),
            data.get('description', ''),
            data.get('completed', False),
            task_id
        )
        
        cursor.execute(update_query, task_data)
        connection.commit()
        
        # Get updated task
        cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
        updated_task = cursor.fetchone()
        
        return jsonify({
            'success': True,
            'message': 'Task updated successfully',
            'task': {
                'id': updated_task[0],
                'title': updated_task[1],
                'description': updated_task[2],
                'completed': bool(updated_task[3]),
                'created_at': updated_task[4].isoformat() if updated_task[4] else None,
                'updated_at': updated_task[5].isoformat() if updated_task[5] else None
            }
        }), 200
        
    except mysql.connector.Error as err:
        return jsonify({
            'success': False,
            'message': f'Database error: {err}'
        }), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Check if task exists
        cursor.execute("SELECT id FROM tasks WHERE id = %s", (task_id,))
        if not cursor.fetchone():
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404
        
        # Delete task
        cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': 'Task deleted successfully'
        }), 200
        
    except mysql.connector.Error as err:
        return jsonify({
            'success': False,
            'message': f'Database error: {err}'
        }), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/tasks/<int:task_id>/toggle', methods=['PATCH'])
def toggle_task_completion(task_id):
    """Toggle task completion status"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        # Get current task status
        cursor.execute("SELECT completed FROM tasks WHERE id = %s", (task_id,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({
                'success': False,
                'message': 'Task not found'
            }), 404
        
        # Toggle completion status
        new_status = not bool(result[0])
        cursor.execute("UPDATE tasks SET completed = %s WHERE id = %s", (new_status, task_id))
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': f'Task marked as {"completed" if new_status else "incomplete"}',
            'completed': new_status
        }), 200
        
    except mysql.connector.Error as err:
        return jsonify({
            'success': False,
            'message': f'Database error: {err}'
        }), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'Todo API is running',
        'timestamp': datetime.now().isoformat()
    }), 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500

if __name__ == '__main__':
    # Initialize database on startup
    init_db()
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)