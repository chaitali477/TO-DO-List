import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_db_connection():
    """
    Create and return a MySQL database connection using environment variables
    """
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME', 'todo_app'),
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci',
            autocommit=False
        )
        return connection
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL: {err}")
        raise err

def test_connection():
    """
    Test the database connection
    """
    try:
        connection = get_db_connection()
        if connection.is_connected():
            cursor = connection.cursor()
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"Successfully connected to MySQL Server version: {version[0]}")
            cursor.close()
            connection.close()
            return True
    except mysql.connector.Error as err:
        print(f"Error testing connection: {err}")
        return False

if __name__ == "__main__":
    # Test connection when run directly
    test_connection()