# v62 — Simplified AI Project Workspace and Modern UI Refresh

Dalili now follows a simpler product idea: upload project evidence first, then let Dalili organise, check, suggest findings and prepare a report.

## Main UX direction

Normal users should mainly see:

1. Home
2. Start
3. Projects
4. Reports
5. Support
6. Settings

Technical tools remain under Advanced.

## Main user journey

Create project → Upload all evidence → Dalili reviews → User reviews findings → Generate report.

## Design changes

- Modern gradient hero sections
- Cleaner sidebar
- Main actions made more obvious
- Progress bar in guided setup
- More card-based workspace
- Technical language moved behind advanced/details sections
- Dashboard now focuses on the next best action
- Project workspace now shows Overview, Evidence, Findings and Report as the central journey

## Product principle

One screen. One task. One Next button. Details on demand.

## Manual test

1. Open `/dashboard` and confirm the main action is Start analysis.
2. Open `/start` and click Start with files.
3. Create a project with minimum details.
4. Upload a CSV/Excel file and a PDF/Word document.
5. Confirm Dalili moves to review.
6. Confirm `/workspace` shows evidence, findings and report readiness.
7. Confirm `/reports` can open and export.
8. Confirm old technical tools are under Advanced, not primary navigation.
