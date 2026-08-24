# Dalili v54 — Render and Vercel Environment Values

## Backend service environment variables

Use these in Render/Railway/DigitalOcean backend service settings.

```text
APP_ENV=production
APP_NAME=Dalili API
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DATABASE
AUTO_CREATE_TABLES=false
CORS_ORIGINS=https://YOUR-FRONTEND.vercel.app
PUBLIC_BASE_URL=https://YOUR-BACKEND.onrender.com
FRONTEND_BASE_URL=https://YOUR-FRONTEND.vercel.app
UPLOAD_STORAGE_DIR=app/storage/uploads
MAX_UPLOAD_MB=50
PASSWORD_RESET_MODE=production_email_required
DEMO_MODE=false
```

## Frontend environment variables

Use these in Vercel/Netlify.

```text
NEXT_PUBLIC_API_BASE_URL=https://YOUR-BACKEND.onrender.com
NEXT_PUBLIC_API_BASE=https://YOUR-BACKEND.onrender.com
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

## PostgreSQL URL conversion

Some hosts provide database URLs starting with:

```text
postgres://
```

For SQLAlchemy, use:

```text
postgresql+psycopg2://
```

Keep the rest of the URL the same.

## What not to expose

Never put `DATABASE_URL` in frontend/Vercel public variables. Only the backend should have the database URL.
