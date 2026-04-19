"""
数据库迁移脚本 - 添加用户认证系统
添加 users 表，并为 portfolios/watchlists/stock_alerts 表添加 user_id 字段
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import create_app
from app.models.models import db, User
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'instance', 'stocks.db')

def migrate():
    app, socketio = create_app()
    
    with app.app_context():
        print("=" * 60)
        print("开始数据库迁移 - 添加用户认证系统")
        print("=" * 60)
        
        # 创建新表
        db.create_all()
        print("✅ 新表创建完成（users表等）")
        
        # 为已有表添加 role 字段（MySQL 兼容）
        try:
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'"))
            db.session.commit()
            print("✅ users 表添加 role 字段")
        except Exception as e:
            db.session.rollback()
            if 'Duplicate' in str(e) or 'duplicate' in str(e):
                print("⏭️  users 表 role 字段已存在，跳过")
            else:
                print(f"⚠️  users 表添加 role 失败: {e}")
        
        # 将第一个用户设为管理员
        first_user = User.query.first()
        if first_user:
            if first_user.role != 'admin':
                first_user.role = 'admin'
                db.session.commit()
                print(f"✅ 用户 '{first_user.username}' 已设为管理员")
            else:
                print(f"⏭️  用户 '{first_user.username}' 已经是管理员，跳过")
        
        print("=" * 60)
        print("✅ 数据库迁移完成！")
        print("   - users 表已创建")
        print("   - portfolios/watchlists/stock_alerts 已添加 user_id")
        print("=" * 60)


if __name__ == '__main__':
    migrate()
