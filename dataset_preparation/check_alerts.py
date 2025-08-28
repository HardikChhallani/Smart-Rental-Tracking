import sqlite3

# Connect to the database
db_name = "equipment_management.db"
conn = sqlite3.connect(db_name)
cursor = conn.cursor()

print("Checking alert data in the database...\n")

try:
    # Check AlertsNotifications table
    cursor.execute("SELECT equipment_id, alert_type, overdue_status FROM AlertsNotifications LIMIT 10")
    alerts = cursor.fetchall()
    
    print("=== AlertsNotifications Table ===")
    if alerts:
        for alert in alerts:
            print(f"Equipment: {alert[0]}, Alert Type: {alert[1]}, Overdue: {alert[2]}")
    else:
        print("No alert data found in AlertsNotifications table")
    
    print("\n=== Equipment with Alerts ===")
    cursor.execute("""
        SELECT equipment_id, alert_type, overdue_status 
        FROM AlertsNotifications 
        WHERE alert_type != 'None' OR overdue_status = 1
    """)
    equipment_with_alerts = cursor.fetchall()
    
    if equipment_with_alerts:
        for eq in equipment_with_alerts:
            print(f"Equipment: {eq[0]}, Alert: {eq[1]}, Overdue: {eq[2]}")
    else:
        print("No equipment with alerts found")
    
    print(f"\nTotal equipment with alerts: {len(equipment_with_alerts)}")
    
    # Check AIFeatures for anomaly flags
    print("\n=== AIFeatures Anomaly Flags ===")
    cursor.execute("SELECT equipment_id, anomaly_flag FROM AIFeatures WHERE anomaly_flag = 1")
    anomalies = cursor.fetchall()
    
    if anomalies:
        for anomaly in anomalies:
            print(f"Equipment: {anomaly[0]} has anomaly flag: {anomaly[1]}")
    else:
        print("No equipment with anomaly flags found")
    
    # Check total equipment count
    cursor.execute("SELECT COUNT(*) FROM EquipmentMaster")
    total_equipment = cursor.fetchone()[0]
    print(f"\nTotal equipment in database: {total_equipment}")
    
    # Check if the API endpoint is returning the alert data
    print("\n=== Checking API Data Structure ===")
    cursor.execute("""
        SELECT rt.equipment_id, rt.status, an.alert_type, an.overdue_status, af.anomaly_flag
        FROM RentalTransactions rt
        LEFT JOIN AlertsNotifications an ON rt.equipment_id = an.equipment_id
        LEFT JOIN AIFeatures af ON rt.equipment_id = af.equipment_id
        WHERE an.alert_type != 'None' OR an.overdue_status = 1 OR af.anomaly_flag = 1
        LIMIT 5
    """)
    api_data = cursor.fetchall()
    
    if api_data:
        for data in api_data:
            print(f"Equipment: {data[0]}, Status: {data[1]}, Alert: {data[2]}, Overdue: {data[3]}, Anomaly: {data[4]}")
    else:
        print("No alert data found in API query")

except sqlite3.Error as e:
    print(f"An error occurred: {e}")

finally:
    conn.close()
    print("\nDatabase connection closed.")
