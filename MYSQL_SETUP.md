# MySQL/MariaDB Setup Guide

Since you're using MySQL/MariaDB (via phpMyAdmin), here's the correct setup:

## Database URL Format

### For Frontend (`apps/web/.env.local`)

**If password is empty:**
```env
DATABASE_URL="mysql://root:@localhost:3306/flowbit_analytics"
```

**If password is 'root':**
```env
DATABASE_URL="mysql://root:root@localhost:3306/flowbit_analytics"
```

**If you have custom credentials:**
```env
DATABASE_URL="mysql://username:password@localhost:3306/flowbit_analytics"
```

### For Vanna AI Service (`services/vanna/.env`)

**If password is empty:**
```env
DATABASE_URL=mysql+pymysql://root:@localhost:3306/flowbit_analytics
```

**If password is 'root':**
```env
DATABASE_URL=mysql+pymysql://root:root@localhost:3306/flowbit_analytics
```

**If you have custom credentials:**
```env
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/flowbit_analytics
```

## Quick Setup Steps

1. **Database is already created** ✅ (you have `flowbit_analytics` in phpMyAdmin)

2. **Update Prisma schema** (already done - changed from PostgreSQL to MySQL)

3. **Set environment variables:**
   - `apps/web/.env.local` - Created with MySQL connection
   - `services/vanna/.env` - Created with MySQL connection

4. **Update Python dependencies:**
   ```bash
   cd services/vanna
   pip install pymysql
   ```

5. **Run migrations:**
   ```bash
   cd apps/web
   npx prisma generate
   npx prisma migrate dev --name init
   ```

6. **Seed database:**
   ```bash
   npx prisma db seed
   ```

## Common Default Credentials

- **Username:** `root`
- **Password:** Empty (`""`) or `root`
- **Host:** `localhost` or `127.0.0.1`
- **Port:** `3306` (default MySQL port)

## Verify Connection

You can test the connection in phpMyAdmin:
- Go to http://localhost/phpmyadmin
- Select `flowbit_analytics` database
- After running migrations, you should see tables: `vendors`, `customers`, `invoices`, `line_items`, `payments`

