# Dalili Pilot Handover Note

## Current pilot status

Dalili is an advanced local pilot that demonstrates a full M&E and research intelligence workflow:

1. Secure login/signup
2. Project setup
3. Dataset upload
4. Backend file storage
5. Backend data profiling
6. Backend DQA generation
7. Indicator calculation
8. Insight review
9. Report draft saving
10. DOCX/PPTX/PDF/Excel export
11. Document extraction
12. Map/location summary
13. AI Assistant context responses
14. Pilot feedback capture

## Demo starting points

- `/pilot-summary` — high-level handover and demo route
- `/pilot-demo` — guided live demo sequence
- `/production-readiness` — local readiness checks
- `/feedback` — capture pilot feedback

## Local startup

Start backend:

```cmd
cd /d D:\Dalili\backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start frontend:

```cmd
cd /d D:\Dalili
npm run dev
```

Or run:

```cmd
start_dalili_demo.bat
```

## Protected fixes

Do not undo these:

- `src/app/globals.css` Tailwind v4 setup
- `postcss.config.mjs` using `@tailwindcss/postcss`
- `src/components/layout/Sidebar.tsx` solid dark green sidebar `bg-[#073B2A]`
- `src/components/layout/AppShell.tsx` light page background `bg-[#f2f4f7]`
- `backend/app/main.py` aliases SQLAlchemy engine as `db_engine` and router as `engine_router`

## Remaining before production

- Move from SQLite to PostgreSQL
- Add production-grade authentication and password reset
- Add HTTPS/rate limiting/security hardening
- Add production object storage for uploads
- Connect real LLM with explicit data-routing controls
- Replace simplified maps with official Uganda geography/shapefiles
