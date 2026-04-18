@echo off
chcp 65001 >nul
title 小马分析系统 - 完整启动流程
echo ============================================
echo    小马分析系统 - 启动与监控
echo ============================================
echo.

cd /d "%~dp0"

echo [步骤1/3] 运行系统诊断...
echo ----------------------------------------
python scripts\tests\quick_test.py
if errorlevel 1 (
    echo.
    echo ⚠️  检测到问题，建议先修复
    echo 是否继续启动？(Y/N)
    choice /C YN /N
    if errorlevel 2 goto :end
)

echo.
echo [步骤2/3] 启动后端服务器...
echo ----------------------------------------
start "后端服务器" cmd /k "cd /d %~dp0 && call scripts\utils\start_backend.bat"

echo 等待后端启动...
timeout /t 3 /nobreak >nul

echo.
echo [步骤3/3] 启动前端服务器...
echo ----------------------------------------
start "前端服务器" cmd /k "cd /d %~dp0 && call scripts\utils\start_frontend.bat"

echo.
echo ============================================
echo ✅ 系统启动完成！
echo.
echo 📊 前端地址: http://localhost:5173/
echo 🔧 后端API: http://127.0.0.1:5000
echo.
echo 💡 提示:
echo - 查看后端日志: "后端服务器" 窗口
echo - 查看前端日志: "前端服务器" 窗口
echo - 停止服务: 在对应窗口按 Ctrl+C
echo.
echo 浏览器将在5秒后自动打开...
echo ============================================

timeout /t 5 /nobreak >nul
start http://localhost:5173/

:end
echo.
echo 按任意键关闭此窗口（服务继续运行）...
pause >nul
