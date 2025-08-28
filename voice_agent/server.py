import asyncio
import sqlite3
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from typing import Any, Sequence

DB_PATH = "/Users/hardikchhallani/PycharmProjects/Smart-Rental-Tracking/dataset_preparation/equipment_management.db"

server = Server(name="sqlite-query-server")


@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools."""
    return [
        Tool(
            name="run_sql",
            description="Run an SQL query against the SQLite database and return results.",
            inputSchema={
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "The SQL query to run."
                    }
                },
                "required": ["sql"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> Sequence[TextContent]:
    """Handle tool calls."""
    if name == "run_sql":
        return await run_sql_tool(arguments)
    else:
        raise ValueError(f"Unknown tool: {name}")


async def run_sql_tool(arguments: dict) -> Sequence[TextContent]:
    """Execute SQL query and return results."""
    sql_query = arguments["sql"]
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(sql_query)
        rows = cur.fetchall()
        conn.commit()
        conn.close()

        results = [dict(row) for row in rows]
        return [TextContent(type="text", text=str(results))]

    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]


async def main():
    # MCP servers communicate via stdin/stdout
    import sys
    from mcp.server.stdio import stdio_server

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())