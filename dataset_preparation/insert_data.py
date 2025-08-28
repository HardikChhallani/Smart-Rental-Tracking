import sqlite3
import random
from datetime import date, timedelta

# --- Connect to the existing database ---
db_name = "equipment_management.db"
conn = sqlite3.connect(db_name)
cursor = conn.cursor()

# --- Clear existing data to prevent duplicates on re-running ---
tables = ["EquipmentMaster", "RentalTransactions", "UsageMetrics", "MaintenanceHealth", "AlertsNotifications",
          "FinancialData", "AIFeatures"]
for table in tables:
    cursor.execute(f"DELETE FROM {table};")
print("Cleared existing data from tables.")

# --- Data generation lists ---
equipment_types = ['Excavator', 'Bulldozer', 'Crane', 'Loader', 'Grader']
job_types = ['Road Construction', 'Land Clearing', 'Bridge Building', 'Foundation Work', 'Pipeline Work', 'Demolition']
alert_types = ['Maintenance Due', 'Overdue Return', 'Low Fuel', 'Breakdown Alert', 'None']
conditions = ['Good', 'Needs Repair', 'Critical']
sites = [f'Site-{100 + i}' for i in range(1, 31)]

try:
    # --- Generate data for 30 pieces of equipment ---
    for i in range(1, 31):
        eq_id = f'EQ{i:03d}'
        eq_type = random.choice(equipment_types)
        qr_id = f'QR{i:03d}'

        # 1. Equipment Master
        cursor.execute("INSERT INTO EquipmentMaster (equipment_id, type, qr_tag_id) VALUES (?, ?, ?)",
                       (eq_id, eq_type, qr_id))

        # 2. Rental Transactions
        check_out = date(2025, random.randint(7, 8), random.randint(1, 28))
        rental_days = random.randint(10, 45)
        expected_return = check_out + timedelta(days=rental_days)
        # Assume some are still checked out (check_in_date is NULL)
        check_in = expected_return + timedelta(days=random.randint(-2, 5)) if random.random() > 0.2 else None
        cursor.execute("""
            INSERT INTO RentalTransactions 
            (equipment_id, site_id, check_out_date, check_in_date, expected_return_date, operator_id, purpose_job_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (eq_id, f'SITE{100 + i}', str(check_out), str(check_in) if check_in else None, str(expected_return),
                  f'OP{i:03d}', random.choice(job_types)))

        # 3. Usage Metrics
        engine_hours = round(random.uniform(5.0, 9.0), 2)
        idle_hours = round(random.uniform(1.0, 3.0), 2)
        cursor.execute("""
            INSERT INTO UsageMetrics 
            (equipment_id, date, engine_hours_per_day, idle_hours_per_day, operating_days, fuel_consumption_per_day, location_coordinates, downtime_hours) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (eq_id, str(check_out), engine_hours, idle_hours, rental_days, round(engine_hours * 6.5, 2),
                  f"{random.uniform(13.0, 28.6):.4f},{random.uniform(77.2, 80.2):.4f}", round(random.uniform(0, 2), 2)))

        # 4. Maintenance Health
        last_service = date(2025, random.randint(5, 7), random.randint(1, 28))
        next_service = last_service + timedelta(days=random.randint(60, 90))
        maint_cost = round(random.uniform(3000, 8000), 2)
        cursor.execute("""
            INSERT INTO MaintenanceHealth 
            (equipment_id, last_service_date, next_service_due, breakdowns_reported, condition_status, maintenance_costs) 
            VALUES (?, ?, ?, ?, ?, ?)
            """, (eq_id, str(last_service), str(next_service), random.randint(0, 3), random.choice(conditions),
                  maint_cost))

        # 5. Alerts & Notifications
        alert_type = random.choice(alert_types)
        overdue = 1 if alert_type == 'Overdue Return' else 0
        reminder_date = str(date.today() - timedelta(days=random.randint(1, 10))) if alert_type != 'None' else None
        cursor.execute("""
            INSERT INTO AlertsNotifications (equipment_id, overdue_status, reminder_sent_date, alert_type) 
            VALUES (?, ?, ?, ?)
            """, (eq_id, overdue, reminder_date, alert_type))

        # 6. Financial Data
        rental_rate = round(random.uniform(4000, 7000), 2)
        total_cost = rental_rate * rental_days
        penalty = total_cost * 0.1 if overdue else 0
        fuel_cost = round((engine_hours * rental_days * 6.5) * 1.5, 2)  # Assuming a fuel price
        cursor.execute("""
            INSERT INTO FinancialData 
            (equipment_id, rental_rate_per_day, total_rental_cost, penalty_cost, fuel_cost, maintenance_cost) 
            VALUES (?, ?, ?, ?, ?, ?)
            """, (eq_id, rental_rate, total_cost, penalty, fuel_cost, maint_cost))

        # 7. AI Features
        utilization = round(random.uniform(0.6, 0.95), 2)
        idle = round(1 - utilization - random.uniform(0.0, 0.05), 2)
        cursor.execute("""
            INSERT INTO AIFeatures 
            (equipment_id, utilization_rate, idle_ratio, predicted_demand_score, anomaly_flag, recommended_site) 
            VALUES (?, ?, ?, ?, ?, ?)
            """, (eq_id, utilization, idle, round(random.uniform(0.6, 0.98), 2), random.choice([0, 1]),
                  random.choice(sites)))

    # --- Commit all changes to the database ---
    conn.commit()
    print("\nSuccessfully generated and inserted complete data for 30 equipment items.")

except sqlite3.Error as e:
    print(f"An error occurred: {e}")
    conn.rollback()

finally:
    # --- Close the connection ---
    conn.close()
    print("Database connection closed.")