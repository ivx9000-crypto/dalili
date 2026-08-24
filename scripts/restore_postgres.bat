@echo off
if "%~1"=="" (
  echo Usage: scripts\restore_postgres.bat backups\your_backup.sql
  exit /b 1
)
echo Restoring %~1 into local Dalili PostgreSQL database...
type "%~1" | docker exec -i dalili-postgres psql -U dalili_user -d dalili
echo Done.
