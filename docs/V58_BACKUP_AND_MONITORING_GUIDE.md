# Dalili Backup and Monitoring Guide

## Minimum pre-testing checks

- GitHub repository is private.
- Render backend environment variables are set.
- Render PostgreSQL is connected.
- `/ops/database` reports PostgreSQL.
- `/ops/stability` reports backend and database as okay.
- Vercel frontend uses the correct `NEXT_PUBLIC_API_BASE_URL`.
- Render CORS includes the Vercel frontend URL.

## Backup practice

Before first-user testing:

1. Open the PostgreSQL service in Render.
2. Create or download a backup if the plan supports it.
3. Record the backup date and the Dalili version being tested.

After testing:

1. Export important test outputs.
2. Record issues from `/support`.
3. Create another backup if user accounts/projects should be preserved.

## Monitoring practice

During first tests, monitor:

- Render backend logs.
- Vercel deployment logs.
- Browser console errors.
- `/support` local error log.
- `/ops/stability` status.

## Current limitation

The `/support` page stores error logs in the local browser only. It is for early testing, not a full production monitoring system. Later versions should add a server-side issue table or integrate Sentry or another error tracker.
