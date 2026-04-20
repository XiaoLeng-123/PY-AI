#!/bin/bash
# ====================================
# 小马分析系统 - Git 一键部署脚本
# 用途：从 Git 仓库拉取代码并完成部署
# 用法：sudo bash git_deploy.sh
# ====================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
# 可设置环境变量覆盖：export GIT_REPO="你的仓库地址"
GIT_REPO="${GIT_REPO:-https://github.com/XiaoLeng-123/PY-AI.git}"
# 如果使用 Gitee，改为：https://gitee.com/你的用户名/PY-AI.git
GIT_BRANCH="${GIT_BRANCH:-main}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/xiaoma-analysis}"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 打印横幅
print_banner() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   小马分析系统 - Git 一键部署${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "仓库: ${GREEN}$GIT_REPO${NC}"
    echo -e "分支: ${GREEN}$GIT_BRANCH${NC}"
    echo -e "部署路径: ${GREEN}$DEPLOY_PATH${NC}"
    echo ""
}

# 检查 root 权限
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "请使用 root 用户或 sudo 运行"
        log_info "用法: sudo bash git_deploy.sh"
        exit 1
    fi
}

# 检查必要工具
check_requirements() {
    log_info "检查系统环境..."
    
    local missing=()
    
    if ! command -v git &> /dev/null; then
        missing+=("git")
    fi
    
    if ! command -v python3 &> /dev/null; then
        missing+=("python3")
    fi
    
    if ! command -v pip3 &> /dev/null; then
        missing+=("python3-pip")
    fi
    
    if ! command -v nginx &> /dev/null; then
        missing+=("nginx")
    fi
    
    if ! command -v mysql &> /dev/null && ! command -v mariadb &> /dev/null; then
        missing+=("mysql-server 或 mariadb-server")
    fi
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_error "缺少必要的软件: ${missing[*]}"
        log_info "安装命令:"
        
        if command -v apt-get &> /dev/null; then
            echo "  sudo apt-get install -y ${missing[*]}"
        elif command -v yum &> /dev/null; then
            echo "  sudo yum install -y ${missing[*]}"
        fi
        
        echo ""
        log_info "是否自动安装? (y/n)"
        read -r install_response
        if [[ $install_response =~ ^[Yy]$ ]]; then
            install_dependencies
        else
            exit 1
        fi
    else
        log_success "所有依赖已就绪"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装系统依赖..."
    
    if command -v apt-get &> /dev/null; then
        apt-get update -qq
        apt-get install -y -qq git python3 python3-pip python3-venv nginx mysql-server curl > /dev/null 2>&1
    elif command -v yum &> /dev/null; then
        yum install -y -q git python3 python3-pip nginx mariadb-server curl > /dev/null 2>&1
    fi
    
    log_success "依赖安装完成"
}

# 备份现有部署
backup_existing() {
    if [ -d "$DEPLOY_PATH" ]; then
        local BACKUP_PATH="/opt/xiaoma-backup-$(date +%Y%m%d_%H%M%S)"
        log_info "发现现有部署，创建备份..."
        cp -r "$DEPLOY_PATH" "$BACKUP_PATH"
        log_success "备份已创建: $BACKUP_PATH"
    fi
}

# 从 Git 拉取代码
clone_or_pull_repo() {
    log_info "从 Git 仓库拉取代码..."
    
    if [ -d "$DEPLOY_PATH/.git" ]; then
        # 已存在，更新代码
        log_info "更新现有代码..."
        cd "$DEPLOY_PATH"
        git fetch origin
        git reset --hard origin/$GIT_BRANCH
        git clean -fd
        log_success "代码更新完成"
    else
        # 首次克隆
        if [ -d "$DEPLOY_PATH" ]; then
            rm -rf "$DEPLOY_PATH"
        fi
        
        git clone -b $GIT_BRANCH $GIT_REPO "$DEPLOY_PATH"
        log_success "代码克隆完成"
    fi
}

# 创建 Python 虚拟环境并安装依赖
setup_python_env() {
    log_info "配置 Python 环境..."
    
    # 创建虚拟环境
    if [ ! -d "$DEPLOY_PATH/venv" ]; then
        cd "$DEPLOY_PATH"
        python3 -m venv venv
        log_success "虚拟环境创建完成"
    else
        log_info "虚拟环境已存在"
    fi
    
    # 激活并安装依赖
    source "$DEPLOY_PATH/venv/bin/activate"
    pip install --upgrade pip -q
    
    if [ -f "$DEPLOY_PATH/requirements.txt" ]; then
        log_info "安装 Python 依赖..."
        pip install -r "$DEPLOY_PATH/requirements.txt" -q
        log_success "Python 依赖安装完成"
    else
        log_warning "未找到 requirements.txt"
    fi
    
    deactivate
}

# 配置环境变量
setup_env() {
    log_info "配置环境变量..."
    
    if [ -f "$DEPLOY_PATH/deploy/config/deploy.env" ]; then
        cp "$DEPLOY_PATH/deploy/config/deploy.env" "$DEPLOY_PATH/.env"
        log_success "环境变量已配置"
        log_warning "请编辑 $DEPLOY_PATH/.env 设置数据库等参数"
    else
        log_warning "未找到 deploy.env，需要手动创建 .env 文件"
    fi
}

