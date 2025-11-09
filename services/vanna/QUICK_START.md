# Quick Start - Vanna AI Service

## Step 1: Create .env File

Create a file named `.env` in `services/vanna/` directory with:

```env
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=mysql+pymysql://root:@localhost:3306/flowbit_analytics
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
```

**Important:**
- Replace `your_groq_api_key_here` with your actual Groq API key from https://console.groq.com
- Update `DATABASE_URL` with your MySQL credentials:
  - If password is empty: `mysql+pymysql://root:@localhost:3306/flowbit_analytics`
  - If password is 'root': `mysql+pymysql://root:root@localhost:3306/flowbit_analytics`

## Step 2: Install Dependencies

Open PowerShell or Command Prompt in `services/vanna/`:

```powershell
# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies (retry if it times out)
pip install -r requirements.txt
```

If installation times out, try:
```powershell
pip install -r requirements.txt --timeout 60
```

Or install packages one by one:
```powershell
pip install fastapi uvicorn[standard] vanna pymysql python-dotenv pydantic python-multipart sqlalchemy
```

## Step 3: Start the Service

```powershell
# Make sure virtual environment is activated
.\venv\Scripts\activate

# Start the service
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

## Step 4: Test the Service

Open a new terminal and test:
```powershell
curl http://localhost:8000/health
```

Should return: `{"status":"healthy"}`

## Troubleshooting

### "GROQ_API_KEY environment variable is required"
- Make sure `.env` file exists in `services/vanna/`
- Check that `GROQ_API_KEY` is set in the file

### "DATABASE_URL environment variable is required"
- Make sure `DATABASE_URL` is set in `.env`
- Verify MySQL connection string format

### Installation Timeout
- Check your internet connection
- Try installing with longer timeout: `pip install -r requirements.txt --timeout 120`
- Or install packages individually

### Port Already in Use
- Change port in `.env`: `PORT=8001`
- Or stop the service using port 8000

