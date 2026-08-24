# Dalili Pilot Reset Guide

Dalili now has two reset options for local demonstrations.

## Browser-only reset

Use this when you want to keep your login session but clear old demo workflow data.

1. Start frontend and backend.
2. Open `/demo-reset`.
3. Click **Clear workflow data only**.
4. Continue from `/projects` and `/data-room`.

This removes browser-side snapshots such as latest dataset, quality report, indicator result, insights, documents, map summaries, team members and compliance local state.

## Full local backend reset

Use this only when you want to delete local development backend records and uploaded files.

1. Stop frontend and backend.
2. In Command Prompt, run:

```cmd
cd /d D:\Dalili
scripts\reset_local_demo.bat
```

3. Type `RESET` when prompted.
4. Restart backend and frontend.

This deletes:

- `backend\dalili_dev.db`
- `backend\app\storage\uploads`
- `.next` cache

It does not delete source code.