# 配置数据库
setup_database() {
    log_info "配置数据库..."
    
    # 启动 MySQL
    if ! systemctl is-active --quiet mysql && ! systemctl is-active --quiet mariadb; then
        log_info "启动数据库服务..."
        systemctl start mysql 2>/dev/null || systemctl start mariadb 2>/dev/null || true
        systemctl enable mysql 2>/dev/null || systemctl enable mariadb 2>/dev/null || true
    fi
    
    # 创建数据库和用户
    mysql -u root <<EOF 2>/dev/null || {
        log_warning "无法使用 root 用户连接 MySQL"
        log_info "请手动执行以下 SQL:"
        echo "CREATE DATABASE IF NOT EXISTS xiaoma_analysis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        echo "CREATE USER IF NOT EXISTS 'xiaoma'@'localhost' IDENTIFIED BY 'xiaoma_password_2024';"
        echo "GRANT ALL PRIVILEGES ON xiaoma_analysis.* TO 'xiaoma'@'localhost';"
        echo "FLUSH PRIVILEGES;"
        return
    }
CREATE DATABASE IF NOT EXISTS xiaoma_analysis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'xiaoma'@'localhost' IDENTIFIED BY 'xiaoma_password_2024';
GRANT ALL PRIVILEGES ON xiaoma_analysis.* TO 'xiaoma'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    log_success "数据库配置完成"
    log_info "数据库名: xiaoma_analysis"
    log_info "用户名: xiaoma"
    log_info "密码: xiaoma_password_2024"
    log_warning "请修改默认密码！"
}

# 初始化数据库表
init_database() {
    log_info "初始化数据库表..."
    
    if [ -f "$DEPLOY_PATH/deploy/scripts/init_db.py" ]; then
        source "$DEPLOY_PATH/venv/bin/activate"
        export DATABASE_URL="mysql+pymysql://xiaoma:xiaoma_password_2024@localhost/xiaoma_analysis"
        cd "$DEPLOY_PATH"
        python deploy/scripts/init_db.py || log_warning "数据库初始化可能需要手动执行"
        deactivate
        log_success "数据库表初始化完成"
    else
        log_warning "未找到 init_db.py 脚本"
    fi
}

# 配置 Nginx
setup_nginx() {
    log_info "配置 Nginx..."
    
    if [ -f "$DEPLOY_PATH/deploy/config/nginx.conf" ]; then
        cp "$DEPLOY_PATH/deploy/config/nginx.conf" /etc/nginx/sites-available/xiaoma-analysis
        ln -sf /etc/nginx/sites-available/xiaoma-analysis /etc/nginx/sites-enabled/
        
        if nginx -t 2>&1 | grep -q "successful"; then
            systemctl restart nginx
            systemctl enable nginx
            log_success "Nginx 配置完成"
        else
            log_error "Nginx 配置测试失败"
            nginx -t
        fi
    else
        log_warning "未找到 nginx.conf"
    fi
}

# 配置 Systemd 服务
setup_systemd() {
    log_info "配置系统服务..."
    
    cat > /etc/systemd/system/xiaoma-analysis.service << EOF
[Unit]
Description=XiaoMa Analysis Backend Service
After=network.target mysql.service mariadb.service
Wants=mysql.service mariadb.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=$DEPLOY_PATH
Environment="PATH=$DEPLOY_PATH/venv/bin"
EnvironmentFile=$DEPLOY_PATH/.env
ExecStart=$DEPLOY_PATH/venv/bin/gunicorn --config $DEPLOY_PATH/deploy/config/gunicorn.conf.py wsgi:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=append:$DEPLOY_PATH/deploy/logs/access.log
StandardError=append:$DEPLOY_PATH/deploy/logs/error.log

# 安全增强
NoNewPrivileges=true
PrivateTmp=true
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable xiaoma-analysis
    log_success "系统服务配置完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    systemctl start xiaoma-analysis
    sleep 2
    
    if systemctl is-active --quiet xiaoma-analysis; then
        log_success "后端服务启动成功"
    else
        log_error "后端服务启动失败"
        log_info "查看日志: journalctl -u xiaoma-analysis -n 50"
    fi
}

# 显示部署结果
show_result() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN} ✓ 部署完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "访问地址: ${BLUE}http://caodax.cn${NC}"
    echo ""
    echo -e "${YELLOW}重要提示:${NC}"
    echo "  1. 编辑配置文件: nano $DEPLOY_PATH/.env"
    echo "  2. 修改数据库密码后重启: sudo systemctl restart xiaoma-analysis"
    echo "  3. 查看日志: sudo journalctl -u xiaoma-analysis -f"
    echo "  4. 健康检查: bash $DEPLOY_PATH/deploy/scripts/health_check.sh"
    echo ""
    echo -e "${YELLOW}更新代码:${NC}"
    echo "  cd $DEPLOY_PATH && git pull && sudo systemctl restart xiaoma-analysis"
    echo ""
    echo "========================================"
}

# 主流程
main() {
    print_banner
    check_root
    check_requirements
    backup_existing
    clone_or_pull_repo
    setup_python_env
    setup_env
    setup_database
    init_database
    setup_nginx
    setup_systemd
    start_services
    show_result
}

# 运行主流程
main
