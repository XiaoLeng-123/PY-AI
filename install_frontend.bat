@echo off
echo 正在安装前端依赖...
cd frontend
call npm install
echo 安装完成！
echo.
echo 启动命令：
echo   后端: python app.py
echo   前端: cd frontend ^&^& npm run dev
echo.
echo 前端访问地址: http://localhost:5173
pause
