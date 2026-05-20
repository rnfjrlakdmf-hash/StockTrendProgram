@echo off
REM ============================================
REM StockTrend 서버 자동 시작 스크립트
REM PC 시작 시 백엔드 + 프론트 자동 실행
REM ============================================

echo [StockTrend] 서버를 시작합니다...

REM 이미 실행중이면 스킵 (포트 체크)
netstat -an | find ":8000" | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [Backend] 이미 실행중 - 건너뜀
) else (
    echo [Backend] 시작 중...
    start "StockTrend-Backend" /MIN cmd /c "C:\Users\rnfjr\StockTrendProgram\start_backend.bat"
)

REM 백엔드 초기화 대기
timeout /t 5 /nobreak >nul

netstat -an | find ":3000" | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [Frontend] 이미 실행중 - 건너뜀
) else (
    echo [Frontend] 시작 중...
    start "StockTrend-Frontend" /MIN cmd /c "C:\Users\rnfjr\StockTrendProgram\start_frontend.bat"
)

echo [StockTrend] 서버 시작 완료!
exit
