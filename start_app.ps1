$BackendPath = ".\backend"
$FrontendPath = ".\frontend"

Write-Host "Starting AI Stock Analyst..." -ForegroundColor Cyan

# 1. Start Backend
Write-Host "Launching Backend (FastAPI)..." -ForegroundColor Green
# Start backend using cmd to avoid PowerShell ExecutionPolicy issues with venv activation
$BackendProcess = Start-Process -FilePath "cmd" -ArgumentList "/k", "cd /d $BackendPath && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) && uvicorn main:app --reload --host 0.0.0.0 --port 8000" -PassThru

# 2. Start Frontend
Write-Host "Launching Frontend (Next.js)..." -ForegroundColor Green
# Start frontend using cmd to ensure npm works regardless of ExecutionPolicy
$FrontendProcess = Start-Process -FilePath "cmd" -ArgumentList "/k", "cd /d $FrontendPath && npm run dev" -PassThru

Write-Host "Both services are starting..." -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:3000"

# Open Browser
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host "Press any key to close all processes..."

# Wait for user input to close
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Cleanup
Stop-Process -Id $BackendProcess.Id -ErrorAction SilentlyContinue
Stop-Process -Id $FrontendProcess.Id -ErrorAction SilentlyContinue

Write-Host "Services stopped. Goodbye!" -ForegroundColor Yellow
