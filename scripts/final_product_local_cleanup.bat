@echo off
echo Dalili final product cleanup helper
echo.
echo This removes old demo-data files from the public folder if they exist.
echo It cannot clear browser localStorage from Windows CMD. To clear old browser records, open Dalili in the browser, press F12, go to Console, and run:
echo localStorage.removeItem('dalili.projects'); localStorage.removeItem('dalili.activeProject'); location.reload();
echo.
cd /d %~dp0\..
if exist public\demo-data rmdir /s /q public\demo-data
echo Done.
pause
