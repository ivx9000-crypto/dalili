@echo off
echo Checking Dalili local services...
echo.

echo Backend health:
curl -s http://127.0.0.1:8000/health
echo.
echo.

echo Backend readiness:
curl -s http://127.0.0.1:8000/ops/readiness
echo.
echo.

echo Frontend check on port 3000:
curl -I http://localhost:3000 2>NUL
if errorlevel 1 echo Frontend may not be running on port 3000. Check the Next.js terminal for the active port.

echo.
echo Done.
pause
