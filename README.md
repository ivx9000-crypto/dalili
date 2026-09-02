# Dalili starter v61 — Simple Upload-to-Report Project Flow

This release simplifies the product experience around the real Dalili purpose: a company or organisation without dedicated M&E staff should be able to create a project, upload the evidence they have, and let Dalili guide them toward a donor report, brief, or management summary.

## Main changes

- Added `/start` as the primary guided flow.
- Simplified the sidebar around Home, Start Analysis, My Projects, Project Workspace, Reports, Support and Settings.
- Moved technical modules under an expandable Advanced Tools section.
- Added a Claude-style project setup modal: project details, project evidence upload, and project instructions in one place.
- Allows multiple files to be uploaded together as project evidence.
- Automatically reads CSV/XLSX files, creates a data dictionary, runs a quick quality review, suggests a first result, and prepares a draft donor report path.
- Keeps evidence/source details available but does not overload ordinary users by default.
- Preserves the existing advanced pages for M&E/data users.

## Design principle

One screen. One task. One Next button.

Dalili should not ask a non-M&E user to understand the full M&E process. The user uploads what they have; Dalili organises, checks, suggests, drafts and asks for approval.

## Install

Copy this package into `D:\Dalili`, replace files, then run:

```powershell
cd D:\Dalili
npm install
npm run build
npm run dev
```

Backend, if testing locally:

```powershell
cd D:\Dalili\backend
D:\Dalili\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Test

```powershell
cd D:\Dalili
.\scripts\v61_simple_upload_to_report_checklist.bat
```

Main page to test:

```text
/start
```

Test flow:

1. Click Start Analysis.
2. Enter project details.
3. Click Next: upload evidence.
4. Upload CSV/XLSX plus any supporting documents.
5. Confirm Dalili reviews the files.
6. Open Workspace, Track Results, and Reports.
7. Confirm a draft report path is available.
