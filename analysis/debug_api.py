import sqlite3
import pandas as pd
from datetime import datetime

DB_PATH = "/Users/hardikchhallani/PycharmProjects/Smart-Rental-Tracking/dataset_preparation/equipment_management.db"

def debug_data():
    print("=== Debugging API Data ===")
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    
    # Check each table individually
    tables = ["RentalTransactions", "EquipmentMaster", "UsageMetrics", "AlertsNotifications", "AIFeatures", "MaintenanceHealth", "FinancialData"]
    
    for table in tables:
        print(f"\n--- {table} ---")
        try:
            df = pd.read_sql_query(f"SELECT * FROM {table} LIMIT 3", conn)
            print(f"Shape: {df.shape}")
            print(f"Columns: {list(df.columns)}")
            print(f"Sample data:")
            print(df.head())
        except Exception as e:
            print(f"Error reading {table}: {e}")
    
    # Test the merge operations
    print("\n=== Testing Merge Operations ===")
    
    try:
        # Load all tables
        rentals = pd.read_sql_query("SELECT * FROM RentalTransactions", conn)
        equipment = pd.read_sql_query("SELECT * FROM EquipmentMaster", conn)
        alerts = pd.read_sql_query("SELECT * FROM AlertsNotifications", conn)
        ai = pd.read_sql_query("SELECT * FROM AIFeatures", conn)
        
        print(f"Rentals shape: {rentals.shape}")
        print(f"Equipment shape: {equipment.shape}")
        print(f"Alerts shape: {alerts.shape}")
        print(f"AI shape: {ai.shape}")
        
        # Test merge
        merged = rentals.merge(equipment, on="equipment_id", how="right")
        print(f"After equipment merge: {merged.shape}")
        
        merged = merged.merge(alerts[["equipment_id","alert_type","overdue_status","reminder_sent_date"]], 
                             on="equipment_id", how="left")
        print(f"After alerts merge: {merged.shape}")
        
        merged = merged.merge(ai[["equipment_id","utilization_rate","idle_ratio","predicted_demand_score","anomaly_flag","recommended_site"]], 
                             on="equipment_id", how="left")
        print(f"After AI merge: {merged.shape}")
        
        # Check for alert data
        print(f"\nEquipment with alerts: {merged['alert_type'].notna().sum()}")
        print(f"Equipment with anomaly flags: {merged['anomaly_flag'].notna().sum()}")
        
        # Show sample with alerts
        alert_equipment = merged[merged['alert_type'].notna()]
        if not alert_equipment.empty:
            print(f"\nSample equipment with alerts:")
            print(alert_equipment[['equipment_id', 'alert_type', 'overdue_status', 'anomaly_flag']].head())
        
    except Exception as e:
        print(f"Error in merge test: {e}")
    
    conn.close()

if __name__ == "__main__":
    debug_data()
