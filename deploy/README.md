# 小马分析系统 - Linux 部署包

## 快速开始

### 1. 上传文件到服务器

```bash
# 方式1: 使用 scp
scp -r deploy/* root@your-server:/opt/xiaoma-analysis/

# 方式2: 使用 rsync
rsync -avz deploy/ root@your-server:/opt/xiaoma-analysis/

# 方式3: 使用 FTP/SFTP 工具上传
```

### 2. 服务器环境要求

- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 10+
- **Python**: 3.8+
- **Nginx**: 1.18+
- **MySQL**: 5.7+ / 8.0+

### 3. 安装依赖

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv nginx mysql-server

# CentOS/RHEL
sudo yum install -y python3 python3-pip nginx mysql-server
```

### 4. 配置 MySQL 数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE stock_analysis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'root'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON stock_analysis.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 5. 一键部署

```bash
# 进入部署目录
cd /opt/xiaoma-analysis

# 添加执行权限
chmod +x scripts/*.sh

# 运行部署脚本
sudo bash scripts/deploy.sh
```

### 6. 配置环境变量

编辑 `backend/.env` 文件：

```bash
nano /opt/xiaoma-analysis/backend/.env
```

修改以下配置：
- `DB_PASSWORD`: MySQL 数据库密码
- `ALIYUN_API_KEY`: 阿里云 API 密钥
- `DOUBAO_API_KEY`: 豆包 API 密钥

### 7. 管理服务

```bash
# 启动服务
sudo bash scripts/start.sh

# 停止服务
sudo bash scripts/stop.sh

# 重启服务
sudo bash scripts/restart.sh

# 查看日志
sudo journalctl -u xiaoma-analysis -f

# 查看状态
sudo systemctl status xiaoma-analysis
```

### 8. 配置 HTTPS（可选）

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d caodax.cn -d www.caodax.cn

# 自动续期
sudo certbot renew --dry-run
```

## 文件结构

```
/opt/xiaoma-analysis/
├── static/              # 前端静态文件
├── backend/             # Flask 后端代码
│   ├── app/             # 应用代码
│   ├── .env             # 环境变量
│   └── wsgi.py          # WSGI 入口
├── config/              # 配置文件
│   ├── nginx.conf       # Nginx 配置
│   ├── gunicorn.conf.py # Gunicorn 配置
│   └── deploy.env       # 环境变量模板
├── scripts/             # 部署脚本
│   ├── deploy.sh        # 一键部署
│   ├── start.sh         # 启动服务
│   ├── stop.sh          # 停止服务
│   └── restart.sh       # 重启服务
├── logs/                # 日志目录
└── venv/                # Python 虚拟环境
```

## 常见问题

### Q1: 服务无法启动？
```bash
# 查看错误日志
sudo journalctl -u xiaoma-analysis -n 100
sudo cat /opt/xiaoma-analysis/logs/error.log
```

### Q2: 数据库连接失败？
```bash
# 检查 MySQL 服务
sudo systemctl status mysql

# 测试数据库连接
mysql -u root -p stock_analysis
```

### Q3: Nginx 配置错误？
```bash
# 测试 Nginx 配置
sudo nginx -t

# 查看 Nginx 日志
sudo cat /opt/xiaoma-analysis/logs/nginx-error.log
```

### Q4: 端口被占用？
```bash
# 查看端口占用
sudo netstat -tulpn | grep :5000
sudo lsof -i :5000

# 修改配置中的端口
nano config/gunicorn.conf.py
```

## 性能优化

### Gunicorn 调优
编辑 `config/gunicorn.conf.py`:
- `workers`: 建议设置为 CPU核心数 * 2 + 1
- `threads`: 每个工作进程的线程数
- `max_requests`: 防止内存泄漏

### Nginx 优化
- 启用 Gzip 压缩
- 配置静态文件缓存
- 启用 HTTP/2

### MySQL 优化
- 配置适当的连接池大小
- 优化查询性能
- 定期备份数据库

## 备份与恢复

### 备份数据库
```bash
mysqldump -u root -p stock_analysis > backup_$(date +%Y%m%d).sql
```

### 恢复数据库
```bash
mysql -u root -p stock_analysis < backup_20260418.sql
```

## 更新部署

```bash
# 1. 备份当前版本
sudo cp -r /opt/xiaoma-analysis /opt/xiaoma-analysis-backup-$(date +%Y%m%d)

# 2. 上传新版本文件
rsync -avz deploy/ root@your-server:/opt/xiaoma-analysis/

# 3. 重启服务
sudo bash /opt/xiaoma-analysis/scripts/restart.sh

# 4. 验证部署
curl http://caodax.cn/api/health
```

## 技术支持

- 问题反馈: issues@caodax.cn
- 文档更新: https://caodax.cn/docs
