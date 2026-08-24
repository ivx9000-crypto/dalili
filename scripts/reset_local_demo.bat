@echo off
setlocal
cd /d %~dp0.. 

echo ======================================================
echo Dalili local demo reset
echo ======================================================
echo This will delete the local SQLite development database
echo and backend uploaded files. Stop frontend/backend first.
echo.
set /p CONFIRM=Type RESET to continue: 
if /I not "%CONFIRM%"=="RESET" (
  echo Cancelled.
  exit /b 0
)

if exist backend\dalili_dev.db del /f /q backend\dalili_dev.db
if exist backend\app\storage\uploads rmdir /s /q backend\app\storage\uploads
mkdir backend\app\storage\uploads
if exist .next rmdir /s /q .next

echo.
echo Local demo backend database, uploads and Next cache cleared.
echo Restart backend and frontend.
endlocal
