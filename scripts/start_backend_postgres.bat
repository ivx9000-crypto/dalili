@echo off
cd /d %~dp0..\backend
if exist ..\.venv\Scripts\activate.bat call ..\.venv\Scripts\activate.bat
set APP_ENV=development
set AUTO_CREATE_TABLES=false
set DATABASE_URL=postgresql+psycopg2://dalili_user:dalili_password@localhost:5432/dalili
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
