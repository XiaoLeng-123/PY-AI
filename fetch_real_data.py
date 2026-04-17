import requests
import time
from datetime import datetime, timedelta
from app import app, db
from models import Stock, StockPrice

def fetch_stock_history(stock_code, days=60):
    """
    通过东方财富API获取小马历史数据
    """
    # 确定市场代码
    if stock_code.startswith('6'):
        market = '1'
    else:
        market = '0'
    
    secid = f'{market}.{stock_code}'
    
    # 计算日期范围
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # 东方财富API
    url = f'http://push2his.eastmoney.com/api/qt/stock/kline/get'
    params = {
        'secid': secid,
        'fields1': 'f1,f2,f3,f4,f5,f6',
        'fields2': 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
        'klt': '101',  # 日K线
        'fqt': '1',    # 前复权
        'beg': start_date.strftime('%Y%m%d'),
        'end': end_date.strftime('%Y%m%d'),
        'lmt': '100000',
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'http://quote.eastmoney.com/',
    }
    
    # 重试机制
    for attempt in range(3):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=15)
            
            if response.status_code != 200:
                if attempt < 2:
                    print(f"  尝试 {attempt+1}/3 失败，等待后重试...")
                    time.sleep(2)
                    continue
                print(f"  ✗ 获取失败: HTTP {response.status_code}")
                return []
            
            data = response.json()
            
            if data.get('data') is None or data['data'].get('klines') is None:
                print(f"  ✗ 无数据")
                return []
            
            klines = data['data']['klines']
            result = []
            
            for line in klines:
                try:
                    fields = line.split(',')
                    # 格式: 日期,开盘,收盘,最高,最低,成交量,成交额,振幅,涨跌幅,涨跌额,换手率
                    date_str = fields[0]
                    open_price = float(fields[1])
                    close_price = float(fields[2])
                    high_price = float(fields[3])
                    low_price = float(fields[4])
                    volume = int(float(fields[5]))
                    
                    result.append({
                        'date': date_str,
                        'open': open_price,
                        'high': high_price,
                        'low': low_price,
                        'close': close_price,
                        'volume': volume
                    })
                except (ValueError, IndexError) as e:
                    continue
            
            return result
        
        except requests.exceptions.ConnectionError as e:
            if attempt < 2:
                print(f"  连接失败，等待后重试...")
                time.sleep(3)
                continue
            print(f"  ✗ 连接错误: {str(e)}")
            return []
        except Exception as e:
            if attempt < 2:
                print(f"  错误，等待后重试...")
                time.sleep(2)
                continue
            print(f"  ✗ 错误: {str(e)}")
            return []
    
    return []

def main():
    with app.app_context():
        stocks = Stock.query.all()
        
        print(f'找到 {len(stocks)} 只小马\n')
        
        total_added = 0
        
        for stock in stocks:
            print(f'正在获取 {stock.name}({stock.code}) 的数据...')
            
            # 获取历史数据
            history_data = fetch_stock_history(stock.code, days=60)
            
            if not history_data:
                print(f'  ✗ 未获取到数据，跳过')
                continue
            
            # 保存到数据库
            added = 0
            for item in history_data:
                try:
                    date_obj = datetime.strptime(item['date'], '%Y-%m-%d').date()
                    
                    # 检查是否已存在
                    existing = StockPrice.query.filter_by(
                        stock_id=stock.id,
                        date=date_obj
                    ).first()
                    
                    if existing:
                        continue
                    
                    price = StockPrice(
                        stock_id=stock.id,
                        date=date_obj,
                        open_price=item['open'],
                        high_price=item['high'],
                        low_price=item['low'],
                        close_price=item['close'],
                        volume=item['volume']
                    )
                    
                    db.session.add(price)
                    added += 1
                    
                except Exception as e:
                    print(f'  保存 {item["date"]} 数据时出错: {str(e)}')
            
            db.session.commit()
            total_added += added
            print(f'  ✓ 成功添加 {added} 条数据\n')
            
            # 避免请求过快
            time.sleep(3)
        
        print(f'\n完成！共添加 {total_added} 条真实数据')

if __name__ == '__main__':
    main()
