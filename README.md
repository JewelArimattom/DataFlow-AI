# Flowbit Analytics Dashboard

A production-grade full-stack web application with an Interactive Analytics Dashboard and "Chat with Data" interface powered by Vanna AI.

## Project Structure

```
/
├── apps/
│   └── web/              # Next.js frontend + API routes
│       ├── app/          # Next.js App Router
│       ├── components/   # React components
│       ├── lib/          # Utilities and Prisma client
│       └── prisma/       # Database schema and migrations
├── services/
│   └── vanna/           # Python FastAPI Vanna AI service
│       └── app/         # FastAPI application
├── packages/
│   └── shared/          # Shared types and utilities
└── data/
    └── Analytics_Test_Data.json
```

## Features

- 📊 **Interactive Analytics Dashboard** - Real-time visualizations of invoice data, vendor spend, and cash flow forecasts
- 💬 **Chat with Data** - Natural language queries powered by Vanna AI to explore your data
- 📝 **Persistent Chat History** - All chat conversations are saved and can be retrieved anytime
- 📤 **CSV / Excel Export** - Export invoice data and reports to CSV or Excel formats
- 🔍 **Advanced Filtering & Search** - Multi-criteria filtering across invoices, vendors, and dates
- 📈 **Dynamic Charts** - Interactive charts with sparklines, trends, and comparisons
- 🌐 **Responsive Design** - Optimized for desktop, tablet, and mobile devices

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI**: shadcn/ui + TailwindCSS
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js (TypeScript)
- **Framework**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma

### AI Service
- **Framework**: FastAPI (Python)
- **AI**: Vanna AI with Groq LLM
- **Database**: PostgreSQL (shared)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- npm or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd apps/web
   npm install
   ```

3. Set up environment variables:
   - Copy `apps/web/.env.example` to `apps/web/.env.local`
   - Copy `services/vanna/.env.example` to `services/vanna/.env`
   - Update with your database URL and API keys

4. Set up the database:
   ```bash
   cd apps/web
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   ```
   
   **Note**: Make sure `Analytics_Test_Data.json` is placed in the `/data` directory at the root.

5. Start development servers:
   ```bash
   # Frontend + Backend (from root)
   npm run dev

   # Vanna AI Service (in separate terminal)
   cd services/vanna
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

### Frontend (`apps/web/.env.local`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/flowbit_analytics?schema=public"
NEXT_PUBLIC_API_BASE=/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
VANNA_API_BASE_URL=http://localhost:8000
```

### Vanna AI Service (`services/vanna/.env`)
```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/flowbit_analytics
GROQ_API_KEY=your_groq_api_key_here
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
```

## API Documentation

### Overview Statistics
**GET** `/api/stats`

Returns overview statistics for the dashboard cards.

**Response:**
```json
{
  "totalSpend": 1234567.89,
  "totalInvoices": 150,
  "documentsUploaded": 150,
  "averageInvoiceValue": 8230.45
}
```

### Invoice Trends
**GET** `/api/invoice-trends`

Returns monthly invoice count and total spend.

**Response:**
```json
[
  {
    "month": "2024-01",
    "count": 25,
    "total": 205000.00
  }
]
```

### Top Vendors
**GET** `/api/vendors/top10`

Returns top 10 vendors by total spend.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Vendor Name",
    "totalSpend": 50000.00
  }
]
```

### Category Spend
**GET** `/api/category-spend`

Returns spend grouped by category.

**Response:**
```json
[
  {
    "category": "Office Supplies",
    "total": 25000.00
  }
]
```

### Cash Outflow Forecast
**GET** `/api/cash-outflow?startDate=2024-01-01&endDate=2024-03-31`

Returns expected cash outflow by date range.

**Query Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Response:**
```json
[
  {
    "date": "2024-01-15",
    "amount": 10000.00
  }
]
```

### Invoices List
**GET** `/api/invoices?page=1&limit=10&search=invoice&sortBy=date&sortOrder=desc&status=pending`

Returns paginated list of invoices with filters.

**Query Parameters:**
- `page` (default: 1): Page number
- `limit` (default: 10): Items per page
- `search` (optional): Search by invoice number or vendor name
- `sortBy` (default: date): Sort column (date, amount, status, invoiceNumber)
- `sortOrder` (default: desc): Sort order (asc, desc)
- `status` (optional): Filter by status (paid, pending, overdue)
- `vendorId` (optional): Filter by vendor ID

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-001",
      "date": "2024-01-15T00:00:00.000Z",
      "amount": 1000.00,
      "total": 1100.00,
      "status": "pending",
      "vendor": "Vendor Name",
      "customer": "Customer Name"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

### Chat with Data
**POST** `/api/chat-with-data`

Forwards natural language query to Vanna AI service.

**Request:**
```json
{
  "question": "What's the total spend in the last 90 days?"
}
```

**Response:**
```json
{
  "sql": "SELECT SUM(total) FROM invoices WHERE date >= CURRENT_DATE - INTERVAL '90 days'",
  "data": [
    {
      "sum": 50000.00
    }
  ],
  "chartType": "bar"
}
```

## Database Schema

### Entity Relationship Diagram

