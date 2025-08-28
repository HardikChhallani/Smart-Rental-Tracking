import sqlite3
import random
from datetime import datetime, timedelta
from fastapi import FastAPI

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
DB_FILE = "/Users/hardikchhallani/PycharmProjects/Smart-Rental-Tracking/dataset_preparation/equipment_management.db"

# ---- Helper functions to generate random data ----
def random_date(start, end):
    """Return a random datetime between `start` and `end`."""
    delta = end - start
    random_days = random.randrange(delta.days)
    return start + timedelta(days=random_days)

def simulate_data():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Equipment Master Data
    cursor.execute("SELECT Equipment_ID FROM EquipmentMaster ORDER BY RANDOM() LIMIT 1")
    equipment_id = cursor.fetchone()[0]

    # Rental/Transaction Data
    site_id = random.randint(100, 200)
    check_out = datetime.now() - timedelta(days=random.randint(1, 10))
    expected_return = check_out + timedelta(days=random.randint(1, 5))
    check_in = check_out + timedelta(days=random.randint(0, 5))
    operator_id = random.randint(1, 50)
    job_type = random.choice(["Drilling", "Earthmoving", "Lifting", "Transport", "Loading"])

    # Usage Metrics
    engine_hours = round(random.uniform(1, 10), 2)
    idle_hours = round(random.uniform(0, 4), 2)
    operating_days = random.randint(1, 10)
    fuel_consumption = round(random.uniform(5, 20), 2)
    gps_lat = round(random.uniform(-90, 90), 6)
    gps_long = round(random.uniform(-180, 180), 6)
    downtime_hours = round(random.uniform(0, 2), 2)

    # Maintenance & Health Data
    last_service = datetime.now() - timedelta(days=random.randint(5, 60))
    next_service = last_service + timedelta(days=random.randint(10, 30))
    breakdowns = random.randint(0, 2)
    condition_status = random.choice(["Good", "Needs Repair", "Critical"])
    maintenance_cost = round(random.uniform(100, 1000), 2)

    # Alerts & Notifications
    overdue = random.choice(["Yes", "No"])
    reminder_sent = random.choice(["Yes", "No"])
    reminder_date = datetime.now() if reminder_sent == "Yes" else None
    alert_type = random.choice(["Overdue", "Misuse", "Low Fuel", "Service Due", "None"])

    # Financial Data
    rental_rate = round(random.uniform(200, 1000), 2)
    total_rental_cost = round(rental_rate * operating_days, 2)
    penalty_cost = round(random.uniform(0, 200), 2)
    fuel_cost = round(fuel_consumption * 10, 2)
    maintenance_cost_final = maintenance_cost

    # AI/Automation Features
    utilization_rate = round(engine_hours / operating_days, 2) if operating_days else 0
    idle_ratio = round(idle_hours / (engine_hours + idle_hours), 2) if (engine_hours + idle_hours) > 0 else 0
    predicted_demand_score = round(random.uniform(0, 1), 2)
    anomaly_flag = random.choice(["Yes", "No"])
    recommended_site = random.randint(100, 200)

    conn.close()

    return {
        "equipment_id": equipment_id,
        "rental_transaction": {
            "site_id": site_id,
            "check_out_date": check_out.isoformat(),
            "check_in_date": check_in.isoformat(),
            "expected_return_date": expected_return.isoformat(),
            "operator_id": operator_id,
            "job_type": job_type
        },
        "usage_metrics": {
            "engine_hours_per_day": engine_hours,
            "idle_hours_per_day": idle_hours,
            "operating_days": operating_days,
            "fuel_consumption_per_day": fuel_consumption,
            "location_coordinates": {"lat": gps_lat, "long": gps_long},
            "downtime_hours": downtime_hours
        },
        "maintenance_health": {
            "last_service_date": last_service.isoformat(),
            "next_service_due": next_service.isoformat(),
            "breakdowns_reported": breakdowns,
            "condition_status": condition_status,
            "maintenance_costs": maintenance_cost
        },
        "alerts_notifications": {
            "overdue_status": overdue,
            "reminder_sent": reminder_sent,
            "reminder_date": reminder_date.isoformat() if reminder_date else None,
            "alert_type": alert_type
        },
        "financial_data": {
            "rental_rate_per_day": rental_rate,
            "total_rental_cost": total_rental_cost,
            "penalty_cost": penalty_cost,
            "fuel_cost": fuel_cost,
            "maintenance_cost": maintenance_cost_final
        },
        "ai_automation": {
            "utilization_rate": utilization_rate,
            "idle_ratio": idle_ratio,
            "predicted_demand_score": predicted_demand_score,
            "anomaly_flag": anomaly_flag,
            "recommended_site": recommended_site
        }
    }


@app.get("/simulate")
def simulate():
    """Simulate and return full random dataset."""
    data = simulate_data()
    return data

if __name__ == "__main__":
    import  uvicorn
    uvicorn.run(app,port=8082)
