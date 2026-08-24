# Dalili v54 — Online Deployment Step-by-Step

This version prepares Dalili for actual online deployment while preserving the v53 working product.

## Recommended first deployment architecture

- Frontend: Vercel
- Backend: Render Web Service
- Database: Render PostgreSQL or another managed PostgreSQL service

## Deployment order

1. Push the full Dalili folder to a private GitHub repository.
2. Create a managed PostgreSQL database.
3. Deploy the backend.
4. Confirm backend health, version, and database status.
5. Deploy the frontend.
6. Set frontend API environment variables.
7. Update backend CORS to allow the frontend domain.
8. Test signup, login, onboarding, upload, quality check, indicators, reports, maps, settings, and account security.

## Backend deployment

Render settings:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `sh start_production.sh`
- Health check path: `/health`

Required backend environment variables:

```text
APP_ENV=production
APP_NAME=Dalili API
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DATABASE
AUTO_CREATE_TABLES=false
CORS_ORIGINS=https://YOUR-FRONTEND.vercel.app
PUBLIC_BASE_URL=https://YOUR-BACKEND.onrender.com
FRONTEND_BASE_URL=https://YOUR-FRONTEND.vercel.app
PASSWORD_RESET_MODE=production_email_required
DEMO_MODE=false
```

The production backend start script runs:

```bash
alembic upgrade head
python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## Backend smoke tests

After deployment, open:

```text
https://YOUR-BACKEND.onrender.com/health
https://YOUR-BACKEND.onrender.com/ops/version
https://YOUR-BACKEND.onrender.com/ops/database
```

Expected result:

- `/health` returns `status: ok`
- `/ops/version` returns version `0.54.0`
- `/ops/database` shows PostgreSQL and `production_ready_database: true`

## Frontend deployment

Vercel settings:

- Framework: Next.js
- Build command: `npm run build`
- Install command: `npm install`

Frontend environment variables:

```text
NEXT_PUBLIC_API_BASE_URL=https://YOUR-BACKEND.onrender.com
NEXT_PUBLIC_API_BASE=https://YOUR-BACKEND.onrender.com
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

Redeploy frontend after setting environment variables.

## CORS update

After Vercel gives you the deployed frontend URL, update backend `CORS_ORIGINS` to include that URL.

Example:

```text
CORS_ORIGINS=https://dalili.vercel.app,https://www.yourdomain.com
```

Then redeploy/restart the backend.

## Final online test path

1. Visit frontend URL.
2. Create account.
3. Accept Terms and Privacy.
4. Complete onboarding.
5. Upload organisation logo.
6. Create project.
7. Upload dataset.
8. Confirm data dictionary and sensitive-field warnings.
9. Run quality check.
10. Calculate indicator.
11. Generate/export report.
12. Check Settings backend/database status.
13. Confirm no demo/pilot/test pages or data appear.

## Important note

Google/Microsoft login buttons are intentionally disabled until real OAuth credentials and callback URLs are configured.
