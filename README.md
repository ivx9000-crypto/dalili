# Dalili Starter v56 — AI-Guided M&E Workflow and Track Results

This version builds on v55.1 and integrates AI guidance more visibly across the project journey.

Main changes:
- Reframes Indicators as **Track Results**.
- Adds plain-language result questions for non-M&E users.
- Adds AI-suggested measures by sector.
- Adds Dalili AI interpretation on the Track Results page.
- Adds AI draft M&E plan to the Project Guide.
- Adds next-action AI guidance to workflow nudges.
- Keeps the advanced indicator builder for M&E/data users.

Install by copying files into `D:\Dalili`, then run:

```powershell
cd D:\Dalili
npm install
npm run build
npm run dev
```

Backend if testing locally:

```powershell
cd D:\Dalili\backend
D:\Dalili\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

After local build passes:

```powershell
git add .
git commit -m "Add AI-guided M&E workflow and track results"
git push
```

Redeploy Vercel. Redeploy Render only if you want the updated backend AI Assistant responses online.


## v57 — Compact UI and Explain-on-Demand Polish

This version keeps the guided M&E workflow from v56 but makes the interface more compact and less process-heavy.

Main principle: **Compact by default. Explain on demand.**

### Key changes

- Reduced sidebar and page spacing.
- Reworked Project Guide into a compact command centre.
- Reworked workflow nudge so it shows the next action first and moves process guidance into “Why this matters”.
- Reduced Track Results card spacing.
- Moved suggested indicator rules behind collapsible details.
- Moved AI calculation/process explanation behind an evidence note.
- Preserved guided M&E setup, v55.1 Data Room crash fix, reports, maps, AI Assistant, deployment setup, PostgreSQL, authentication, branding and privacy pages.

### Test

Run:

```powershell
cd D:\Dalili
npm install
npm run build
npm run dev
```

Then:

```powershell
.\scripts57_compact_ui_checklist.bat
```
