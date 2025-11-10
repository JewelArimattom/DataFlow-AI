from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import socket
import time
from urllib.parse import urlparse
from dotenv import load_dotenv
from app.vanna_config import get_vanna_instance

load_dotenv()

app = FastAPI(title="Vanna AI Service", version="1.0.0")

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
            error_msg = f"Failed to execute SQL: {str(exec_error)}"
            print(error_msg)
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=error_msg)
        
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

