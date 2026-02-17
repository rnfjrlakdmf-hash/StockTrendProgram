@echo off
echo ============================================
echo 백엔드 서버 강제 재시작
echo ============================================
echo.

echo [1단계] 포트 8000 사용 중인 모든 프로세스 종료...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    echo 프로세스 종료: PID %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo [2단계] 2초 대기...
timeout /t 2 /nobreak >nul

echo.
echo [3단계] 백엔드 서버 시작...
cd backend
start "Stock Backend Server" python main.py

echo.
echo ============================================
echo 서버가 새 창에서 시작되었습니다.
echo ============================================
timeout /t 3 /nobreak >nul
