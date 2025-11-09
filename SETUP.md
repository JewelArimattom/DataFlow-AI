# Quick Setup Guide

Follow these steps to get the Flowbit Analytics Dashboard running locally.

## Prerequisites

- Node.js 18+ installed
- Python 3.10+ installed
- PostgreSQL 14+ installed and running
- Groq API key (get from https://console.groq.com)

## Step 1: Database Setup

1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE flowbit_analytics;
   ```

2. Note your connection string:
   ```
   postgresql://username:password@localhost:5432/flowbit_analytics
   ```

## Step 2: Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   cd apps/web
   npm install
   ```

2. Create environment file:
   ```bash
   cd apps/web
   cp .env.example .env.local
   ```

3. Edit `apps/web/.env.local`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/flowbit_analytics?schema=public"
   NEXT_PUBLIC_API_BASE=/api
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   VANNA_API_BASE_URL=http://localhost:8000
   ```

4. Set up database:
   ```bash
   cd apps/web
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. Add your data file:
   - Place `Analytics_Test_Data.json` in the `/data` directory at the root
   - Run seed: `npx prisma db seed`

## Step 3: Vanna AI Service Setup

1. Navigate to service directory:
   ```bash
   cd services/vanna
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create environment file:
   ```bash
   cp .env.example .env
   ```

5. Edit `services/vanna/.env`:
   ```env
   DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/flowbit_analytics
   GROQ_API_KEY=your_groq_api_key_here
   PORT=8000
   ALLOWED_ORIGINS=http://localhost:3000
   ```

## Step 4: Run Services

### Terminal 1: Frontend + Backend
```bash
# From root directory
npm run dev
```

### Terminal 2: Vanna AI Service
```bash
cd services/vanna
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload --port 8000
```

## Step 5: Access Application

Open http://localhost:3000 in your browser.

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running: `pg_isready`
- Check connection string in `.env.local`
- Ensure database exists

### Vanna Service Not Starting
- Check Python version: `python --version` (should be 3.10+)
- Verify virtual environment is activated
- Check `GROQ_API_KEY` is set correctly

### Frontend Build Errors
- Clear cache: `rm -rf apps/web/.next`
- Reinstall: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (should be 18+)

### Data Not Loading
- Verify `Analytics_Test_Data.json` is in `/data` directory
- Check seed script ran successfully
- Verify database has data: `psql -d flowbit_analytics -c "SELECT COUNT(*) FROM invoices;"`

