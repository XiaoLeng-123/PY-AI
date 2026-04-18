"""
系统启动监控脚本 - 实时显示控制台输出并自动修复问题
"""
import sys
import os
from datetime import datetime

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# 添加颜色支持
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    """打印标题"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}  {text}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")

def print_success(text):
    """打印成功信息"""
    print(f"{Colors.GREEN}✅ {text}{Colors.RESET}")

def print_error(text):
    """打印错误信息"""
    print(f"{Colors.RED}❌ {text}{Colors.RESET}")

def print_warning(text):
    """打印警告信息"""
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.RESET}")

def print_info(text):
    """打印普通信息"""
    print(f"   {text}")

def check_python_version():
    """检查Python版本"""
    print_header("步骤1: 检查Python环境")
    
    version = sys.version_info
    print_info(f"Python版本: {version.major}.{version.minor}.{version.micro}")
    
    if version.major >= 3 and version.minor >= 8:
        print_success("Python版本符合要求 (>= 3.8)")
        return True
    else:
        print_error("Python版本过低，需要 >= 3.8")
        return False

def check_dependencies():
    """检查依赖包"""
    print_header("步骤2: 检查依赖包")
    
    required_packages = [
        'flask',
        'flask-cors',
        'flask-socketio',
        'flask-sqlalchemy',
        'pymysql',
        'cryptography',
        'requests',
        'python-dotenv'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print_success(f"{package:25} ✅")
        except ImportError:
            print_error(f"{package:25} ❌ 缺失")
            missing.append(package)
    
    if missing:
        print_warning(f"\n发现 {len(missing)} 个缺失的依赖包")
        print_info(f"运行以下命令安装:")
        print_info(f"pip install {' '.join(missing)}")
        return False
    else:
        print_success("\n所有依赖包已安装")
        return True

def check_database():
    """检查数据库连接"""
    print_header("步骤3: 检查数据库连接")
    
    try:
        from app.config import Config
        from app.models.models import db, Stock
        from app.main import create_app
        
        app, _ = create_app()
        with app.app_context():
            # 测试数据库连接
            count = Stock.query.count()
            print_success(f"数据库连接成功")
            print_info(f"股票数量: {count}")
            
            if count > 0:
                first = Stock.query.first()
                print_info(f"示例股票: {first.code} - {first.name}")
            else:
                print_warning("数据库中没有股票数据")
                print_info("请先添加股票或使用批量获取功能")
            
            return True
            
    except Exception as e:
        print_error(f"数据库连接失败: {e}")
        
        # 尝试提供解决方案
        error_msg = str(e).lower()
        if 'mysql' in error_msg or 'pymysql' in error_msg:
            print_info("\n可能的原因:")
            print_info("1. MySQL服务未启动")
            print_info("2. 用户名或密码错误")
            print_info("3. 数据库不存在")
            print_info("\n解决方案:")
            print_info("1. 启动MySQL服务")
            print_info("2. 检查 app/config.py 中的数据库配置")
            print_info("3. 创建数据库: CREATE DATABASE stock_analysis CHARACTER SET utf8mb4;")
        elif 'cryptography' in error_msg:
            print_info("\n缺少cryptography包")
            print_info("运行: pip install cryptography")
        
        return False

def check_routes():
    """检查API路由"""
    print_header("步骤4: 检查API路由")
    
    try:
        from app.main import create_app
        
        app, _ = create_app()
        rules = list(app.url_map.iter_rules())
        
        # 关键路由列表
        critical_routes = [
            '/api/stocks',
            '/api/price/realtime',
            '/api/price/indicators',
            '/api/advanced/backtest',
            '/api/advanced/backtest/optimize',
            '/api/advanced/moneyflow',
        ]
        
        found_count = 0
        for route_pattern in critical_routes:
            found = any(route_pattern in str(rule.rule) for rule in rules)
            if found:
                print_success(f"{route_pattern:35} ✅")
                found_count += 1
            else:
                print_error(f"{route_pattern:35} ❌")
        
        print_info(f"\n总计: {found_count}/{len(critical_routes)} 个关键路由已注册")
        
        if found_count == len(critical_routes):
            print_success("所有关键路由正常")
            return True
        else:
            print_error(f"缺少 {len(critical_routes) - found_count} 个路由")
            return False
            
    except Exception as e:
        print_error(f"路由检查失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_frontend():
    """检查前端配置"""
    print_header("步骤5: 检查前端配置")
    
    project_root = os.path.join(os.path.dirname(__file__), '..', '..')
    frontend_dir = os.path.join(project_root, 'frontend')
    
    if not os.path.exists(frontend_dir):
        print_error(f"前端目录不存在: {frontend_dir}")
        return False
    
    # 检查package.json
    package_json = os.path.join(frontend_dir, 'package.json')
    if not os.path.exists(package_json):
        print_error("package.json 不存在")
        return False
    
    print_success("前端目录存在")
    print_success("package.json 存在")
    
    # 检查node_modules
    node_modules = os.path.join(frontend_dir, 'node_modules')
    if os.path.exists(node_modules):
        print_success("node_modules 已安装")
    else:
        print_warning("node_modules 不存在")
        print_info("运行: cd frontend && npm install")
    
    return True

def start_monitoring():
    """启动监控系统"""
    print_header("🚀 小马分析系统 - 启动监控")
    print_info(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print_info(f"工作目录: {os.getcwd()}")
    
    # 执行检查
    checks = [
        ("Python环境", check_python_version),
        ("依赖包", check_dependencies),
        ("数据库", check_database),
        ("API路由", check_routes),
        ("前端配置", check_frontend),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"{name} 检查异常: {e}")
            results.append((name, False))
    
    # 总结
    print_header("📊 检查总结")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = f"{Colors.GREEN}✅ 通过{Colors.RESET}" if result else f"{Colors.RED}❌ 失败{Colors.RESET}"
        print(f"{name:15} {status}")
    
    print(f"\n{Colors.BOLD}总计: {passed}/{total} 项检查通过{Colors.RESET}")
    
    if passed == total:
        print_success("\n🎉 所有检查通过！系统可以正常启动。")
        print_info("\n下一步操作:")
        print_info("1. 双击运行 start.bat 启动系统")
        print_info("2. 或手动启动:")
        print_info("   - 后端: python app/main.py")
        print_info("   - 前端: cd frontend && npm run dev")
        print_info("3. 访问: http://localhost:5173/")
        return 0
    else:
        print_error(f"\n⚠️  有 {total - passed} 项检查失败")
        print_info("\n请根据上面的错误提示进行修复")
        print_info("修复后重新运行此脚本验证")
        return 1

if __name__ == "__main__":
    try:
        exit_code = start_monitoring()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print_warning("\n\n用户中断")
        sys.exit(0)
    except Exception as e:
        print_error(f"\n未知错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
