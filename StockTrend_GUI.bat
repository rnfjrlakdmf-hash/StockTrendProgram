@echo off
cd /d "%~dp0"
if exist "backend\venv\Scripts\python.exe" (
    "backend\venv\Scripts\python.exe" run_app.py
) else (
    echo Python Virtual Environment not found! Attempting to use system python...
    python run_app.py
)
