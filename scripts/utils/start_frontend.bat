@echo off
chcp 65001 >nul
title 小马分析系统 - 前端服务器
echo ============================================
echo    正在启动前端开发服务器...
echo ============================================
echo.

cd /d "%~dp0..\..\frontend"

echo [1/1] 启动Vite开发服务器...
echo.
echo ✅ 前端地址: http://localhost:5173/
echo.
echo ============================================
echo 前端服务运行中...
echo 按 Ctrl+C 停止服务
echo ============================================
echo.

npm run dev

pause
