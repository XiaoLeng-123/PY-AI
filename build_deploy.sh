# 小马分析系统 - Linux 部署包
# 版本: 1.0
# 域名: caodax.cn

# 构建前端
cd frontend
npm run build
cd ..

# 创建部署目录结构
mkdir -p deploy/{static,backend,config,logs}

# 复制前端构建产物
cp -r frontend/dist/* deploy/static/

# 复制后端代码
cp -r app deploy/backend/
cp requirements.txt deploy/backend/
cp wsgi.py deploy/backend/

# 创建配置文件
cp config/nginx.conf deploy/config/
cp config/deploy.env deploy/config/
cp config/gunicorn.conf.py deploy/config/

# 创建启动脚本
cp scripts/deploy.sh deploy/
cp scripts/start.sh deploy/
cp scripts/stop.sh deploy/
cp scripts/restart.sh deploy/

echo "部署包已生成: deploy/"
