import sqlite3
import os

# --- CONFIGURATION ---
# Make sure this matches the actual name of your database file
DB_NAME = "cyberwatch.db" 

def clear_database():
    # Check if file exists first
    if not os.path.exists(DB_NAME):
        print(f"Error: Database file '{DB_NAME}' not found.")
        return

    try:
        # Connect to the database
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        print(f"--- CONNECTED TO {DB_NAME} ---")

        # 1. DELETE DATA
        # We delete from child tables first to avoid foreign key errors
        tables_to_clear = ['logevent', 'incident', 'asset']
        
        for table in tables_to_clear:
            try:
                cursor.execute(f"DELETE FROM {table}")
                print(f"✓ Deleted all rows from '{table}'")
            except sqlite3.OperationalError as e:
                print(f"⚠ Could not clear '{table}': {e}")

        # 2. RESET ID COUNTERS
        # This resets the auto-increment ID back to 1 for the next entry
        try:
            cursor.execute("DELETE FROM sqlite_sequence")
            print("✓ ID counters reset to 0")
        except sqlite3.OperationalError:
            print("⚠ Could not reset ID counters (sqlite_sequence not found)")

        # 3. COMMIT CHANGES
        conn.commit()
        print("--- CLEANUP COMPLETE ---")

    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
        conn.rollback() # Undo changes if something broke

    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    confirm = input("Are you sure you want to delete ALL data? (yes/no): ")
    if confirm.lower() == "yes":
        clear_database()
    else:
        print("Operation cancelled.")