# Dalili v51 Deployment Test Checklist

## Local test before deployment

- [ ] `npm run build` succeeds
- [ ] Backend starts locally
- [ ] `/health` works
- [ ] `/ops/version` returns `0.51.0`
- [ ] `/ops/database` works
- [ ] Login/signup work locally
- [ ] Project dropdown still has no demo projects
- [ ] Organisation logo still works
- [ ] Report export still works

## Backend online test

- [ ] Backend service deployed
- [ ] PostgreSQL environment variable set
- [ ] `AUTO_CREATE_TABLES=false`
- [ ] `CORS_ORIGINS` includes frontend domain
- [ ] `/health` works online
- [ ] `/ops/version` works online
- [ ] `/ops/database` shows PostgreSQL
- [ ] Alembic migrations run successfully

## Frontend online test

- [ ] Frontend deployed
- [ ] `NEXT_PUBLIC_API_BASE_URL` set to backend URL
- [ ] Signup works online
- [ ] Login works online
- [ ] Dashboard loads after login
- [ ] Create project works
- [ ] Upload dataset works
- [ ] Quality check works
- [ ] Indicators work
- [ ] Reports/export work
- [ ] Settings/logo work

## Blockers before real external users

- [ ] Email verification or proper password reset email is configured
- [ ] Object/file storage strategy agreed
- [ ] Backups enabled
- [ ] Logs and error monitoring enabled
- [ ] Role permissions reviewed
- [ ] Legal pages reviewed
