@echo off
chcp 65001 >nul
echo ============================================
echo    小马分析系统 - 开发环境启动
echo ============================================
echo.

cd /d "%~dp0"

echo [1/2] 启动前端开发服务器...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo 等待前端启动...
timeout /t 3 /nobreak >nul

echo.
echo [2/2] 启动后端服务器...
start "Backend" cmd /k "cd /d %~dp0 && call .venv\Scripts\activate.bat && python app/main.py"

echo.
echo ============================================
echo ✅ 系统启动中...
echo.
echo 📊 前端地址: http://localhost:5173/
echo 🔧 后端API: http://127.0.0.1:5000
echo.
echo 💡 提示:
echo - 查看日志: 在对应窗口查看
echo - 停止服务: 在对应窗口按 Ctrl+C
echo - 生产部署: 使用 deploy/ 目录中的脚本
echo ============================================

timeout /t 3 /nobreak >nul
start http://localhost:5173/

echo.
echo 按任意键关闭此窗口（服务继续运行）...
pause >nul