```
┌──────────┐         ┌──────────┐
│  Vendor  │         │ Customer │
└────┬─────┘         └────┬─────┘
     │                    │
     │ 1                  │ 0..1
     │                    │
     └──────────┬─────────┘
                │
                │ N
         ┌──────▼──────┐
         │   Invoice   │
         └──────┬──────┘
                │
                │ 1
        ┌───────┴────────┐
        │                 │
   ┌────▼─────┐    ┌──────▼─────┐
   │LineItem  │    │  Payment   │
   └──────────┘    └────────────┘
```

### Tables

#### vendors
- `id` (UUID, Primary Key)
- `name` (String, Indexed)
- `category` (String, Nullable)
- `email` (String, Nullable)
- `phone` (String, Nullable)
- `address` (String, Nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

#### customers
- `id` (UUID, Primary Key)
- `name` (String, Indexed)
- `email` (String, Nullable)
- `phone` (String, Nullable)
- `address` (String, Nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

#### invoices
- `id` (UUID, Primary Key)
- `invoiceNumber` (String, Unique, Indexed)
- `date` (DateTime, Indexed)
- `dueDate` (DateTime, Nullable)
- `amount` (Decimal(10,2))
- `tax` (Decimal(10,2), Nullable)
- `total` (Decimal(10,2))
- `status` (String, Indexed) - paid, pending, overdue
- `vendorId` (UUID, Foreign Key → vendors.id, Indexed)
- `customerId` (UUID, Foreign Key → customers.id, Nullable)
- `notes` (String, Nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

#### line_items
- `id` (UUID, Primary Key)
- `invoiceId` (UUID, Foreign Key → invoices.id, Indexed, Cascade Delete)
- `description` (String)
- `quantity` (Decimal(10,2))
- `unitPrice` (Decimal(10,2))
- `amount` (Decimal(10,2))
- `category` (String, Nullable, Indexed)
- `createdAt` (DateTime)

#### payments
- `id` (UUID, Primary Key)
- `invoiceId` (UUID, Foreign Key → invoices.id, Indexed, Cascade Delete)
- `amount` (Decimal(10,2))
- `paymentDate` (DateTime, Indexed)
- `method` (String, Nullable) - cash, card, bank_transfer, etc.
- `reference` (String, Nullable)
- `notes` (String, Nullable)
- `createdAt` (DateTime)

## Chat with Data Workflow

The "Chat with Data" feature enables natural language queries about your invoice data. Here's how it works:

### Flow Diagram

```
User Query (Frontend)
    ↓
POST /api/chat-with-data
    ↓
Next.js API Route (Backend)
    ↓
POST /query → Vanna AI Service
    ↓
Vanna AI + Groq LLM
    ↓
SQL Generation
    ↓
Execute SQL on PostgreSQL
    ↓
Return Results
    ↓
Display SQL + Data (Frontend)
```

### Step-by-Step Process

1. **User Input**: User types a natural language question in the chat interface (e.g., "What's the total spend in the last 90 days?")

2. **Frontend Request**: The frontend sends a POST request to `/api/chat-with-data` with the question.

3. **Backend Proxy**: The Next.js API route forwards the request to the Vanna AI service running on a separate server.

4. **Vanna AI Processing**:
   - Vanna AI receives the natural language question
   - Uses Groq LLM to generate SQL query based on the database schema
   - Executes the generated SQL on PostgreSQL
   - Returns the SQL query and results

5. **Response Handling**: The backend receives the SQL and data, then returns it to the frontend.

6. **Display**: The frontend displays:
   - The generated SQL query in a code block
   - The query results in a table format
   - Optionally, a chart if the data is suitable

### Example Queries

- "What's the total spend in the last 90 days?"
- "List top 5 vendors by spend"
- "Show overdue invoices as of today"
- "What's the average invoice value?"
- "How many invoices are pending?"
- "Show me invoices over $1000"

### Training Vanna AI

Vanna AI can be trained with example questions and SQL pairs to improve accuracy. The training data helps the model understand your specific database schema and business logic.

## Deployment

### Frontend + Backend (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Configure build settings:
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Set environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `VANNA_API_BASE_URL`
   - `NEXT_PUBLIC_APP_URL`
5. Deploy

### Vanna AI Service (Render/Railway)

#### Render
1. Create new Web Service
2. Connect GitHub repository
3. Configure:
   - **Root Directory**: `services/vanna`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set environment variables:
   - `DATABASE_URL`
   - `GROQ_API_KEY`
   - `ALLOWED_ORIGINS` (your Vercel URL)
5. Deploy

#### Railway
1. Create new project
2. Add service from GitHub
3. Set root directory to `services/vanna`
4. Configure environment variables
5. Deploy

### Database (Supabase/Railway/Neon)

1. Create PostgreSQL database
2. Get connection string
3. Update `DATABASE_URL` in all services
4. Run migrations:
   ```bash
   cd apps/web
   npx prisma migrate deploy
   npx prisma db seed
   ```

## Development

### Running Tests

```bash
# Frontend
cd apps/web
npm run lint

# Backend API tests (to be added)
```

### Database Migrations

```bash
cd apps/web
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### Seeding Data

```bash
cd apps/web
npx prisma db seed
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Ensure database exists

### Vanna AI Service Not Responding
- Check service is running on correct port
- Verify `GROQ_API_KEY` is set
- Check CORS configuration
- Verify `VANNA_API_BASE_URL` in frontend matches service URL

### Build Errors
- Clear `.next` directory: `rm -rf apps/web/.next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version (requires 18+)

