import requests
import random
from datetime import datetime, timedelta

API_BASE = 'http://localhost:5000/api'

# 获取所有小马
response = requests.get(f'{API_BASE}/stocks')
stocks = response.json()

# 为每只小马生成示例数据
for stock in stocks:
    stock_id = stock['id']
    stock_name = stock['name']
    
    print(f'正在为 {stock_name} 生成数据...')
    
    # 生成过去30天的数据
    prices = []
    base_price = random.uniform(10, 100)
    
    for i in range(30):
        date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
        
        # 随机价格波动
        change = random.uniform(-0.05, 0.05)
        close = base_price * (1 + change)
        open_price = close * random.uniform(0.98, 1.02)
        high = max(open_price, close) * random.uniform(1.0, 1.03)
        low = min(open_price, close) * random.uniform(0.97, 1.0)
        volume = random.randint(100000, 1000000)
        
        prices.append({
            'date': date,
            'open': round(open_price, 2),
            'high': round(high, 2),
            'low': round(low, 2),
            'close': round(close, 2),
            'volume': volume
        })
        
        base_price = close
    
    # 批量添加
    response = requests.post(
        f'{API_BASE}/stocks/{stock_id}/prices/batch',
        json={'prices': prices},
        headers={'Content-Type': 'application/json'}
    )
    
    if response.status_code == 201:
        result = response.json()
        print(f'  ✓ {stock_name}: {result["message"]}')
    else:
        print(f'  ✗ {stock_name}: {response.text}')

print('\n完成！')
