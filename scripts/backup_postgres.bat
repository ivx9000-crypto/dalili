@echo off
set BACKUP_DIR=backups
if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set TODAY=%%d-%%b-%%c
set FILE=%BACKUP_DIR%\dalili_backup_%RANDOM%.sql
echo Creating PostgreSQL backup at %FILE%
docker exec dalili-postgres pg_dump -U dalili_user -d dalili > %FILE%
echo Done.
