# Dalili v44 — Combined Stabilisation, Deployment Preparation, and Pilot Onboarding

This version combines the former v44, v45, and v46 workstreams into one step.

## What to test

1. Login/signup and account management.
2. Create/select project.
3. Upload demo dataset.
4. Run backend DQA and backend indicator.
5. Save insight reviews and report draft.
6. Export report formats.
7. Check `/system-check`.
8. Review `/deployment-prep`.
9. Add contacts in `/pilot-onboarding`.

## Deployment preparation

Use SQLite only for local demos. For staging or live pilots, configure PostgreSQL using `docker-compose.yml` or a managed PostgreSQL database and set `DATABASE_URL` in `backend/.env`.

## Pilot onboarding

Use `/pilot-onboarding` to track people and organisations to invite. For production, connect invitations to real email sending and controlled account provisioning.
