#!/bin/bash
# 手动启动脚本（不使用 systemd，适用于测试或调试）
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

echo "======================================"
echo " 手动启动服务（调试模式）"
echo "======================================"
echo ""

# 检查虚拟环境
if [ ! -d "$BASE_DIR/venv" ]; then
    echo "✗ 错误: 未找到虚拟环境"
    echo "  请先运行部署脚本或手动创建虚拟环境"
    exit 1
fi

# 激活虚拟环境
echo "[1/3] 激活虚拟环境..."
source "$BASE_DIR/venv/bin/activate"
echo "✓ 虚拟环境已激活"
echo ""

# 检查环境变量
echo "[2/3] 检查配置..."
if [ -f "$BASE_DIR/backend/.env" ]; then
    echo "✓ 环境变量文件存在"
else
    echo "⚠ 警告: 未找到 .env 文件"
    echo "  复制模板: cp config/deploy.env backend/.env"
fi
echo ""

# 启动 Gunicorn
echo "[3/3] 启动 Gunicorn..."
echo ""
echo "服务信息:"
echo "  监听地址: 127.0.0.1:5000"
echo "  工作进程: 4"
echo "  日志目录: $BASE_DIR/logs/"
echo ""
echo "按 Ctrl+C 停止服务"
echo "======================================"
echo ""

cd "$BASE_DIR/backend"

# 确保日志目录存在
mkdir -p "$BASE_DIR/logs"

# 启动 Gunicorn（前台运行）
exec gunicorn \
    --config "$BASE_DIR/config/gunicorn.conf.py" \
    --access-logfile "$BASE_DIR/logs/access.log" \
    --error-logfile "$BASE_DIR/logs/error.log" \
    wsgi:app
