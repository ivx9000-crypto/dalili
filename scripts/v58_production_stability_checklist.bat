@echo off
echo Dalili v58 production stability and first-user testing checklist
echo.
echo Local checks:
echo 1. npm run build passes.
echo 2. Backend starts and /health works.
echo 3. /ops/version shows 0.58.0.
echo 4. /ops/database reports the expected database engine.
echo 5. /ops/stability responds.
echo.
echo Product checks:
echo 6. /support opens.
echo 7. /workspace opens and shows the next action.
echo 8. /data-room rejects unsupported files clearly.
echo 9. /data-room accepts a small CSV/XLSX and does not crash.
echo 10. /indicators Track Results opens and explains a result.
echo 11. /reports exports an output.
echo 12. Logout and login still work.
echo.
echo Online checks:
echo 13. Vercel frontend points to Render backend.
echo 14. Render CORS includes the Vercel URL.
echo 15. First user can complete the journey without explanation.
echo.
pause
