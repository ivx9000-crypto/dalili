@echo off
echo Stopping common Dalili development processes...
taskkill /IM node.exe /F 2>nul
taskkill /IM uvicorn.exe /F 2>nul
taskkill /IM python.exe /F 2>nul
echo Done. If Python was running other work, restart it manually.
