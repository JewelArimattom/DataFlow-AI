from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import socket
import time
import re
from urllib.parse import urlparse
from dotenv import load_dotenv
from app.vanna_config import get_vanna_instance

load_dotenv()

app = FastAPI(title="Vanna AI Service", version="1.0.0")


def format_sql_error(error_msg: str, sql: str) -> str:
    """
    Transform technical SQL errors into human-friendly messages.
    
    Args:
        error_msg: The raw error message from the database
        sql: The SQL query that caused the error
    
    Returns:
        A friendly, actionable error message
    """
    error_lower = error_msg.lower()
    
    # Column does not exist
    if "column" in error_lower and ("does not exist" in error_lower or "not found" in error_lower or "undefinedcolumn" in error_lower):
        # Extract column name from error
        match = re.search(r"column ['\"]?(\w+\.)?(\w+)['\"]? does not exist", error_msg, re.IGNORECASE)
        if match:
            col_name = match.group(2)
            return (
                f"I tried to use a column called '{col_name}' but it doesn't exist in the database. "
                f"This might be a typo or the column might have a different name. "
                f"Could you rephrase your question or check the available columns?"
            )
        return (
            "I tried to access a column that doesn't exist in the database. "
            "This might be a typo or the column name might be different. "
            "Try rephrasing your question or asking about available columns first."
        )
    
    # Table does not exist
    if "table" in error_lower and ("does not exist" in error_lower or "not found" in error_lower):
        match = re.search(r"table ['\"]?(\w+\.)?(\w+)['\"]?", error_msg, re.IGNORECASE)
        if match:
            table_name = match.group(2)
            return (
                f"I tried to query a table called '{table_name}' but it doesn't exist in the database. "
                f"The table name might be spelled differently. "
                f"Available tables include: invoices, vendors, customers, line_items, and payments."
            )
        return (
            "I tried to access a table that doesn't exist in the database. "
            "Available tables: invoices, vendors, customers, line_items, payments."
        )
    
    # Syntax error
    if "syntax error" in error_lower or "syntaxerror" in error_lower:
        return (
            "I generated SQL with a syntax error. This usually happens when the question is ambiguous "
            "or uses terms that are hard to translate to SQL. Could you try rephrasing your question more simply?"
        )
    
    # Ambiguous column reference
    if "ambiguous" in error_lower:
        return (
            "I generated a query that references a column name that exists in multiple tables. "
            "Try being more specific about which table you want to query, or simplify your question."
        )
    
    # Permission denied
    if "permission denied" in error_lower or "access denied" in error_lower:
        return (
            "I don't have permission to access that data. This might be a database permissions issue. "
            "Please contact your administrator if you need access to this information."
        )
    
    # Division by zero
    if "division by zero" in error_lower or "divide by zero" in error_lower:
        return (
            "The calculation resulted in a division by zero. This can happen when filtering returns no results "
            "or when computing averages/percentages with empty datasets. Try adjusting your filters."
        )
    
    # Type mismatch
    if "type" in error_lower and ("mismatch" in error_lower or "cannot" in error_lower or "invalid" in error_lower):
        return (
            "I tried to compare or combine values of different types (like comparing text to numbers). "
            "This usually means the question needs to be rephrased or the data types are unexpected."
        )
    
    # Aggregate function error
    if any(func in error_lower for func in ["sum", "avg", "count", "min", "max"]) and ("group by" in error_lower or "aggregate" in error_lower):
        return (
            "There's an issue with how I'm grouping or aggregating the data. "
            "Try simplifying your question or asking for one metric at a time."
        )
    
    # Connection/timeout errors
    if any(word in error_lower for word in ["timeout", "connection", "network", "connect"]):
        return (
            "I couldn't connect to the database or the query took too long to execute. "
            "The database might be busy or temporarily unavailable. Please try again in a moment."
        )
    
    # Foreign key constraint
    if "foreign key" in error_lower or "constraint" in error_lower:
        return (
            "There's a data relationship issue preventing this operation. "
            "This usually happens when trying to reference data that doesn't exist or violates database rules."
        )
    
    # Generic fallback with helpful context
    # Extract first meaningful line of error
    lines = error_msg.split('\n')
    first_line = next((line.strip() for line in lines if line.strip() and not line.strip().startswith('(')), error_msg)[:200]
    
    return (
        f"I encountered an issue while running the query: {first_line}\n\n"
        f"This might mean:\n"
        f"• The question needs to be rephrased more clearly\n"
        f"• The data I'm trying to access has a different structure\n"
        f"• There's a temporary database issue\n\n"
        f"Try asking your question in a different way, or ask me to 'list available tables' or 'show table structure' first."
    )


