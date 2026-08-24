# Dalili v53 — Final Pre-Deployment UX & Auth Hardening

This update keeps the v49/v50/v51/v52 product improvements and adds a final round of user-facing hardening before online deployment.

## Preserved

- Dark green sidebar and readable light app background
- Clean project dropdown with no demo projects
- Organisation logo and branding support
- Notifications panel
- Data dictionary and sensitive-column warnings
- Reports and exports
- Maps improvements
- AI Assistant boundaries
- PostgreSQL setup and `/ops/database`
- Privacy, Terms and Data Protection pages
- Onboarding page
- Google/Microsoft sign-in placeholders
- Optional 2FA settings UI

## New/strengthened in v53

1. Signup now requires acceptance of Terms and Privacy Policy.
2. Signup password rules now check minimum length plus letters and numbers.
3. Signup and login have show/hide password controls.
4. Google/Microsoft buttons are visibly disabled until live OAuth credentials are configured.
5. Admin Users page now blocks non-admin users even if they manually type the URL.
6. Data Room shows a sensitive-data warning before file upload.
7. Settings now checks backend and database status through `/health` and `/ops/database`.
8. Backend operations version now reports `0.53.0`.
9. Added a final pre-deployment checklist script.

## Manual checks before online deployment

- Create a fresh account.
- Confirm Terms/Privacy acceptance is required.
- Confirm signup redirects to `/onboarding`.
- Confirm Google/Microsoft buttons are disabled and clearly labelled as not yet active.
- Confirm a non-admin cannot open `/admin/users` by typing the URL.
- Confirm Settings shows backend and database connection status.
- Confirm Data Room shows the sensitive-data upload warning.
- Confirm reports still export.
- Confirm organisation logo still appears in the topbar/dashboard/settings/report surfaces.
- Confirm `/ops/version` returns `0.53.0`.
- Confirm `/ops/database` works in SQLite and PostgreSQL modes.
