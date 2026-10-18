# KaryaDrishti

Prototype rebuilt with React + TypeScript, Tailwind CSS, Recharts, FastAPI, PostgreSQL + pgvector, and Docker.

## Start

Requirements: Node.js 22+, Python 3.11+, Docker Compose.

1. Copy `.env.example` to `.env` and set a unique JWT secret.
2. Run `docker compose up --build`.
3. Open the dashboard at http://localhost:8080 and API docs at http://localhost:8000/docs.

Frontend-only development: `cd client && npm install && npm run dev`. Run the API with `cd api && pip install -r requirements.txt && uvicorn app.main:app --reload`.

The API exposes `POST /api/v1/forecasts` (Holt or ARIMA), `POST /api/v1/scenarios`, and authenticated `POST /api/v1/skills/match` (Sentence-Transformers). PostgreSQL initializes a labour observation table with a 384-dimension pgvector column and HNSW index.

All demo figures are synthetic and illustrative. OAuth token issuance is a demo stub, not production identity. Connect a trusted OIDC provider and add persistent user/role management before deployment.
