@echo off
echo Starting Vanna AI Service...
echo.
REM Ensure script runs from its own directory
cd /d %~dp0

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Virtual environment not found. Creating...
    python -m venv venv
    echo Virtual environment created.
    echo.
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if requirements are installed
echo Checking dependencies...
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
    echo.
)

REM Check for .env file
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please create a .env file with:
    echo   GROQ_API_KEY=your_groq_api_key
    echo   DATABASE_URL=mysql+pymysql://user:password@host:port/database
    echo.
    pause
)

REM Start the service
echo Starting Vanna AI service on port 8000...
echo.
uvicorn app.main:app --reload --port 8000

