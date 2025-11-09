#!/bin/bash

echo "Starting Vanna AI Service..."
echo ""

# Ensure script runs from its own directory
cd "$(dirname "$0")"
# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating..."
    python3 -m venv venv
    echo "Virtual environment created."
    echo ""
fi

# Activate virtual environment
source venv/bin/activate

# Check if requirements are installed
echo "Checking dependencies..."
if ! pip show fastapi > /dev/null 2>&1; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
    echo ""
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found!"
    echo "Please create a .env file with:"
    echo "  GROQ_API_KEY=your_groq_api_key"
    echo "  DATABASE_URL=mysql+pymysql://user:password@host:port/database"
    echo ""
    read -p "Press enter to continue anyway..."
fi

# Start the service
echo "Starting Vanna AI service on port 8000..."
echo ""
uvicorn app.main:app --reload --port 8000

