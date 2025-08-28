import sqlite3
import pandas as pd
from datetime import datetime
from analytics_module import run_all

DB_PATH = "/Users/hardikchhallani/PycharmProjects/Smart-Rental-Tracking/dataset_preparation/equipment_management.db"

def test_run_all():
    print("=== Testing run_all function ===")
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    
    # Load data like the API does
    tables = ["RentalTransactions", "EquipmentMaster", "UsageMetrics", "AlertsNotifications", "AIFeatures", "MaintenanceHealth", "FinancialData"]
    dfs = {}
    
    for table in tables:
        df = pd.read_sql_query(f"SELECT * FROM {table}", conn)
        
        # Convert date columns to datetime
        if table == "RentalTransactions":
            for col in ["check_out_date", "check_in_date", "expected_return_date"]:
                if col in df.columns:
                    df[col] = pd.to_datetime(df[col], errors="coerce")
            dfs["rentals"] = df
        elif table == "EquipmentMaster":
            dfs["equipment"] = df
        elif table == "UsageMetrics":
            if "date" in df.columns:
                df["date"] = pd.to_datetime(df["date"], errors="coerce")
            dfs["usage"] = df
        elif table == "AlertsNotifications":
            if "reminder_sent_date" in df.columns:
                df["reminder_sent_date"] = pd.to_datetime(df["reminder_sent_date"], errors="coerce")
            dfs["alerts"] = df
        elif table == "AIFeatures":
            dfs["ai"] = df
        elif table == "MaintenanceHealth":
            for col in ["last_service_date", "next_service_due"]:
                if col in df.columns:
                    df[col] = pd.to_datetime(df[col], errors="coerce")
            dfs["maintenance"] = df
        elif table == "FinancialData":
            dfs["financial"] = df
    
    conn.close()
    
    print(f"Loaded dataframes: {list(dfs.keys())}")
    
    # Test the run_all function
    results = run_all(dfs)
    
    print(f"\nResults keys: {list(results.keys())}")
    
    # Check the main equipment_data
    if "equipment_data" in results:
        equipment_data = results["equipment_data"]
        print(f"\nEquipment data shape: {equipment_data.shape}")
        print(f"Equipment data columns: {list(equipment_data.columns)}")
        
        # Check if alert fields are present
        alert_fields = ['alert_type', 'overdue_status', 'anomaly_flag']
        for field in alert_fields:
            if field in equipment_data.columns:
                print(f"{field} present: {equipment_data[field].notna().sum()} non-null values")
            else:
                print(f"{field} NOT present in equipment_data")
        
        # Show sample equipment with all fields
        print(f"\nSample equipment data for EQ001:")
        eq001 = equipment_data[equipment_data['equipment_id'] == 'EQ001']
        if not eq001.empty:
            for col in equipment_data.columns:
                value = eq001[col].iloc[0]
                print(f"{col}: {value}")
    
    # Check other results
    for key, value in results.items():
        if isinstance(value, pd.DataFrame):
            print(f"\n{key}: {value.shape} rows, {len(value.columns)} columns")
        else:
            print(f"\n{key}: {type(value)}")

if __name__ == "__main__":
    test_run_all()
