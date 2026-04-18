#!/bin/bash
# 小马分析系统 - 一键部署脚本
set -e

DEPLOY_PATH="/opt/xiaoma-analysis"
DEPLOY_ENV="deploy.env"

echo "======================================"
echo " 小马分析系统部署脚本"
echo "======================================"

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 root 用户或 sudo 运行"
    exit 1
fi

# 1. 创建目录
echo "创建部署目录..."
mkdir -p "$DEPLOY_PATH"/{static,backend,config,logs,venv}

# 2. 复制文件
echo "复制应用文件..."
cp -r static/* "$DEPLOY_PATH/static/"
cp -r backend/* "$DEPLOY_PATH/backend/"
cp config/* "$DEPLOY_PATH/config/"

# 3. 创建虚拟环境
echo "创建 Python 虚拟环境..."
cd "$DEPLOY_PATH"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# 4. 配置环境变量
if [ -f "$DEPLOY_PATH/config/$DEPLOY_ENV" ]; then
    cp "$DEPLOY_PATH/config/$DEPLOY_ENV" "$DEPLOY_PATH/backend/.env"
fi

# 5. 配置 Nginx
echo "配置 Nginx..."
cp "$DEPLOY_PATH/config/nginx.conf" /etc/nginx/sites-available/xiaoma-analysis
ln -sf /etc/nginx/sites-available/xiaoma-analysis /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# 6. 配置 Systemd 服务
echo "配置系统服务..."
cat > /etc/systemd/system/xiaoma-analysis.service << EOF
[Unit]
Description=XiaoMa Analysis Backend
After=network.target mysql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=$DEPLOY_PATH/backend
Environment="PATH=$DEPLOY_PATH/venv/bin"
ExecStart=$DEPLOY_PATH/venv/bin/gunicorn --config $DEPLOY_PATH/config/gunicorn.conf.py wsgi:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xiaoma-analysis
systemctl start xiaoma-analysis

echo ""
echo "======================================"
echo " ✓ 部署完成！"
echo " 访问地址: http://caodax.cn"
echo " 查看日志: journalctl -u xiaoma-analysis -f"
echo "======================================"
