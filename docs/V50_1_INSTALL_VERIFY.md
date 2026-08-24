# Dalili v50.1 Install Verification

This hotfix confirms the PostgreSQL/operations endpoints are included.

After copying the files into `D:\Dalili`, run the backend then open:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/ops/version`
- `http://127.0.0.1:8000/ops/database`

If `/ops/version` returns `v50.1 operations router loaded`, the corrected backend files are running.
