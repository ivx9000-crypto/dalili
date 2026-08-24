# Dalili v54 — Online Smoke Test Checklist

Run this after backend and frontend are deployed.

## Backend

- [ ] `/health` returns `status: ok`
- [ ] `/ops/version` returns `0.54.0`
- [ ] `/ops/database` shows `database_engine: postgresql`
- [ ] `/ops/database` shows `production_ready_database: true`
- [ ] `/docs` loads for admin/developer testing

## Frontend

- [ ] Landing page loads
- [ ] Signup page loads
- [ ] Terms and Privacy acceptance is required
- [ ] Signup creates account or shows a clear error
- [ ] Login works
- [ ] New user redirects to onboarding
- [ ] Google/Microsoft buttons are disabled/clearly marked until configured
- [ ] No demo projects appear
- [ ] No Aisha/demo persona appears
- [ ] No pilot/demo pages appear in sidebar

## Core workflow

- [ ] Create organisation profile
- [ ] Upload logo
- [ ] Create project
- [ ] Upload dataset
- [ ] Data dictionary appears
- [ ] Sensitive-field warning appears where expected
- [ ] Run quality check
- [ ] Calculate indicator
- [ ] Review insight
- [ ] Generate report
- [ ] Export report/project brief
- [ ] Settings shows backend connected
- [ ] Settings shows database connected

## Security and permissions

- [ ] Non-admin cannot access `/admin/users`
- [ ] Logout works
- [ ] Wrong password shows clear error
- [ ] Backend unavailable shows clear error
- [ ] Password reset does not expose development tokens in production

## Stop/go decision

Do not share the online link with external users until all high-priority checks pass.
