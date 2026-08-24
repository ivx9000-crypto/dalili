@echo off
echo Dalili v54 local pre-deployment verification

echo.
echo 1. Checking backend files...
if not exist backend\start_production.sh (
  echo Missing backend\start_production.sh
  exit /b 1
)
if not exist render.yaml (
  echo Missing render.yaml
  exit /b 1
)
if not exist vercel.json (
  echo Missing vercel.json
  exit /b 1
)

echo.
echo 2. Checking frontend build...
call npm run build
if errorlevel 1 exit /b 1

echo.
echo 3. Checking backend package import...
cd backend
call ..\.venv\Scripts\activate.bat
python -c "from app.main import app; print('Routes:', len(app.routes)); print('Version route exists:', any(r.path == '/ops/version' for r in app.routes))"
if errorlevel 1 exit /b 1
cd ..

echo.
echo Local pre-deployment verification completed.
