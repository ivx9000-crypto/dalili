# Dalili v50 — Deployment Checklist

Before moving online, confirm:

- [ ] `npm run build` passes locally.
- [ ] Backend starts locally with SQLite.
- [ ] Backend starts locally with PostgreSQL.
- [ ] `python -m alembic upgrade head` succeeds.
- [ ] `/ops/database` reports PostgreSQL.
- [ ] Frontend `NEXT_PUBLIC_API_BASE_URL` points to the deployed backend.
- [ ] Backend `CORS_ORIGINS` only includes the deployed frontend URL.
- [ ] Production `DATABASE_URL` uses managed PostgreSQL.
- [ ] `AUTO_CREATE_TABLES=false` in production.
- [ ] HTTPS is enabled for frontend and backend.
- [ ] Password reset is reviewed before external users.
- [ ] File upload storage plan is confirmed.
- [ ] Backups are enabled and tested.
- [ ] Privacy, Terms, and Data Protection pages have been reviewed.
