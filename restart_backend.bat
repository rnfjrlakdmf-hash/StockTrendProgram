@echo off
echo ============================================
echo 백엔드 서버 재시작
echo ============================================
echo.
echo 기존 서버 프로세스를 종료합니다...

REM Kill processes on port 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /F /PID %%a 2>nul

timeout /t 2 >nul

echo.
echo 서버를 시작합니다...
cd backend
python main.py
