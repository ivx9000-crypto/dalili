# Dalili v51 — Online Deployment Configuration

This package prepares Dalili for a first online deployment while preserving the working local product.

## Recommended first hosting setup

Use this for the first live version:

- Frontend: Vercel
- Backend: Render
- Database: Render PostgreSQL or Supabase PostgreSQL
- Files: local server storage at first, then object storage before scale

## What changed in v51

1. Frontend API calls now use environment variables:
   - `NEXT_PUBLIC_API_BASE_URL`
   - fallback: `NEXT_PUBLIC_API_BASE`
   - fallback: `http://127.0.0.1:8000`
2. Added frontend production environment template:
   - `.env.production.example`
3. Added backend production/Render environment template:
   - `backend/.env.render.example`
4. Added deployment helper files:
   - `render.yaml`
   - `vercel.json`
   - `backend/Procfile`
5. Added deployment verification script:
   - `scripts/check_deployment_urls.bat`
6. Backend app version updated to `0.51.0`.

## Backend production environment variables

Set these in Render/Railway/DigitalOcean:

```env
APP_ENV=production
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DATABASE
AUTO_CREATE_TABLES=false
CORS_ORIGINS=https://your-dalili-app.vercel.app,https://yourdomain.com
PUBLIC_BASE_URL=https://your-dalili-api.onrender.com
FRONTEND_BASE_URL=https://your-dalili-app.vercel.app
PASSWORD_RESET_MODE=production_email_required
```

Important: production should use `AUTO_CREATE_TABLES=false` and Alembic migrations.

## Frontend production environment variables

Set these in Vercel/Netlify:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-dalili-api.onrender.com
NEXT_PUBLIC_API_BASE=https://your-dalili-api.onrender.com
```

## Backend Render commands

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Health check path:

```text
/health
```

## Running migrations online

Run migrations against the production database before opening the app to users:

```bash
alembic upgrade head
```

On Render, this can be run from the service shell after environment variables are set.

## Deployment verification

After deployment, test:

```text
https://your-api-domain/health
https://your-api-domain/ops/version
https://your-api-domain/ops/database
https://your-frontend-domain/login
https://your-frontend-domain/signup
```

Expected backend version response:

```json
{
  "version": "0.51.0",
  "ops_database_route": "/ops/database",
  "status": "v51 online deployment configuration loaded"
}
```

## CORS rule

If login/signup works locally but fails online, check `CORS_ORIGINS`. It must include the exact frontend domain, including `https://`.

Example:

```env
CORS_ORIGINS=https://dalili.vercel.app
```

Do not leave localhost-only CORS in production.

## First online deployment order

1. Create managed PostgreSQL database.
2. Deploy backend.
3. Add backend environment variables.
4. Run Alembic migrations.
5. Confirm `/health`, `/ops/version`, `/ops/database` work.
6. Deploy frontend.
7. Add `NEXT_PUBLIC_API_BASE_URL` pointing to backend.
8. Confirm login/signup.
9. Create first organisation and project.
10. Upload a small CSV and run quality check.

## Do not put sensitive data online yet until these are done

Before using real beneficiary/client data online, complete:

- HTTPS enabled
- production database active
- `AUTO_CREATE_TABLES=false`
- production CORS configured
- admin password changed
- password reset moved away from local-dev token mode
- role permissions reviewed
- data retention policy agreed
- privacy/terms/data-protection pages reviewed
- backups enabled
