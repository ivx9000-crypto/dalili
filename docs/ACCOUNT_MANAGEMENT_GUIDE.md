# Dalili Account Management Guide

This version adds local pilot account management:

- `/account` for profile, change password, logout all sessions, and self-deactivation.
- `/forgot-password` to create a local development reset token.
- `/reset-password` to apply the token and set a new password.
- `/admin/users` for admin role changes and safe user deactivation/restoration.

## Important production note

The forgot-password flow currently displays a reset token on screen for local development. In production this must be sent by email over HTTPS and should not be displayed in the browser.

User deletion is implemented as a soft delete/status change to preserve auditability.
