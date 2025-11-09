# Vanna AI Service

FastAPI service for natural language to SQL queries using Vanna AI and Groq.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables (copy `.env.example` to `.env`):
```bash
cp .env.example .env
# Edit .env with your values
```

4. Run the service:
```bash
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /health` - Health check
- `POST /query` - Process natural language query
  - Request: `{ "question": "What's the total spend?" }`
  - Response: `{ "sql": "...", "data": [...], "chartType": "bar" }`

## Deployment

The service can be deployed to:
- Render
- Railway
- Fly.io
- Digital Ocean

Make sure to set all environment variables in your hosting platform.

