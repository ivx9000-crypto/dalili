@echo off
echo Dalili production cleanup before online deployment
echo.
echo This removes local sample/demo artefacts from the project folder where possible.
echo It does not delete your real backend database or real uploaded files.
echo.
if exist public\demo-data rmdir /s /q public\demo-data
if exist src\lib\demo-data.ts del /q src\lib\demo-data.ts
if exist src\components\dashboard\DemoWorkflowCard.tsx del /q src\components\dashboard\DemoWorkflowCard.tsx

echo.
echo Browser localStorage cleanup cannot be done from this script.
echo Open Dalili in the browser, press F12, Console, and run:
echo localStorage.removeItem('dalili.projects'); localStorage.removeItem('dalili.activeProject'); location.reload();
echo.
echo Done.
pause
