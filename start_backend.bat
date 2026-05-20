@echo off
title [StockTrend] Backend Server - Port 8000
cd /d "C:\Users\rnfjr\StockTrendProgram\backend"

:START
echo [%DATE% %TIME%] Starting backend server...

REM venv\Scripts\python.exe 직접 호출 (activate 불필요, PowerShell 정책 문제 우회)
venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000

echo.
echo [%DATE% %TIME%] Backend server stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto START
