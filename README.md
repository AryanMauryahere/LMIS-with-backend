<div align="center">

<img src="KaryaDrishti_Logo.png" alt="KaryaDrishti logo" height="110">

# KaryaDrishti

**AI-enabled labour market intelligence for skill planning**

Forecast district-level job demand against qualified training supply, spot shortages before they happen, and test training-seat scenarios.

*Smart India Hackathon 2026 · PS 26246 · Maharashtra pilot (Pune and Nagpur)*

</div>
Live demo: https://lmis-with-backend.vercel.app
API docs: https://lmis-with-backend.onrender.com/docs
Data: synthetic demonstration data only.
---

## The problem

Training capacity is often planned from last year's numbers, while hiring demand shifts by district and sector. Planners usually learn about a mismatch after it has happened: graduates without jobs, or employers who cannot find skilled workers. Job-posting data, training records and official occupation codes also live in different places and describe the same work with different titles.

## What KaryaDrishti does

KaryaDrishti brings these signals into one workspace and looks forward, so planners can act **before** training targets are set.

| Step | What happens |
|---|---|
| **1. Ingest and validate** | Monthly CSV extracts (postings, completions, entry rate) are checked row by row on the server, with an import log of everything accepted or rejected. |
| **2. Normalise occupations** | Raw job titles are embedded with sentence-transformers and matched to the NCO / NSQF crosswalk using pgvector cosine similarity. Low-confidence matches (below 0.85) go to a human review queue instead of being accepted silently. |
| **3. Estimate qualified supply** | Seats are not workers. Supply is computed as `completions x entry rate`. |
| **4. Forecast** | Demand and supply are projected 6 or 12 months ahead with Holt smoothing, ARIMA or a 3-month moving average (statsmodels), with a rolling-holdout error estimate. |
| **5. Rank and warn** | `gap = projected demand - projected qualified supply`. Gaps of 18% or more of demand are flagged as shortages (or surpluses on the other side), ranked with data coverage shown. |
| **6. Simulate** | Scenario sliders estimate how added training seats change the gap: `seats x completion rate x entry rate`. |
| **7. Share** | Planners download a policy brief; citizens get a read-only public view with no login. |

## Roles

| Role | Workspace |
|---|---|
| **Policy Planner** | Overview and early-warning inbox, forecasts, seat scenarios, policy brief |
| **Data Officer** | CSV intake, validation log |
| **Skill Analyst** | Occupation mapping review, forecast evidence |
| **Public** | Read-only district explorer (no account) |

Access is enforced on the server with OAuth2 and JWT role checks, not only hidden in the interface.

## Tech stack

| Layer | Technology |
|---|---|
| Presentation | React 18, TypeScript, Tailwind CSS, Recharts (SVG), interactive scenario sliders |
| Core API and database | FastAPI (Python 3.11), PostgreSQL 16 with pgvector, Pydantic data contracts |
| Intelligence and analytics | sentence-transformers, statsmodels (Holt smoothing / ARIMA), scikit-learn, pandas |
| Security and deployment | OAuth2 + JWT with role-based access, Docker Compose, GitHub Actions CI/CD |

## Project structure

```
karyadrishti/
├── api/            FastAPI app: auth, API routes, forecasting, mapping, seed data, tests
├── client/           React + TypeScript + Tailwind single-page app
├── docker-compose.yml  db (pgvector) + backend + frontend
├── .github/workflows/  CI: tests, frontend build, Docker image publish
└── .env.example        settings template
```

## Getting started

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (on Windows this needs WSL 2).

```bash
git clone https://github.com/<your-username>/karyadrishti.git
cd karyadrishti
cp .env.example .env        # on Windows PowerShell: copy .env.example .env
docker compose up --build
```

Then open:

- App: http://localhost:3000
- API docs (Swagger): http://localhost:8000/docs

The first build downloads several large Python packages and, on first start, a small embedding model (about 90 MB), so it can take a while. Later runs start in seconds because Docker caches the layers and the model.

### Demo accounts

The password is whatever `DEMO_PASSWORD` is set to in `.env` (default `karya2026`).

| Role | Email |
|---|---|
| Policy Planner | `planner@karyadrishti.in` |
| Data Officer | `officer@karyadrishti.in` |
| Skill Analyst | `analyst@karyadrishti.in` |

Public View needs no login.

### Configuration

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Key used to sign login tokens. Set a long random value before sharing the app. |
| `DEMO_PASSWORD` | Password for the seeded demo accounts |
| `DEMO_MODE` | `1` enables one-click demo-role login; set `0` before any real deployment |
| `CORS_ORIGINS` | Allowed browser origins for the API |

Never commit your real `.env` file.

### Local development without Docker for the app

```bash
# database only
docker compose up db

# backend
cd api
pip install -r requirements.txt
uvicorn app.main:app --reload

# frontend (in another terminal)
cd client
npm install
npm run dev        # http://localhost:5173, proxies /api to :8000
```

When running the backend outside Docker, point `DATABASE_URL` at `localhost:5432`.

## API overview

Base path: `/api/v1`

| Method | Route | Access |
|---|---|---|
| POST | `/auth/token` | Email + password login (OAuth2 form), returns a JWT |
| POST | `/auth/demo` | One-click demo role login (disabled when `DEMO_MODE=0`) |
| GET | `/me` | Current user |
| POST | `/forecasts` | Demand/supply forecast (any staff role) |
| POST | `/scenarios` | Seat what-if (Planner, Analyst) |
| POST | `/skills/match` | Match a job title to skills (Planner, Analyst) |
| GET | `/public/forecast` | Read-only forecast, no login |

Full interactive documentation is available at `/docs` when the API is running.

## CSV format

Required columns: `state, district, sector, trade, month, postings, completions, entry_rate`

- `month` as `YYYY-MM`
- `postings` and `completions` as non-negative whole numbers
- `entry_rate` as a decimal from 0 to 1

## Testing

```bash
cd api && python -m compileall -q app
cd client && npm run build
```

Both run automatically in GitHub Actions on every push and pull request.

## Implemented vs planned

Implemented: login with roles, forecasts (Holt/ARIMA with a real 3-month backtest), seat scenarios, skill matching, public view.
Not implemented yet (described above as the design): PostgreSQL storage of observations, CSV import and validation log, mapping review queue, policy brief, pgvector matching. `api/db/init.sql` is ready but the API does not read from it yet.

## Limitations

- The bundled data is **synthetic** sample data for Pune and Nagpur. No live NCS, e-Shram or PLFS feed is connected.
- Forecasts are transparent baseline models, not a final production model, and the scenario formula ignores timing, course capacity, cost and placement constraints.
- The occupation matcher uses a general-purpose embedding model that has not been fine-tuned on Indian occupation data.

## Roadmap

- Connect real data sources (NCS, e-Shram, PLFS) with approved access
- Backtest forecasts against past years and report accuracy by sector
- Fine-tune occupation matching on NCO-2015 / NSQF titles
- District map view and XLSX import
- Persist policy briefs and audit logs per user

## Team

Add your team name and members here.

## License

Add a license of your choice (for example MIT) before making the repository public.
