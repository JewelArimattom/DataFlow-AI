import os
import re
import traceback
from sqlalchemy import create_engine, text, inspect
from groq import Groq

_vanna_instance = None
_database_engine = None

class SelfHostedVanna:
    """
    Self-hosted Vanna AI implementation using Groq for SQL generation
    """
    def __init__(self, groq_api_key: str, database_url: str):
        self.groq_client = Groq(api_key=groq_api_key)
        self.database_url = database_url
        self.engine = create_engine(database_url)
        
        # Get database schema for context
        self.schema_info = self._get_schema_info()
    
    def _get_schema_info(self):
        """Get database schema information for context"""
        try:
            inspector = inspect(self.engine)
            tables = inspector.get_table_names()
            schema = {}
            
            for table in tables:
                columns = inspector.get_columns(table)
                schema[table] = [col['name'] for col in columns]
            
            return schema
        except Exception as e:
            print(f"Warning: Could not get schema info: {e}")
            return {}
    
    def generate_sql(self, question: str) -> str:
        """Generate SQL from natural language question using Groq"""
        # Build schema context
        schema_context = "Database Schema:\n"
        for table, columns in self.schema_info.items():
            schema_context += f"- {table}({', '.join(columns)})\n"
        
        # Create prompt for Groq
        prompt = f"""You are a SQL expert. Given the following database schema and a natural language question, generate a valid MySQL SQL query.

{schema_context}

Question: {question}

Generate only the SQL query, no explanations. Return valid MySQL syntax.

SQL Query:"""
        
        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile", 
                messages=[
                    {
                        "role": "system",
                        "content": "You are a SQL expert. Generate valid MySQL queries based on natural language questions."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=500,
                timeout=60.0  # 60 second timeout for the 70B model
            )
            
            sql = response.choices[0].message.content.strip()
            
            # Clean up SQL (remove markdown code blocks if present)
            if sql.startswith("```"):
                sql = sql.split("```")[1]
                if sql.startswith("sql"):
                    sql = sql[3:]
                sql = sql.strip()
            
            return sql
        except Exception as e:
            raise Exception(f"Failed to generate SQL with Groq: {str(e)}")
    
    def run_sql(self, sql: str, keep_columns: list | None = None):
        """Execute SQL query and return results.

        By default this method will try to avoid returning huge/binary
        columns that are not useful for tabular display (PDFs, blobs,
        attachments, large text). You can provide an explicit
        `keep_columns` list to return only certain columns.
        """
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(sql))
                rows = result.fetchall()

                # No rows -> empty result
                if not rows:
                    return []

                columns = list(result.keys())

                # If caller requests explicit columns, honor that (only keep existing ones)
                if keep_columns:
                    cols_to_return = [c for c in keep_columns if c in columns]
                else:
                    # Heuristics: drop columns that look like binary/attachments or are very large
                    exclude_pattern = re.compile(r"blob|binary|file|attachment|pdf|document|image|base64|content", re.I)
                    cols_to_return = [c for c in columns if not exclude_pattern.search(c)]

                results: list[dict] = []
                for row in rows:
                    row_map = dict(zip(columns, row))
                    filtered: dict = {}
                    for col in cols_to_return:
                        val = row_map.get(col)
                        # Represent bytes/binary succinctly
                        if isinstance(val, (bytes, bytearray)):
                            filtered[col] = "<binary data>"
                            continue
                        # Truncate excessively long strings for display
                        if isinstance(val, str) and len(val) > 200:
                            filtered[col] = val[:200] + "..."
                            continue
                        filtered[col] = val
                    results.append(filtered)

                return results
        except Exception as e:
            raise Exception(f"Failed to execute SQL: {str(e)}")


def get_vanna_instance():
    """
    Initialize and return self-hosted Vanna AI instance with Groq
    """
    global _vanna_instance, _database_engine
    
    if _vanna_instance is not None:
        return _vanna_instance
    
    # Get API key from environment
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY environment variable is required. Please set it in your .env file.")
    
    # Get database connection string
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required. Please set it in your .env file.")
    
    # Convert mysql:// to mysql+pymysql:// or postgresql:// to postgresql+psycopg:// for SQLAlchemy if needed
    if database_url.startswith("mysql://"):
        database_url = database_url.replace("mysql://", "mysql+pymysql://", 1)
    elif database_url.startswith("postgresql://") and "+psycopg" not in database_url:
        # PostgreSQL driver is usually handled automatically by SQLAlchemy, but we can be explicit
        # If you have psycopg2 installed, SQLAlchemy will use it by default
        pass  # Keep as-is; SQLAlchemy will pick the correct driver
    
    print(f"Initializing self-hosted Vanna AI with Groq...")
    print(f"Database URL: {database_url[:30]}...")  # Don't print full URL for security
    
    try:
        # Use our custom self-hosted implementation
        _vanna_instance = SelfHostedVanna(
            groq_api_key=groq_api_key,
            database_url=database_url
        )
        print("Self-hosted Vanna AI initialized successfully!")
        return _vanna_instance
    except Exception as e:
        error_msg = f"Failed to initialize self-hosted Vanna AI: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        raise ValueError(
            f"{error_msg}\n\n"
            f"Please check:\n"
            f"1. GROQ_API_KEY is valid (get from https://console.groq.com)\n"
            f"2. DATABASE_URL is correct and accessible\n"
            f"3. All dependencies are installed: pip install -r requirements.txt\n"
            f"4. groq package is installed: pip install groq"
        )

