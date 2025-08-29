import pandas as pd
from typing import Dict
from datetime import datetime

def _today():
    """Returns today's date as a pandas datetime object."""
    return pd.to_datetime(datetime.today().strftime("%Y-%m-%d"))

def complete_equipment_profile(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Creates a complete, wide-format profile for each piece of equipment by merging all
    related data tables. It intelligently handles one-to-many relationships by
    selecting the most recent records.
    """
    # Start with the master list of all equipment
    base = dfs["equipment"].copy()

    # --- Handle one-to-many relationships by getting the LATEST record ---

    # Get the latest rental transaction for each equipment
    if "rentals" in dfs and not dfs["rentals"].empty:
        latest_rentals = dfs["rentals"].sort_values("check_out_date", ascending=False).drop_duplicates("equipment_id")
        base = base.merge(latest_rentals, on="equipment_id", how="left")
    
    # Get the latest usage metric for each equipment
    if "usage" in dfs and not dfs["usage"].empty:
        latest_usage = dfs["usage"].sort_values("date", ascending=False).drop_duplicates("equipment_id")
        base = base.merge(latest_usage, on="equipment_id", how="left")

    # --- Handle one-to-one relationships with a direct merge ---
    
    # Merge remaining data tables
    for table_name in ["maintenance", "alerts", "financial", "ai"]:
        if table_name in dfs and not dfs[table_name].empty:
            base = base.merge(dfs[table_name], on="equipment_id", how="left")

    # --- Add Calculated Fields ---

    # Calculate status based on dates
    today = _today()
    base["status"] = "Idle" # Default status for equipment with no rental history
    if "check_out_date" in base.columns:
        base.loc[(base["check_out_date"].notna()) & (base["check_in_date"].isna()), "status"] = "Active"
        base.loc[base["check_in_date"].notna(), "status"] = "Returned"
    if "expected_return_date" in base.columns:
        base.loc[(base["expected_return_date"].notna()) &
                 (base["expected_return_date"] < today) &
                 (base["check_in_date"].isna()), "status"] = "Overdue"

    # Calculate snapshot utilization percentage
    if "engine_hours_per_day" in base.columns and "idle_hours_per_day" in base.columns:
        total_hours = base["engine_hours_per_day"] + base["idle_hours_per_day"]
        base["utilization_pct_snapshot"] = (
            base["engine_hours_per_day"] / total_hours.replace(0, pd.NA)
        ) * 100
    else:
        base["utilization_pct_snapshot"] = None

    # --- Finalize DataFrame ---
    
    # Ensure all columns from the schema are present, adding them with None if missing
    expected_columns = [
        "equipment_id", "type", "qr_tag_id", "transaction_id", "site_id", 
        "check_out_date", "check_in_date", "expected_return_date", "operator_id",
        "purpose_job_type", "usage_id", "date", "engine_hours_per_day", 
        "idle_hours_per_day", "operating_days", "fuel_consumption_per_day", 
        "location_coordinates", "downtime_hours", "record_id", "last_service_date",
        "next_service_due", "breakdowns_reported", "condition_status", 
        "maintenance_costs", "alert_id", "overdue_status", "reminder_sent_date", 
        "alert_type", "financial_id", "rental_rate_per_day", "total_rental_cost", 
        "penalty_cost", "fuel_cost", "maintenance_cost", "ai_id", "utilization_rate",
        "idle_ratio", "predicted_demand_score", "anomaly_flag", "recommended_site",
        "status", "utilization_pct_snapshot"
    ]
    
    for col in expected_columns:
        if col not in base.columns:
            base[col] = None
            
    return base[expected_columns]

# ---------------------------------
# 2) Asset dashboard (SIMPLIFIED - NOW A VIEW OF THE COMPLETE PROFILE)
# ---------------------------------
def asset_dashboard(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Provides a summary view of the complete equipment profile, focusing on
    live status and key operational metrics.
    """
    # Get the full profile first
    full_profile = complete_equipment_profile(dfs)

    # Define the columns needed for the dashboard view
    dashboard_columns = [
        "equipment_id", "type", "qr_tag_id", "site_id", "status", "check_out_date",
        "expected_return_date", "check_in_date", "date", "engine_hours_per_day",
        "idle_hours_per_day", "utilization_pct_snapshot", "location_coordinates",
        "alert_type", "overdue_status", "reminder_sent_date", "utilization_rate",
        "idle_ratio", "predicted_demand_score", "anomaly_flag", "recommended_site",
        "last_service_date", "next_service_due", "breakdowns_reported",
        "condition_status", "maintenance_costs", "rental_rate_per_day",
        "total_rental_cost", "penalty_cost", "fuel_cost", "maintenance_cost"
    ]
    
    # Rename 'date' to 'last_seen' for clarity in the dashboard
    return full_profile[dashboard_columns].rename(columns={"date": "last_seen"})

# ---------------------------------
# 3) Usage metrics (No changes needed)
# ---------------------------------
def usage_metrics(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    usage = dfs["usage"].copy()
    usage["total_hours"] = usage["engine_hours_per_day"] + usage["idle_hours_per_day"]

    metrics = usage.groupby("equipment_id").agg({
        "engine_hours_per_day":"sum",
        "idle_hours_per_day":"sum",
        "total_hours":"sum"
    }).reset_index()

    metrics["utilization_pct"] = (metrics["engine_hours_per_day"] /
                                  metrics["total_hours"].replace(0, pd.NA)) * 100
    metrics["underutilized"] = (metrics["utilization_pct"] < 50).astype(int)
    return metrics

# ---------------------------------
# 4) Overdue alerts (No changes needed)
# ---------------------------------
def detect_overdue(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    rentals = dfs["rentals"].copy()
    today = _today()
    overdue = rentals[(rentals["expected_return_date"].notna()) &
                      (rentals["expected_return_date"] < today) &
                      (rentals["check_in_date"].isna())].copy()
    overdue["overdue_days"] = (today - overdue["expected_return_date"]).dt.days
    return overdue[["equipment_id","site_id","expected_return_date","overdue_days"]]

def maintenance_alerts(dfs: Dict[str, pd.DataFrame],
                       threshold_hours: int = 200,
                       threshold_days: int = 180) -> pd.DataFrame:
    maint = dfs["maintenance"].copy()
    usage = dfs["usage"].copy()

    last_maint = maint.groupby("equipment_id")["last_service_date"].max().reset_index()
    merged = usage.merge(last_maint, on="equipment_id", how="left")
    eng_hours = merged.groupby("equipment_id")["engine_hours_per_day"].sum().reset_index()

    alerts = last_maint.merge(eng_hours, on="equipment_id", how="left")
    alerts["service_due_hours"] = alerts["engine_hours_per_day"] >= threshold_hours
    alerts["service_due_days"] = alerts["last_service_date"].notna() & \
                                 ((_today()) - alerts["last_service_date"]).dt.days >= threshold_days
    alerts["service_alert"] = (alerts["service_due_hours"] | alerts["service_due_days"]).astype(int)
    return alerts[["equipment_id","last_service_date","engine_hours_per_day",
                   "service_due_hours","service_due_days","service_alert"]]

def anomalies(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    profile = complete_equipment_profile(dfs)
    usage = usage_metrics(dfs)[["equipment_id","utilization_pct","underutilized"]]

    issues = profile.copy()
    issues["anom_no_site"] = issues["site_id"].isna().astype(int)
    issues = issues.merge(usage, on="equipment_id", how="left")
    issues["anom_low_util"] = issues["underutilized"].fillna(0).astype(int)

    issues["anomaly_flag"] = ((issues["status"] == "Overdue") |
                              (issues["anom_no_site"] == 1) |
                              (issues["anom_low_util"] == 1)).astype(int)
    return issues[[
        "equipment_id","status","site_id",
        "anom_no_site","anom_low_util","anomaly_flag","utilization_pct"
    ]]

# ---------------------------------
# 7) Predictive allocation (No changes needed)
# ---------------------------------
def predictive_allocation(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    ai = dfs["ai"].copy()
    equipment = dfs["equipment"].copy()
    sites = dfs.get("sites", pd.DataFrame(columns=["site_id","required_type","location"]))
    merged = ai.merge(equipment, on="equipment_id", how="left")

    allocations = []
    for _, row in merged.iterrows():
        eq_id = row["equipment_id"]
        eq_type = row["type"]
        eq_loc = row.get("location_coordinates", None)
        score = row["predicted_demand_score"]

        site_candidates = sites[sites["required_type"] == eq_type].copy()
        if site_candidates.empty:
            allocations.append([eq_id, None, "No matching site"])
            continue

        site_candidates["score"] = site_candidates.apply(
            lambda s: score + (20 if s.get("location") == eq_loc else 0), axis=1
        )
        best_site = site_candidates.sort_values("score", ascending=False).iloc[0]
        allocations.append([eq_id, best_site["site_id"], f"Allocate to {best_site.get('location')} (score={best_site['score']})"])

    return pd.DataFrame(allocations, columns=["equipment_id","recommended_site_id","recommendation"])

# ---------------------------------
# 8) Rollback allocation (No changes needed)
# ---------------------------------
def rollback_with_allocation(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    rentals = dfs["rentals"].copy()
    today = _today()

    ended = rentals[(rentals["expected_return_date"].notna()) &
                    (rentals["expected_return_date"] < today) &
                    (rentals["check_in_date"].isna())]

    if ended.empty:
        return pd.DataFrame(columns=["equipment_id","action"])

    realloc = predictive_allocation(dfs)
    result = ended.merge(realloc, on="equipment_id", how="left")
    result["action"] = result["recommendation"].fillna("Return to warehouse")
    return result[["equipment_id","site_id","expected_return_date","action"]]

# ---------------------------------
# 9) Alerts aggregator (No changes needed)
# ---------------------------------
def alerts(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    alerts_list = []

    overdue = detect_overdue(dfs)
    for _, r in overdue.iterrows():
        alerts_list.append([r["equipment_id"], "Contract", f"Overdue by {r['overdue_days']} days"])

    maint = maintenance_alerts(dfs)
    for _, r in maint[maint["service_alert"] == 1].iterrows():
        alerts_list.append([r["equipment_id"], "Maintenance", "Service due (hours/days exceeded)"])

    anoms = anomalies(dfs)
    for _, r in anoms[anoms["anomaly_flag"] == 1].iterrows():
        alerts_list.append([r["equipment_id"], "Anomaly", "Operational anomaly detected"])

    rollback = rollback_with_allocation(dfs)
    for _, r in rollback.iterrows():
        alerts_list.append([r["equipment_id"], "Rollback", r["action"]])

    pred = predictive_allocation(dfs)
    for _, r in pred.iterrows():
        alerts_list.append([r["equipment_id"], "Predictive", r["recommendation"]])

    return pd.DataFrame(alerts_list, columns=["equipment_id","alert_type","message"])

# ---------------------------------
# Orchestrator (UPDATED)
# ---------------------------------
def run_all(dfs: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
    """
    Executes all analytics functions and returns a dictionary of resulting DataFrames.
    The main output 'equipment_data' contains the complete, unabridged profile for each asset.
    """
    # The complete equipment profile is now the central, most important result
    complete_profile = complete_equipment_profile(dfs)
    
    # All other analytics are derived or supplementary
    analytics_results = {
        # CORE OUTPUTS
        "equipment_data": complete_profile, # The main, complete profile
        "asset_dashboard": asset_dashboard(dfs), # The summarized dashboard view
        "alerts": alerts(dfs), # The final aggregated alert feed
        
        # INDIVIDUAL ANALYTICS
        "usage_metrics": usage_metrics(dfs),
        "overdue_alerts": detect_overdue(dfs),
        "maintenance_alerts": maintenance_alerts(dfs),
        "anomalies": anomalies(dfs),
        "predictive_allocation": predictive_allocation(dfs),
        "rollback_with_allocation": rollback_with_allocation(dfs),
        
        # RAW INPUT DATA (for flexibility)
        "equipment_master": dfs.get("equipment", pd.DataFrame()),
        "rental_transactions": dfs.get("rentals", pd.DataFrame()),
        "usage_metrics_raw": dfs.get("usage", pd.DataFrame()),
        "maintenance_health": dfs.get("maintenance", pd.DataFrame()),
        "financial_data": dfs.get("financial", pd.DataFrame()),
        "alerts_notifications": dfs.get("alerts", pd.DataFrame()),
        "ai_features": dfs.get("ai", pd.DataFrame()),
    }
    
    return analytics_results

if __name__ == "__main__":
    db_name = "equipment_management.db"
    conn = sqlite3.connect(db_name)

    # 1. Define all the tables you need to load from your database
    table_names = {
        "equipment": "EquipmentMaster",
        "rentals": "RentalTransactions",
        "usage": "UsageMetrics",
        "maintenance": "MaintenanceHealth",
        "alerts": "AlertsNotifications",
        "financial": "FinancialData",
        "ai": "AIFeatures"
    }

    print("Loading data from database...")
    data_frames = {}
    for df_key, table_name in table_names.items():
        try:
            query = f"SELECT * FROM {table_name}"
            data_frames[df_key] = pd.read_sql_query(query, conn)
            print(f"  - Successfully loaded '{table_name}' into key '{df_key}'")
        except Exception as e:
            print(f"  - Could not load table '{table_name}'. Error: {e}")
            data_frames[df_key] = pd.DataFrame() # Create empty dataframe if table is missing

    conn.close()

    # 2. **Crucial Step**: Convert all date columns to pandas datetime objects
    # This ensures calculations and comparisons work correctly.
    date_columns_map = {
        "rentals": ["check_out_date", "check_in_date", "expected_return_date"],
        "usage": ["date"],
        "maintenance": ["last_service_date", "next_service_due"],
        "alerts": ["reminder_sent_date"]
    }

    for df_key, columns in date_columns_map.items():
        if not data_frames[df_key].empty:
            for col in columns:
                data_frames[df_key][col] = pd.to_datetime(data_frames[df_key][col], errors='coerce')

    # 3. Now, run the analysis with the complete set of data
    print("\nRunning all analytics...")
    results = run_all(data_frames)

    # 4. Display the complete, merged data for a specific equipment ID
    print("\n✅ Complete Profile for EQ001:")
    
    # Set display options to see all columns
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', 1000)

    equipment_profile = results['equipment_data']
    print(equipment_profile[equipment_profile['equipment_id'] == 'EQ001'].to_string(index=False))