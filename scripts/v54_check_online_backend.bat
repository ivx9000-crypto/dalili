@echo off
set /p API_BASE=Paste deployed backend URL without trailing slash: 

echo Checking %API_BASE%/health
powershell -Command "try { Invoke-RestMethod '%API_BASE%/health' | ConvertTo-Json -Depth 5 } catch { Write-Host $_; exit 1 }"
if errorlevel 1 exit /b 1

echo.
echo Checking %API_BASE%/ops/version
powershell -Command "try { Invoke-RestMethod '%API_BASE%/ops/version' | ConvertTo-Json -Depth 5 } catch { Write-Host $_; exit 1 }"
if errorlevel 1 exit /b 1

echo.
echo Checking %API_BASE%/ops/database
powershell -Command "try { Invoke-RestMethod '%API_BASE%/ops/database' | ConvertTo-Json -Depth 5 } catch { Write-Host $_; exit 1 }"
if errorlevel 1 exit /b 1

echo.
echo Backend online checks completed.
