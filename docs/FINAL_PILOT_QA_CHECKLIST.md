# Dalili Final Pilot QA Checklist

Use this checklist before showing Dalili to a reviewer, potential partner, or internal team member.

## 1. Start services

Backend:

```cmd
cd /d D:\Dalili\backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```cmd
cd /d D:\Dalili
npm run dev
```

Confirm:

- http://127.0.0.1:8000/health works
- http://127.0.0.1:8000/docs works
- frontend URL opens

## 2. Optional clean reset

Browser reset:

- Open `/demo-reset`
- Click **Clear workflow data only**

Backend reset:

```cmd
scripts\reset_local_demo.bat
```

Only use the backend reset if you want to delete local demo records.

## 3. Demo flow

- Sign up or log in
- Open `/pilot-summary`
- Open `/pilot-demo`
- Create/select a backend project
- Open `/data-room`
- Click **Load sample dataset**
- Run backend profile and DQA
- Open `/indicators` and calculate/save an indicator
- Open `/insights` and save insight reviews
- Open `/reports`, save draft and export DOCX/PPTX/PDF/Excel
- Open `/ai-assistant` and ask: "What should I put in the donor report?"
- Open `/feedback` and record reviewer feedback

## 4. Pages to confirm

- `/dashboard`
- `/projects`
- `/data-room`
- `/quality-check`
- `/indicators`
- `/insights`
- `/reports`
- `/documents`
- `/maps`
- `/team`
- `/ai-assistant`
- `/settings`
- `/production-readiness`
- `/pilot-summary`
- `/pilot-demo`
- `/feedback`
- `/demo-reset`

## 5. Known production items still pending

- PostgreSQL migration for staging/production
- Production-grade password reset and email verification
- HTTPS, rate limiting and stronger backend route permissions
- Secure object storage for files
- Real LLM connection with source-grounding controls
- Official Uganda shapefiles and production GIS
