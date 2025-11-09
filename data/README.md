# Data Directory

Place your `Analytics_Test_Data.json` file in this directory.

The file should contain an array of invoice objects with the following structure:

```json
[
  {
    "invoice_number": "INV-001",
    "date": "2024-01-15",
    "due_date": "2024-02-15",
    "amount": 1000.00,
    "tax": 100.00,
    "total": 1100.00,
    "status": "pending",
    "vendor": {
      "name": "Vendor Name",
      "category": "Office Supplies",
      "email": "vendor@example.com",
      "phone": "+1234567890",
      "address": "123 Main St"
    },
    "customer": {
      "name": "Customer Name",
      "email": "customer@example.com",
      "phone": "+1234567890",
      "address": "456 Oak Ave"
    },
    "line_items": [
      {
        "description": "Item description",
        "quantity": 10,
        "unit_price": 100.00,
        "amount": 1000.00,
        "category": "Office Supplies"
      }
    ],
    "payments": [
      {
        "amount": 500.00,
        "payment_date": "2024-01-20",
        "method": "bank_transfer",
        "reference": "REF-001",
        "notes": "Partial payment"
      }
    ],
    "notes": "Additional notes"
  }
]
```

After placing the file, run the seed script:

```bash
cd apps/web
npx prisma db seed
```

