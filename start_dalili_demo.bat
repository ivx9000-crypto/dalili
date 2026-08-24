@echo off
setlocal
cd /d %~dp0

echo Starting Dalili backend and frontend in separate windows...
start "Dalili Backend" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
start "Dalili Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Backend:  http://127.0.0.1:8000/docs
echo Frontend: use the localhost URL shown in the frontend window.
echo Suggested demo page: /pilot-summary
pause
