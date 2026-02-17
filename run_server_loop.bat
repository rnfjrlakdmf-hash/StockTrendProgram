@echo off
title Stock Backend Auto-Restart Loop
echo [Monitor] Starting Backend Server Reliability Loop...
echo [Monitor] Press Ctrl+C to stop the monitoring.

:loop
echo.
echo [Monitor] %date% %time% - Starting Server...
cd backend
python main.py
echo.
echo [Monitor] Server stopped/crashed!
echo [Monitor] Restarting in 3 seconds...
cd ..
timeout /t 3 /nobreak
goto loop
