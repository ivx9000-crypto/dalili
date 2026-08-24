# Dalili Backend Foundation

This backend is the first production-style foundation for Dalili. It uses FastAPI and is structured so we can later connect the frontend modules to a real database instead of browser storage.

## What is included now

- FastAPI app
- health endpoint
- organisation endpoints
- project endpoints
- dataset metadata endpoints
- audit log endpoint
- CORS configured for local Next.js ports
- SQLite development default so it can run immediately
- PostgreSQL-ready `DATABASE_URL` configuration

## Run the backend on Windows

Open Command Prompt:

```cmd
cd /d D:\Dalili\backend
copy .env.example .env
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Or double-click/run:

```cmd
start_backend.bat
```

Then open:

```text
http://127.0.0.1:8000/docs
```

## Test endpoints

```text
GET  http://127.0.0.1:8000/health
GET  http://127.0.0.1:8000/organisations
POST http://127.0.0.1:8000/organisations
GET  http://127.0.0.1:8000/projects
POST http://127.0.0.1:8000/projects
GET  http://127.0.0.1:8000/datasets
POST http://127.0.0.1:8000/datasets
GET  http://127.0.0.1:8000/audit-logs
```

## PostgreSQL later

When ready, install PostgreSQL and update `.env`:

```env
DATABASE_URL=postgresql+psycopg2://dalili_user:dalili_password@localhost:5432/dalili
```

For now, keep SQLite unless you are ready to manage PostgreSQL locally.

## Dataset metadata sync

When the frontend Data Room uploads a file and an active project has a backend ID, the browser registers dataset metadata through:

```http
POST /datasets
```

The uploaded file content still remains in browser storage in this prototype. The backend currently stores metadata only: project ID, filename, row count, column count, quality score, and audit log entry. Full file storage will be added in the next backend module.

You can list datasets with:

```http
GET /datasets
GET /datasets?project_id=1
GET /datasets/{dataset_id}
```

## Full dataset file storage

The backend now supports file upload and download for datasets:

```http
POST /datasets/upload
GET  /datasets/{dataset_id}/download
```

`POST /datasets/upload` accepts multipart form data:

- `project_id`
- `row_count`
- `column_count`
- `quality_score`
- `file`

Files are stored locally under:

```text
backend/app/storage/uploads/
```

This is for local development only. In production, this storage layer should move to S3-compatible object storage with encryption and access controls.


## Team and approvals endpoints

- `GET /team-members`
- `GET /team-members?project_id=1`
- `POST /team-members`
- `PUT /team-members/{member_id}`
- `DELETE /team-members/{member_id}`
- `GET /approval-snapshots`
- `GET /approval-snapshots/latest`
- `POST /approval-snapshots`

## Step 1 Secure Foundation endpoints

This version adds local development authentication:

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /auth/roles`

Use the frontend `/signup` page first, then `/login`. The frontend stores the local development token in browser `localStorage` and protects AppShell pages.

This is suitable for local development only. Before production, add HTTPS, stronger session controls, password reset email, rate limiting, invitation-based onboarding, and full backend route-level RBAC.
