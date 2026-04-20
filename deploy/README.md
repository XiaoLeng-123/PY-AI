# 小马分析系统 - Linux 生产环境部署包

> **版本**: 1.0  
> **域名**: caodax.cn  
> **最后更新**: 2024-04-20

## 📖 文档导航

- 🚀 [快速开始](#-快速开始)
- 📦 [文件结构](#-文件结构)
- 🔧 [配置说明](#-配置说明)
- 🛠️ [服务管理](#️-服务管理)
- ❓ [故障排查](#-故障排查)
- 📚 [详细文档](#-详细文档)

---

## 🚀 快速开始

### 前置检查清单

在开始部署前，请确保：
- [ ] 服务器已安装 Python 3.8+
- [ ] 服务器已安装 Nginx
- [ ] 服务器已安装 MySQL/MariaDB
- [ ] 你有 root 或 sudo 权限
- [ ] 域名已解析到服务器 IP

### 步骤 1: 构建部署包（在开发机器上）

```bash
# 在项目根目录执行
cd C:\PY-AI
bash build_deploy.sh
```

**注意**: 
- Windows 用户可以使用 Git Bash 或 WSL 运行此脚本
- 确保已安装 Node.js 和 npm
- 脚本会自动安装前端依赖并构建

### 步骤 2: 上传到服务器

```bash
# 方式 1: 使用 scp
scp -r deploy/* root@your-server:/opt/xiaoma-analysis/

# 方式 2: 使用 rsync（推荐，支持断点续传）
rsync -avz deploy/ root@your-server:/opt/xiaoma-analysis/

# 方式 3: 打包后上传
tar czf deploy.tar.gz deploy/
scp deploy.tar.gz root@your-server:/opt/
ssh root@your-server "cd /opt && tar xzf deploy.tar.gz"
```

### 步骤 3: 一键部署（在服务器上）

```bash
# SSH 登录服务器
ssh root@your-server

# 进入部署目录
cd /opt/xiaoma-analysis

# 运行一键部署脚本
sudo bash scripts/deploy.sh
```

部署脚本会自动完成：
- ✅ 创建目录结构
- ✅ 安装 Python 依赖
- ✅ 配置环境变量
- ✅ 初始化数据库
- ✅ 配置 Nginx
- ✅ 配置 Systemd 服务
- ✅ 启动所有服务

### 步骤 4: 配置环境变量

编辑 `.env` 文件：

```bash
sudo nano /opt/xiaoma-analysis/backend/.env
```

**必须修改的配置：**

```env
# 数据库配置
DATABASE_URL=mysql+pymysql://username:password@localhost/database_name

# Flask 密钥（生成随机字符串）
SECRET_KEY=your-secret-key-here

# API 密钥（如需要）
ALIYUN_API_KEY=your-aliyun-key
DOUBAO_API_KEY=your-doubao-key

# 其他配置
FLASK_ENV=production
DEBUG=False
LOG_LEVEL=INFO
```

**生成 SECRET_KEY：**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 步骤 5: 重启服务

```bash
sudo systemctl restart xiaoma-analysis
sudo systemctl restart nginx
```

### 步骤 6: 验证部署

```bash
# 运行健康检查
bash scripts/health_check.sh

# 测试 API
curl http://127.0.0.1:5000/api/health

# 测试前端访问
curl http://caodax.cn

# 查看服务状态
sudo systemctl status xiaoma-analysis
sudo systemctl status nginx
```

---

## 📦 文件结构

```
/opt/xiaoma-analysis/
├── static/              # 前端静态文件（Nginx 直接提供）
│   ├── index.html
│   ├── assets/         # CSS, JS, 图片等资源
│   └── favicon.svg
├── backend/             # Flask 后端应用
│   ├── app/            # Python 应用代码
│   │   ├── models/     # 数据模型
│   │   ├── routes/     # API 路由
│   │   ├── services/   # 业务逻辑
│   │   └── utils/      # 工具函数
│   ├── venv/           # Python 虚拟环境（部署时创建）
│   ├── .env            # 环境变量配置（需手动创建）
│   ├── requirements.txt
│   └── wsgi.py         # WSGI 入口文件
├── config/             # 配置文件
│   ├── nginx.conf      # Nginx 服务器配置
│   ├── gunicorn.conf.py # Gunicorn WSGI 服务器配置
│   └── deploy.env      # 环境变量模板
├── scripts/            # 运维脚本
│   ├── deploy.sh       # 一键部署脚本
│   ├── start.sh        # 启动服务
│   ├── stop.sh         # 停止服务
│   ├── restart.sh      # 重启服务
│   ├── health_check.sh # 健康检查
│   ├── troubleshoot.sh # 故障诊断和修复
│   ├── manual_start.sh # 手动启动（调试用）
│   └── init_db.py      # 数据库初始化
├── logs/               # 日志目录
│   ├── access.log      # Gunicorn 访问日志
│   └── error.log       # Gunicorn 错误日志
├── backups/            # 数据库备份（自动创建）
└── README.md           # 本文件
```

---

## 🔧 配置说明

### Gunicorn 配置

位置: `config/gunicorn.conf.py`

```python
# 监听地址（仅本地，通过 Nginx 反向代理）
bind = "127.0.0.1:5000"

# 工作进程数（建议：CPU核心数 * 2 + 1）
workers = 4

# 每个工作进程的线程数
threads = 2

# 超时时间（秒）
timeout = 120

# 日志配置
accesslog = "/opt/xiaoma-analysis/logs/access.log"
errorlog = "/opt/xiaoma-analysis/logs/error.log"
loglevel = "info"

# 防止内存泄漏
max_requests = 1000
max_requests_jitter = 50
```

**性能调优建议：**
- **workers**: CPU 密集型应用使用 `CPU核心数 * 2 + 1`，I/O 密集型使用 `CPU核心数 * 4`
- **threads**: 对于 I/O 密集型应用可以增加线程数
- **timeout**: 根据实际响应时间调整，避免过长导致资源占用

### Nginx 配置要点

位置: `/etc/nginx/sites-available/xiaoma-analysis`

关键配置项：
- `server_name`: 设置为你的域名
- `root`: 静态文件路径 `/opt/xiaoma-analysis/static`
- `proxy_pass`: 后端代理地址 `http://127.0.0.1:5000`

### 环境变量说明

| 变量名 | 说明 | 示例 | 必填 |
|--------|------|------|------|
| DATABASE_URL | 数据库连接字符串 | mysql+pymysql://user:pass@localhost/db | ✅ |
| SECRET_KEY | Flask 密钥 | random-string-here | ✅ |
| FLASK_ENV | 运行环境 | production | ✅ |
| DEBUG | 调试模式 | False | ✅ |
| LOG_LEVEL | 日志级别 | INFO / DEBUG / ERROR | ❌ |
| ALIYUN_API_KEY | 阿里云 API 密钥 | your-key | ❌ |
| DOUBAO_API_KEY | 豆包 API 密钥 | your-key | ❌ |

---

## 🛠️ 服务管理

### Systemd 命令

```bash
# 启动服务
sudo systemctl start xiaoma-analysis
sudo systemctl start nginx

# 停止服务
sudo systemctl stop xiaoma-analysis

# 重启服务
sudo systemctl restart xiaoma-analysis
sudo systemctl restart nginx

# 重载配置（不中断服务）
sudo systemctl reload xiaoma-analysis

# 查看状态
sudo systemctl status xiaoma-analysis
sudo systemctl status nginx

# 开机自启
sudo systemctl enable xiaoma-analysis
sudo systemctl enable nginx

# 取消开机自启
sudo systemctl disable xiaoma-analysis
```

### 使用便捷脚本

```bash
# 健康检查（推荐定期运行）
bash scripts/health_check.sh

# 故障诊断和修复
bash scripts/troubleshoot.sh

# 手动启动（调试用，不使用 systemd）
bash scripts/manual_start.sh

# 快速重启
bash scripts/restart.sh

# 停止服务
bash scripts/stop.sh
```

### 日志管理

```bash
# 实时查看 Systemd 日志
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

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## ❓ 故障排查

### 快速诊断

```bash
# 运行完整的故障诊断工具（推荐）
bash scripts/troubleshoot.sh

# 运行健康检查
bash scripts/health_check.sh
```

### 常见问题及解决方案

#### Q1: 服务无法启动？

**症状**: `systemctl start xiaoma-analysis` 失败

**排查步骤**:
```bash
# 1. 查看详细错误日志
sudo journalctl -u xiaoma-analysis -n 50 --no-pager

# 2. 检查端口占用
sudo lsof -i :5000
sudo netstat -tulpn | grep 5000

# 3. 检查配置文件
cat /opt/xiaoma-analysis/backend/.env

# 4. 测试 Gunicorn 配置
source /opt/xiaoma-analysis/venv/bin/activate
cd /opt/xiaoma-analysis/backend
gunicorn --check-config --config ../config/gunicorn.conf.py wsgi:app

# 5. 手动启动测试
bash scripts/manual_start.sh
```

**常见原因**:
- 数据库连接失败 → 检查 `.env` 中的 `DATABASE_URL`
- 端口被占用 → 修改 `gunicorn.conf.py` 中的端口
- Python 依赖缺失 → 重新安装 `pip install -r requirements.txt`
- 权限问题 → `sudo chown -R www-data:www-data /opt/xiaoma-analysis`

---

#### Q2: 数据库连接失败？

**症状**: 日志中出现 `Connection refused` 或 `Access denied`

**排查步骤**:
```bash
# 1. 检查 MySQL 服务状态
sudo systemctl status mysql
# 或
sudo systemctl status mariadb

# 2. 测试数据库连接
mysql -u username -p -h localhost database_name

# 3. 检查数据库用户权限
mysql -u root -p
SELECT user, host FROM mysql.user;
SHOW GRANTS FOR 'username'@'localhost';

# 4. 检查 .env 配置
grep DATABASE_URL /opt/xiaoma-analysis/backend/.env
```

**解决方案**:
```sql
-- 创建数据库和用户
CREATE DATABASE xiaoma_analysis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'xiaoma'@'localhost' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON xiaoma_analysis.* TO 'xiaoma'@'localhost';
FLUSH PRIVILEGES;
```

---

#### Q3: Nginx 502 Bad Gateway？

**症状**: 访问网站显示 502 错误

**排查步骤**:
```bash
# 1. 检查后端是否运行
sudo systemctl status xiaoma-analysis

# 2. 测试后端直接访问
curl http://127.0.0.1:5000/api/health

# 3. 检查 Gunicorn 日志
tail -100 /opt/xiaoma-analysis/logs/error.log

# 4. 检查 Nginx 配置
sudo nginx -t
sudo tail -100 /var/log/nginx/error.log

# 5. 重启服务
sudo systemctl restart xiaoma-analysis
sudo systemctl restart nginx
```

**常见原因**:
- 后端服务未启动 → `sudo systemctl start xiaoma-analysis`
- Gunicorn 监听地址错误 → 检查 `gunicorn.conf.py` 中的 `bind`
- Nginx 配置错误 → 检查 `proxy_pass` 设置

---

#### Q4: 前端资源加载失败（404）？

**症状**: 页面空白，浏览器控制台显示 404 错误

**排查步骤**:
```bash
# 1. 检查静态文件是否存在
ls -la /opt/xiaoma-analysis/static/
ls -la /opt/xiaoma-analysis/static/assets/

# 2. 检查 Nginx 配置
grep -A 10 "location /" /etc/nginx/sites-available/xiaoma-analysis

# 3. 检查文件权限
sudo ls -la /opt/xiaoma-analysis/static/

# 4. 清除浏览器缓存或使用无痕模式
```

**解决方案**:
```bash
# 重新复制静态文件
cp -r /path/to/deploy/static/* /opt/xiaoma-analysis/static/
sudo chown -R www-data:www-data /opt/xiaoma-analysis/static
sudo systemctl restart nginx
```

---

#### Q5: 内存不足或 OOM？

**症状**: 服务频繁重启，日志中出现 `Out of memory`

**排查步骤**:
```bash
# 1. 查看内存使用
free -h
htop

# 2. 检查 Gunicorn 进程
ps aux | grep gunicorn

# 3. 查看系统日志
sudo dmesg | grep -i "out of memory"
```

**解决方案**:
```python
# 减少 Gunicorn workers（编辑 config/gunicorn.conf.py）
workers = 2  # 从 4 减少到 2

# 或者增加服务器内存
# 或者添加 swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

#### Q6: API 响应缓慢？

**症状**: 接口响应时间超过 5 秒

**排查步骤**:
```bash
# 1. 检查数据库查询性能
mysql -u root -p
EXPLAIN SELECT * FROM prices WHERE stock_id = 1 ORDER BY date DESC LIMIT 100;

# 2. 检查慢查询日志
sudo cat /var/log/mysql/slow-query.log

# 3. 监控系统资源
htop
iotop

# 4. 检查 API 日志
tail -f /opt/xiaoma-analysis/logs/access.log
```

**优化建议**:
- 添加数据库索引
- 优化 SQL 查询
- 增加 Gunicorn workers
- 启用 Redis 缓存
- 使用 CDN 加速静态资源

---

### 使用诊断工具

`troubleshoot.sh` 脚本会自动检查并修复常见问题：

```bash
bash scripts/troubleshoot.sh
```

**检查项目**:
1. ✅ 目录结构完整性
2. ✅ 关键文件存在性
3. ✅ Python 虚拟环境
4. ✅ Python 依赖包
5. ✅ 环境变量配置
6. ✅ Systemd 服务状态
7. ✅ Nginx 配置
8. ✅ 磁盘空间

---

## 📚 详细文档

更详细的部署指南、性能优化、安全建议等内容，请查看：

👉 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

包含以下内容：
- 📖 完整的部署步骤详解
- 🔐 安全配置建议
- ⚡ 性能优化技巧
- 💾 备份和恢复策略
- 🔄 升级和回滚流程
- 🛡️ 防火墙和 SSL 配置
- 📊 监控和告警设置

---

## 🔐 安全建议

### 1. 配置防火墙

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

### 2. 启用 HTTPS

```bash
# 使用 Let's Encrypt（免费）
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d caodax.cn -d www.caodax.cn

# 自动续期
sudo crontab -e
# 添加: 0 3 * * * certbot renew --quiet
```

### 3. 数据库安全

- 不要使用 root 用户连接应用
- 设置强密码
- 限制数据库访问权限
- 定期备份数据

### 4. 文件权限

```bash
# 设置正确的所有权
sudo chown -R www-data:www-data /opt/xiaoma-analysis

# 敏感文件权限
sudo chmod 600 /opt/xiaoma-analysis/backend/.env
sudo chmod 644 /opt/xiaoma-analysis/config/*.conf
```

---

## 💾 备份与恢复

### 数据库备份

```bash
# 手动备份
mysqldump -u username -p xiaoma_analysis > backup_$(date +%Y%m%d).sql

# 创建自动备份脚本
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

## 🔄 更新部署

### 增量更新

```bash
# 1. 备份当前版本
sudo systemctl stop xiaoma-analysis
cp -r /opt/xiaoma-analysis /opt/xiaoma-analysis.backup.$(date +%Y%m%d)

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

### 快速回滚

```bash
# 如果新版本有问题，快速回滚
sudo systemctl stop xiaoma-analysis
rm -rf /opt/xiaoma-analysis
mv /opt/xiaoma-analysis.backup.20240101 /opt/xiaoma-analysis
sudo systemctl start xiaoma-analysis
```

---

## 📊 监控建议

### 系统监控

```bash
# 安装监控工具
sudo apt install htop iotop nethogs

# 实时监控
htop        # CPU 和内存
iotop       # 磁盘 I/O
nethogs     # 网络流量
```

### 日志轮转

```bash
# 配置日志轮转
sudo vim /etc/logrotate.d/xiaoma-analysis
```

内容：
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

## 🆘 获取帮助

### 诊断步骤

1. **运行健康检查**
   ```bash
   bash scripts/health_check.sh
   ```

2. **运行故障诊断**
   ```bash
   bash scripts/troubleshoot.sh
   ```

3. **查看日志**
   ```bash
   sudo journalctl -u xiaoma-analysis -f
   tail -f /opt/xiaoma-analysis/logs/error.log
   ```

4. **检查系统资源**
   ```bash
   htop
   df -h
   free -h
   ```

### 常用命令速查

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
```

---

## 📝 附录

### A. 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 80 | Nginx | HTTP 访问 |
| 443 | Nginx | HTTPS 访问 |
| 5000 | Gunicorn | 后端应用（仅本地访问） |
| 3306 | MySQL | 数据库（仅本地访问） |

### B. 关键路径

| 路径 | 说明 |
|------|------|
| `/opt/xiaoma-analysis/` | 应用根目录 |
| `/opt/xiaoma-analysis/backend/.env` | 环境变量配置 |
| `/opt/xiaoma-analysis/logs/` | 应用日志 |
| `/etc/nginx/sites-available/xiaoma-analysis` | Nginx 配置 |
| `/etc/systemd/system/xiaoma-analysis.service` | Systemd 服务配置 |

### C. 技术支持

- 📧 问题反馈: issues@caodax.cn
- 📖 在线文档: https://caodax.cn/docs
- 💬 技术支持: 联系开发团队

---

**最后更新**: 2024-04-20  
**版本**: 1.0  
**维护者**: 开发团队
