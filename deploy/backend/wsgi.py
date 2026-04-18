"""
WSGI 入口文件
用于 Gunicorn 启动 Flask 应用
"""
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run()
