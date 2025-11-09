# Vanna AI Service - Environment Setup

## Step 1: Create .env file

Create a file named `.env` in `services/vanna/` with the following content:

```env
# Groq API Key (get from https://console.groq.com)
GROQ_API_KEY=your_groq_api_key_here

# Database URL (MySQL format)
# If password is empty:
DATABASE_URL=mysql+pymysql://root:@localhost:3306/flowbit_analytics

# If password is 'root', use:
# DATABASE_URL=mysql+pymysql://root:root@localhost:3306/flowbit_analytics

# Service Port
PORT=8000

# Allowed Origins
ALLOWED_ORIGINS=http://localhost:3000
```

## Step 2: Get Your Groq API Key

1. Go to https://console.groq.com
2. Sign up or log in
3. Create an API key
4. Copy the key and paste it in the `.env` file

## Step 3: Update Database URL

Replace the `DATABASE_URL` with your MySQL credentials:
- Username: usually `root`
- Password: your MySQL password (or empty if no password)
- Host: `localhost` or `127.0.0.1`
- Port: `3306` (default)
- Database: `flowbit_analytics`

## Quick Start

After creating the `.env` file, run:

```bash
cd services/vanna
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Or use the startup script:
```bash
cd services/vanna
start.bat
```

