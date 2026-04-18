@echo off
chcp 65001 >nul
echo ============================================
echo    Stock Analysis System Launcher
echo ============================================
echo.

cd /d "%~dp0"

echo [1/2] Starting frontend dev server...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Waiting for frontend...
timeout /t 3 /nobreak >nul

echo.
echo [2/2] Starting backend server...
start "Backend Server" cmd /k "cd /d %~dp0 && call .venv\Scripts\activate.bat && python app/main.py"

echo.
echo ============================================
echo System starting...
echo Frontend: http://localhost:5173/
echo Backend API: http://127.0.0.1:5000
echo.
echo Browser will open in 3 seconds...
echo ============================================

timeout /t 3 /nobreak >nul
start http://localhost:5173/

echo.
echo Press any key to close this window (services continue running)...
pause >nul
