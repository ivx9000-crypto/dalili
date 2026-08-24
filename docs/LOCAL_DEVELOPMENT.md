# Dalili local development guide

## Start the backend

Open Command Prompt 1:

```cmd
cd /d D:\Dalili\backend
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend links:

- http://127.0.0.1:8000/health
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/ops/readiness

## Start the frontend

Open Command Prompt 2:

```cmd
cd /d D:\Dalili
npm install
npm run dev
```

Open the URL shown by Next.js, usually:

- http://localhost:3000
- http://localhost:3001 if port 3000 is busy

## Stop the servers

Press `Ctrl + C` in each Command Prompt window.

If a port is stuck:

```cmd
taskkill /IM node.exe /F
netstat -ano | findstr :8000
```

Then stop the specific PID if needed:

```cmd
taskkill /PID <PID> /F
```
