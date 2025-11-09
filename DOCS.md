# Flowbit Analytics Documentation

## 1. Overview
Flowbit Analytics is a monorepo (Turbo + PNPM/NPM workspaces) providing:
- A Next.js (App Router) dashboard (`apps/web`) with financial analytics (invoices, vendors, category spend, cash outflow, trends, KPIs) and an AI-assisted natural language query interface ("Chat with Data").
- A FastAPI microservice (`services/vanna`) that converts natural language questions into SQL using Groq LLM + runtime schema introspection, executes queries safely against the MySQL database, and returns structured results plus a human-friendly summary.
- A MySQL database accessed via Prisma ORM (models: Vendor, Customer, Invoice, LineItem, Payment).

This document collects setup steps, schema/ER diagram, API reference, and the chat workflow end‑to‑end.

## 2. Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, App Router, Tailwind CSS, Recharts |
| Backend AI | FastAPI + Groq LLM (self-hosted Vanna adapter) |
| Database | MySQL (Prisma Client) |
| Orchestration | Turbo workspaces |
| Auth | (Not implemented yet) |
| Language → SQL | Custom SelfHostedVanna (Groq) |

## 3. Monorepo Structure (Key Paths)
- `apps/web` – Next.js app (dashboard + API routes + Prisma client setup)
- `apps/web/app/api/*` – Serverless/Edge style route handlers (dashboard data & chat proxy)
- `apps/web/prisma/schema.prisma` – Database schema definitions
- `services/vanna` – FastAPI natural language to SQL microservice
- `data/Analytics_Test_Data.json` – Example data fixture (optional)
- `DOCS.md` – This documentation file

## 4. Environment Variables
Create a `.env` in both root (for Next.js) and in `services/vanna` (for FastAPI) if needed.

Frontend (`apps/web` / root):
- `DATABASE_URL` – MySQL connection string for Prisma (e.g. `mysql://user:pass@localhost:3306/flowbit`)
- `VANNA_API_BASE_URL` – Base URL for the FastAPI service (e.g. `http://localhost:8000`)

Backend (`services/vanna`):
- `DATABASE_URL` – Same DB URL but converted internally to SQLAlchemy `mysql+pymysql://...` if needed
- `GROQ_API_KEY` – API key for Groq LLM
- `ALLOWED_ORIGINS` – (Optional) comma‑separated origins for CORS (e.g. `http://localhost:3000,https://yourapp.vercel.app`)
- `PORT` – Optional service port override (defaults 8000)

PowerShell (Windows) temporary session export examples:
```powershell
$env:DATABASE_URL = "mysql://user:pass@localhost:3306/flowbit"
$env:VANNA_API_BASE_URL = "http://localhost:8000"
$env:GROQ_API_KEY = "sk-your-key"
```

For persistence, put these in a `.env` file (FastAPI uses `python-dotenv`).

## 5. Setup Instructions
### 5.1 Prerequisites
- Node.js >= 18
- Python 3.11+ (recommended) for FastAPI service
- MySQL server running locally (or remote instance)

### 5.2 Database & Prisma
1. Ensure MySQL is running and create a database, e.g. `flowbit`.
2. Set `DATABASE_URL` in root `.env`.
3. Install dependencies and generate Prisma client:
```powershell
npm install
npm run db:generate
```
4. Run initial migration (creates schema):
```powershell
npm run db:migrate -- --name init
```
5. (Optional) Seed data:
```powershell
npm run db:seed
```
   - Uses `apps/web/prisma/seed.ts` (referenced via script) to populate sample entities.

### 5.3 FastAPI Service (Vanna)
From project root:
```powershell
cd services/vanna
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
# Set GROQ_API_KEY & DATABASE_URL in .env or environment
uvicorn app.main:app --reload --port 8000
```

### 5.4 Frontend Dev Server
In project root (Turbo orchestrates workspaces):
```powershell
npm run dev
```
- This runs `turbo run dev` which triggers `apps/web` \`next dev\` script.
Access UI at `http://localhost:3000`.

