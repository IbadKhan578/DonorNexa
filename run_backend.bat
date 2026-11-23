@echo off
echo ========================================================
echo  DonorNexa - Starting Backend API Server (FastAPI)
echo ========================================================
cd /d "%~dp0backend"
set PYTHONPATH=%~dp0backend
"%~dp0backend\venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
