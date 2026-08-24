@echo off
echo Dalili v53 pre-deployment checklist

echo.
echo 1. Backend version check:
echo    Open http://127.0.0.1:8000/ops/version and confirm version 0.53.0

echo.
echo 2. Database check:
echo    Open http://127.0.0.1:8000/ops/database and confirm database connection.

echo.
echo 3. Frontend check:
echo    Open http://localhost:3000/signup and confirm Terms/Privacy acceptance is required.

echo.
echo 4. Auth check:
echo    Test signup, login, wrong password, backend-offline message, and onboarding redirect.

echo.
echo 5. Security check:
echo    Login as a non-admin and manually open /admin/users. It should show permission denied.

echo.
echo 6. Data Room check:
echo    Confirm the sensitive-data warning appears before upload.

echo.
echo 7. Settings check:
echo    Confirm backend and database status are visible.

echo.
echo Done. Use docs\V53_PRE_DEPLOYMENT_UX_AUTH_HARDENING.md for the full checklist.
pause
