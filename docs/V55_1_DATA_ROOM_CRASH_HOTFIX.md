# v55.1 Data Room Crash Hotfix

This hotfix stabilises the Data Room after v55 guided workflow changes.

Fixes:
- Stops an upload/render loop caused by unstable preview array dependencies.
- Adds safe browser localStorage writes so large programme datasets do not crash the page.
- Stores a smaller browser preview while still syncing/saving the uploaded file to the backend where an active backend project exists.
- Keeps the guided M&E workflow, organisation branding, reports, PostgreSQL deployment and all previous production fixes.

Test:
1. Open `/data-room`.
2. Upload a CSV/XLSX file.
3. Confirm the page stays open.
4. Confirm the data dictionary appears.
5. Confirm quality issues are shown.
6. Confirm backend sync status appears instead of crashing.
