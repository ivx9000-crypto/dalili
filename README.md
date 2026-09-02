# Dalili starter v62

v62 simplifies Dalili around one core flow: upload project evidence, let Dalili review it, approve findings, and generate a donor/client-ready report.

Install into `D:\Dalili`, then run:

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

Checklist:

```powershell
cd D:\Dalili
.\scripts\v62_simplified_workspace_ui_checklist.bat
```
