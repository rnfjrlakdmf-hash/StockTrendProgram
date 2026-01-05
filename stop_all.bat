@echo off
taskkill /F /IM python.exe /T
taskkill /F /IM node.exe /T
taskkill /F /IM StockTrend_App.exe /T
echo All processes stopped.
pause
