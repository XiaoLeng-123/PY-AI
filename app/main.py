"""
小马分析系统 - 模块化版本
使用Flask Blueprint组织路由
"""
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
from app.config import Config, STATIC_PATH
from app.models.models import db


def create_app():
    """应用工厂函数"""
    app = Flask(__name__, 
                static_folder=STATIC_PATH,
                static_url_path='')
    
    # 加载配置
    app.config.from_object(Config)
    
    # 初始化扩展
    CORS(app)
    socketio = SocketIO(app, cors_allowed_origins="*")
    db.init_app(app)
    
    # 创建数据库表
    with app.app_context():
        db.create_all()
    
    # 注册蓝图
    register_blueprints(app)
    
    # 注册基础路由
    register_routes(app)
    
    # WebSocket事件
    register_websocket_events(socketio)
    
    return app, socketio


def register_blueprints(app):
    """注册所有蓝图"""
    from app.routes.stock_routes import stock_bp
    from app.routes.price_routes import price_bp
    from app.routes.ai_routes import ai_bp
    from app.routes.advanced_routes import advanced_bp
    from app.routes.stats_routes import stats_bp
    
    app.register_blueprint(stock_bp)
    app.register_blueprint(price_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(advanced_bp)
    app.register_blueprint(stats_bp)


def register_routes(app):
    """注册基础路由"""
    
    @app.route('/')
    def index():
        """首页"""
        return send_from_directory(STATIC_PATH, 'index.html')
    
    @app.route('/<path:path>')
    def serve_static(path):
        """提供静态文件"""
        if path.startswith('api/'):
            return {'error': 'API endpoint not found'}, 404
        
        try:
            return send_from_directory(STATIC_PATH, path)
        except:
            return send_from_directory(STATIC_PATH, 'index.html')


def register_websocket_events(socketio):
    """注册WebSocket事件"""
    from flask_socketio import emit
    from flask import request
    from app.models.models import Stock
    from app.services.financial_api import get_realtime_price
    import threading
    import time
    
    # 存储订阅关系: {stock_id: [sid1, sid2, ...]}
    subscriptions = {}
    
    @socketio.on('connect')
    def handle_connect():
        print(f'客户端连接: {request.sid}')
        emit('status', {'msg': '已连接到实时行情服务器'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        print(f'客户端断开: {request.sid}')
        # 清理订阅关系
        for stock_id in list(subscriptions.keys()):
            if request.sid in subscriptions[stock_id]:
                subscriptions[stock_id].remove(request.sid)
                if not subscriptions[stock_id]:
                    del subscriptions[stock_id]
    
    @socketio.on('subscribe_stock')
    def handle_subscribe(data):
        stock_id = data.get('stock_id')
        if stock_id:
            print(f'客户端 {request.sid} 订阅股票 {stock_id}')
            if stock_id not in subscriptions:
                subscriptions[stock_id] = []
            if request.sid not in subscriptions[stock_id]:
                subscriptions[stock_id].append(request.sid)
    
    def push_realtime_prices():
        """后台线程：定期推送实时行情"""
        while True:
            try:
                for stock_id, sids in list(subscriptions.items()):
                    if not sids:
                        continue
                    
                    # 获取股票信息
                    stock = Stock.query.get(stock_id)
                    if not stock:
                        continue
                    
                    # 获取实时行情
                    realtime_data = get_realtime_price(stock.code)
                    if realtime_data:
                        # 推送到所有订阅者
                        for sid in sids:
                            socketio.emit('price_update', {
                                'stock_id': stock_id,
                                'data': realtime_data
                            }, room=sid)
                
                # 每5秒推送一次
                time.sleep(5)
            except Exception as e:
                print(f'推送实时行情失败: {e}')
                time.sleep(5)
    
    # 启动后台推送线程
    push_thread = threading.Thread(target=push_realtime_prices, daemon=True)
    push_thread.start()
    print('✅ 实时行情推送服务已启动')


# 创建应用实例
app, socketio = create_app()


if __name__ == '__main__':
    import webbrowser
    import threading
    import subprocess
    
    # 获取项目根目录
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_dir = os.path.join(project_root, 'frontend')
    
    def start_frontend():
        """在后台启动前端开发服务器"""
        try:
            if os.path.exists(frontend_dir):
                print("\n正在启动前端开发服务器...")
                # 在新窗口中启动前端
                if os.name == 'nt':
                    # Windows: 使用 CREATE_NEW_CONSOLE 打开新窗口
                    subprocess.Popen(
                        ['npm', 'run', 'dev'],
                        cwd=frontend_dir,
                        creationflags=subprocess.CREATE_NEW_CONSOLE,
                        shell=True
                    )
                else:
                    subprocess.Popen(
                        ['npm', 'run', 'dev'],
                        cwd=frontend_dir,
                        start_new_session=True
                    )
                print("前端服务器已启动（请查看新打开的窗口）")
            else:
                print(f"警告：未找到前端目录 {frontend_dir}")
        except Exception as e:
            print(f"启动前端失败: {e}")
    
    def open_browser():
        """延迟打开前端开发服务器地址"""
        import time
        time.sleep(5)  # 等待前端启动完成
        webbrowser.open('http://localhost:5173/')
    
    # 启动前端
    frontend_thread = threading.Thread(target=start_frontend, daemon=True)
    frontend_thread.start()
    
    # 延迟打开浏览器
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    print("=" * 60)
    print("小马分析系统启动中...")
    print("前端地址: http://localhost:5173/")
    print("后端API: http://127.0.0.1:5000")
    print("按 Ctrl+C 停止服务器")
    print("=" * 60)
    
    app.run(debug=False, host='0.0.0.0', port=5000)
