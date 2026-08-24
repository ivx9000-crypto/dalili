# Dalili production readiness checklist

## Required before real users

- [ ] Use PostgreSQL instead of SQLite.
- [ ] Set production CORS to the deployed frontend domain only.
- [ ] Serve frontend and backend over HTTPS.
- [ ] Store secrets in server environment variables, not in source code.
- [ ] Add password reset email flow.
- [ ] Add rate limiting for auth endpoints.
- [ ] Add invitation-based onboarding for organisation users.
- [ ] Add backend permission checks for every project-scoped endpoint.
- [ ] Add backup and restore procedure for the database.
- [ ] Move uploads from local disk to managed object storage.
- [ ] Add file size limits and malware scanning before production.
- [ ] Add automated tests for auth, uploads, reports, indicators, and exports.
- [ ] Add privacy policy, terms of service, and DPA template.

## Recommended before paid pilots

- [ ] Use a staging domain.
- [ ] Add a demo organisation with sample datasets.
- [ ] Add application error logging.
- [ ] Add admin-only audit log review page.
- [ ] Add user documentation.
- [ ] Add export branding controls.
