import google.generativeai as genai
from fastapi import FastAPI, Body
import os
from dotenv import load_dotenv

from server import run_sql_tool

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="Gemini SQL Query API")
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
prompt = """
You are an SQL generation agent for an Equipment Rental database. 
Your output MUST ALWAYS be a single JSON object with exactly these keys:
- "sql": (string) the raw SQL query to answer the user question
- "reasoning": (string) a short explanation of how you derived the SQL

### Database Schema
1. EquipmentMaster(equipment_id TEXT PRIMARY KEY, type TEXT, qr_tag_id TEXT)
2. RentalTransactions(transaction_id INTEGER PK, equipment_id TEXT, site_id TEXT, check_out_date TEXT, check_in_date TEXT, expected_return_date TEXT, operator_id TEXT, purpose_job_type TEXT)
3. UsageMetrics(usage_id INTEGER PK, equipment_id TEXT, date TEXT, engine_hours_per_day REAL, idle_hours_per_day REAL, operating_days INTEGER, fuel_consumption_per_day REAL, location_coordinates TEXT, downtime_hours REAL)
4. MaintenanceHealth(record_id INTEGER PK, equipment_id TEXT, last_service_date TEXT, next_service_due TEXT, breakdowns_reported INTEGER, condition_status TEXT CHECK('Good','Needs Repair','Critical'), maintenance_costs REAL)
5. AlertsNotifications(alert_id INTEGER PK, equipment_id TEXT, overdue_status INTEGER CHECK(0,1), reminder_sent_date TEXT, alert_type TEXT)
6. FinancialData(financial_id INTEGER PK, equipment_id TEXT, rental_rate_per_day REAL, total_rental_cost REAL, penalty_cost REAL, fuel_cost REAL, maintenance_cost REAL)
7. AIFeatures(ai_id INTEGER PK, equipment_id TEXT, utilization_rate REAL, idle_ratio REAL, predicted_demand_score REAL, anomaly_flag INTEGER CHECK(0,1), recommended_site TEXT)

### Rules
- Output ONLY JSON, no markdown or extra text.
- The "sql" value must be valid SQLite syntax using the schema above.
- If multiple queries are needed, put them in the same string separated by semicolons.
- Use exact column and table names.

### Example
User: "find all ai_id from AIFeatures"
Output:
{"sql": "SELECT ai_id FROM AIFeatures;", "reasoning": "The question asks for all ai_id values from the AIFeatures table."}

User query: "{user_query}"
Provide ONLY the JSON object as described.
"""

def generate_sql_from_gemini(user_query: str) -> tuple[str, str]:
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt)
    text = response.text.strip()

    import json, re
    try:
        json_match = re.search(r"\{.*\}", text, re.S)
        if json_match:
            parsed = json.loads(json_match.group(0))
            return parsed.get("sql", ""), parsed.get("reasoning", "")
    except Exception as e:
        print("JSON parsing error:", e)
    return "SELECT 'No SQL parsed' as info;", text


@app.post("/query")
async def query_database(payload: dict = Body(...)):
    user_query = payload.get("query")
    if not user_query:
        return {"error": "Missing 'query' in request body"}

    # Step 1. Generate SQL + reasoning from Gemini
    sql_query, reasoning = generate_sql_from_gemini(user_query)

    # Step 2. Call your MCP tool directly
    mcp_result = await run_sql_tool({"sql": sql_query})
    db_output = mcp_result[0].text if mcp_result else "No output"
    print("DB Output:", db_output)
    return {
        "user_query": user_query,
        "sql_generated": sql_query,
        "model_reasoning": reasoning,
        "db_result": db_output
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)