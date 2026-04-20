#!/bin/bash
# 启动服务脚本
set -e

echo "正在启动服务..."

# 启动后端服务
if systemctl start xiaoma-analysis 2>/dev/null; then
    echo "✓ 后端服务已启动"
else
    echo "✗ 后端服务启动失败，尝试手动启动..."
    echo "  请检查: sudo journalctl -u xiaoma-analysis -n 20"
    exit 1
fi

# 启动 Nginx
if command -v nginx &> /dev/null; then
    if systemctl start nginx 2>/dev/null; then
        echo "✓ Nginx 已启动"
    else
        echo "⚠ Nginx 启动失败或已运行"
    fi
else
    echo "⚠ Nginx 未安装"
fi

echo ""
echo "服务状态:"
systemctl status xiaoma-analysis --no-pager -l | head -15
echo ""
echo "访问地址: http://caodax.cn"
