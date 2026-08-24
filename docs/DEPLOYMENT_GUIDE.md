# Dalili deployment guide

Dalili currently runs locally with a Next.js frontend and FastAPI backend.

## Frontend

Required environment variable:

```env
NEXT_PUBLIC_API_BASE=https://your-backend-domain.example
```

Build command:

```cmd
npm run build
```

Start command:

```cmd
npm run start
```

## Backend

Production should use PostgreSQL:

```env
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DATABASE
APP_ENV=production
CORS_ORIGINS=https://your-frontend-domain.example
```

Backend start command:

```cmd
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For production hosting, use a process manager or container platform rather than manually running this command in a terminal.

## PostgreSQL local test

If Docker Desktop is installed:

```cmd
docker compose up -d postgres
```

Then set `backend\.env`:

```env
DATABASE_URL=postgresql+psycopg2://dalili_user:change_me@localhost:5432/dalili
```

Restart the backend.
