# Dalili Pilot Demo Guide

This guide is for a local pilot demo of Dalili.

## 1. Start backend

```cmd
cd /d D:\Dalili\backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check:

- http://127.0.0.1:8000/health
- http://127.0.0.1:8000/docs

## 2. Start frontend

```cmd
cd /d D:\Dalili
npm run dev
```

Open the URL shown by Next.js.

## 3. Demo account

Create an account from `/signup`, or log in from `/login` using an account you already created.

Suggested demo values:

- Name: Aisha Nakato
- Email: demo@dalili.local
- Organisation: Dalili Demo Organisation
- Role: Organisation Admin

## 4. Demo workflow

1. Go to `/projects` and create a project.
2. Go to `/data-room` and click **Load sample dataset**.
3. Run backend profile and backend DQA.
4. Go to `/quality-check` and review/save the DQA.
5. Go to `/indicators` and calculate an indicator.
6. Go to `/insights` and save insight reviews.
7. Go to `/reports`, save a report draft, and export DOCX/PPTX/PDF/XLSX.
8. Go to `/ai-assistant` and ask: `What should I put in the donor report?`
9. Go to `/production-readiness` to review remaining blockers.

## 5. Sample dataset

The built-in sample dataset is stored at:

```text
public/demo-data/uganda_health_demo.csv
```

Useful demo indicator:

- Numerator: `hiv_tested` equals `Yes`
- Denominator: all records
- Disaggregate by: `sex`, `district`, or `age_group`

## 6. Stop servers

Press `Ctrl + C` in each Command Prompt window.

If ports get stuck:

```cmd
taskkill /IM node.exe /F
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```
