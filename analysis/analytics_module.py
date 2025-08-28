import pandas as pd
from typing import Dict
from datetime import datetime

# ---------------------------------
# Utility
# ---------------------------------
def _today():
    return pd.to_datetime(datetime.today().strftime("%Y-%m-%d"))

# ---------------------------------
# 1) Asset dashboard (live status)
# ---------------------------------
def asset_dashboard(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    rentals = dfs["rentals"].copy()
    equipment = dfs["equipment"].copy()

    rentals["status"] = "UNKNOWN"
    today = _today()
    rentals.loc[(rentals["check_out_date"].notna()) & (rentals["check_in_date"].isna()), "status"] = "Active"
    rentals.loc[rentals["check_in_date"].notna(), "status"] = "Returned"
    rentals.loc[(rentals["expected_return_date"].notna()) &
                (rentals["expected_return_date"] < today) &
                (rentals["check_in_date"].isna()), "status"] = "Overdue"

    # Last usage snapshot
    if "usage" in dfs:
        last_usage = dfs["usage"].sort_values("date").groupby("equipment_id").tail(1)
    else:
        last_usage = pd.DataFrame(columns=["equipment_id","date","engine_hours_per_day","idle_hours_per_day","location_coordinates"])

    # Merge with alert data
    if "alerts" in dfs:
        alerts_data = dfs["alerts"].copy()
    else:
        alerts_data = pd.DataFrame(columns=["equipment_id","alert_type","overdue_status","reminder_sent_date"])
    
    # Merge with AI features
    if "ai" in dfs:
        ai_data = dfs["ai"].copy()
    else:
        ai_data = pd.DataFrame(columns=["equipment_id","utilization_rate","idle_ratio","predicted_demand_score","anomaly_flag","recommended_site"])
    
    # Merge with maintenance data
    if "maintenance" in dfs:
        maintenance_data = dfs["maintenance"].copy()
    else:
        maintenance_data = pd.DataFrame(columns=["equipment_id","last_service_date","next_service_due","breakdowns_reported","condition_status","maintenance_costs"])
    
    # Merge with financial data
    if "financial" in dfs:
        financial_data = dfs["financial"].copy()
    else:
        financial_data = pd.DataFrame(columns=["equipment_id","rental_rate_per_day","total_rental_cost","penalty_cost","fuel_cost","maintenance_cost"])

    dash = (rentals
            .merge(equipment, on="equipment_id", how="right")
            .merge(last_usage[["equipment_id","date","engine_hours_per_day","idle_hours_per_day","location_coordinates"]],
                   on="equipment_id", how="left")
            .merge(alerts_data[["equipment_id","alert_type","overdue_status","reminder_sent_date"]],
                   on="equipment_id", how="left")
            .merge(ai_data[["equipment_id","utilization_rate","idle_ratio","predicted_demand_score","anomaly_flag","recommended_site"]],
                   on="equipment_id", how="left")
            .merge(maintenance_data[["equipment_id","last_service_date","next_service_due","breakdowns_reported","condition_status","maintenance_costs"]],
                   on="equipment_id", how="left")
            .merge(financial_data[["equipment_id","rental_rate_per_day","total_rental_cost","penalty_cost","fuel_cost","maintenance_cost"]],
                   on="equipment_id", how="left"))
    dash.rename(columns={
        "date":"last_seen",
        "engine_hours_per_day":"last_engine_hpd",
        "idle_hours_per_day":"last_idle_hpd"
    }, inplace=True)

    dash["utilization_pct_snapshot"] = (
        dash["last_engine_hpd"] /
        (dash["last_engine_hpd"] + dash["last_idle_hpd"]).replace(0, pd.NA)
    ) * 100

    return dash[[
        "equipment_id","type","qr_tag_id","site_id","status","check_out_date",
        "expected_return_date","check_in_date","last_seen","last_engine_hpd","last_idle_hpd",
        "utilization_pct_snapshot","location_coordinates","alert_type","overdue_status",
        "reminder_sent_date","utilization_rate","idle_ratio","predicted_demand_score",
        "anomaly_flag","recommended_site","last_service_date","next_service_due",
        "breakdowns_reported","condition_status","maintenance_costs","rental_rate_per_day",
        "total_rental_cost","penalty_cost","fuel_cost","maintenance_cost"
    ]].drop_duplicates("equipment_id")

# ---------------------------------
# 2) Usage metrics
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
# 3) Overdue alerts
# ---------------------------------
def detect_overdue(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    rentals = dfs["rentals"].copy()
    today = _today()
    overdue = rentals[(rentals["expected_return_date"].notna()) &
                      (rentals["expected_return_date"] < today) &
                      (rentals["check_in_date"].isna())].copy()
    overdue["overdue_days"] = (today - overdue["expected_return_date"]).dt.days
    return overdue[["equipment_id","site_id","expected_return_date","overdue_days"]]

# ---------------------------------
# 4) Maintenance alerts
# ---------------------------------
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

# ---------------------------------
# 5) Anomaly detection
# ---------------------------------
def anomalies(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    dash = asset_dashboard(dfs)
    usage = usage_metrics(dfs)[["equipment_id","utilization_pct","underutilized"]]

    issues = dash.copy()
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
# 6) Predictive allocation
# ---------------------------------
def predictive_allocation(dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    ai = dfs["ai"].copy()
    equipment = dfs["equipment"].copy()

    # sites is optional - handle if missing
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
            lambda s: score + (20 if s["location"] == eq_loc else 0), axis=1
        )
        best_site = site_candidates.sort_values("score", ascending=False).iloc[0]
        allocations.append([eq_id, best_site["site_id"], f"Allocate to {best_site['location']} (score={best_site['score']})"])

    return pd.DataFrame(allocations, columns=["equipment_id","recommended_site_id","recommendation"])

# ---------------------------------
# 7) Rollback allocation
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
# 8) Alerts aggregator (NEW)
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
# Orchestrator
# ---------------------------------
def run_all(dfs: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
    return {
        "asset_dashboard": asset_dashboard(dfs),
        "usage_metrics": usage_metrics(dfs),
        "overdue_alerts": detect_overdue(dfs),
        "maintenance_alerts": maintenance_alerts(dfs),
        "anomalies": anomalies(dfs),
        "predictive_allocation": predictive_allocation(dfs),
        "rollback_with_allocation": rollback_with_allocation(dfs),
        "alerts": alerts(dfs)  # final aggregated alert feed
    }