@echo off
echo ============================================
echo 백엔드 서버 시작
echo ============================================
echo.

cd backend

echo Python 가상환경 활성화 시도...
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    echo 가상환경 활성화 성공!
) else (
    echo 가상환경이 없습니다. 전역 Python 사용
)

echo.
echo 서버 시작 중...
echo.
python main.py

pause
