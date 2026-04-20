#!/bin/bash
# 健康检查脚本
set -e

DEPLOY_PATH="${DEPLOY_PATH:-/opt/xiaoma-analysis}"

echo "======================================"
echo " 服务健康检查"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Nginx
echo "[1/5] 检查 Nginx..."
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        echo -e "  ${GREEN}✓${NC} Nginx 运行正常"
    else
        echo -e "  ${RED}✗${NC} Nginx 未运行"
        echo "  启动命令: sudo systemctl start nginx"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Nginx 未安装"
fi
echo ""

# 检查 Gunicorn/Systemd 服务
echo "[2/5] 检查后端服务..."
if systemctl is-active --quiet xiaoma-analysis; then
    echo -e "  ${GREEN}✓${NC} 后端服务运行正常"
    
    # 显示进程信息
    PID=$(systemctl show xiaoma-analysis --property=MainPID --value)
    if [ "$PID" != "0" ]; then
        echo "  → PID: $PID"
    fi
else
    echo -e "  ${RED}✗${NC} 后端服务未运行"
    echo "  启动命令: sudo systemctl start xiaoma-analysis"
fi
echo ""

# 检查日志文件
echo "[3/5] 检查日志文件..."
if [ -f "$DEPLOY_PATH/logs/error.log" ]; then
    ERROR_LINES=$(tail -100 "$DEPLOY_PATH/logs/error.log" | grep -c "ERROR\|Exception\|Traceback" || true)
    if [ "$ERROR_LINES" -gt 0 ]; then
        echo -e "  ${YELLOW}⚠${NC} 发现 $ERROR_LINES 条错误日志"
        echo "  最近错误:"
        tail -5 "$DEPLOY_PATH/logs/error.log" | grep "ERROR\|Exception" | head -3 | sed 's/^/    /'
    else
        echo -e "  ${GREEN}✓${NC} 日志正常，无严重错误"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} 日志文件不存在"
fi
echo ""

# 检查 API 端点
echo "[4/5] 测试 API 连接..."
API_URL="http://127.0.0.1:5000"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$API_URL/api/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} API 响应正常 (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "  ${RED}✗${NC} API 无法连接"
    echo "  请检查:"
    echo "    1. 后端服务是否启动: sudo systemctl status xiaoma-analysis"
    echo "    2. Gunicorn 配置是否正确: cat $DEPLOY_PATH/config/gunicorn.conf.py"
else
    echo -e "  ${YELLOW}⚠${NC} API 响应异常 (HTTP $HTTP_CODE)"
fi
echo ""

# 检查前端访问
echo "[5/5] 测试前端访问..."
FRONTEND_URL="http://caodax.cn"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$FRONTEND_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} 前端访问正常 (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "  ${RED}✗${NC} 前端无法访问"
    echo "  请检查:"
    echo "    1. Nginx 是否运行: sudo systemctl status nginx"
    echo "    2. Nginx 配置: sudo nginx -t"
    echo "    3. DNS 解析是否正确"
else
    echo -e "  ${YELLOW}⚠${NC} 前端响应异常 (HTTP $HTTP_CODE)"
fi
echo ""

# 磁盘空间检查
echo "[额外] 检查磁盘空间..."
DISK_USAGE=$(df -h "$DEPLOY_PATH" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo -e "  ${RED}✗${NC} 磁盘使用率过高: ${DISK_USAGE}%"
    echo "  建议清理日志文件或扩展磁盘"
elif [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "  ${YELLOW}⚠${NC} 磁盘使用率较高: ${DISK_USAGE}%"
else
    echo -e "  ${GREEN}✓${NC} 磁盘空间充足: ${DISK_USAGE}%"
fi
echo ""

# 总结
echo "======================================"
echo " 检查完成"
echo "======================================"
echo ""
echo "快速操作:"
echo "  查看实时日志: sudo journalctl -u xiaoma-analysis -f"
echo "  重启服务: sudo systemctl restart xiaoma-analysis"
echo "  查看状态: sudo systemctl status xiaoma-analysis"
