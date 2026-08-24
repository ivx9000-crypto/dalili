@echo off
set /p API_URL=Enter deployed backend URL, for example https://your-api.onrender.com: 
echo.
echo Checking health...
curl -i %API_URL%/health
echo.
echo Checking ops version...
curl -i %API_URL%/ops/version
echo.
echo Checking database...
curl -i %API_URL%/ops/database
echo.
pause
