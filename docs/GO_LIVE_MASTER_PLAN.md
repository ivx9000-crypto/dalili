# Dalili Go-Live Master Plan

This document combines the remaining five phases into one controlled step: system stabilisation, deployment preparation, production security, feature strengthening, and real pilot validation.

## Objective
Move Dalili from a local pilot demo into a hosted, secure, testable pilot product for controlled external users.

## Combined Workstreams

### 1. Stabilise
- Run frontend build and lint checks.
- Run backend import and Python compile checks.
- Test the full workflow: signup, login, project creation, upload, DQA, indicators, insights, reports, exports, documents, maps, AI Assistant, feedback, and pilot onboarding.
- Fix broken buttons, route errors, export issues, and UI readability issues.

### 2. Deploy
- Prepare PostgreSQL for staging.
- Configure frontend and backend environment variables.
- Deploy backend API and confirm health endpoints.
- Deploy frontend and connect it to backend API.
- Enable HTTPS and correct CORS.

### 3. Secure
- Harden route-level permissions.
- Review admin role controls.
- Use email-based password reset in production.
- Enforce audit logs for exports and sensitive data access.
- Move uploaded files to secure object storage before real sensitive data is used.

### 4. Strengthen
- Improve backend DQA and indicator calculation reliability.
- Improve PDF/DOCX extraction and report templates.
- Add real Uganda geography/shapefile support.
- Connect external AI only after evidence grounding rules are enforced.

### 5. Pilot
- Invite controlled users from M&E, research, consulting, NGO, and donor-funded programme teams.
- Use Dalili with demo or non-sensitive pilot data first.
- Capture feedback through the Feedback Centre.
- Decide what must be fixed before a paid pilot.

## Go/No-Go Gate
Do not invite external pilot users until:
- `npm run build` passes.
- Backend `/health` and `/ops/readiness` pass.
- Login and account management work.
- Project creation and project switching work.
- Dataset upload and backend DQA work.
- Report export works.
- Demo reset works.
- At least one complete workflow has been tested end-to-end.
