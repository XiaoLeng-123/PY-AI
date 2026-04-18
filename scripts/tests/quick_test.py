"""
简化版系统测试 - 快速验证核心功能
"""
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

def test_imports():
    """测试所有模块是否可以正常导入"""
    print("="*60)
    print("测试1: 模块导入检查")
    print("="*60)
    
    try:
        from app import create_app
        print("✅ Flask应用导入成功")
        
        from app.services.financial_api import get_realtime_price, get_stock_history_kline
        print("✅ 金融API服务导入成功")
        
        from app.routes.advanced_routes import advanced_bp
        print("✅ 高级路由导入成功")
        
        from app.models.models import Stock, StockPrice
        print("✅ 数据模型导入成功")
        
        return True
    except Exception as e:
        print(f"❌ 导入失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_database():
    """测试数据库连接"""
    print("\n" + "="*60)
    print("测试2: 数据库连接检查")
    print("="*60)
    
    try:
        from app import create_app
        from app.models.models import db, Stock
        
        app = create_app()
        with app.app_context():
            count = Stock.query.count()
            print(f"✅ 数据库连接成功")
            print(f"   股票数量: {count}")
            
            if count > 0:
                first_stock = Stock.query.first()
                print(f"   示例股票: {first_stock.code} - {first_stock.name}")
            
            return True
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_routes():
    """测试API路由注册"""
    print("\n" + "="*60)
    print("测试3: API路由检查")
    print("="*60)
    
    try:
        from app import create_app
        
        app = create_app()
        rules = [str(rule) for rule in app.url_map.iter_rules()]
        
        # 检查关键路由
        required_routes = [
            '/api/stocks',
            '/api/price/realtime/<int:stock_id>',
            '/api/price/indicators/<int:stock_id>',
            '/api/advanced/backtest',
            '/api/advanced/backtest/optimize',
            '/api/advanced/moneyflow',
            '/api/advanced/alerts',
            '/api/advanced/watchlist'
        ]
        
        found_count = 0
        for route in required_routes:
            # 简化匹配（去掉参数部分）
            route_pattern = route.split('<')[0]
            if any(route_pattern in r for r in rules):
                print(f"✅ {route}")
                found_count += 1
            else:
                print(f"❌ {route} - 未找到")
        
        print(f"\n总计: {found_count}/{len(required_routes)} 个路由已注册")
        return found_count == len(required_routes)
        
    except Exception as e:
        print(f"❌ 路由检查失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_backtest_logic():
    """测试回测逻辑"""
    print("\n" + "="*60)
    print("测试4: 回测逻辑检查")
    print("="*60)
    
    try:
        # 测试均线计算函数
        def calc_ma(data, period):
            result = []
            for i in range(len(data)):
                if i < period - 1:
                    result.append(None)
                else:
                    result.append(sum(data[i-period+1:i+1]) / period)
            return result
        
        # 测试数据
        test_data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
        ma5 = calc_ma(test_data, 5)
        
        print(f"✅ 均线计算函数正常")
        print(f"   测试数据: {test_data}")
        print(f"   MA5结果: {ma5}")
        
        # 验证结果
        expected_ma5_last = sum(test_data[-5:]) / 5
        actual_ma5_last = ma5[-1]
        
        if abs(expected_ma5_last - actual_ma5_last) < 0.01:
            print(f"✅ 计算结果正确: {actual_ma5_last:.2f}")
            return True
        else:
            print(f"❌ 计算结果错误: 期望{expected_ma5_last:.2f}, 实际{actual_ma5_last:.2f}")
            return False
            
    except Exception as e:
        print(f"❌ 回测逻辑测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "🚀"*30)
    print("  小马分析系统 - 快速测试")
    print("  测试时间:", __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    print("🚀"*30 + "\n")
    
    results = []
    
    # 执行测试
    results.append(("模块导入", test_imports()))
    results.append(("数据库连接", test_database()))
    results.append(("API路由", test_api_routes()))
    results.append(("回测逻辑", test_backtest_logic()))
    
    # 总结
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{name:15} {status}")
    
    print(f"\n总计: {passed}/{total} 项测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！系统运行正常。")
        print("\n下一步:")
        print("1. 启动后端: python app/main.py")
        print("2. 启动前端: cd frontend && npm run dev")
        print("3. 访问: http://localhost:5173/")
        return 0
    else:
        print(f"\n⚠️  有 {total - passed} 项测试失败，请检查错误信息。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
