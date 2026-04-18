"""
快速API端点验证
检查所有关键路由是否可访问
"""
import sys
import os
import requests

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

API_BASE = "http://127.0.0.1:5000"

endpoints = [
    ("GET", "/api/stocks", "股票列表"),
    ("GET", "/api/advanced/sectors/overview", "板块概况"),
    ("GET", "/api/advanced/watchlist", "自选股列表"),
    ("GET", "/api/advanced/alerts", "预警列表"),
]

print("🔍 验证API端点可用性\n")
print("="*60)

for method, path, description in endpoints:
    url = f"{API_BASE}{path}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=3)
        else:
            response = requests.post(url, timeout=3)
        
        status = "✅" if response.status_code == 200 else "⚠️"
        print(f"{status} {method:4} {path:40} [{response.status_code}] - {description}")
        
    except requests.exceptions.ConnectionError:
        print(f"❌ {method:4} {path:40} [连接失败] - {description}")
    except Exception as e:
        print(f"❌ {method:4} {path:40} [错误: {e}] - {description}")

print("="*60)
print("\n💡 提示: 如果看到连接失败，请先启动后端服务")
print("   运行: python app/main.py")