### 5.5 Verification
- Visit `http://localhost:3000/api/stats` – should return JSON metrics.
- Visit `http://localhost:8000/health` – should return `{ "status": "healthy" }`.
- Try `POST http://localhost:3000/api/chat-with-data` with `{ "question": "Total invoice spend this year" }`.

## 6. Database Schema
Prisma models (simplified attribute listing):
- Vendor(id, name, category?, email?, phone?, address?, createdAt, updatedAt, invoices[])
- Customer(id, name, email?, phone?, address?, createdAt, updatedAt, invoices[])
- Invoice(id, invoiceNumber, date, dueDate?, amount, tax?, total, status, vendorId, customerId?, notes?, createdAt, updatedAt, vendor, customer?, lineItems[], payments[])
- LineItem(id, invoiceId, description, quantity, unitPrice, amount, category?, createdAt)
- Payment(id, invoiceId, amount, paymentDate, method?, reference?, notes?, createdAt)

### 6.1 ER Diagram (Mermaid)
```mermaid
erDiagram
  Vendor ||--o{ Invoice : "has"
  Customer ||--o{ Invoice : "has"
  Invoice ||--o{ LineItem : "contains"
  Invoice ||--o{ Payment : "paid_by"

  Vendor {
    string id PK
    string name
    string category
    string email
    string phone
    string address
    datetime createdAt
    datetime updatedAt
  }
  Customer {
    string id PK
    string name
    string email
    string phone
    string address
    datetime createdAt
    datetime updatedAt
  }
  Invoice {
    string id PK
    string invoiceNumber UNIQUE
    datetime date
    datetime dueDate
    decimal amount
    decimal tax
    decimal total
    string status
    string vendorId FK
    string customerId FK
    string notes
    datetime createdAt
    datetime updatedAt
  }
  LineItem {
    string id PK
    string invoiceId FK
    string description
    decimal quantity
    decimal unitPrice
    decimal amount
    string category
    datetime createdAt
  }
  Payment {
    string id PK
    string invoiceId FK
    decimal amount
    datetime paymentDate
    string method
    string reference
    string notes
    datetime createdAt
  }
```

### 6.2 Relation Notes
- Invoice→Vendor: Required (each invoice references exactly one vendor).
- Invoice→Customer: Optional (customer may be null for internal/vendor-only invoices).
- Cascade delete on LineItem and Payment ensures orphan cleanup when invoice is removed.

## 7. API Reference (Next.js Routes)
Base URL (dev): `http://localhost:3000/api`

### 7.1 GET /api/stats
Returns KPI aggregates and 6-month histories.
Response shape:
```json
{
  "totalSpend": 12345.67,
  "totalInvoices": 42,
  "documentsUploaded": 42,
  "averageInvoiceValue": 294.18,
  "totalSpendHistory": [1000, 1200, 900, 1500, 1800, 2100],
  "totalInvoicesHistory": [5,6,7,8,9,7],
  "documentsUploadedHistory": [5,6,7,8,9,7],
  "averageInvoiceValueHistory": [200,220,180,250,300,294]
}
```

### 7.2 GET /api/invoice-trends
Monthly aggregation of invoice count + total.
```json
[
  { "month": "2025-05", "count": 12, "total": 8200.50 },
  { "month": "2025-06", "count": 9, "total": 6100.00 }
]
```

### 7.3 GET /api/category-spend
Spend aggregated by line item category.
```json
[
  { "category": "Software", "total": 5000.00 },
  { "category": "Services", "total": 3200.00 }
]
```

### 7.4 GET /api/cash-outflow
Buckets unpaid (non-`paid`) invoices into date ranges.
```json
[
  { "range": "0-7 days", "amount": 3000.00 },
  { "range": "8-30 days", "amount": 4500.00 },
  { "range": "31-60 days", "amount": 1200.00 },
  { "range": "60+ days", "amount": 800.00 }
]
```

### 7.5 GET /api/vendors/top10?limit=10
Top vendors by total invoice spend.
```json
[
  { "id": "uuid-1", "name": "Acme Corp", "totalSpend": 9000.00 },
  { "id": "uuid-2", "name": "Globex", "totalSpend": 7600.00 }
]
```

