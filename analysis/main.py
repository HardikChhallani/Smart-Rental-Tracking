import sqlite3
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict

from analytics_module import (
    asset_dashboard,
    usage_metrics,
    detect_overdue,
    maintenance_alerts,
    anomalies,
    predictive_allocation,
    rollback_with_allocation,
    alerts,
    run_all
)

DB_PATH = "/Users/hardikchhallani/PycharmProjects/Smart-Rental-Tracking/dataset_preparation/equipment_management.db"

app = FastAPI(
    title="Equipment Analytics API",
    description="Backend API for Equipment Rental Analytics, Predictive Allocation, Rollback, Maintenance & Alerts",
    version="2.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Table-to-column mapping to enforce correct schema
TABLE_COLUMNS = {
    "EquipmentMaster": [
        "equipment_id", "type", "qr_tag_id"
    ],
    "RentalTransactions": [
        "transaction_id", "equipment_id", "site_id",
        "check_out_date", "check_in_date", "expected_return_date",
        "operator_id", "purpose_job_type"
    ],
    "UsageMetrics": [
        "usage_id", "equipment_id", "date", "engine_hours_per_day",
        "idle_hours_per_day", "operating_days", "fuel_consumption_per_day",
        "location_coordinates", "downtime_hours"
    ],
    "MaintenanceHealth": [
        "record_id", "equipment_id", "last_service_date",
        "next_service_due", "breakdowns_reported", "condition_status",
        "maintenance_costs"
    ],
    "AlertsNotifications": [
        "alert_id", "equipment_id", "overdue_status",
        "reminder_sent_date", "alert_type"
    ],
    "FinancialData": [
        "financial_id", "equipment_id", "rental_rate_per_day",
        "total_rental_cost", "penalty_cost", "fuel_cost", "maintenance_cost"
    ],
    "AIFeatures": [
        "ai_id", "equipment_id", "utilization_rate",
        "idle_ratio", "predicted_demand_score", "anomaly_flag", "recommended_site"
    ]
}

TABLE_ALIASES = {
    "RentalTransactions": "rentals",
    "EquipmentMaster": "equipment",
    "UsageMetrics": "usage",
    "MaintenanceHealth": "maintenance",
    "AlertsNotifications": "alerts",
    "FinancialData": "financial",
    "AIFeatures": "ai"
}

# Explicit date columns for conversion
DATE_COLS = {
    "RentalTransactions": ["check_out_date", "check_in_date", "expected_return_date"],
    "UsageMetrics": ["date"],
    "MaintenanceHealth": ["last_service_date", "next_service_due"],
    "AlertsNotifications": ["reminder_sent_date"]
}

def fetch_data_from_db(tables: list) -> Dict[str, pd.DataFrame]:
    try:
        conn = sqlite3.connect(DB_PATH)
        dfs = {}
        for table in tables:
            cols = ", ".join(TABLE_COLUMNS[table])
            df = pd.read_sql_query(f"SELECT {cols} FROM {table}", conn)

            # Convert date columns to datetime where needed
            if table in DATE_COLS:
                for col in DATE_COLS[table]:
                    if col in df.columns:
                        df[col] = pd.to_datetime(df[col], errors="coerce")

            dfs[TABLE_ALIASES[table]] = df

        conn.close()
        return dfs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/")
def root():
    return {"message": "Equipment Analytics API is running!"}


@app.get("/run-all")
def run_all_analysis():
    tables = list(TABLE_COLUMNS.keys())
    dfs = fetch_data_from_db(tables)
    results = run_all(dfs)
    return {k: v.to_dict(orient="records") for k, v in results.items()}


# -------------------------------------
# Individual Endpoints (no db_path input)
# -------------------------------------

@app.get("/asset-dashboard")
def get_asset_dashboard():
    print("=== Asset Dashboard API Called ===")
    dfs = fetch_data_from_db(["RentalTransactions", "EquipmentMaster", "UsageMetrics", "AlertsNotifications", "AIFeatures", "MaintenanceHealth", "FinancialData"])
    print(f"Dataframes loaded: {list(dfs.keys())}")
    print(f"Alerts dataframe shape: {dfs['alerts'].shape if 'alerts' in dfs else 'Not found'}")
    result = asset_dashboard(dfs)
    print(f"Result shape: {result.shape}")
    print(f"Result columns: {list(result.columns)}")
    print(f"Alert fields present: {'alert_type' in result.columns}, {'overdue_status' in result.columns}, {'anomaly_flag' in result.columns}")
    return result.to_dict(orient="records")


@app.get("/usage-metrics")
def get_usage_metrics():
    dfs = fetch_data_from_db(["UsageMetrics"])
    result = usage_metrics(dfs)
    return result.to_dict(orient="records")


@app.get("/overdue-alerts")
def get_overdue_alerts():
    dfs = fetch_data_from_db(["RentalTransactions"])
    result = detect_overdue(dfs)
    return result.to_dict(orient="records")


@app.get("/maintenance-alerts")
def get_maintenance_alerts():
    dfs = fetch_data_from_db(["MaintenanceHealth", "UsageMetrics"])
    result = maintenance_alerts(dfs)
    return result.to_dict(orient="records")


@app.get("/anomalies")
def get_anomalies():
    dfs = fetch_data_from_db(["RentalTransactions", "EquipmentMaster", "UsageMetrics"])
    result = anomalies(dfs)
    return result.to_dict(orient="records")


@app.get("/predictive-allocation")
def get_predictive_allocation():
    dfs = fetch_data_from_db(["AIFeatures", "EquipmentMaster"])
    result = predictive_allocation(dfs)
    return result.to_dict(orient="records")


@app.get("/rollback-allocation")
def get_rollback_allocation():
    dfs = fetch_data_from_db(["RentalTransactions", "AIFeatures", "EquipmentMaster"])
    result = rollback_with_allocation(dfs)
    return result.to_dict(orient="records")


@app.get("/alerts")
def get_alerts():
    dfs = fetch_data_from_db(
        ["RentalTransactions", "EquipmentMaster", "UsageMetrics", "MaintenanceHealth", "AIFeatures"]
    )
    result = alerts(dfs)
    return result.to_dict(orient="records")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, port=8085)