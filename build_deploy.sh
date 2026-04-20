#!/bin/bash
# 小马分析系统 - Linux 部署包构建脚本
# 版本: 1.0
# 域名: caodax.cn
set -e

echo "======================================"
echo " 开始构建部署包..."
echo "======================================"

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# 1. 构建前端
echo ""
echo "[1/5] 构建前端应用..."
if [ ! -d "frontend/node_modules" ]; then
    echo "  → 安装前端依赖..."
    cd frontend
    npm install
    cd ..
fi

cd frontend
npm run build
cd ..
echo "  ✓ 前端构建完成"

# 2. 清理并创建部署目录结构
echo ""
echo "[2/5] 创建部署目录结构..."
rm -rf deploy
mkdir -p deploy/{static,backend/app,config,logs,scripts}
echo "  ✓ 目录结构创建完成"

# 3. 复制前端构建产物
echo ""
echo "[3/5] 复制前端文件..."
if [ -d "frontend/dist" ] && [ "$(ls -A frontend/dist 2>/dev/null)" ]; then
    cp -r frontend/dist/* deploy/static/
    echo "  ✓ 前端文件复制完成"
else
    echo "  ✗ 错误: frontend/dist 目录为空或不存在"
    exit 1
fi

# 4. 复制后端代码和配置
echo ""
echo "[4/5] 复制后端文件..."

# 复制后端 Python 代码
cp -r app/* deploy/backend/app/
cp requirements.txt deploy/backend/

# 复制 wsgi.py（从项目根目录或 deploy/backend）
if [ -f "wsgi.py" ]; then
    cp wsgi.py deploy/backend/
elif [ -f "deploy/backend/wsgi.py" ]; then
    # wsgi.py 已存在于目标位置，跳过
    echo "  → wsgi.py 已存在"
else
    echo "  ✗ 错误: wsgi.py 文件不存在"
    exit 1
fi
echo "  ✓ 后端代码复制完成"

# 5. 复制配置文件和脚本
echo ""
echo "[5/5] 复制配置和脚本..."

# 复制配置文件
for file in nginx.conf deploy.env gunicorn.conf.py; do
    if [ -f "deploy/config/$file" ]; then
        cp "deploy/config/$file" deploy/config/
    else
        echo "  ✗ 警告: config/$file 不存在"
    fi
done

# 复制启动脚本
for file in deploy.sh start.sh stop.sh restart.sh health_check.sh init_db.py; do
    if [ -f "deploy/scripts/$file" ]; then
        cp "deploy/scripts/$file" deploy/scripts/
        chmod +x "deploy/scripts/$file" 2>/dev/null || true
    else
        echo "  ✗ 警告: scripts/$file 不存在"
    fi
done

echo "  ✓ 配置和脚本复制完成"

# 6. 创建 README 部署说明
echo ""
echo "生成部署说明..."
cat > deploy/README.md << 'EOF'
# 小马分析系统 - 部署说明

## 快速部署

```bash
# 1. 上传 deploy 目录到服务器 /opt/xiaoma-analysis
scp -r deploy/* root@your-server:/opt/xiaoma-analysis/

# 2. 在服务器上执行部署脚本
cd /opt/xiaoma-analysis
sudo bash scripts/deploy.sh
```

## 手动部署步骤

### 前置要求
- Python 3.8+
- Node.js 16+ (仅用于重新构建前端)
- Nginx
- MySQL/MariaDB

### 部署步骤

1. **安装 Python 依赖**
   ```bash
   cd /opt/xiaoma-analysis/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **配置环境变量**
   ```bash
   cp config/deploy.env backend/.env
   # 编辑 .env 文件，设置数据库连接等参数
   vim backend/.env
   ```

3. **初始化数据库**
   ```bash
   python3 scripts/init_db.py
   ```

4. **配置 Nginx**
   ```bash
   sudo cp config/nginx.conf /etc/nginx/sites-available/xiaoma-analysis
   sudo ln -sf /etc/nginx/sites-available/xiaoma-analysis /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **配置 Systemd 服务**
   ```bash
   sudo bash scripts/deploy.sh  # 会自动配置 systemd
   ```

## 服务管理

```bash
# 启动服务
sudo systemctl start xiaoma-analysis
sudo systemctl start nginx

# 停止服务
sudo systemctl stop xiaoma-analysis

# 重启服务
sudo systemctl restart xiaoma-analysis

# 查看日志
sudo journalctl -u xiaoma-analysis -f

# 健康检查
bash scripts/health_check.sh
```

## 目录结构

```
/opt/xiaoma-analysis/
├── static/          # 前端静态文件
├── backend/         # 后端 Python 应用
│   ├── app/        # 应用代码
│   ├── venv/       # Python 虚拟环境（部署时创建）
│   ├── .env        # 环境变量配置
│   ├── requirements.txt
│   └── wsgi.py     # WSGI 入口
├── config/         # 配置文件
│   ├── nginx.conf
│   ├── gunicorn.conf.py
│   └── deploy.env
├── scripts/        # 运维脚本
│   ├── deploy.sh
│   ├── start.sh
│   ├── stop.sh
│   ├── restart.sh
│   ├── health_check.sh
│   └── init_db.py
└── logs/           # 日志目录
    ├── access.log
    └── error.log
```

## 常见问题

### 1. 前端资源加载失败
检查 Nginx 配置中的 static 路径是否正确指向 `/opt/xiaoma-analysis/static`

### 2. 后端连接数据库失败
检查 `backend/.env` 中的数据库配置是否正确

### 3. Gunicorn 启动失败
查看日志：`tail -f logs/error.log`

## 访问地址

- 前端: http://caodax.cn
- API: http://caodax.cn/api

## 技术支持

如有问题，请查看日志文件或联系技术支持。
EOF
echo "  ✓ 部署说明生成完成"

# 完成
echo ""
echo "======================================"
echo " ✓ 部署包构建完成！"
echo " 位置: $PROJECT_ROOT/deploy/"
echo " 大小: $(du -sh deploy/ | cut -f1)"
echo ""
echo "下一步："
echo "  1. 将 deploy/ 目录上传到服务器"
echo "  2. 在服务器上运行: sudo bash scripts/deploy.sh"
echo "======================================"
