# Dalili v58 — Production Stability and First-User Testing

This version keeps the guided M&E workflow and compact UI, then adds the practical tools needed before wider sharing.

## Goal

Dalili should be tested by people who do not have dedicated M&E staff. The test should confirm that they can:

1. Create a project.
2. Understand the Project Guide.
3. Upload a small programme dataset.
4. Review data quality and sensitive-field warnings.
5. Use Track Results without knowing technical M&E terms.
6. Generate and export a useful report or project brief.
7. Log out and log back in without losing the project.

## What changed in v58

- Added Help & Testing page at `/support`.
- Added local browser error logging for page crashes.
- Added a friendlier global crash page.
- Added first-user smoke-test checklist in the app.
- Added backend `/ops/stability` endpoint.
- Added Data Room upload validation for unsupported files and large browser-side files.
- Added error-log notifications in the topbar.
- Added guides for backups, issue reporting, and first-user testing.

## First-user testing rule

Use non-sensitive or dummy data for early tests. Do not invite external users to upload beneficiary-level health, child protection, SGBV, HIV, finance, or precise GPS data until backup, access control, and data processing terms are fully reviewed.

## What to ask testers

- Did Dalili make it clear what to do after creating a project?
- Did you understand what data to upload or collect?
- Was Track Results understandable without M&E knowledge?
- Did the report or export feel useful enough to share?
- Where did you feel lost, confused, or unsure?

## Online smoke test

After deploying v58, test:

- `/health`
- `/ops/version`
- `/ops/database`
- `/ops/stability`
- `/support`
- `/workspace`
- `/data-room`
- `/indicators`
- `/reports`
- `/settings`

## Backup note

For now, create database backups before and after major user testing. On Render, use the PostgreSQL dashboard backup/export options where available. For a mature production release, automate daily backups and document restore testing.
