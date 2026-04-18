# 数据库迁移脚本
# 用于在 Linux 服务器上初始化数据库表结构

#!/usr/bin/env python3
"""
数据库初始化脚本
"""
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db

def init_db():
    """初始化数据库"""
    app = create_app()
    
    with app.app_context():
        try:
            # 创建所有表
            db.create_all()
            print("✓ 数据库表创建成功")
            
            # 检查表是否创建成功
            with db.engine.connect() as conn:
                result = conn.execute(db.text("SHOW TABLES"))
                tables = [row[0] for row in result]
                print(f"✓ 已创建 {len(tables)} 个表:")
                for table in tables:
                    print(f"  - {table}")
                    
        except Exception as e:
            print(f"✗ 数据库初始化失败: {e}")
            sys.exit(1)

if __name__ == "__main__":
    init_db()
