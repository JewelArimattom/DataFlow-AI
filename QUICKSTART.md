# Quick Start Guide

Follow these steps to run the Flowbit Analytics Dashboard locally.

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ (`node --version`)
- ✅ Python 3.10+ (`python --version`)
- ✅ PostgreSQL 14+ installed and running
- ✅ Groq API key (get from https://console.groq.com)

## Step 1: Install Dependencies

### Frontend Dependencies
```bash
# From root directory
npm install

# Navigate to web app
cd apps/web
npm install
```

### Backend Dependencies (Vanna AI Service)
```bash
# Navigate to vanna service
cd services/vanna

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt
```

## Step 2: Set Up Database

1. **Create PostgreSQL database:**
   ```sql
   CREATE DATABASE flowbit_analytics;
   ```

2. **Note your connection string:**
   ```
   postgresql://username:password@localhost:5432/flowbit_analytics
   ```

## Step 3: Configure Environment Variables

### Frontend Configuration

Create `apps/web/.env.local`:
```bash
cd apps/web
# Copy the example file (if it exists) or create new
```

Add these variables:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/flowbit_analytics?schema=public"
NEXT_PUBLIC_API_BASE=/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
VANNA_API_BASE_URL=http://localhost:8000
```

### Vanna AI Service Configuration

Create `services/vanna/.env`:
```bash
cd services/vanna
# Create .env file
```

Add these variables:
```env
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/flowbit_analytics
GROQ_API_KEY=your_groq_api_key_here
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
```

**Important:** Replace:
- `username` and `password` with your PostgreSQL credentials
- `your_groq_api_key_here` with your actual Groq API key

## Step 4: Set Up Database Schema

```bash
cd apps/web

# Generate Prisma Client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init
```

## Step 5: Add Your Data

1. **Place your data file:**
   - Copy `Analytics_Test_Data.json` to the `/data` directory at the root
   - The file should be at: `data/Analytics_Test_Data.json`

2. **Seed the database:**
   ```bash
   cd apps/web
   npx prisma db seed
   ```

   You should see output like:
   ```
   Starting seed...
   Found X invoices to process
   Created Y vendors
   Created Z customers
   Seed completed!
   ```

## Step 6: Run the Application

You need **two terminal windows** running simultaneously:

### Terminal 1: Frontend + Backend (Next.js)

```bash
# From root directory
npm run dev
```

Or if that doesn't work:
```bash
cd apps/web
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

### Terminal 2: Vanna AI Service (Python)

```bash
cd services/vanna

# Activate virtual environment (if not already active)
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Start the service
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

## Step 7: Access the Application

1. **Open your browser** and go to: http://localhost:3000

2. **You should see:**
   - Dashboard with overview cards
   - Charts showing your data
   - Invoices table
   - Sidebar with "Dashboard" and "Chat with Data" tabs

3. **Test the Chat feature:**
   - Click on "Chat with Data" in the sidebar
   - Try asking: "What's the total spend?"
   - You should see SQL generated and results displayed

## Troubleshooting

### Database Connection Error

**Error:** `Can't reach database server`

**Solution:**
1. Check PostgreSQL is running:
   ```bash
   # On Mac/Linux
   pg_isready
   
   # On Windows (PowerShell)
   Get-Service postgresql*
   ```

2. Verify connection string in `.env.local` is correct
3. Ensure database exists: `psql -l` (should list `flowbit_analytics`)

### Vanna Service Not Starting

**Error:** `ModuleNotFoundError` or import errors

**Solution:**
1. Ensure virtual environment is activated (you should see `(venv)` in terminal)
2. Reinstall dependencies: `pip install -r requirements.txt`
3. Check Python version: `python --version` (should be 3.10+)

### Frontend Build Errors

**Error:** TypeScript or build errors

**Solution:**
1. Clear Next.js cache:
   ```bash
   cd apps/web
   rm -rf .next
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. Regenerate Prisma Client:
   ```bash
   npx prisma generate
   ```

### No Data Showing

**Error:** Dashboard shows zeros or empty charts

**Solution:**
1. Verify data file exists: `data/Analytics_Test_Data.json`
2. Check seed ran successfully (look for "Seed completed!" message)
3. Verify data in database:
   ```bash
   psql -d flowbit_analytics -c "SELECT COUNT(*) FROM invoices;"
   ```
   Should return a number > 0

### Vanna AI Not Responding

**Error:** Chat queries fail or timeout

**Solution:**
1. Check Vanna service is running on port 8000
2. Test health endpoint: http://localhost:8000/health
   - Should return: `{"status":"healthy"}`
3. Verify `GROQ_API_KEY` is set correctly in `services/vanna/.env`
4. Check `VANNA_API_BASE_URL` in `apps/web/.env.local` matches service URL

## Common Commands Reference

```bash
# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run linter

# Database
npx prisma generate  # Generate Prisma Client
npx prisma migrate dev  # Create and apply migration
npx prisma db seed   # Seed database with data
npx prisma studio    # Open database GUI

# Vanna Service
uvicorn app.main:app --reload --port 8000  # Start service
```

## Next Steps

Once everything is running:
1. ✅ Explore the dashboard
2. ✅ Try different chart views
3. ✅ Test the Chat with Data feature
4. ✅ Review the API documentation in README.md
5. ✅ Check deployment guide (DEPLOYMENT.md) when ready to deploy

## Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Review [SETUP.md](./SETUP.md) for more setup details
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions

