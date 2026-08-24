# Dalili v52 — Authentication, Onboarding, Security and Production Cleanup

This package is a pre-online-deployment cleanup release. It is designed to preserve the working product while removing test/demo surfaces from the live product experience.

## Preserved

- Dark green sidebar and readable page background
- Tailwind/PostCSS v4 setup
- Backend `db_engine` / `engine_router` fix
- PostgreSQL support and `/ops/database`
- Project dropdown cleanup
- Organisation logo support
- Notifications panel
- Data dictionary and sensitive field warnings
- Reports and exports
- Maps improvements
- AI Assistant boundaries
- Account management
- Privacy, Terms and Data Protection pages

## Improved

1. Signup no longer silently resets. It now displays backend errors and keeps user input.
2. Signup redirects to `/onboarding` after successful account creation.
3. Login displays clearer backend/authentication errors.
4. Google and Microsoft sign-in options are shown as production-ready placeholders, not fake working buttons.
5. Optional two-step authentication preference is added to Account.
6. Connected login methods are visible in Account.
7. Admin Users is hidden from the sidebar unless the signed-in user has an admin role.
8. User-facing demo/pilot/internal pages have been removed from the frontend route tree.
9. Dashboard no longer imports demo metrics or sample data.
10. A production cleanup script has been added.

## Important

Google/Microsoft OAuth and true backend-enforced 2FA still require production callback URLs, OAuth provider credentials, and email/authenticator verification services. The UI and endpoint structure are prepared, but final enforcement should be completed during online deployment.

## Local cleanup command

Run:

```powershell
cd D:\Dalili
scripts\production_cleanup_before_online.bat
```

Then clear browser demo storage if old projects are still visible:

```js
localStorage.removeItem('dalili.projects');
localStorage.removeItem('dalili.activeProject');
location.reload();
```
