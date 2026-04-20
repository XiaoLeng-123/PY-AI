#!/bin/bash
# 小马分析系统 - 一键部署脚本
set -e

# 配置变量
DEPLOY_PATH="${DEPLOY_PATH:-/opt/xiaoma-analysis}"
DEPLOY_ENV="deploy.env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

echo "======================================"
echo " 小马分析系统部署脚本"
echo "======================================"
echo "部署路径: $DEPLOY_PATH"
echo ""

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then 
    echo "✗ 错误: 请使用 root 用户或 sudo 运行"
    echo "  示例: sudo bash scripts/deploy.sh"
    exit 1
fi

# 检查必要文件
echo "[检查] 验证部署文件..."
REQUIRED_FILES=(
    "static/index.html"
    "backend/app/__init__.py"
    "backend/requirements.txt"
    "backend/wsgi.py"
    "config/nginx.conf"
    "config/gunicorn.conf.py"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$BASE_DIR/$file" ] && [ ! -f "$file" ]; then
        echo "✗ 错误: 缺少必要文件: $file"
        exit 1
    fi
done
echo "✓ 文件检查通过"
echo ""

# 1. 创建目录
echo "[1/7] 创建部署目录..."
mkdir -p "$DEPLOY_PATH"/{static,backend,config,logs,scripts}
echo "✓ 目录创建完成"
echo ""

# 2. 复制文件
echo "[2/7] 复制应用文件..."
if [ -d "$BASE_DIR/static" ]; then
    cp -r "$BASE_DIR/static/"* "$DEPLOY_PATH/static/"
elif [ -d "static" ]; then
    cp -r static/* "$DEPLOY_PATH/static/"
else
    echo "✗ 错误: 找不到 static 目录"
    exit 1
fi

if [ -d "$BASE_DIR/backend" ]; then
    cp -r "$BASE_DIR/backend/"* "$DEPLOY_PATH/backend/"
elif [ -d "backend" ]; then
    cp -r backend/* "$DEPLOY_PATH/backend/"
else
    echo "✗ 错误: 找不到 backend 目录"
    exit 1
fi

if [ -d "$BASE_DIR/config" ]; then
    cp "$BASE_DIR/config/"* "$DEPLOY_PATH/config/"
elif [ -d "config" ]; then
    cp config/* "$DEPLOY_PATH/config/"
else
    echo "✗ 错误: 找不到 config 目录"
    exit 1
fi

if [ -d "$BASE_DIR/scripts" ]; then
    cp "$BASE_DIR/scripts/"* "$DEPLOY_PATH/scripts/"
elif [ -d "scripts" ]; then
    cp scripts/* "$DEPLOY_PATH/scripts/"
fi

chmod +x "$DEPLOY_PATH/scripts/"*.sh 2>/dev/null || true
echo "✓ 文件复制完成"
echo ""

# 3. 创建虚拟环境并安装依赖
echo "[3/7] 创建 Python 虚拟环境..."
cd "$DEPLOY_PATH"

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✓ 虚拟环境创建完成"
else
    echo "→ 虚拟环境已存在，跳过创建"
fi

source venv/bin/activate
pip install --upgrade pip -q
pip install -r backend/requirements.txt -q
echo "✓ Python 依赖安装完成"
echo ""

# 4. 配置环境变量
echo "[4/7] 配置环境变量..."
if [ -f "$DEPLOY_PATH/config/$DEPLOY_ENV" ]; then
    cp "$DEPLOY_PATH/config/$DEPLOY_ENV" "$DEPLOY_PATH/backend/.env"
    echo "✓ 环境变量配置完成"
    echo "  → 请编辑 $DEPLOY_PATH/backend/.env 设置数据库等参数"
else
    echo "⚠ 警告: 未找到 deploy.env，使用默认配置"
fi
echo ""

# 5. 初始化数据库
echo "[5/7] 初始化数据库..."
if [ -f "$DEPLOY_PATH/scripts/init_db.py" ]; then
    source "$DEPLOY_PATH/venv/bin/activate"
    cd "$DEPLOY_PATH/backend"
    python "$DEPLOY_PATH/scripts/init_db.py" || echo "⚠ 数据库初始化可能需要手动执行"
    echo "✓ 数据库初始化尝试完成"
else
    echo "→ 跳过数据库初始化（init_db.py 不存在）"
fi
echo ""

# 6. 配置 Nginx
echo "[6/7] 配置 Nginx..."
if command -v nginx &> /dev/null; then
    cp "$DEPLOY_PATH/config/nginx.conf" /etc/nginx/sites-available/xiaoma-analysis
    ln -sf /etc/nginx/sites-available/xiaoma-analysis /etc/nginx/sites-enabled/
    
    # 测试 Nginx 配置
    if nginx -t 2>&1; then
        systemctl restart nginx
        echo "✓ Nginx 配置完成并重启"
    else
        echo "✗ Nginx 配置测试失败，请检查配置文件"
        echo "  运行: nginx -t 查看详细错误"
    fi
else
    echo "⚠ 警告: Nginx 未安装，请先安装 Nginx"
    echo "  Ubuntu/Debian: sudo apt install nginx"
    echo "  CentOS/RHEL: sudo yum install nginx"
fi
echo ""

# 7. 配置 Systemd 服务
echo "[7/7] 配置系统服务..."
cat > /etc/systemd/system/xiaoma-analysis.service << EOF
[Unit]
Description=XiaoMa Analysis Backend Service
After=network.target mysql.service mariadb.service
Wants=mysql.service mariadb.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=$DEPLOY_PATH/backend
Environment="PATH=$DEPLOY_PATH/venv/bin"
EnvironmentFile=$DEPLOY_PATH/backend/.env
ExecStart=$DEPLOY_PATH/venv/bin/gunicorn --config $DEPLOY_PATH/config/gunicorn.conf.py wsgi:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=append:$DEPLOY_PATH/logs/access.log
StandardError=append:$DEPLOY_PATH/logs/error.log

# 安全增强
NoNewPrivileges=true
PrivateTmp=true

# 资源限制
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xiaoma-analysis
systemctl start xiaoma-analysis

# 等待服务启动
sleep 2

# 检查服务状态
if systemctl is-active --quiet xiaoma-analysis; then
    echo "✓ 系统服务配置完成并启动成功"
else
    echo "✗ 服务启动失败，请检查日志"
    echo "  查看日志: journalctl -u xiaoma-analysis -n 50 --no-pager"
fi
echo ""

# 显示部署结果
echo "======================================"
echo " ✓ 部署完成！"
echo "======================================"
echo ""
echo "访问地址: http://caodax.cn"
echo ""
echo "常用命令:"
echo "  查看状态: sudo systemctl status xiaoma-analysis"
echo "  查看日志: sudo journalctl -u xiaoma-analysis -f"
echo "  重启服务: sudo systemctl restart xiaoma-analysis"
echo "  停止服务: sudo systemctl stop xiaoma-analysis"
echo ""
echo "日志文件:"
echo "  访问日志: $DEPLOY_PATH/logs/access.log"
echo "  错误日志: $DEPLOY_PATH/logs/error.log"
echo ""
echo "重要提示:"
echo "  1. 请检查后端日志确认服务正常运行"
echo "  2. 如需修改配置，编辑 $DEPLOY_PATH/backend/.env"
echo "  3. 修改配置后需重启: sudo systemctl restart xiaoma-analysis"
echo "======================================"
