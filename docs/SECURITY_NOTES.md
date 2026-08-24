# Dalili security notes

Current authentication is suitable for local development and early prototype testing only.

Before production:

1. Enforce backend permission checks for every organisation and project record.
2. Add password reset and email verification.
3. Add brute-force protection and rate limits for login.
4. Add refresh-token/session expiry rules.
5. Do not store secrets in the repository.
6. Use HTTPS only.
7. Log sensitive data access events.
8. Define data retention and deletion procedures.
9. Use PostgreSQL backups.
10. Move uploads to managed secure object storage.

Dalili should continue to follow the design rule: Python/backend calculation first, AI explanation second, with source-linked outputs.
