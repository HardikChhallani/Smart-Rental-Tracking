import sqlite3
import pandas as pd
from datetime import datetime
from analytics_module import asset_dashboard

DB_PATH = "/Users/hardikchhallani/PycharmProjects/Smart-Rental-Tracking/dataset_preparation/equipment_management.db"

def test_asset_dashboard():
    print("=== Testing asset_dashboard function ===")
    
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
    print(f"Alerts shape: {dfs['alerts'].shape}")
    print(f"AI shape: {dfs['ai'].shape}")
    
    # Test the asset_dashboard function
    result = asset_dashboard(dfs)
    
    print(f"\nResult shape: {result.shape}")
    print(f"Result columns: {list(result.columns)}")
    
    # Check if alert fields are present
    alert_fields = ['alert_type', 'overdue_status', 'anomaly_flag']
    for field in alert_fields:
        if field in result.columns:
            print(f"{field} present: {result[field].notna().sum()} non-null values")
        else:
            print(f"{field} NOT present in result")
    
    # Show sample with alerts
    if 'alert_type' in result.columns:
        alert_equipment = result[result['alert_type'].notna()]
        print(f"\nEquipment with alerts: {len(alert_equipment)}")
        if not alert_equipment.empty:
            print("Sample alert equipment:")
            print(alert_equipment[['equipment_id', 'alert_type', 'overdue_status']].head())
    
    # Show the actual result for one equipment
    print(f"\nSample result for EQ001:")
    eq001 = result[result['equipment_id'] == 'EQ001']
    if not eq001.empty:
        for col in result.columns:
            print(f"{col}: {eq001[col].iloc[0]}")

if __name__ == "__main__":
    test_asset_dashboard()
