#!/bin/bash
# 停止服务脚本
set -e

echo "正在停止服务..."

# 停止后端服务
if systemctl stop xiaoma-analysis 2>/dev/null; then
    echo "✓ 后端服务已停止"
else
    echo "⚠ 后端服务可能未运行"
fi

echo ""
echo "提示: Nginx 未停止，如需停止请运行: sudo systemctl stop nginx"
