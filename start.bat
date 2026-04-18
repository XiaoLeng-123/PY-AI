@echo off
chcp 65001 >nul
echo ============================================
echo    小马分析系统启动器
echo ============================================
echo.

cd /d "%~dp0"

echo [1/2] 启动前端开发服务器...
start "前端服务器" cmd /k "cd /d %~dp0frontend && npm run dev"

echo 等待前端启动...
timeout /t 3 /nobreak >nul

echo.
echo [2/2] 启动后端服务器...
start "后端服务器" cmd /k "cd /d %~dp0 && call .venv\Scripts\activate.bat && python app/main.py"

echo.
echo ============================================
echo 系统启动中...
echo 前端地址: http://localhost:5173/
echo 后端API: http://127.0.0.1:5000
echo.
echo 浏览器将在3秒后自动打开...
echo ============================================

timeout /t 3 /nobreak >nul
start http://localhost:5173/

echo.
echo 按任意键关闭此窗口（前端和后端继续运行）...
pause >nul
