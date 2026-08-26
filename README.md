# Dalili starter v58 — Production Stability and First-User Testing

This version preserves v57 and adds stability, first-user testing, and support tools.

## New in v58

- `/support` Help & Testing page.
- Local browser error log and global crash screen.
- Data Room upload validation for unsupported files and >15MB browser-side files.
- Backend `/ops/stability` endpoint.
- Topbar notification when local issue notes exist.
- First-user testing, backup, monitoring, and stability docs.

## Install

Copy the package into `D:\Dalili`, replacing files.

```powershell
cd D:\Dalili
npm install
npm run build
npm run dev
```

Backend:

```powershell
cd D:\Dalili\backend
D:\Dalili\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Test

```powershell
cd D:\Dalili
.\scripts\v58_production_stability_checklist.bat
```

Open:

- `/support`
- `/workspace`
- `/data-room`
- `/quality-check`
- `/indicators`
- `/reports`
- `/settings`

Backend endpoints:

- `/health`
- `/ops/version`
- `/ops/database`
- `/ops/stability`

## Deploy

After build passes:

```powershell
cd D:\Dalili
git add .
git commit -m "Add production stability and first-user testing tools"
git push
```

Redeploy Vercel. Redeploy Render if backend files changed.
