@echo off
cd /d %~dp0..\backend
if exist ..\.venv\Scripts\activate.bat call ..\.venv\Scripts\activate.bat
python -m pip install -r requirements.txt
python -m alembic upgrade head
