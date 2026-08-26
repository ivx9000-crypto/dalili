# Dalili v55.1 — Data Room Crash Hotfix

This package preserves v55 Guided M&E Setup and Project Workflow and fixes the Data Room crash when uploading and cleaning programme data.

Key fixes:
- Stabilised Data Room upload/render cycle.
- Added safe browser storage handling for large datasets.
- Prevented large uploads from crashing the page when localStorage is full.
- Preserved guided workflow, project guide, reports, maps, authentication, PostgreSQL and online deployment settings.

Install by copying files into `D:\Dalili`, replacing existing files, then run `npm install`, `npm run build`, and `npm run dev`.
