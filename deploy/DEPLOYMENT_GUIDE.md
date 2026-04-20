# 小马分析系统 - Linux 生产环境部署指南

## 📋 目录

- [前置要求](#前置要求)
- [快速部署](#快速部署)
- [详细部署步骤](#详细部署步骤)
- [配置说明](#配置说明)
- [服务管理](#服务管理)
- [故障排查](#故障排查)
- [安全建议](#安全建议)
- [性能优化](#性能优化)

---

## 前置要求

### 硬件要求
- CPU: 2核心或以上
- 内存: 4GB 或以上
- 磁盘: 20GB 可用空间
- 网络: 稳定的互联网连接

### 软件要求
- 操作系统: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- Python: 3.8 或更高版本
- Node.js: 16.x 或更高版本（仅用于构建前端）
- Nginx: 1.18 或更高版本
- MySQL/MariaDB: 5.7 或更高版本

### 系统准备

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx mysql-server curl git

# CentOS/RHEL
sudo yum install -y python3 python3-pip nginx mariadb-server curl git
sudo systemctl enable mariadb
sudo systemctl start mariadb
```

---

## 快速部署

### 方式一：使用自动化脚本（推荐）

```bash
# 1. 上传部署包到服务器
scp -r deploy/* root@your-server:/opt/xiaoma-analysis/

# 2. SSH 登录服务器
ssh root@your-server

# 3. 执行一键部署
cd /opt/xiaoma-analysis
sudo bash scripts/deploy.sh
```

### 方式二：手动部署

参见下方的[详细部署步骤](#详细部署步骤)

---

## 详细部署步骤

### 步骤 1: 上传文件

将 `deploy/` 目录的所有内容上传到服务器的 `/opt/xiaoma-analysis/` 目录：

```bash
# 方法 1: 使用 scp
scp -r deploy/* root@your-server:/opt/xiaoma-analysis/

# 方法 2: 使用 rsync（推荐，支持断点续传）
rsync -avz deploy/ root@your-server:/opt/xiaoma-analysis/

# 方法 3: 打包后上传
tar czf deploy.tar.gz deploy/
scp deploy.tar.gz root@your-server:/opt/
ssh root@your-server "cd /opt && tar xzf deploy.tar.gz"
```

### 步骤 2: 设置权限

```bash
sudo chown -R www-data:www-data /opt/xiaoma-analysis
sudo chmod -R 755 /opt/xiaoma-analysis
sudo chmod +x /opt/xiaoma-analysis/scripts/*.sh
```

### 步骤 3: 创建 Python 虚拟环境

```bash
cd /opt/xiaoma-analysis
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### 步骤 4: 配置环境变量

```bash
# 复制配置模板
cp config/deploy.env backend/.env

# 编辑配置文件
vim backend/.env
```

**关键配置项：**

```env
# 数据库配置
DATABASE_URL=mysql+pymysql://username:password@localhost/db_name

# Flask 配置
FLASK_ENV=production
SECRET_KEY=your-secret-key-here

# API 密钥（如需要）
API_KEY=your-api-key

# 其他配置
DEBUG=False
LOG_LEVEL=INFO
```

### 步骤 5: 初始化数据库

```bash
# 确保 MySQL 正在运行
sudo systemctl status mysql

# 创建数据库
mysql -u root -p
CREATE DATABASE xiaoma_analysis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'xiaoma'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON xiaoma_analysis.* TO 'xiaoma'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 运行初始化脚本
source venv/bin/activate
cd backend
python ../scripts/init_db.py
```

### 步骤 6: 配置 Nginx

```bash
# 复制 Nginx 配置
sudo cp config/nginx.conf /etc/nginx/sites-available/xiaoma-analysis

# 创建符号链接
sudo ln -sf /etc/nginx/sites-available/xiaoma-analysis /etc/nginx/sites-enabled/

# 删除默认配置（如果存在）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

**Nginx 配置检查清单：**
- [ ] server_name 设置为你的域名
- [ ] SSL 证书路径正确（如果使用 HTTPS）
- [ ] 静态文件路径指向 `/opt/xiaoma-analysis/static`
- [ ] proxy_pass 指向 `http://127.0.0.1:5000`

### 步骤 7: 配置 Systemd 服务

```bash
# 创建服务文件
sudo tee /etc/systemd/system/xiaoma-analysis.service > /dev/null <<EOF
[Unit]
Description=XiaoMa Analysis Backend Service
After=network.target mysql.service mariadb.service
Wants=mysql.service mariadb.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/xiaoma-analysis/backend
Environment="PATH=/opt/xiaoma-analysis/venv/bin"
EnvironmentFile=/opt/xiaoma-analysis/backend/.env
ExecStart=/opt/xiaoma-analysis/venv/bin/gunicorn --config /opt/xiaoma-analysis/config/gunicorn.conf.py wsgi:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=append:/opt/xiaoma-analysis/logs/access.log
StandardError=append:/opt/xiaoma-analysis/logs/error.log

# 安全增强
NoNewPrivileges=true
PrivateTmp=true

# 资源限制
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd
sudo systemctl daemon-reload

# 启用并启动服务
sudo systemctl enable xiaoma-analysis
sudo systemctl start xiaoma-analysis

# 检查服务状态
sudo systemctl status xiaoma-analysis
```

### 步骤 8: 验证部署

```bash
# 运行健康检查
bash scripts/health_check.sh

# 测试 API
curl http://127.0.0.1:5000/api/health

# 测试前端
curl http://caodax.cn

# 查看日志
sudo journalctl -u xiaoma-analysis -f
```

---

## 配置说明

### Gunicorn 配置

位置: `config/gunicorn.conf.py`

```python
# 监听地址
bind = "127.0.0.1:5000"

# 工作进程数（CPU核心数 * 2 + 1）
workers = 4

# 线程数
threads = 2

# 超时时间（秒）
timeout = 120

# 日志级别
loglevel = "info"
```

**性能调优建议：**
- workers: 根据 CPU 核心数调整
- threads: 对于 I/O 密集型应用可以增加
- timeout: 根据实际响应时间调整

### Nginx 配置要点

```nginx
server {
    listen 80;
    server_name caodax.cn www.caodax.cn;
    
    # 静态文件
    location / {
        root /opt/xiaoma-analysis/static;
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| DATABASE_URL | 数据库连接字符串 | mysql+pymysql://user:pass@localhost/db |
| FLASK_ENV | 运行环境 | production |
| SECRET_KEY | Flask 密钥 | random-string-here |
| DEBUG | 调试模式 | False |
| LOG_LEVEL | 日志级别 | INFO |

---

## 服务管理

### 基本操作

```bash
# 启动服务
sudo systemctl start xiaoma-analysis

# 停止服务
sudo systemctl stop xiaoma-analysis

# 重启服务
sudo systemctl restart xiaoma-analysis

# 重载配置（不中断服务）
sudo systemctl reload xiaoma-analysis

# 查看状态
sudo systemctl status xiaoma-analysis

# 开机自启
sudo systemctl enable xiaoma-analysis

# 取消开机自启
sudo systemctl disable xiaoma-analysis
```

### 日志管理

```bash
# 实时查看日志
sudo journalctl -u xiaoma-analysis -f

# 查看最近 100 行
sudo journalctl -u xiaoma-analysis -n 100

# 查看今天的日志
sudo journalctl -u xiaoma-analysis --since today

# 查看错误日志
sudo journalctl -u xiaoma-analysis -p err

# 查看 Gunicorn 日志
tail -f /opt/xiaoma-analysis/logs/error.log
tail -f /opt/xiaoma-analysis/logs/access.log
```

### 使用便捷脚本

```bash
# 健康检查
bash scripts/health_check.sh

# 故障诊断
bash scripts/troubleshoot.sh

# 手动启动（调试用）
bash scripts/manual_start.sh

# 重启服务
bash scripts/restart.sh

# 停止服务
bash scripts/stop.sh
```

---

## 故障排查

### 常见问题

#### 1. 服务无法启动

```bash
# 查看详细错误
sudo journalctl -u xiaoma-analysis -n 50 --no-pager

# 检查端口占用
sudo lsof -i :5000

# 检查配置文件
cat /opt/xiaoma-analysis/backend/.env

# 测试 Gunicorn 配置
source /opt/xiaoma-analysis/venv/bin/activate
cd /opt/xiaoma-analysis/backend
gunicorn --check-config --config ../config/gunicorn.conf.py wsgi:app
```

#### 2. 数据库连接失败

```bash
# 测试数据库连接
mysql -u username -p -h localhost database_name

# 检查 MySQL 状态
sudo systemctl status mysql

# 查看数据库用户权限
mysql -u root -p
SELECT user, host FROM mysql.user;
SHOW GRANTS FOR 'username'@'localhost';
```

#### 3. Nginx 502 Bad Gateway

```bash
# 检查后端是否运行
sudo systemctl status xiaoma-analysis

# 检查 Gunicorn 日志
tail -100 /opt/xiaoma-analysis/logs/error.log

# 测试后端直接访问
curl http://127.0.0.1:5000/api/health

# 检查 Nginx 配置
sudo nginx -t
sudo tail -100 /var/log/nginx/error.log
```

#### 4. 前端资源加载失败

```bash
# 检查静态文件是否存在
ls -la /opt/xiaoma-analysis/static/

# 检查 Nginx 配置中的 root 路径
grep -A 5 "location /" /etc/nginx/sites-available/xiaoma-analysis

# 清除浏览器缓存或使用无痕模式测试
```

#### 5. 内存不足

```bash
# 查看内存使用
free -h
htop

# 减少 Gunicorn workers
vim /opt/xiaoma-analysis/config/gunicorn.conf.py
# 修改: workers = 2

# 重启服务
sudo systemctl restart xiaoma-analysis
```

### 使用诊断工具

```bash
# 运行完整的故障诊断
bash scripts/troubleshoot.sh

# 该脚本会检查:
# - 目录结构
# - 关键文件
# - Python 虚拟环境
# - 依赖包
# - 环境变量
# - Systemd 服务
# - Nginx 配置
# - 磁盘空间
```

---

## 安全建议

### 1. 防火墙配置

```bash
# Ubuntu (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. 配置 SSL/HTTPS

```bash
# 使用 Let's Encrypt（免费）
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d caodax.cn -d www.caodax.cn

# 自动续期
sudo crontab -e
# 添加: 0 3 * * * certbot renew --quiet
```

### 3. 数据库安全

```sql
-- 创建专用数据库用户
CREATE USER 'xiaoma'@'localhost' IDENTIFIED BY 'strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON xiaoma_analysis.* TO 'xiaoma'@'localhost';
FLUSH PRIVILEGES;

-- 不要使用 root 用户连接应用
```

### 4. 文件权限

```bash
# 设置正确的所有权
sudo chown -R www-data:www-data /opt/xiaoma-analysis

# 敏感文件权限
sudo chmod 600 /opt/xiaoma-analysis/backend/.env
sudo chmod 644 /opt/xiaoma-analysis/config/*.conf
```

### 5. 定期更新

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 更新 Python 依赖
source /opt/xiaoma-analysis/venv/bin/activate
pip list --outdated
pip install --upgrade -r /opt/xiaoma-analysis/backend/requirements.txt
```

---

## 性能优化

### 1. Gunicorn 优化

```python
# config/gunicorn.conf.py

# 根据服务器配置调整
workers = multiprocessing.cpu_count() * 2 + 1  # CPU 密集型
# workers = multiprocessing.cpu_count() * 4     # I/O 密集型

threads = 2
worker_class = "sync"  # 或 "gevent" 用于高并发

# 防止内存泄漏
max_requests = 1000
max_requests_jitter = 50
```

### 2. Nginx 优化

```nginx
# /etc/nginx/nginx.conf

worker_processes auto;
worker_connections 1024;

# 启用 gzip 压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

# 缓存静态文件
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 3. 数据库优化

```sql
-- 添加索引
CREATE INDEX idx_stock_code ON stocks(code);
CREATE INDEX idx_date ON prices(date);

-- 优化查询
EXPLAIN SELECT * FROM prices WHERE stock_id = 1 ORDER BY date DESC LIMIT 100;

-- 定期维护
OPTIMIZE TABLE prices;
ANALYZE TABLE stocks;
```

### 4. 监控和告警

```bash
# 安装监控工具
sudo apt install prometheus-node-exporter grafana

# 设置日志轮转
sudo vim /etc/logrotate.d/xiaoma-analysis
```

**日志轮转配置：**
```
/opt/xiaoma-analysis/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
}
```

---

## 备份和恢复

### 数据库备份

```bash
# 创建备份脚本
cat > /opt/xiaoma-analysis/scripts/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/xiaoma-analysis/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mysqldump -u username -p'password' xiaoma_analysis > $BACKUP_DIR/db_$DATE.sql
gzip $BACKUP_DIR/db_$DATE.sql

# 保留最近 30 天的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/xiaoma-analysis/scripts/backup_db.sh

# 添加到 crontab（每天凌晨 2 点备份）
crontab -e
# 添加: 0 2 * * * /opt/xiaoma-analysis/scripts/backup_db.sh
```

### 数据恢复

```bash
# 解压备份
gunzip db_20240101_020000.sql.gz

# 恢复数据库
mysql -u username -p xiaoma_analysis < db_20240101_020000.sql
```

---

## 升级部署

### 增量更新

```bash
# 1. 备份当前版本
sudo systemctl stop xiaoma-analysis
cp -r /opt/xiaoma-analysis /opt/xiaoma-analysis.backup

# 2. 上传新版本
rsync -avz deploy/ root@server:/opt/xiaoma-analysis/

# 3. 安装新依赖
source /opt/xiaoma-analysis/venv/bin/activate
pip install -r /opt/xiaoma-analysis/backend/requirements.txt

# 4. 迁移数据库（如果需要）
python /opt/xiaoma-analysis/scripts/init_db.py

# 5. 重启服务
sudo systemctl start xiaoma-analysis

# 6. 验证
bash /opt/xiaoma-analysis/scripts/health_check.sh
```

### 回滚

```bash
# 如果新版本有问题，快速回滚
sudo systemctl stop xiaoma-analysis
rm -rf /opt/xiaoma-analysis
mv /opt/xiaoma-analysis.backup /opt/xiaoma-analysis
sudo systemctl start xiaoma-analysis
```

---

## 技术支持

### 获取帮助

1. **查看日志**
   ```bash
   sudo journalctl -u xiaoma-analysis -f
   tail -f /opt/xiaoma-analysis/logs/error.log
   ```

2. **运行诊断**
   ```bash
   bash scripts/troubleshoot.sh
   bash scripts/health_check.sh
   ```

3. **检查系统资源**
   ```bash
   htop
   df -h
   free -h
   ```

### 联系信息

- 项目文档: README.md
- 问题反馈: GitHub Issues
- 紧急联系: 技术支持团队

---

## 附录

### A. 目录结构

```
/opt/xiaoma-analysis/
├── static/              # 前端静态文件
│   ├── index.html
│   ├── assets/
│   └── ...
├── backend/             # 后端应用
│   ├── app/            # Python 应用代码
│   ├── venv/           # Python 虚拟环境
│   ├── .env            # 环境变量
│   ├── requirements.txt
│   └── wsgi.py
├── config/             # 配置文件
│   ├── nginx.conf
│   ├── gunicorn.conf.py
│   └── deploy.env
├── scripts/            # 运维脚本
│   ├── deploy.sh
│   ├── health_check.sh
│   ├── troubleshoot.sh
│   ├── manual_start.sh
│   └── init_db.py
├── logs/               # 日志目录
│   ├── access.log
│   └── error.log
└── backups/            # 备份目录（自动创建）
```

### B. 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 80 | Nginx | HTTP |
| 443 | Nginx | HTTPS |
| 5000 | Gunicorn | 后端应用（仅本地访问）|
| 3306 | MySQL | 数据库（仅本地访问）|

### C. 常用命令速查

```bash
# 服务管理
sudo systemctl [start|stop|restart|status] xiaoma-analysis
sudo systemctl [start|stop|restart|status] nginx

# 日志查看
sudo journalctl -u xiaoma-analysis -f
tail -f /opt/xiaoma-analysis/logs/*.log

# 健康检查
bash scripts/health_check.sh
bash scripts/troubleshoot.sh

# 数据库
mysql -u username -p database_name
mysqldump -u username -p database_name > backup.sql

# 性能监控
htop
iotop
nethogs
```

---

**最后更新**: 2024-01-01  
**版本**: 1.0  
**维护者**: 开发团队
