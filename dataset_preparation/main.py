import sqlite3

db_name = "equipment_management.db"

conn = sqlite3.connect(db_name)
cursor = conn.cursor()

# 1. Equipment Master Data
cursor.execute("""
CREATE TABLE IF NOT EXISTS EquipmentMaster (
    equipment_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    make_model TEXT,
    year_of_manufacture INTEGER,
    ownership_type TEXT CHECK (ownership_type IN ('Owned', 'Rented', 'Leased')),
    rfid_qr_tag_id TEXT,
    gps_device_id TEXT
);
""")

# 2. Rental / Transaction Data
cursor.execute("""
CREATE TABLE IF NOT EXISTS RentalTransactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    site_id TEXT NOT NULL,
    check_out_date TEXT,
    check_in_date TEXT,
    expected_return_date TEXT,
    operator_id TEXT,
    purpose_job_type TEXT,
    FOREIGN KEY (equipment_id) REFERENCES EquipmentMaster (equipment_id)
);
""")

# 3. Usage Metrics
cursor.execute("""
CREATE TABLE IF NOT EXISTS UsageMetrics (
    usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    date TEXT NOT NULL,
    engine_hours_per_day REAL,
    idle_hours_per_day REAL,
    operating_days INTEGER,
    fuel_consumption_per_day REAL,
    location_coordinates TEXT,
    downtime_hours REAL,
    FOREIGN KEY (equipment_id) REFERENCES EquipmentMaster (equipment_id)
);
""")

# 4. Maintenance & Health Data
cursor.execute("""
CREATE TABLE IF NOT EXISTS MaintenanceHealth (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    last_service_date TEXT,
    next_service_due TEXT,
    breakdowns_reported INTEGER, -- count
    condition_status TEXT CHECK (condition_status IN ('Good', 'Needs Repair', 'Critical')),
    maintenance_costs REAL,
    FOREIGN KEY (equipment_id) REFERENCES EquipmentMaster (equipment_id)
);
""")

# 5. Alerts & Notifications
cursor.execute("""
CREATE TABLE IF NOT EXISTS AlertsNotifications (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    overdue_status INTEGER CHECK (overdue_status IN (0,1)), -- Yes=1, No=0
    reminder_sent_date TEXT,
    alert_type TEXT, -- Overdue, Misuse, Low Fuel, Service Due, etc.
    FOREIGN KEY (equipment_id) REFERENCES EquipmentMaster (equipment_id)
);
""")

# 6. Financial Data
cursor.execute("""
CREATE TABLE IF NOT EXISTS FinancialData (
    financial_id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    rental_rate_per_day REAL,
    total_rental_cost REAL,
    penalty_cost REAL,
    fuel_cost REAL,
    maintenance_cost REAL,
    FOREIGN KEY (equipment_id) REFERENCES EquipmentMaster (equipment_id)
);
""")

# 7. AI / Automation Features
cursor.execute("""
CREATE TABLE IF NOT EXISTS AIFeatures (
    ai_id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    utilization_rate REAL,
    idle_ratio REAL,
    predicted_demand_score REAL,
    anomaly_flag INTEGER CHECK (anomaly_flag IN (0,1)), -- Yes=1, No=0
    recommended_site TEXT,
    FOREIGN KEY (equipment_id) REFERENCES EquipmentMaster (equipment_id)
);
""")

# Commit changes and close connection
conn.commit()
conn.close()

print(f"Database '{db_name}' created with all required tables.")
