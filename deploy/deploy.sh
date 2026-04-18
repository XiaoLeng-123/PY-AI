#!/bin/bash
# ====================================
# 小马分析系统 - 一键部署脚本
# 域名: caodax.cn
# 作者: 小马分析团队
# 版本: 1.0
# ====================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 部署配置
DEPLOY_PATH="/opt/xiaoma-analysis"
DEPLOY_USER="www-data"
BACKUP_PATH="/opt/xiaoma-backup-$(date +%Y%m%d_%H%M%S)"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 打印横幅
print_banner() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   小马分析系统 - Linux 部署工具${NC}"
    echo -e "${BLUE}   域名: caodax.cn${NC}"
    echo -e "${BLUE}   版本: 1.0.0${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# 检查 root 权限
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "请使用 root 用户或 sudo 运行此脚本"
        log_info "使用方式: sudo bash deploy.sh"
        exit 1
    fi
}

# 检查系统环境
check_system() {
    log_info "检查系统环境..."
    
    # 检测操作系统
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VERSION=$VERSION_ID
        log_info "操作系统: $OS $VERSION"
    else
        log_warning "无法检测操作系统类型"
    fi
    
    # 检查必要命令
    local required_commands=("python3" "pip3" "nginx" "mysql" "systemctl")
    local missing_commands=()
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            missing_commands+=($cmd)
        fi
    done
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        log_warning "以下命令未安装: ${missing_commands[*]}"
        log_info "是否自动安装？(y/n)"
        read -r install_response
        if [[ $install_response =~ ^[Yy]$ ]]; then
            install_dependencies
        else
            log_error "请先安装缺少的依赖后重新运行"
            exit 1
        fi
    else
        log_success "所有依赖已安装"
    fi
}

# 安装系统依赖
install_dependencies() {
    log_info "安装系统依赖..."
    
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        apt-get update
        apt-get install -y python3 python3-pip python3-venv nginx mysql-server curl git
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        yum update -y
        yum install -y python3 python3-pip nginx mariadb-server curl git
    elif command -v dnf &> /dev/null; then
        # Fedora
        dnf update -y
        dnf install -y python3 python3-pip nginx mariadb-server curl git
    else
        log_error "不支持的包管理器"
        exit 1
    fi
    
    log_success "系统依赖安装完成"
}

# 配置 MySQL
setup_mysql() {
    log_info "配置 MySQL 数据库..."
    
    # 检查 MySQL 是否运行
    if ! systemctl is-active --quiet mysql && ! systemctl is-active --quiet mariadb; then
        log_info "启动 MySQL 服务..."
        systemctl start mysql || systemctl start mariadb
        systemctl enable mysql || systemctl enable mariadb
    fi
    
    # 检查数据库是否存在
    if mysql -u root -e "USE stock_analysis;" 2>/dev/null; then
        log_warning "数据库 stock_analysis 已存在"
        log_info "是否删除并重新创建？(y/n)"
        read -r recreate_db
        if [[ $recreate_db =~ ^[Yy]$ ]]; then
            mysql -u root -e "DROP DATABASE stock_analysis;"
        else
            log_info "使用现有数据库"
            return
        fi
    fi
    
    # 创建数据库
    log_info "创建数据库 stock_analysis..."
    mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS stock_analysis 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'xiaoma_user'@'localhost' IDENTIFIED BY 'xiaoma_password_2026';
GRANT ALL PRIVILEGES ON stock_analysis.* TO 'xiaoma_user'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    log_success "MySQL 数据库配置完成"
    log_info "数据库名: stock_analysis"
    log_info "用户名: xiaoma_user"
    log_info "密码: xiaoma_password_2026"
    log_warning "请修改默认密码！"
}

# 备份现有部署
backup_existing() {
    if [ -d "$DEPLOY_PATH" ]; then
        log_info "发现现有部署，创建备份..."
        cp -r "$DEPLOY_PATH" "$BACKUP_PATH"
        log_success "备份已创建: $BACKUP_PATH"
    fi
}

# 创建目录结构
create_directories() {
    log_info "创建目录结构..."
    mkdir -p "$DEPLOY_PATH"/{static,backend,config,logs,scripts}
    chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_PATH"
    log_success "目录创建完成"
}

# 复制文件
copy_files() {
    log_info "复制应用文件..."
    
    # 复制静态文件
    if [ -d "$SCRIPT_DIR/static" ]; then
        cp -r "$SCRIPT_DIR/static/"* "$DEPLOY_PATH/static/"
        log_success "静态文件已复制"
    else
        log_error "找不到 static 目录"
        exit 1
    fi
    
    # 复制后端代码
    if [ -d "$SCRIPT_DIR/backend" ]; then
        cp -r "$SCRIPT_DIR/backend/"* "$DEPLOY_PATH/backend/"
        log_success "后端代码已复制"
    else
        log_error "找不到 backend 目录"
        exit 1
    fi
    
    # 复制配置和脚本
    if [ -d "$SCRIPT_DIR/config" ]; then
        cp "$SCRIPT_DIR/config/"* "$DEPLOY_PATH/config/"
    fi
    
    if [ -d "$SCRIPT_DIR/scripts" ]; then
        cp "$SCRIPT_DIR/scripts/"* "$DEPLOY_PATH/scripts/"
        chmod +x "$DEPLOY_PATH/scripts/"*.sh
    fi
    
    chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_PATH"
    log_success "文件复制完成"
}

