# Gunicorn 配置文件
# 用于生产环境运行 Flask 应用

import multiprocessing

# 服务器套接字
bind = "127.0.0.1:5000"

# 工作进程数 (CPU核心数 * 2 + 1)
workers = 4

# 工作进程类型
worker_class = "sync"

# 每个工作进程的线程数
threads = 2

# 最大并发请求数
worker_connections = 1000

# 超时时间（秒）
timeout = 120

# 优雅重启超时
graceful_timeout = 30

# Keepalive 超时
keepalive = 5

# 日志配置
accesslog = "/opt/xiaoma-analysis/logs/access.log"
errorlog = "/opt/xiaoma-analysis/logs/error.log"
loglevel = "info"

# 进程命名
proc_name = "xiaoma-analysis"

# PID 文件
pidfile = "/opt/xiaoma-analysis/gunicorn.pid"

# 预加载应用
preload_app = True

# 工作进程最大请求数（防止内存泄漏）
max_requests = 1000
max_requests_jitter = 50
