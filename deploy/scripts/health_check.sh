#!/bin/bash
# 健康检查脚本
set -e

echo "检查服务状态..."

# 检查 Nginx
if systemctl is-active --quiet nginx; then
    echo "✓ Nginx 运行正常"
else
    echo "✗ Nginx 未运行"
fi

# 检查 Gunicorn
if systemctl is-active --quiet xiaoma-analysis; then
    echo "✓ Gunicorn 运行正常"
else
    echo "✗ Gunicorn 未运行"
fi

# 检查 API 端点
echo ""
echo "测试 API 连接..."
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health | grep -q "200"; then
    echo "✓ API 响应正常"
else
    echo "✗ API 无响应"
fi

# 检查前端
echo ""
echo "测试前端访问..."
if curl -s -o /dev/null -w "%{http_code}" http://caodax.cn | grep -q "200"; then
    echo "✓ 前端访问正常"
else
    echo "✗ 前端无法访问"
fi

echo ""
echo "检查完成"
