#!/usr/bin/env python3
"""
数据库初始化脚本
用于在 Linux 服务器上创建和迁移数据库表
"""
import sys
import os

# 添加项目路径
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(script_dir, '..', 'backend')
sys.path.insert(0, backend_dir)

def init_db():
    """初始化数据库"""
    print("=" * 50)
    print(" 数据库初始化")
    print("=" * 50)
    print()
    
    try:
        from app import create_app, db
    except ImportError as e:
        print(f"✗ 错误: 无法导入应用模块")
        print(f"  详细信息: {e}")
        print(f"  请确保已安装所有依赖: pip install -r requirements.txt")
        sys.exit(1)
    
    app = create_app()
    
    with app.app_context():
        try:
            # 创建所有表
            print("[1/2] 创建数据库表...")
            db.create_all()
            print("✓ 数据库表创建成功")
            print()
            
            # 检查表是否创建成功
            print("[2/2] 验证表结构...")
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            print(f"✓ 已创建 {len(tables)} 个表:")
            for table in sorted(tables):
                # 获取表的列信息
                columns = inspector.get_columns(table)
                col_count = len(columns)
                print(f"  - {table} ({col_count} 列)")
            
            print()
            print("=" * 50)
            print(" ✓ 数据库初始化完成！")
            print("=" * 50)
            
        except Exception as e:
            print()
            print("=" * 50)
            print(f" ✗ 数据库初始化失败")
            print("=" * 50)
            print(f"错误信息: {e}")
            print()
            print("可能的原因:")
            print("  1. 数据库连接配置错误（检查 .env 文件）")
            print("  2. 数据库服务未运行")
            print("  3. 数据库权限不足")
            print()
            print("调试建议:")
            print("  1. 检查 backend/.env 中的 DATABASE_URL 配置")
            print("  2. 确认 MySQL/MariaDB 服务正在运行")
            print("  3. 验证数据库用户权限")
            sys.exit(1)

if __name__ == "__main__":
    init_db()
