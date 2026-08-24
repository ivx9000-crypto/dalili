@echo off
echo Checking frontend ports...
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :3002
netstat -ano | findstr :3003
echo.
echo Checking backend port 8000...
netstat -ano | findstr :8000
echo.
echo If nothing appears for a port, no process is listening there.
