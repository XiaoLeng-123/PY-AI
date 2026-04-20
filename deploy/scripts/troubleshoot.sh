#!/bin/bash
# 故障诊断和修复脚本
set -e

DEPLOY_PATH="${DEPLOY_PATH:-/opt/xiaoma-analysis}"

echo "======================================"
echo " 故障诊断和修复工具"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 问题计数
ISSUES=0

# 检查项 1: 目录结构
echo -e "${BLUE}[检查 1/8]${NC} 目录结构..."
MISSING_DIRS=()
for dir in static backend config logs scripts; do
    if [ ! -d "$DEPLOY_PATH/$dir" ]; then
        MISSING_DIRS+=("$dir")
    fi
done

if [ ${#MISSING_DIRS[@]} -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} 目录结构完整"
else
    echo -e "  ${RED}✗${NC} 缺少目录: ${MISSING_DIRS[*]}"
    echo -e "  ${YELLOW}→${NC} 修复: 创建缺失的目录"
    for dir in "${MISSING_DIRS[@]}"; do
        mkdir -p "$DEPLOY_PATH/$dir"
    done
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 检查项 2: 关键文件
echo -e "${BLUE}[检查 2/8]${NC} 关键文件..."
MISSING_FILES=()
for file in backend/wsgi.py backend/requirements.txt config/nginx.conf config/gunicorn.conf.py; do
    if [ ! -f "$DEPLOY_PATH/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} 关键文件完整"
else
    echo -e "  ${RED}✗${NC} 缺少文件: ${MISSING_FILES[*]}"
    echo -e "  ${YELLOW}→${NC} 请重新上传部署包或手动补充缺失文件"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 检查项 3: Python 虚拟环境
echo -e "${BLUE}[检查 3/8]${NC} Python 虚拟环境..."
if [ -d "$DEPLOY_PATH/venv" ] && [ -f "$DEPLOY_PATH/venv/bin/python" ]; then
    PYTHON_VERSION=$("$DEPLOY_PATH/venv/bin/python" --version 2>&1)
    echo -e "  ${GREEN}✓${NC} 虚拟环境存在 ($PYTHON_VERSION)"
else
    echo -e "  ${RED}✗${NC} 虚拟环境不存在或损坏"
    echo -e "  ${YELLOW}→${NC} 修复: 重新创建虚拟环境"
    read -p "  是否现在创建? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$DEPLOY_PATH"
        python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip -q
        pip install -r backend/requirements.txt -q
        echo -e "  ${GREEN}✓${NC} 虚拟环境创建完成"
    fi
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 检查项 4: Python 依赖
echo -e "${BLUE}[检查 4/8]${NC} Python 依赖包..."
if [ -f "$DEPLOY_PATH/venv/bin/python" ]; then
    source "$DEPLOY_PATH/venv/bin/activate"
    MISSING_DEPS=()
    
    while IFS= read -r package; do
        # 跳过空行和注释
        [[ -z "$package" || "$package" =~ ^# ]] && continue
        # 提取包名（去除版本信息）
        pkg_name=$(echo "$package" | sed 's/[>=<!].*//')
        if ! python -c "import $pkg_name" 2>/dev/null; then
            MISSING_DEPS+=("$package")
        fi
    done < <(grep -v '^#' "$DEPLOY_PATH/backend/requirements.txt" | grep -v '^$')
    
    if [ ${#MISSING_DEPS[@]} -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} 所有依赖已安装"
    else
        echo -e "  ${RED}✗${NC} 缺少依赖: ${#MISSING_DEPS[@]} 个"
        echo -e "  ${YELLOW}→${NC} 修复: 安装缺失的依赖"
        read -p "  是否现在安装? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pip install -r "$DEPLOY_PATH/backend/requirements.txt" -q
            echo -e "  ${GREEN}✓${NC} 依赖安装完成"
        fi
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "  ${YELLOW}⚠${NC} 跳过依赖检查（虚拟环境不存在）"
fi
echo ""

# 检查项 5: 环境变量配置
echo -e "${BLUE}[检查 5/8]${NC} 环境变量配置..."
if [ -f "$DEPLOY_PATH/backend/.env" ]; then
    echo -e "  ${GREEN}✓${NC} .env 文件存在"
    
    # 检查关键配置
    if grep -q "DATABASE_URL" "$DEPLOY_PATH/backend/.env"; then
        DB_URL=$(grep "DATABASE_URL" "$DEPLOY_PATH/backend/.env" | cut -d'=' -f2-)
        if [ -n "$DB_URL" ]; then
            echo -e "  ${GREEN}✓${NC} 数据库连接已配置"
        else
            echo -e "  ${RED}✗${NC} 数据库连接为空"
            ISSUES=$((ISSUES + 1))
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} 未找到 DATABASE_URL 配置"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "  ${RED}✗${NC} .env 文件不存在"
    echo -e "  ${YELLOW}→${NC} 修复: 复制配置模板"
    if [ -f "$DEPLOY_PATH/config/deploy.env" ]; then
        cp "$DEPLOY_PATH/config/deploy.env" "$DEPLOY_PATH/backend/.env"
        echo -e "  ${GREEN}✓${NC} 已复制配置模板，请编辑 .env 文件"
    fi
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 检查项 6: Systemd 服务
echo -e "${BLUE}[检查 6/8]${NC} Systemd 服务配置..."
if systemctl list-unit-files | grep -q "xiaoma-analysis"; then
    echo -e "  ${GREEN}✓${NC} 系统服务已注册"
    
    if systemctl is-active --quiet xiaoma-analysis; then
        echo -e "  ${GREEN}✓${NC} 服务正在运行"
    else
        echo -e "  ${YELLOW}⚠${NC} 服务未运行"
        read -p "  是否启动服务? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            systemctl start xiaoma-analysis
            sleep 2
            if systemctl is-active --quiet xiaoma-analysis; then
                echo -e "  ${GREEN}✓${NC} 服务已启动"
            else
                echo -e "  ${RED}✗${NC} 服务启动失败，查看日志: journalctl -u xiaoma-analysis -n 20"
                ISSUES=$((ISSUES + 1))
            fi
        fi
    fi
else
    echo -e "  ${RED}✗${NC} 系统服务未注册"
    echo -e "  ${YELLOW}→${NC} 修复: 重新运行部署脚本"
    echo "  命令: sudo bash scripts/deploy.sh"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 检查项 7: Nginx 配置
echo -e "${BLUE}[检查 7/8]${NC} Nginx 配置..."
if command -v nginx &> /dev/null; then
    if [ -f "/etc/nginx/sites-available/xiaoma-analysis" ]; then
        echo -e "  ${GREEN}✓${NC} Nginx 配置文件存在"
        
        if nginx -t 2>&1 | grep -q "successful"; then
            echo -e "  ${GREEN}✓${NC} Nginx 配置测试通过"
        else
            echo -e "  ${RED}✗${NC} Nginx 配置测试失败"
            nginx -t 2>&1 | sed 's/^/    /'
            ISSUES=$((ISSUES + 1))
        fi
        
        if systemctl is-active --quiet nginx; then
            echo -e "  ${GREEN}✓${NC} Nginx 正在运行"
        else
            echo -e "  ${YELLOW}⚠${NC} Nginx 未运行"
            read -p "  是否启动 Nginx? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                systemctl start nginx
                echo -e "  ${GREEN}✓${NC} Nginx 已启动"
            fi
        fi
    else
        echo -e "  ${RED}✗${NC} Nginx 配置文件不存在"
        echo -e "  ${YELLOW}→${NC} 修复: 复制配置文件"
        if [ -f "$DEPLOY_PATH/config/nginx.conf" ]; then
            cp "$DEPLOY_PATH/config/nginx.conf" /etc/nginx/sites-available/xiaoma-analysis
            ln -sf /etc/nginx/sites-available/xiaoma-analysis /etc/nginx/sites-enabled/
            nginx -t && systemctl restart nginx
            echo -e "  ${GREEN}✓${NC} Nginx 配置完成"
        fi
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Nginx 未安装"
    echo "  安装命令: sudo apt install nginx (Ubuntu/Debian)"
fi
echo ""

# 检查项 8: 磁盘空间
echo -e "${BLUE}[检查 8/8]${NC} 磁盘空间..."
DISK_USAGE=$(df -h "$DEPLOY_PATH" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo -e "  ${RED}✗${NC} 磁盘使用率过高: ${DISK_USAGE}%"
    echo -e "  ${YELLOW}→${NC} 建议清理日志文件"
    read -p "  是否清理旧日志? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        find "$DEPLOY_PATH/logs" -name "*.log" -size +100M -exec truncate -s 0 {} \;
        echo -e "  ${GREEN}✓${NC} 日志已清理"
    fi
    ISSUES=$((ISSUES + 1))
elif [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "  ${YELLOW}⚠${NC} 磁盘使用率较高: ${DISK_USAGE}%"
else
    echo -e "  ${GREEN}✓${NC} 磁盘空间充足: ${DISK_USAGE}%"
fi
echo ""

# 总结
echo "======================================"
echo " 诊断完成"
echo "======================================"
echo ""

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ 未发现严重问题，系统运行正常${NC}"
else
    echo -e "${YELLOW}⚠ 发现 $ISSUES 个问题${NC}"
    echo ""
    echo "建议操作:"
    echo "  1. 根据上述提示修复问题"
    echo "  2. 重启服务: sudo systemctl restart xiaoma-analysis"
    echo "  3. 再次运行诊断: bash scripts/troubleshoot.sh"
fi

echo ""
echo "常用命令:"
echo "  查看日志: sudo journalctl -u xiaoma-analysis -f"
echo "  健康检查: bash scripts/health_check.sh"
echo "  重启服务: sudo systemctl restart xiaoma-analysis"
echo "======================================"