### 7.6 GET /api/invoices
Query params: `page`, `limit`, `search`, `sortBy`, `sortOrder`, `status`, `vendorId`.
Example: `/api/invoices?page=1&limit=10&search=ACME&sortBy=date&sortOrder=desc`.
Response:
```json
{
  "data": [
    {
      "id": "uuid-3",
      "invoiceNumber": "INV-1001",
      "date": "2025-06-01T00:00:00.000Z",
      "dueDate": "2025-06-15T00:00:00.000Z",
      "amount": 1000.00,
      "tax": 80.00,
      "total": 1080.00,
      "status": "pending",
      "vendor": "Acme Corp",
      "customer": "Client A",
      "notes": "Annual license"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 37,
    "totalPages": 4
  }
}
```

### 7.7 POST /api/chat-with-data
Body:
```json
{ "question": "What is total spend by vendor this month?" }
```
Response:
```json
{
  "sql": "SELECT v.name, SUM(i.total) ...",
  "data": [ { "name": "Acme Corp", "total": 4500.00 } ],
  "chartType": "bar",
  "message": "I ran the SQL and found 1 rows. Columns returned: name, total. Here's a sample row: {\"name\":\"Acme Corp\",\"total\":4500}" 
}
```
Status Codes:
- 400: Missing question
- 503/504: Backend unreachable or timeout
- 500: Unexpected internal failure

## 8. Vanna AI Service (FastAPI) Endpoints
Base (dev): `http://localhost:8000`

### 8.1 GET /health
Simple health check.
```json
{ "status": "healthy" }
```

### 8.2 POST /query
Body: `{ "question": "Average invoice value YTD" }`
Response fields:
- `sql`: Generated MySQL query
- `data`: Filtered list of rows (binary columns removed, long text truncated)
- `chartType`: Heuristic suggestion (`bar`|`line`|`null`)
- `message`: Human-friendly summary (row count + columns + sample row)

Error handling:
- 500 on SQL generation/execution failures (detailed message)

## 9. Chat With Data Workflow
1. User enters natural language question in UI.
2. Frontend issues `POST /api/chat-with-data` with JSON body.
3. Proxy route performs health check to `VANNA_API_BASE_URL/health` (5s timeout). On failure → 503 with guidance.
4. If healthy, forwards question to `POST /query` (30s timeout).
5. FastAPI service:
   - Initializes/obtains Vanna instance (`get_vanna_instance`): loads schema + Groq client.
   - Calls `generate_sql(question)` using schema-aware prompt.
   - Executes SQL via `run_sql` (safe filtering heuristics).
   - Builds `message` string summarizing results.
6. Proxy returns `{ sql, data, chartType, message }` to frontend.
7. Frontend renders:
   - Table or chart (depending on `chartType` + data size).
   - SQL block with copy button.
   - CSV export constructed client-side.
   - Suggestion buttons for follow-ups.
   - Chat history persisted to `localStorage` (hydration guard prevents SSR mismatch).

## 10. Data Safety & Heuristics
- Binary / large attachment-like columns filtered out by regex (blob|binary|file|attachment|pdf|document|image|base64|content).
- Strings > 200 chars truncated with ellipsis for UI responsiveness.
- Sample row limited to first ~5 columns in chat summary.
- Timeout protections (5s health, 30s query) prevent hanging UI.

## 11. Development Scripts (Root vs Workspace)
Root scripts (Turbo orchestrated):
- `npm run dev` – Runs all workspace `dev` scripts.
- `npm run db:generate|db:migrate|db:seed` – Delegates to workspace implementations.

`apps/web` scripts:
- `dev` → `next dev`
- `db:migrate` → `prisma migrate dev`
- `db:seed` → `tsx prisma/seed.ts`

## 12. Testing & Verification Ideas (Future)
- Unit tests for API route data shaping (e.g. invoices pagination logic).
- Integration test invoking FastAPI `/query` with a mocked Groq client.
- Snapshot test for chart transformations (category spend sorting, outflow bucketing).