# CORS configuration
origins = [
    "http://localhost:3000",
    "https://*.vercel.app",
    os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [],
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, use specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    sql: str
    data: list
    chartType: str | None = None
    # A short, human-friendly message describing the results (chat-style)
    message: str | None = None


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/diag-db")
async def diag_db():
    """Diagnostic endpoint: attempt a TCP connect to the configured DATABASE_URL host:port

    Useful for deploying to Render and confirming whether the host can reach the DB.
    Returns JSON with ok:true on success and ok:false with error on failure.
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return {"ok": False, "error": "DATABASE_URL not set in environment"}

    # Accept mysql:// or mysql+pymysql:// formats
    try:
        # Strip SQLAlchemy prefix if present
        normalized = db_url
        if normalized.startswith("mysql+pymysql://"):
            normalized = normalized.replace("mysql+pymysql://", "mysql://", 1)

        parsed = urlparse(normalized)
        host = parsed.hostname or ""
        port = parsed.port or 3306
    except Exception as e:
        return {"ok": False, "error": f"Failed to parse DATABASE_URL: {e}", "raw": db_url}

    try:
        start = time.time()
        s = socket.create_connection((host, port), timeout=6)
        # Try to read a small greeting (MySQL server handshake) if any
        greeting = None
        try:
            s.settimeout(2.0)
            data = s.recv(512)
            if data:
                try:
                    greeting = data.decode('utf-8', errors='replace')
                except Exception:
                    greeting = str(data[:200])
        except Exception:
            # ignore read errors
            greeting = None
        s.close()
        latency_ms = int((time.time() - start) * 1000)
        return {"ok": True, "host": host, "port": port, "latency_ms": latency_ms, "greeting": greeting[:200] if greeting else None}
    except Exception as e:
        return {"ok": False, "host": host, "port": port, "error": str(e)}


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    import traceback
    try:
        print(f"Received query: {request.question}")
        
        # Get Vanna instance
        try:
            vanna = get_vanna_instance()
            print("Vanna instance obtained successfully")
        except Exception as init_error:
            error_msg = f"Failed to initialize Vanna: {str(init_error)}"
            print(error_msg)
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Generate SQL from natural language
        try:
            # Try different Vanna API methods
            if hasattr(vanna, 'generate_sql'):
                sql = vanna.generate_sql(question=request.question)
            elif hasattr(vanna, 'ask'):
                sql = vanna.ask(request.question)
            else:
                # Fallback: try calling it directly
                sql = vanna(request.question)
            print(f"Generated SQL: {sql}")
        except Exception as sql_error:
            error_msg = f"Failed to generate SQL: {str(sql_error)}"
            print(error_msg)
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Execute SQL and get results
        try:
            if hasattr(vanna, 'run_sql'):
                results = vanna.run_sql(sql=sql)
            elif hasattr(vanna, 'run'):
                results = vanna.run(sql)
            else:
                # Fallback: execute directly using database connection
                from sqlalchemy import create_engine, text
                database_url = os.getenv("DATABASE_URL")
                if database_url.startswith("mysql://"):
                    database_url = database_url.replace("mysql://", "mysql+pymysql://", 1)
                engine = create_engine(database_url)
                with engine.connect() as conn:
                    result = conn.execute(text(sql))
                    results = [dict(row._mapping) for row in result]
            print(f"Query executed, got {len(results) if results else 0} results")
        except Exception as exec_error:
            error_msg = str(exec_error)
            print(f"SQL execution error: {error_msg}")
            print(traceback.format_exc())
            
            # Make the error message human-friendly
            friendly_msg = format_sql_error(error_msg, sql)
            raise HTTPException(status_code=500, detail=friendly_msg)
        
        # Convert results to list of dicts
        if results and len(results) > 0:
            if isinstance(results[0], dict):
                data = results
            elif isinstance(results[0], tuple) or isinstance(results[0], list):
                # If results are tuples/lists, try to get column names
                try:
                    # Try to get column names from result object
                    if hasattr(results, 'keys'):
                        columns = list(results.keys())
                        data = [dict(zip(columns, row)) for row in results]
                    else:
                        # Fallback: use generic column names
                        num_cols = len(results[0]) if results else 0
                        columns = [f"column_{i+1}" for i in range(num_cols)]
                        data = [dict(zip(columns, row)) for row in results]
                except:
                    data = [{"result": str(row)} for row in results]
            else:
                data = [{"result": str(row)} for row in results]
        else:
            data = []
        
        # Simple chart type detection
        chart_type = None
        if len(data) > 0 and len(data) <= 20:
            if any(key in str(data[0]).lower() for key in ['date', 'time', 'month']):
                chart_type = "line"
            elif len(data) <= 10:
                chart_type = "bar"
        
        # Build a short human-friendly message summarizing the results
        if not data:
            message = "I ran the generated SQL but didn't find any matching rows. You can try rephrasing your question or broadening the filters."
        else:
            # columns present in the first row
            cols = list(data[0].keys()) if isinstance(data[0], dict) else []
            # create a concise sample row for display
            sample = None
            try:
                sample = {k: (str(v) if v is not None else "") for k, v in list(data[0].items())[:5]}
            except Exception:
                sample = str(data[0])

            message = (
                f"I ran the SQL and found {len(data)} row{'s' if len(data) != 1 else ''}. "
                f"Columns returned: {', '.join(cols[:8]) + (', ...' if len(cols) > 8 else '')}. "
                f"Here's a sample row: {sample}"
            )

        return QueryResponse(sql=sql, data=data, chartType=chart_type, message=message)
    
    except HTTPException:
        raise
    except Exception as e:
        error_detail = f"Error processing query: {str(e)}"
        print(error_detail)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))

