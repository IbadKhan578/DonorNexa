@echo off
echo ========================================================
echo  DonorNexa - Starting Frontend Dev Server (Vite)
echo ========================================================
cd /d %~dp0frontend
npm run dev -- --host
pause