# 设置 Python 虚拟环境
setup_python() {
    log_info "设置 Python 环境..."
    
    cd "$DEPLOY_PATH"
    
    # 创建虚拟环境
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        log_success "虚拟环境创建完成"
    fi
    
    # 激活虚拟环境并安装依赖
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r backend/requirements.txt
    
    log_success "Python 依赖安装完成"
    deactivate
}

# 配置环境变量
setup_env() {
    log_info "配置环境变量..."
    
    # 复制环境变量模板
    if [ -f "$DEPLOY_PATH/config/deploy.env" ]; then
        cp "$DEPLOY_PATH/config/deploy.env" "$DEPLOY_PATH/backend/.env"
        
        # 提示用户修改配置
        log_warning "请编辑以下文件并修改配置:"
        log_info "$DEPLOY_PATH/backend/.env"
        echo ""
        echo "需要修改的配置项:"
        echo "  - DB_PASSWORD: MySQL 数据库密码"
        echo "  - ALIYUN_API_KEY: 阿里云 API 密钥"
        echo "  - DOUBAO_API_KEY: 豆包 API 密钥"
        echo ""
        log_info "是否现在编辑？(y/n)"
        read -r edit_env
        if [[ $edit_env =~ ^[Yy]$ ]]; then
            nano "$DEPLOY_PATH/backend/.env"
        fi
    fi
}

# 配置 Nginx
setup_nginx() {
    log_info "配置 Nginx..."
    
    # 备份现有配置
    if [ -f "/etc/nginx/sites-enabled/default" ]; then
        cp /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup
    fi
    
    # 复制并启用配置
    cp "$DEPLOY_PATH/config/nginx.conf" /etc/nginx/sites-available/xiaoma-analysis
    
    # 创建软链接
    if [ -L "/etc/nginx/sites-enabled/xiaoma-analysis" ]; then
        rm /etc/nginx/sites-enabled/xiaoma-analysis
    fi
    ln -s /etc/nginx/sites-available/xiaoma-analysis /etc/nginx/sites-enabled/xiaoma-analysis
    
    # 测试配置
    if nginx -t; then
        log_success "Nginx 配置测试通过"
        systemctl restart nginx
        systemctl enable nginx
        log_success "Nginx 已启动并配置"
    else
        log_error "Nginx 配置测试失败，请检查配置文件"
        exit 1
    fi
}

# 配置 Systemd 服务
setup_systemd() {
    log_info "配置 Systemd 服务..."
    
    cat > /etc/systemd/system/xiaoma-analysis.service << EOF
[Unit]
Description=XiaoMa Analysis Backend Service
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=notify
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=$DEPLOY_PATH/backend
Environment="PATH=$DEPLOY_PATH/venv/bin"
EnvironmentFile=$DEPLOY_PATH/backend/.env
ExecStart=$DEPLOY_PATH/venv/bin/gunicorn --config $DEPLOY_PATH/config/gunicorn.conf.py wsgi:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=append:$DEPLOY_PATH/logs/app.log
StandardError=append:$DEPLOY_PATH/logs/error.log

# 安全设置
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
    
    # 重载 systemd
    systemctl daemon-reload
    
    # 启用并启动服务
    systemctl enable xiaoma-analysis
    systemctl start xiaoma-analysis
    
    log_success "Systemd 服务配置完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库表结构..."
    
    cd "$DEPLOY_PATH/backend"
    source ../venv/bin/activate
    
    python3 scripts/init_db.py
    
    deactivate
    log_success "数据库初始化完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    echo ""
    
    # 检查服务状态
    if systemctl is-active --quiet nginx; then
        log_success "✓ Nginx 运行正常"
    else
        log_error "✗ Nginx 未运行"
    fi
    
    if systemctl is-active --quiet xiaoma-analysis; then
        log_success "✓ Gunicorn 运行正常"
    else
        log_error "✗ Gunicorn 未运行"
    fi
    
    # 等待服务启动
    sleep 2
    
    # 测试 API
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health | grep -q "200"; then
        log_success "✓ API 响应正常"
    else
        log_warning "⚠ API 可能未完全启动，请稍后检查"
    fi
    
    # 测试前端
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
        log_success "✓ 前端访问正常"
    else
        log_warning "⚠ 前端可能未完全启动，请稍后检查"
    fi
    
    echo ""
}

# 打印完成信息
print_completion() {
    echo ""
    log_success "=========================================="
    log_success " 部署完成！"
    log_success "=========================================="
    echo ""
    log_info "访问地址: http://caodax.cn"
    log_info "管理命令:"
    echo "  - 启动服务: sudo systemctl start xiaoma-analysis"
    echo "  - 停止服务: sudo systemctl stop xiaoma-analysis"
    echo "  - 重启服务: sudo systemctl restart xiaoma-analysis"
    echo "  - 查看日志: sudo journalctl -u xiaoma-analysis -f"
    echo "  - 查看状态: sudo systemctl status xiaoma-analysis"
    echo ""
    log_info "常用脚本:"
    echo "  - 健康检查: bash $DEPLOY_PATH/scripts/health_check.sh"
    echo "  - 备份数据: bash $DEPLOY_PATH/scripts/backup.sh"
    echo ""
    log_warning "重要提示:"
    echo "  1. 请修改默认数据库密码"
    echo "  2. 请配置 SSL 证书以启用 HTTPS"
    echo "  3. 请定期备份数据库"
    echo ""
}

# 主函数
main() {
    print_banner
    
    check_root
    check_system
    setup_mysql
    backup_existing
    create_directories
    copy_files
    setup_python
    setup_env
    setup_nginx
    setup_systemd
    init_database
    health_check
    print_completion
}

# 运行主函数
main "$@"
