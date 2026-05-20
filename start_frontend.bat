@echo off
title [StockTrend] Frontend Server - Port 3000
cd /d "C:\Users\rnfjr\StockTrendProgram\frontend"

:START
echo [%DATE% %TIME%] Starting frontend server...
cmd /c "npm run dev"
echo [%DATE% %TIME%] Frontend crashed! Restarting in 5 seconds...
timeout /t 5 /nobreak
goto START
