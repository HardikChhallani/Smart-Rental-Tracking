import sqlite3

# Connect to the database
db_name = "equipment_management.db"
conn = sqlite3.connect(db_name)
cursor = conn.cursor()

print("Checking database schema...\n")

try:
    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("=== Database Tables ===")
    for table in tables:
        print(f"Table: {table[0]}")
    
    print("\n=== Table Schemas ===")
    for table in tables:
        table_name = table[0]
        print(f"\n--- {table_name} ---")
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
    
    # Check AlertsNotifications specifically
    print("\n=== AlertsNotifications Sample Data ===")
    cursor.execute("SELECT * FROM AlertsNotifications LIMIT 3")
    alerts_data = cursor.fetchall()
    if alerts_data:
        for row in alerts_data:
            print(f"Row: {row}")
    else:
        print("No data in AlertsNotifications table")

except sqlite3.Error as e:
    print(f"An error occurred: {e}")

finally:
    conn.close()
    print("\nDatabase connection closed.")
