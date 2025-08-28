import sqlite3
import random
from datetime import date, timedelta

# Connect to the existing database
db_name = "equipment_management.db"
conn = sqlite3.connect(db_name)
cursor = conn.cursor()

print("Adding alert-generating data to the database...")

try:
    # Get existing equipment IDs
    cursor.execute("SELECT equipment_id FROM EquipmentMaster")
    equipment_ids = [row[0] for row in cursor.fetchall()]
    
    # Define alert scenarios
    alert_scenarios = [
        {
            'alert_type': 'Overdue Return',
            'overdue_status': 1,
            'reminder_sent_date': str(date.today() - timedelta(days=random.randint(1, 5)))
        },
        {
            'alert_type': 'Maintenance Due',
            'overdue_status': 0,
            'reminder_sent_date': str(date.today() - timedelta(days=random.randint(1, 3)))
        },
        {
            'alert_type': 'Low Fuel',
            'overdue_status': 0,
            'reminder_sent_date': str(date.today() - timedelta(days=random.randint(1, 2)))
        },
        {
            'alert_type': 'Breakdown Alert',
            'overdue_status': 0,
            'reminder_sent_date': str(date.today() - timedelta(days=random.randint(1, 3)))
        }
    ]
    
    # Add alerts to random equipment (about 30% of equipment will have alerts)
    alert_count = 0
    for equipment_id in equipment_ids:
        if random.random() < 0.3:  # 30% chance of having an alert
            alert_scenario = random.choice(alert_scenarios)
            
            # Update AlertsNotifications table
            cursor.execute("""
                UPDATE AlertsNotifications 
                SET alert_type = ?, overdue_status = ?, reminder_sent_date = ?
                WHERE equipment_id = ?
            """, (alert_scenario['alert_type'], alert_scenario['overdue_status'], 
                  alert_scenario['reminder_sent_date'], equipment_id))
            
            # Update AIFeatures to add anomaly flags
            cursor.execute("""
                UPDATE AIFeatures 
                SET anomaly_flag = 1
                WHERE equipment_id = ?
            """, (equipment_id,))
            
            # Update MaintenanceHealth to add some critical conditions
            if alert_scenario['alert_type'] in ['Maintenance Due', 'Breakdown Alert']:
                cursor.execute("""
                    UPDATE MaintenanceHealth 
                    SET condition_status = 'Critical', breakdowns_reported = ?
                    WHERE equipment_id = ?
                """, (random.randint(1, 3), equipment_id))
            
            alert_count += 1
            print(f"Added {alert_scenario['alert_type']} alert to {equipment_id}")
    
    # Add some overdue equipment by updating rental transactions
    overdue_equipment = random.sample(equipment_ids, min(5, len(equipment_ids)))
    for equipment_id in overdue_equipment:
        # Set expected return date to past date
        past_date = date.today() - timedelta(days=random.randint(1, 10))
        cursor.execute("""
            UPDATE RentalTransactions 
            SET expected_return_date = ?, check_in_date = NULL
            WHERE equipment_id = ?
        """, (str(past_date), equipment_id))
        
        # Update alerts for overdue equipment
        cursor.execute("""
            UPDATE AlertsNotifications 
            SET alert_type = 'Overdue Return', overdue_status = 1, reminder_sent_date = ?
            WHERE equipment_id = ?
        """, (str(date.today() - timedelta(days=random.randint(1, 3))), equipment_id))
        
        print(f"Made {equipment_id} overdue (expected return: {past_date})")
    
    # Commit all changes
    conn.commit()
    print(f"\nSuccessfully added alerts to {alert_count} equipment items")
    print(f"Made {len(overdue_equipment)} equipment overdue")
    print("Database updated with alert-generating data!")

except sqlite3.Error as e:
    print(f"An error occurred: {e}")
    conn.rollback()

finally:
    conn.close()
    print("Database connection closed.")
