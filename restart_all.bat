@echo off
chcp 65001
echo [1/4] Existing Servers Killing...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul

echo [2/4] Waiting for cleanup...
timeout /t 2 /nobreak >nul

echo [3/4] Starting Backend Server...
start "StockTrend Backend" cmd /k "cd /d %~dp0 && python backend/main.py"

echo [4/4] Starting Frontend Server...
start "StockTrend Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo [SUCCESS] All servers restarted! Please refresh your browser.
pause
