# Flowbit Analytics Dashboard - Web Application

Next.js application with dashboard and API routes.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

3. Set up database:
```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

4. Run development server:
```bash
npm run dev
```

## Project Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - React components
- `lib/` - Utilities and Prisma client
- `prisma/` - Database schema and migrations

## API Routes

All API routes are in `app/api/`:
- `/api/stats` - Overview statistics
- `/api/invoice-trends` - Monthly trends
- `/api/vendors/top10` - Top vendors
- `/api/category-spend` - Category breakdown
- `/api/cash-outflow` - Cash outflow forecast
- `/api/invoices` - Invoices list
- `/api/chat-with-data` - Chat proxy

## Pages

- `/dashboard` - Main analytics dashboard
- `/chat-with-data` - Natural language query interface

