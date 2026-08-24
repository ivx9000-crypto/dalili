@echo off
echo Checking Dalili v50.1 backend files...
cd /d D:\Dalili\backend
findstr /n /c:"@router.get(\"/database\")" app\routers\ops.py
findstr /n /c:"ops" app\main.py
echo.
echo If both checks returned lines, restart backend and open:
echo http://127.0.0.1:8000/ops/version
echo http://127.0.0.1:8000/ops/database
pause
