@echo off
chcp 65001 >nul
title 小马分析系统 - 后端服务器
echo ============================================
echo    正在启动后端服务器...
echo ============================================
echo.

cd /d "%~dp0..\.."

REM 激活虚拟环境
if exist .venv\Scripts\activate.bat (
    echo [1/2] 激活Python虚拟环境...
    call .venv\Scripts\activate.bat
) else (
    echo ⚠️  未找到虚拟环境，使用系统Python
)

echo.
echo [2/2] 启动Flask后端服务...
echo.
echo ✅ 后端地址: http://127.0.0.1:5000
echo ✅ WebSocket: ws://127.0.0.1:5000
echo.
echo ============================================
echo 后端服务运行中...
echo 按 Ctrl+C 停止服务
echo ============================================
echo.

python app/main.py

pause
