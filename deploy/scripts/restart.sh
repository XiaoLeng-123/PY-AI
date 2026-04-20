#!/bin/bash
# 重启服务脚本
set -e

echo "正在重启服务..."

# 重启后端服务
if systemctl restart xiaoma-analysis 2>/dev/null; then
    echo "✓ 后端服务已重启"
else
    echo "✗ 后端服务重启失败"
    exit 1
fi

# 重启 Nginx
if command -v nginx &> /dev/null; then
    if systemctl restart nginx 2>/dev/null; then
        echo "✓ Nginx 已重启"
    else
        echo "⚠ Nginx 重启失败"
    fi
fi

echo ""
echo "等待服务启动..."
sleep 2

# 检查服务状态
if systemctl is-active --quiet xiaoma-analysis; then
    echo "✓ 服务运行正常"
else
    echo "✗ 服务启动失败，请查看日志:"
    echo "  sudo journalctl -u xiaoma-analysis -n 30"
    exit 1
fi
