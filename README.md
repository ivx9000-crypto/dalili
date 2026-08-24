# Dalili Starter v54 — Online Deployment Execution Pack

This package preserves the v53 working product and adds the final online deployment execution files for a Vercel frontend + Render backend + managed PostgreSQL setup.

## Key additions

- `backend/start_production.sh` — runs Alembic migrations then starts FastAPI.
- `render.yaml` — backend deployment blueprint.
- `vercel.json` — frontend deployment configuration.
- `.env.vercel.example` — frontend production variables.
- `backend/.env.production.example` — backend production variables.
- `docs/V54_ONLINE_DEPLOYMENT_STEP_BY_STEP.md` — deployment guide.
- `docs/V54_RENDER_VERCEL_ENV_VALUES.md` — environment variable guide.
- `docs/V54_ONLINE_SMOKE_TEST_CHECKLIST.md` — after-deployment test checklist.
- `scripts/v54_verify_local_before_deploy.bat` — local pre-deployment check.
- `scripts/v54_check_online_backend.bat` — online backend route checker.

## Local check

```powershell
cd D:\Dalili
scripts\v54_verify_local_before_deploy.bat
```

## Backend local start

```powershell
cd D:\Dalili\backend
D:\Dalili\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Frontend local start

```powershell
cd D:\Dalili
npm run dev
```

## Deployment guide

Read `docs/V54_ONLINE_DEPLOYMENT_STEP_BY_STEP.md`.
