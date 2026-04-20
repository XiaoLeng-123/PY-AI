# 快速部署参考卡

## 🚀 3步快速部署

```bash
# 1. 构建部署包（本地）
bash build_deploy.sh

# 2. 上传到服务器
rsync -avz deploy/ root@server:/opt/xiaoma-analysis/

# 3. 一键部署（服务器）
ssh root@server "cd /opt/xiaoma-analysis && sudo bash scripts/deploy.sh"
```

---

## 📋 常用命令速查

### 服务管理
```bash
sudo systemctl start xiaoma-analysis     # 启动
sudo systemctl stop xiaoma-analysis      # 停止
sudo systemctl restart xiaoma-analysis   # 重启
sudo systemctl status xiaoma-analysis    # 状态
```

### 日志查看
```bash
sudo journalctl -u xiaoma-analysis -f           # 实时日志
tail -f /opt/xiaoma-analysis/logs/error.log     # 错误日志
tail -f /opt/xiaoma-analysis/logs/access.log    # 访问日志
```

### 健康检查
```bash
bash scripts/health_check.sh       # 健康检查
bash scripts/troubleshoot.sh       # 故障诊断
curl http://127.0.0.1:5000/api/health  # API测试
```

### 数据库
```bash
mysqldump -u user -p db > backup.sql          # 备份
mysql -u user -p db < backup.sql              # 恢复
python scripts/init_db.py                     # 初始化
```

---

## 🔍 故障排查流程

```
服务异常
  ├─ 运行 bash scripts/troubleshoot.sh
  ├─ 查看 sudo journalctl -u xiaoma-analysis -n 50
  ├─ 检查 tail -f logs/error.log
  └─ 验证 curl http://127.0.0.1:5000/api/health
```

---

## 📁 关键路径

| 路径 | 说明 |
|------|------|
| `/opt/xiaoma-analysis/` | 应用根目录 |
| `backend/.env` | 环境变量配置 |
| `logs/error.log` | 错误日志 |
| `config/gunicorn.conf.py` | Gunicorn 配置 |
| `/etc/nginx/sites-available/xiaoma-analysis` | Nginx 配置 |

---

## ⚙️ 常用配置

### 修改 Gunicorn Workers
```bash
sudo vim config/gunicorn.conf.py
# 修改: workers = 4
sudo systemctl restart xiaoma-analysis
```

### 修改环境变量
```bash
sudo vim backend/.env
sudo systemctl restart xiaoma-analysis
```

### 修改 Nginx 配置
```bash
sudo vim /etc/nginx/sites-available/xiaoma-analysis
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🆘 紧急情况

### 服务无法启动
```bash
sudo journalctl -u xiaoma-analysis -n 100 --no-pager
bash scripts/manual_start.sh  # 调试模式
```

### 回滚到上一版本
```bash
sudo systemctl stop xiaoma-analysis
rm -rf /opt/xiaoma-analysis
mv /opt/xiaoma-analysis.backup.DATE /opt/xiaoma-analysis
sudo systemctl start xiaoma-analysis
```

### 清理磁盘空间
```bash
# 清理日志
sudo truncate -s 0 /opt/xiaoma-analysis/logs/*.log

# 清理旧备份
find /opt/xiaoma-analysis/backups -mtime +30 -delete
```

---

## 📊 监控指标

```bash
# CPU 和内存
htop

# 磁盘使用
df -h

# 网络连接
sudo netstat -tulpn | grep :5000

# 进程数
ps aux | grep gunicorn | wc -l
```

---

## 🔐 安全提醒

- ✅ 定期更新系统: `sudo apt update && sudo apt upgrade`
- ✅ 配置防火墙: `sudo ufw enable`
- ✅ 启用 HTTPS: `sudo certbot renew`
- ✅ 备份数据库: 每日自动备份
- ✅ 修改默认密码: 数据库、API 密钥

---

## 📞 获取帮助

1. 查看文档: `cat README.md` 或 `cat DEPLOYMENT_GUIDE.md`
2. 运行诊断: `bash scripts/troubleshoot.sh`
3. 查看日志: `sudo journalctl -u xiaoma-analysis -f`
4. 联系支持: support@caodax.cn

---

**提示**: 将此文件打印或保存为书签，便于快速查阅！
