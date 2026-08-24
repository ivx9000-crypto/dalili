# Dalili v50 — PostgreSQL and Production Database Setup

This version prepares Dalili to move from local SQLite development to PostgreSQL-managed operation.

## What changed

- Added Alembic migration support.
- Added PostgreSQL-first production `.env` example.
- Added local PostgreSQL Docker Compose health check.
- Added database readiness endpoint: `/ops/database`.
- Added scripts for local PostgreSQL startup, migrations, backup, and restore.
- Disabled automatic table creation in production when `AUTO_CREATE_TABLES=false`.

## Local PostgreSQL test flow on Windows

From `D:\Dalili`:

```bat
scripts\start_local_postgres.bat
```

Then run migrations:

```bat
scripts\run_backend_migrations.bat
```

Then start backend with PostgreSQL:

```bat
scripts\start_backend_postgres.bat
```

Open:

```text
http://127.0.0.1:8000/ops/database
```

You should see `database_engine: postgresql` and a positive table count.

## Production rules

In production:

```env
APP_ENV=production
AUTO_CREATE_TABLES=false
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DATABASE
CORS_ORIGINS=https://your-frontend-domain.com
```

Run migrations before starting the backend:

```bash
cd backend
python -m alembic upgrade head
```

## Backup

For local Docker PostgreSQL:

```bat
scripts\backup_postgres.bat
```

For hosted PostgreSQL, use your provider's automated backups and scheduled logical dumps.

## Important caution

SQLite data is not automatically migrated into PostgreSQL by this release. For now, treat PostgreSQL setup as the production database going forward. If you need to move local SQLite records later, add an explicit data migration/export script.
