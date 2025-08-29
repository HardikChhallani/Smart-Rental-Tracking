import google.generativeai as genai
from fastapi import FastAPI, Body
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from server import run_sql_tool

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="Smart Rental Equipment AI Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI Chat Analysis Prompt with Equipment Rental Theme
ai_analysis_prompt = """
You are an AI assistant for a Smart Rental Equipment Management System. Your role is to help users understand equipment rental data, maintenance schedules, and operational insights.

### System Theme: Smart Rental Equipment Management
- **Brand Voice**: Professional, helpful, and data-driven
- **Tone**: Friendly but authoritative, like a knowledgeable equipment manager
- **Style**: Clear, concise explanations with actionable insights
- **Context**: Construction, mining, and industrial equipment rental business

### Your Capabilities:
1. **Equipment Analysis**: Help users understand equipment performance, utilization, and health
2. **Rental Insights**: Provide insights on rental patterns, costs, and efficiency
3. **Maintenance Guidance**: Explain maintenance schedules and equipment conditions
4. **Financial Analysis**: Help understand rental costs, revenue, and profitability
5. **Operational Optimization**: Suggest ways to improve equipment utilization

### Response Guidelines:
- Always respond in natural, conversational English
- Use equipment rental terminology appropriately
- Provide actionable insights when possible
- Be encouraging and solution-oriented
- Keep responses concise but informative
- Use bullet points or numbered lists for multiple insights

### Example Response Style:
"Based on your equipment rental data, I can see that your excavator fleet is performing well with 85% utilization. However, I notice that EQ-207 has been flagged for maintenance. Here are my recommendations:
• Schedule maintenance for EQ-207 within the next 3 days
• Consider redistributing its current workload to EQ-101 and EQ-315
• This should help maintain your high utilization rates"

Now, please help the user with their equipment rental question: {user_query}

Provide a helpful, professional response that fits the Smart Rental Equipment Management theme.
"""

# Predefined user query → SQL mapping
user_query_map = {
    "Equipment with highest maintenance costs": {
        "sql": "SELECT equipment_id, maintenance_costs FROM MaintenanceHealth ORDER BY maintenance_costs DESC LIMIT 1;",
        "reasoning": "Return the equipment with highest recorded maintenance spending."
    },
    "Average rental duration per equipment type": {
        "sql": "SELECT T1.type, AVG(julianday(T2.check_in_date) - julianday(T2.check_out_date)) AS average_rental_duration_days FROM EquipmentMaster AS T1 JOIN RentalTransactions AS T2 ON T1.equipment_id = T2.equipment_id WHERE T2.check_in_date IS NOT NULL GROUP BY T1.type;",
        "reasoning": "Compute average rental duration for each equipment type."
    }
}

def generate_ai_response(user_query: str) -> str:
    """Generate AI-powered natural language response for equipment rental queries."""
    try:
        model = genai.GenerativeModel("gemini-2.5-pro")
        response = model.generate_content(ai_analysis_prompt.format(user_query=user_query))
        return response.text.strip()
    except Exception as e:
        return f"I apologize, but I'm experiencing technical difficulties with my AI analysis. Please try again or contact support if the issue persists. Error: {str(e)}"

def synthesize_nl_from_db_result(user_query: str, db_result: list[dict]) -> str:
    """Converts DB JSON result into themed natural language response."""
    if not db_result:
        return "I couldn't find any data matching your request. This might mean the equipment hasn't been used yet, or there might be an issue with the data. Please check your query or contact support for assistance."

    if user_query == "Equipment with highest maintenance costs":
        eq = db_result[0]
        return f"🔧 **Maintenance Cost Analysis**\n\nBased on your equipment maintenance records, **{eq['equipment_id']}** has the highest maintenance costs at **${eq['maintenance_costs']:,.2f}**.\n\n💡 **Recommendation**: Consider scheduling a detailed inspection of this equipment to identify the root cause of high maintenance costs. This could help optimize your maintenance strategy and reduce operational expenses."

    if user_query == "Average rental duration per equipment type":
        lines = []
        for item in db_result:
            duration = item['average_rental_duration_days']
            if duration < 1:
                duration_text = f"{duration:.1f} days"
            else:
                duration_text = f"{duration:.1f} days"
            lines.append(f"• **{item['type']}**: {duration_text}")
        
        return f"📊 **Rental Duration Analysis**\n\nHere's the average rental duration for each equipment type:\n\n" + "\n".join(lines) + "\n\n💡 **Insight**: This data helps optimize your rental pricing and equipment allocation strategies."

    # Default: themed response
    return f"📋 **Data Summary**\n\nHere's what I found for your query:\n\n{str(db_result)}\n\n💡 **Note**: This is raw data from your equipment management system. Let me know if you'd like me to analyze specific aspects or provide actionable insights!"

@app.post("/query")
async def query_database(payload: dict = Body(...)):
    user_query = payload.get("query")
    if not user_query:
        return {"output": "I need a query to help you with your equipment rental analysis. Please provide a question about your equipment, rentals, maintenance, or operations."}

    # Check if query matches predefined queries
    mapping = user_query_map.get(user_query)
    if mapping:
        # Use predefined SQL and database
        sql_query = mapping["sql"]
        try:
            mcp_result = await run_sql_tool({"sql": sql_query})
            db_output = mcp_result[0].json() if mcp_result else []
            nl_output = synthesize_nl_from_db_result(user_query, db_output)
            return {"output": nl_output}
        except Exception as e:
            return {"output": f"I encountered an error while accessing your equipment database: {str(e)}. Please try again or contact technical support."}
    
    # If no predefined match, use AI analysis
    ai_response = generate_ai_response(user_query)
    return {"output": ai_response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)
