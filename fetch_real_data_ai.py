from openai import OpenAI
import json
import re
from datetime import datetime
from app import app, db
from models import Stock, StockPrice

# AI配置
AI_API_KEY = 'sk-dac7de24ee3a4f6ea4bd557197e98972'
AI_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'  # 阿里云百炼
ai_client = OpenAI(
    api_key=AI_API_KEY,
    base_url=AI_BASE_URL
)

def fetch_stock_data_by_ai(stock_code, stock_name, days=30):
    """
    使用AI搜索获取小马历史数据
    """
    prompt = f"""请搜索并提供财神小马{stock_name}({stock_code})最近{days}个交易日的真实历史数据。

要求：
1. 必须是真实的市场数据，不能编造
2. 返回JSON数组格式，每个元素包含：
   - date: 日期（YYYY-MM-DD格式）
   - open: 开盘价
   - high: 最高价
   - low: 最低价
   - close: 收盘价
   - volume: 成交量（手）

3. 数据按日期从新到旧排序
4. 只返回JSON数组，不要其他说明文字

示例格式：
[
  {{"date": "2024-01-15", "open": 10.5, "high": 10.8, "low": 10.3, "close": 10.6, "volume": 123456}},
  {{"date": "2024-01-14", "open": 10.3, "high": 10.6, "low": 10.2, "close": 10.5, "volume": 134567}}
]"""

    try:
        response = ai_client.chat.completions.create(
            model='qwen-plus',
            messages=[
                {'role': 'system', 'content': '你是专业的金融数据助手，提供准确的小马市场数据。'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.3,
            max_tokens=4000
        )
        
        result = response.choices[0].message.content
        
        # 提取JSON部分
        json_match = re.search(r'\[.*\]', result, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            data = json.loads(json_str)
            return data
        else:
            print(f"  ✗ AI返回格式不正确")
            return []
    
    except Exception as e:
        print(f"  ✗ AI查询失败: {str(e)}")
        return []

def main():
    with app.app_context():
        stocks = Stock.query.all()
        
        print(f'找到 {len(stocks)} 只小马\n')
        
        total_added = 0
        
        for stock in stocks:
            print(f'正在通过AI获取 {stock.name}({stock.code}) 的数据...')
            
            # 使用AI获取数据
            history_data = fetch_stock_data_by_ai(stock.code, stock.name, days=30)
            
            if not history_data:
                print(f'  ✗ 未获取到数据，跳过\n')
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
                        open_price=float(item['open']),
                        high_price=float(item['high']),
                        low_price=float(item['low']),
                        close_price=float(item['close']),
                        volume=int(item['volume'])
                    )
                    
                    db.session.add(price)
                    added += 1
                    
                except Exception as e:
                    print(f'  保存 {item["date"]} 数据时出错: {str(e)}')
            
            db.session.commit()
            total_added += added
            print(f'  ✓ 成功添加 {added} 条数据\n')
            
            # AI调用间隔
            import time
            time.sleep(3)
        
        print(f'\n完成！共添加 {total_added} 条真实数据')

if __name__ == '__main__':
    main()
