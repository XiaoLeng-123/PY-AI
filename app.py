from flask import Flask, request, jsonify, send_from_directory, redirect
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from models import db, Stock, StockPrice, Portfolio
import datetime
import os
import json
import pandas as pd
from werkzeug.utils import secure_filename
import sys
from openai import OpenAI
from dotenv import load_dotenv

# 加载 .env 环境变量（如果存在）
load_dotenv()

# 获取运行目录（兼容打包后的exe）
def get_base_path():
    """获取程序运行的基础路径"""
    if getattr(sys, 'frozen', False):
        # 打包后的exe运行环境
        # PyInstaller会将资源文件放在 _internal 文件夹中
        base = os.path.dirname(sys.executable)
        internal_path = os.path.join(base, '_internal')
        if os.path.exists(internal_path):
            return internal_path
        return base
    else:
        # 开发环境
        return os.path.dirname(os.path.abspath(__file__))

BASE_PATH = get_base_path()

# 获取静态文件目录
if getattr(sys, 'frozen', False):
    # 打包后：static在 _internal/static
    STATIC_PATH = os.path.join(BASE_PATH, 'static')
else:
    # 开发环境：static在项目根目录
    STATIC_PATH = os.path.join(BASE_PATH, 'static')

app = Flask(__name__, 
            static_folder=STATIC_PATH,
            static_url_path='')
CORS(app)

# 初始化WebSocket
socketio = SocketIO(app, cors_allowed_origins="*")

# AI配置 - 从环境变量读取（优先使用 .env 文件中的配置）
AI_API_KEY = os.getenv('ALIYUN_API_KEY', 'sk-dac7de24ee3a4f6ea4bd557197e98972')
AI_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'  # 阿里云百炼
ai_client = OpenAI(
    api_key=AI_API_KEY,
    base_url=AI_BASE_URL
)

# 豆包API配置（火山引擎） - 从环境变量读取
DOUBAO_API_KEY = os.getenv('DOUBAO_API_KEY', '276abc6a-4c29-4789-811e-33c559616804')
DOUBAO_MODEL = 'deepseek-v3-2-251201'
DOUBAO_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
doubao_client = OpenAI(
    api_key=DOUBAO_API_KEY,
    base_url=DOUBAO_BASE_URL
)

# Flask 密钥 - 从环境变量读取
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'xiaoma_analysis_secret_key_2026')

# 如果你使用的是其他平台，可以修改 base_url：
# OpenAI: https://api.openai.com/v1
# 阿里云百炼: https://dashscope.aliyuncs.com/compatible-mode/v1
# 智谱清言: https://open.bigmodel.cn/api/paas/v4

# 配置SQLite数据库（使用绝对路径）
db_path = os.path.join(BASE_PATH, 'instance', 'stocks.db')
# 确保数据库目录存在
os.makedirs(os.path.dirname(db_path), exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 初始化数据库
db.init_app(app)

# 创建数据库表
with app.app_context():
    db.create_all()


@app.route('/api/stocks', methods=['GET'])
def get_stocks():
    """获取所有小马列表"""
    stocks = Stock.query.all()
    return jsonify([{
        'id': stock.id,
        'code': stock.code,
        'name': stock.name,
        'market': stock.market,
        'created_at': stock.created_at.isoformat()
    } for stock in stocks])


@app.route('/api/stocks/<int:stock_id>/info', methods=['GET'])
def get_stock_detail_info(stock_id):
    """获取小马详细信息（板块、最新消息等）"""
    stock = Stock.query.get_or_404(stock_id)
    
    prompt = f"""请联网搜索小马 {stock.code}({stock.name}) 的以下信息，只返回JSON格式：
{{
  "sectors": ["所属板块1", "所属板块2", "所属板块3"],
  "latest_news": "最新重要消息（50字以内）",
  "concept": "核心概念题材"
}}

只返回JSON，不要markdown格式。"""
    
    print(f"\n=== 获取小马详细信息 ===")
    print(f"代码: {stock.code}")
    
    try:
        response = ai_client.chat.completions.create(
            model='qwen-max',
            messages=[
                {'role': 'system', 'content': '你是专业的金融数据助手，请联网搜索获取最新的小马信息。'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.1,
            max_tokens=500,
            extra_body={
                'enable_search': True
            }
        )
        
        result = response.choices[0].message.content
        print(f"AI返回: {result}")
        
        import re
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            stock_info = json.loads(json_str)
            return jsonify(stock_info)
        else:
            return jsonify({'error': 'AI返回格式不正确'}), 500
            
    except Exception as e:
        print(f"查询异常: {str(e)}")
        return jsonify({'error': f'查询失败: {str(e)}'}), 500


@app.route('/api/stocks/<int:stock_id>', methods=['GET'])
def get_stock(stock_id):
    """获取单个小马信息"""
    stock = Stock.query.get_or_404(stock_id)
    return jsonify({
        'id': stock.id,
        'code': stock.code,
        'name': stock.name,
        'market': stock.market,
        'created_at': stock.created_at.isoformat()
    })


@app.route('/api/stocks', methods=['POST'])
def add_stock():
    """添加新小马"""
    data = request.json
    
    # 检查小马代码是否已存在
    existing_stock = Stock.query.filter_by(code=data['code']).first()
    if existing_stock:
        return jsonify({'error': '小马代码已存在'}), 400
    
    stock = Stock(
        code=data['code'],
        name=data['name'],
        market=data.get('market', '财神')
    )
    
    db.session.add(stock)
    db.session.commit()
    
    return jsonify({
        'message': '小马添加成功',
        'id': stock.id
    }), 201


@app.route('/api/stocks/batch_fetch', methods=['POST'])
def batch_fetch_stock_data():
    """批量获取指定时间区间的小马数据"""
    data = request.json
    stock_code = data.get('stock_code', '')
    start_date = data.get('start_date', '')
    end_date = data.get('end_date', '')
    
    if not stock_code or not start_date or not end_date:
        return jsonify({'error': '请提供完整的参数'}), 400
    
    # 查找小马
    stock = Stock.query.filter_by(code=stock_code).first()
    if not stock:
        return jsonify({'error': '小马代码不存在'}), 404
    
    prompt = f"""请联网搜索获取小马代码 {stock_code}({stock.name}) 从 {start_date} 到 {end_date} 的每个交易日完整行情数据。

必须联网从新浪财经、东方财富等财经网站获取真实数据！

返回JSON数组格式：
[
  {{
    "date": "YYYY-MM-DD",
    "open": 开盘价,
    "high": 最高价,
    "low": 最低价,
    "close": 收盘价,
    "volume": 成交量
  }},
  ...
]

请确保数据完整准确，只返回JSON数组，不要markdown格式。"""
    
    print(f"\n=== 批量获取小马数据 ===")
    print(f"代码: {stock_code}, 日期: {start_date} 至 {end_date}")
    
    try:
        response = ai_client.chat.completions.create(
            model='qwen-max',
            messages=[
                {'role': 'system', 'content': '你是专业的金融数据助手，请联网搜索获取真实的小马历史行情数据。'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.1,
            max_tokens=5000,
            extra_body={
                'enable_search': True
            }
        )
        
        result = response.choices[0].message.content
        print(f"AI返回长度: {len(result)}")
        
        # 解析JSON数组
        import re
        json_match = re.search(r'\[.*\]', result, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            price_data_list = json.loads(json_str)
            
            added_count = 0
            skipped_count = 0
            
            for item in price_data_list:
                try:
                    date_obj = datetime.datetime.strptime(item['date'], '%Y-%m-%d').date()
                    
                    # 检查是否已存在
                    existing = StockPrice.query.filter_by(
                        stock_id=stock.id,
                        date=date_obj
                    ).first()
                    
                    if existing:
                        skipped_count += 1
                        continue
                    
                    price = StockPrice(
                        stock_id=stock.id,
                        date=date_obj,
                        open_price=float(item['open']),
                        high_price=float(item['high']),
                        low_price=float(item['low']),
                        close_price=float(item['close']),
                        volume=int(item.get('volume', 0))
                    )
                    
                    db.session.add(price)
                    added_count += 1
                except Exception as e:
                    print(f"插入数据异常: {e}")
                    continue
            
            db.session.commit()
            
            # 返回导入的数据详情
            added_data = []
            for item in price_data_list:
                date_obj = datetime.datetime.strptime(item['date'], '%Y-%m-%d').date()
                added_data.append({
                    'date': item['date'],
                    'open': float(item['open']),
                    'high': float(item['high']),
                    'low': float(item['low']),
                    'close': float(item['close']),
                    'volume': int(item.get('volume', 0))
                })
            
            return jsonify({
                'message': '导入完成',
                'added_count': added_count,
                'skipped_count': skipped_count,
                'data': added_data
            })
        else:
            return jsonify({'error': 'AI返回格式不正确'}), 500
            
    except Exception as e:
        print(f"批量获取异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'批量获取失败: {str(e)}'}), 500


@app.route('/api/stocks/search', methods=['POST'])
def search_stock_info():
    """通过新浪财经API查询小马实时行情数据"""
    data = request.json
    code = data.get('code', '')
    
    if not code:
        return jsonify({'error': '请提供小马代码'}), 400
    
    print(f"\n=== 查询小马信息 ===")
    print(f"代码: {code}")
    
    try:
        # 构建新浪财经实时行情API地址
        if code.startswith('6'):
            sina_code = f'sh{code}'
            market = '财神'
        else:
            sina_code = f'sz{code}'
            market = '财神'
        
        url = f"https://hq.sinajs.cn/list={sina_code}"
        headers = {
            'Referer': 'https://finance.sina.com.cn/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        import requests
        response = requests.get(url, headers=headers, timeout=5)
        response.encoding = 'gbk'  # 新浪财经返回的是GBK编码
        
        if response.status_code != 200:
            return jsonify({'error': '查询失败'}), 500
        
        # 解析数据格式: var hq_str_sh600666="名字,开盘价,昨收,当前价,最高,最低,买1,卖1,成交量,成交额,买1量,买1价,..."
        result_str = response.text
        if '=' not in result_str:
            return jsonify({'error': '小马代码不存在或数据格式错误'}), 404
        
        data_part = result_str.split('=')[1].strip('";\n\r')
        fields = data_part.split(',')
        
        if len(fields) < 30:
            return jsonify({'error': '数据不完整'}), 404
        
        name = fields[0]
        open_price = float(fields[1]) if fields[1] else 0
        pre_close = float(fields[2]) if fields[2] else 0
        current_price = float(fields[3]) if fields[3] else 0
        high = float(fields[4]) if fields[4] else 0
        low = float(fields[5]) if fields[5] else 0
        volume = int(fields[8]) if fields[8] else 0  # 成交量（手）
        amount = float(fields[9]) if fields[9] else 0  # 成交额（元）
        
        # 计算涨跌幅
        if pre_close > 0:
            change_percent = ((current_price - pre_close) / pre_close) * 100
            change_str = f"{'+' if change_percent >= 0 else ''}{change_percent:.2f}%"
        else:
            change_str = '0.00%'
        
        # 格式化成交量
        if volume >= 100000000:
            volume_str = f"{volume / 100000000:.2f}亿手"
        elif volume >= 10000:
            volume_str = f"{volume / 10000:.2f}万手"
        else:
            volume_str = f"{volume}手"
        
        stock_info = {
            'name': name,
            'market': market,
            'latest_price': current_price,
            'change_percent': change_str,
            'high': high,
            'low': low,
            'volume': volume_str,
            'open': open_price,
            'pre_close': pre_close,
            'volume_num': volume,
            'amount': amount
        }
        
        print(f"✓ 查询成功: {name} - ¥{current_price} {change_str}")
        return jsonify(stock_info)
        
    except requests.exceptions.RequestException as e:
        print(f"网络请求异常: {str(e)}")
        return jsonify({'error': f'网络请求失败: {str(e)}'}), 500
    except Exception as e:
        print(f"查询异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'查询失败: {str(e)}'}), 500


@app.route('/api/stocks/search_by_name', methods=['POST'])
def search_stock_by_name():
    """通过名称查询小马实时行情数据"""
    data = request.json
    name = data.get('name', '')
    
    if not name or len(name) < 2:
        return jsonify({'error': '请输入小马名称'}), 400
    
    print(f"\n=== 根据名称查询小马 ===")
    print(f"名称: {name}")
    
    try:
        import requests
        # 使用新浪财经的小马搜索API（更稳定）
        search_url = f"https://suggest3.sinajs.cn/suggest/key={name}"
        headers = {
            'Referer': 'https://finance.sina.com.cn/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        search_response = requests.get(search_url, headers=headers, timeout=5)
        search_response.encoding = 'gbk'
        
        if search_response.status_code != 200:
            return jsonify({'error': '查询失败'}), 500
        
        # 解析新浪搜索API返回的数据
        # 格式: var suggestvalue="名称,类型,代码,市场代码,名称,,名称,99,1,,,;...";
        search_text = search_response.text
        if 'suggestvalue=' not in search_text:
            return jsonify({'error': '数据格式错误'}), 404
        
        value_part = search_text.split('"')[1]
        if not value_part or value_part == ',,':
            return jsonify({'error': '未找到匹配的小马'}), 404
        
        # 解析搜索结果（逗号分隔）
        results = []
        for item in value_part.split(';'):
            if not item:
                continue
            parts = item.split(',')
            # 格式: 名称,类型,代码,市场代码,...
            # 例如: 利柏特,11,605167,sh605167,利柏特,,利柏特,99,1,,,
            if len(parts) >= 3:
                stock_name = parts[0].strip()
                item_type = parts[1].strip()
                code = parts[2].strip()
                
                # 只保留小马（类型11表示A股），过滤基金（类型201）等
                if code and stock_name and len(code) >= 6 and item_type == '11':
                    results.append({'code': code, 'name': stock_name})
        
        if not results:
            return jsonify({'error': '未找到匹配的小马'}), 404
        
        # 获取第一个匹配结果
        first_result = results[0]
        code = first_result['code']
        stock_name = first_result['name']
        
        # 判断市场
        if code.startswith('6'):
            sina_code = f'sh{code}'
            market = '财神'
        else:
            sina_code = f'sz{code}'
            market = '财神'
        
        # 获取实时行情
        sina_url = f"https://hq.sinajs.cn/list={sina_code}"
        sina_response = requests.get(sina_url, headers=headers, timeout=5)
        sina_response.encoding = 'gbk'
        
        if sina_response.status_code != 200:
            return jsonify({'error': '获取行情失败'}), 500
        
        # 解析新浪财经数据
        result_str = sina_response.text
        if '=' not in result_str:
            return jsonify({'error': '数据格式错误'}), 404
        
        data_part = result_str.split('=')[1].strip('";\n\r')
        fields = data_part.split(',')
        
        if len(fields) < 30:
            return jsonify({'error': '数据不完整'}), 404
        
        pre_close = float(fields[2]) if fields[2] else 0
        current_price = float(fields[3]) if fields[3] else 0
        high = float(fields[4]) if fields[4] else 0
        low = float(fields[5]) if fields[5] else 0
        volume = int(fields[8]) if fields[8] else 0
        
        # 计算涨跌幅
        if pre_close > 0:
            change_percent = ((current_price - pre_close) / pre_close) * 100
            change_str = f"{'+' if change_percent >= 0 else ''}{change_percent:.2f}%"
        else:
            change_str = '0.00%'
        
        # 格式化成交量
        if volume >= 100000000:
            volume_str = f"{volume / 100000000:.2f}亿手"
        elif volume >= 10000:
            volume_str = f"{volume / 10000:.2f}万手"
        else:
            volume_str = f"{volume}手"
        
        result = {
            'code': code,
            'name': stock_name,
            'market': market,
            'latest_price': current_price,
            'change_percent': change_str,
            'high': high,
            'low': low,
            'volume': volume_str
        }
        
        print(f"✓ 查询成功: {result['name']}({result['code']}) - ¥{current_price} {change_str}")
        return jsonify(result)
        
    except requests.exceptions.RequestException as e:
        print(f"网络请求异常: {str(e)}")
        return jsonify({'error': f'网络请求失败: {str(e)}'}), 500
    except Exception as e:
        print(f"查询异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'查询失败: {str(e)}'}), 500


@app.route('/api/stocks/<int:stock_id>', methods=['DELETE'])
def delete_stock(stock_id):
    """删除小马"""
    stock = Stock.query.get_or_404(stock_id)
    db.session.delete(stock)
    db.session.commit()
    
    return jsonify({'message': '小马删除成功'})


@app.route('/api/stocks/update_all', methods=['POST'])
def update_all_stocks():
    """更新所有小马的最新60天数据，使用腾讯财经API，包含数据准确性校验"""
    from datetime import datetime, timedelta
    import requests
    
    print(f"\n=== 开始更新所有小马数据 ===")
    
    all_stocks = Stock.query.all()
    if not all_stocks:
        return jsonify({'success': False, 'error': '没有小马数据'}), 400
    
    # 计算日期范围（从今天起往前60天，约2个月）
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=60)
    
    success_count = 0
    failed_stocks = []
    total_added = 0
    total_updated = 0  # 新增的校验更新计数
    
    for stock in all_stocks:
        try:
            # 构建腾讯财经API地址
            if stock.code.startswith('6'):
                tencent_code = f'sh{stock.code}'
            else:
                tencent_code = f'sz{stock.code}'
            
            # 使用腾讯财经API获取K线数据（前复权）
            url = f"https://web.ifzq.gtimg.cn/appstock/app/fqkline/get"
            params = {
                'param': f'{tencent_code},day,,,60,qfq',  # 60条日线，前复权
            }
            
            headers = {
                'Referer': 'https://stockapp.finance.qq.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            try:
                response = requests.get(url, params=params, headers=headers, timeout=10)
            except requests.exceptions.RequestException as e:
                print(f"  ✗ {stock.name}({stock.code}): 网络请求失败 - {str(e)}")
                failed_stocks.append(f"{stock.name}(网络错误)")
                continue
            
            if response.status_code != 200:
                print(f"  ✗ {stock.name}({stock.code}): HTTP {response.status_code}")
                failed_stocks.append(stock.name)
                continue
            
            try:
                api_data = response.json()
            except json.JSONDecodeError as e:
                print(f"  ✗ {stock.name}({stock.code}): JSON解析失败 - {str(e)}")
                print(f"  响应内容: {response.text[:200]}")
                failed_stocks.append(f"{stock.name}(JSON错误)")
                continue
            
            # 解析腾讯API返回的数据结构: {code: 0, data: {sz000815: {qfqday: [[...], [...]]}}}
            if api_data.get('code') != 0:
                print(f"  ✗ {stock.name}({stock.code}): API返回code={api_data.get('code')}, msg={api_data.get('msg', '')}")
                failed_stocks.append(stock.name)
                continue
            
            # 尝试多种key格式
            stock_data = None
            matched_key = None
            for key in [tencent_code, stock.code, f'{"sh" if stock.code.startswith("6") else "sz"}{stock.code}']:
                if key in api_data.get('data', {}):
                    stock_data = api_data['data'][key]
                    matched_key = key
                    break
            
            klines = stock_data.get('qfqday', []) if stock_data else []
            
            # 如果腾讯API的K线数据为空，尝试使用东方财富API
            if not klines or not isinstance(klines, list):
                if stock_data:
                    print(f"  → 腾讯API的K线数据为空 (matched_key={matched_key}), 尝试东方财富API...")
                else:
                    print(f"  ✗ {stock.name}({stock.code}): 腾讯API未找到小马数据")
                    print(f"  API返回的keys: {list(api_data.get('data', {}).keys())[:10]}")
                    print(f"  尝试的keys: {[tencent_code, stock.code]}")
                    print(f"  → 尝试使用东方财富API...")
                
                # 尝试使用东方财富API作为备用
                try:
                    # 确定市场代码
                    if stock.code.startswith('6'):
                        market = '1'
                    else:
                        market = '0'
                    
                    secid = f'{market}.{stock.code}'
                    eastmoney_url = f'http://push2his.eastmoney.com/api/qt/stock/kline/get'
                    eastmoney_params = {
                        'secid': secid,
                        'fields1': 'f1,f2,f3,f4,f5,f6',
                        'fields2': 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
                        'klt': '101',  # 日K线
                        'fqt': '1',    # 前复权
                        'beg': start_date.strftime('%Y%m%d'),
                        'end': end_date.strftime('%Y%m%d'),
                        'lmt': '100',
                    }
                    
                    eastmoney_headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'http://quote.eastmoney.com/',
                    }
                    
                    em_response = requests.get(eastmoney_url, params=eastmoney_params, headers=eastmoney_headers, timeout=10)
                    
                    if em_response.status_code == 200:
                        em_data = em_response.json()
                        if em_data.get('data') and em_data['data'].get('klines'):
                            klines_raw = em_data['data']['klines']
                            print(f"  ✓ 东方财富API成功获取 {len(klines_raw)} 条数据")
                            
                            # 转换东方财富数据格式
                            klines = []
                            for line in klines_raw:
                                try:
                                    fields = line.split(',')
                                    # 格式: 日期,开盘,收盘,最高,最低,成交量,成交额,...
                                    date_str = fields[0]
                                    open_price = float(fields[1])
                                    close_price = float(fields[2])
                                    high_price = float(fields[3])
                                    low_price = float(fields[4])
                                    volume = int(float(fields[5]))
                                    
                                    klines.append([
                                        date_str,
                                        open_price,
                                        close_price,
                                        high_price,
                                        low_price,
                                        volume
                                    ])
                                except (ValueError, IndexError):
                                    continue
                            
                            if not klines:
                                print(f"  ✗ {stock.name}({stock.code}): 东方财富API数据解析失败")
                                failed_stocks.append(f"{stock.name}(无数据)")
                                continue
                        else:
                            print(f"  ✗ {stock.name}({stock.code}): 东方财富API无数据")
                            failed_stocks.append(f"{stock.name}(无数据)")
                            continue
                    else:
                        print(f"  ✗ {stock.name}({stock.code}): 东方财富API请求失败 HTTP {em_response.status_code}")
                        failed_stocks.append(f"{stock.name}(无数据)")
                        continue
                except Exception as e:
                    print(f"  ✗ {stock.name}({stock.code}): 东方财富API异常 - {str(e)}")
                    failed_stocks.append(f"{stock.name}(无数据)")
                    continue
            
            print(f"  ✓ {stock.name}({stock.code}): 获取到 {len(klines)} 条K线数据")
            
            # 过滤日期范围内的数据
            added_for_stock = 0
            updated_for_stock = 0
            
            for kline in klines:
                try:
                    # 腾讯格式: [日期, 开盘, 收盘, 最高, 最低, 成交量]
                    if len(kline) < 6:
                        continue
                    
                    date_str = kline[0]  # '2026-01-12'
                    if not date_str:
                        continue
                    
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                    
                    # 检查日期范围
                    if date_obj < start_date or date_obj > end_date:
                        continue
                    
                    # 检查是否已存在
                    existing = StockPrice.query.filter_by(
                        stock_id=stock.id,
                        date=date_obj
                    ).first()
                    
                    # 解析新数据
                    new_open = float(kline[1])
                    new_close = float(kline[2])
                    new_high = float(kline[3])
                    new_low = float(kline[4])
                    new_volume = int(float(kline[5]))  # 腾讯API成交量单位已是"手"
                    
                    if new_close == 0:
                        continue
                    
                    if existing:
                        # 数据已存在，校验准确性
                        # 允许小误差（可能是四舍五入导致）
                        price_diff = abs(existing.close_price - new_close)
                        volume_diff = abs(existing.volume - new_volume)
                        
                        # 如果价格差异超过0.01或成交量差异超过100手，则更新
                        if price_diff > 0.01 or volume_diff > 100:
                            existing.open_price = new_open
                            existing.high_price = new_high
                            existing.low_price = new_low
                            existing.close_price = new_close
                            existing.volume = new_volume
                            updated_for_stock += 1
                            print(f"  ⚠ {date_obj}: 数据修正 (收盘价: {existing.close_price:.2f}→{new_close:.2f})")
                    else:
                        # 数据不存在，新增
                        price = StockPrice(
                            stock_id=stock.id,
                            date=date_obj,
                            open_price=new_open,
                            high_price=new_high,
                            low_price=new_low,
                            close_price=new_close,
                            volume=new_volume
                        )
                        
                        db.session.add(price)
                        added_for_stock += 1
                    
                except Exception as e:
                    print(f"  解析 {stock.name} 数据异常: {e}")
                    continue
            
            if added_for_stock > 0 or updated_for_stock > 0:
                db.session.commit()
                total_added += added_for_stock
                total_updated += updated_for_stock
                success_count += 1
                
                if updated_for_stock > 0:
                    print(f"✓ {stock.name}({stock.code}): 新增 {added_for_stock} 条, 修正 {updated_for_stock} 条")
                elif added_for_stock > 0:
                    print(f"✓ {stock.name}({stock.code}): 新增 {added_for_stock} 条")
                else:
                    print(f"- {stock.name}({stock.code}): 数据已是最新")
            else:
                print(f"- {stock.name}({stock.code}): 无新数据")
                success_count += 1  # 也算成功，只是没有新数据
                
        except Exception as e:
            error_msg = str(e)
            print(f"✗ {stock.name}({stock.code}): 更新失败 - {error_msg}")
            # 记录详细错误信息
            import traceback
            traceback.print_exc()
            failed_stocks.append(f"{stock.name}(错误: {error_msg[:50]})")
            db.session.rollback()
    
    print(f"\n=== 更新完成 ===")
    print(f"总小马数: {len(all_stocks)}")
    print(f"成功: {success_count}")
    print(f"失败: {len(failed_stocks)}")
    print(f"新增数据: {total_added} 条")
    print(f"修正数据: {total_updated} 条")
    
    return jsonify({
        'success': True,
        'total_stocks': len(all_stocks),
        'success_count': success_count,
        'failed_stocks': failed_stocks,
        'total_added': total_added,
        'total_updated': total_updated
    })


@app.route('/api/stocks/<int:stock_id>/prices', methods=['GET'])
def get_stock_prices(stock_id):
    """获取小马历史价格数据"""
    stock = Stock.query.get_or_404(stock_id)
    
    # 可选的日期范围参数
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    days = request.args.get('days', type=int)  # 最近N天
    
    query = StockPrice.query.filter_by(stock_id=stock_id)
    
    if start_date:
        query = query.filter(StockPrice.date >= datetime.datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(StockPrice.date <= datetime.datetime.strptime(end_date, '%Y-%m-%d').date())
    
    # 如果指定了days，限制返回数量
    if days:
        prices = query.order_by(StockPrice.date.desc()).limit(days).all()
    else:
        prices = query.order_by(StockPrice.date.desc()).all()
    
    return jsonify([{
        'id': price.id,
        'date': price.date.isoformat(),
        'open': price.open_price,
        'high': price.high_price,
        'low': price.low_price,
        'close': price.close_price,
        'volume': price.volume
    } for price in prices])


@app.route('/api/stocks/<int:stock_id>/prices', methods=['POST'])
def add_stock_price(stock_id):
    """添加小马价格数据"""
    print(f"\n=== 添加价格数据请求 ===")
    print(f"stock_id: {stock_id}")
    print(f"request.json: {request.json}")
    
    stock = Stock.query.get_or_404(stock_id)
    data = request.json
    
    try:
        # 检查该日期是否已有数据
        date_obj = datetime.datetime.strptime(data['date'], '%Y-%m-%d').date()
        print(f"日期解析成功: {date_obj}")
        
        existing_price = StockPrice.query.filter_by(
            stock_id=stock_id,
            date=date_obj
        ).first()
        
        if existing_price:
            print(f"该日期已存在数据")
            return jsonify({'error': '该日期的数据已存在'}), 400
        
        print(f"准备插入数据: open={data['open']}, high={data['high']}, low={data['low']}, close={data['close']}, volume={data.get('volume', 0)}")
        
        price = StockPrice(
            stock_id=stock_id,
            date=date_obj,
            open_price=float(data['open']),
            high_price=float(data['high']),
            low_price=float(data['low']),
            close_price=float(data['close']),
            volume=int(data.get('volume', 0))
        )
        
        db.session.add(price)
        db.session.commit()
        
        print(f"数据添加成功")
        
        return jsonify({
            'message': '价格数据添加成功',
            'id': price.id
        }), 201
        
    except Exception as e:
        print(f"添加数据异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'添加失败: {str(e)}'}), 400


@app.route('/api/stocks/<int:stock_id>/prices/batch', methods=['POST'])
def batch_add_stock_prices(stock_id):
    """批量添加小马价格数据"""
    stock = Stock.query.get_or_404(stock_id)
    data = request.json
    
    prices_added = 0
    errors = []
    
    for item in data.get('prices', []):
        try:
            date_obj = datetime.datetime.strptime(item['date'], '%Y-%m-%d').date()
            
            # 检查是否已存在
            existing_price = StockPrice.query.filter_by(
                stock_id=stock_id,
                date=date_obj
            ).first()
            
            if existing_price:
                errors.append(f"日期 {item['date']} 的数据已存在，跳过")
                continue
            
            price = StockPrice(
                stock_id=stock_id,
                date=date_obj,
                open_price=float(item['open']),
                high_price=float(item['high']),
                low_price=float(item['low']),
                close_price=float(item['close']),
                volume=int(item.get('volume', 0))
            )
            
            db.session.add(price)
            prices_added += 1
            
        except Exception as e:
            errors.append(f"处理日期 {item.get('date', '未知')} 时出错: {str(e)}")
    
    db.session.commit()
    
    return jsonify({
        'message': f'成功添加 {prices_added} 条数据',
        'errors': errors
    }), 201


@app.route('/api/ai/fetch_stock', methods=['POST'])
def ai_fetch_stock():
    """AI实时查询指定小马指定日期的数据（支持联网搜索）"""
    data = request.json
    stock_code = data.get('stock_code')
    query_date = data.get('date')
    
    print(f"\n=== AI实时查询请求 ===")
    print(f"小马代码: {stock_code}")
    print(f"查询日期: {query_date}")
    
    if not stock_code or not query_date:
        return jsonify({'error': '请提供小马代码和日期'}), 400
    
    # 使用阿里云百炼的联网搜索能力
    prompt = f"""请联网搜索财神小马{stock_code}在{query_date}的真实交易数据。

重要要求：
1. 必须通过搜索引擎获取最新的真实数据，不能编造
2. 返回纯JSON格式，包含以下字段：
   - date: 日期（YYYY-MM-DD）
   - stock_name: 小马名称
   - open: 开盘价（数字）
   - high: 最高价（数字）
   - low: 最低价（数字）
   - close: 收盘价（数字）
   - volume: 成交量（手，数字）

3. 只返回JSON对象，不要任何其他说明文字

示例：
{{"date": "2024-01-15", "stock_name": "大族激光", "open": 10.5, "high": 10.8, "low": 10.3, "close": 10.6, "volume": 123456}}"""
    
    try:
        response = ai_client.chat.completions.create(
            model='qwen-max',  # 使用支持联网搜索的模型
            messages=[
                {'role': 'system', 'content': '你是专业的金融数据助手。请使用联网搜索功能获取最新的真实小马市场数据。'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.1,
            max_tokens=500,
            extra_body={
                'enable_search': True  # 阿里云百炼联网搜索参数
            }
        )
        
        result = response.choices[0].message.content
        print(f"AI原始返回: {result}")
        
        # 提取JSON
        import json
        import re
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            stock_data = json.loads(json_str)
            print(f"解析后的数据: {stock_data}")
            return jsonify(stock_data)
        else:
            print("未找到JSON格式")
            return jsonify({'error': 'AI返回格式不正确'}), 500
    
    except Exception as e:
        print(f"异常: {str(e)}")
        return jsonify({'error': f'AI查询失败: {str(e)}'}), 500


@app.route('/api/ai/analyze', methods=['POST'])
def ai_analyze():
    """AI分析小马数据"""
    data = request.json
    stock_id = data.get('stock_id')
    question = data.get('question', '请分析这只小马')
    
    if not stock_id:
        return jsonify({'error': '请提供小马ID'}), 400
    
    stock = Stock.query.get_or_404(stock_id)
    prices = StockPrice.query.filter_by(stock_id=stock_id).order_by(StockPrice.date.desc()).limit(30).all()
    
    if not prices:
        return jsonify({'error': '没有价格数据可供分析'}), 404
    
    # 构建数据上下文
    price_data = []
    for p in prices:
        price_data.append({
            'date': p.date.isoformat(),
            'open': p.open_price,
            'high': p.high_price,
            'low': p.low_price,
            'close': p.close_price,
            'volume': p.volume
        })
    
    # 计算基本指标
    closes = [p.close_price for p in prices]
    latest_price = closes[0]
    price_change = ((closes[0] - closes[-1]) / closes[-1]) * 100 if len(closes) > 1 else 0
    
    context = f"""小马信息：
- 代码：{stock.code}
- 名称：{stock.name}
- 市场：{stock.market}

最近{len(prices)}天的价格数据：
{json.dumps(price_data, ensure_ascii=False, indent=2)}

技术指标：
- 最新价格：{latest_price}
- 期间涨跌幅：{price_change:.2f}%
- 最高价：{max(closes)}
- 最低价：{min(closes)}
- 平均价格：{sum(closes)/len(closes):.2f}

用户问题：{question}"""
    
    try:
        response = ai_client.chat.completions.create(
            model='qwen-plus',
            messages=[
                {'role': 'system', 'content': '你是专业的小马分析师，请根据提供的小马数据和用户问题进行专业分析。'},
                {'role': 'user', 'content': context}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        analysis = response.choices[0].message.content
        return jsonify({'analysis': analysis})
        
    except Exception as e:
        return jsonify({'error': f'AI分析失败: {str(e)}'}), 500


@app.route('/api/ai/compare_analyze', methods=['POST'])
def ai_compare_analyze():
    """AI对比分析多只小马"""
    data = request.json
    stocks_data = data.get('stocks', [])
    question = data.get('question', '请对比分析这些小马')
    
    if not stocks_data or len(stocks_data) < 2:
        return jsonify({'error': '请提供至少2只小马进行对比'}), 400
    
    # 构建对比上下文
    context = f"""请对比分析以下{len(stocks_data)}只小马：

"""
    
    for i, stock_info in enumerate(stocks_data, 1):
        prices = stock_info.get('prices', [])
        if not prices:
            context += f"\n{i}. {stock_info['name']}({stock_info['code']}) - 无价格数据\n"
            continue
        
        closes = [p['close'] for p in prices]
        latest_price = closes[0]
        price_change = ((closes[0] - closes[-1]) / closes[-1]) * 100 if len(closes) > 1 else 0
        
        context += f"""
{i}. {stock_info['name']}({stock_info['code']}) - {stock_info['market']}
   - 最新价格：{latest_price}
   - 期间涨跌幅：{price_change:.2f}%
   - 最高价：{max(closes)}
   - 最低价：{min(closes)}
   - 平均价格：{sum(closes)/len(closes):.2f}
   - 数据点数：{len(prices)}
   - 最近价格数据：
{json.dumps(prices[:10], ensure_ascii=False, indent=6)}
"""
    
    context += f"""
对比分析要求：{question}

请从以下维度进行专业对比分析：
1. 收益性对比（收益率、波动性）
2. 风险性对比（最大回撤、波动率）
3. 技术指标对比（趋势、支撑位、阻力位）
4. 投资建议（适合的投资风格、持仓建议）

请给出清晰的结构化分析结果。"""
    
    print(f"\n=== AI对比分析请求 ===")
    print(f"小马数量: {len(stocks_data)}")
    print(f"分析问题: {question}")
    
    try:
        response = ai_client.chat.completions.create(
            model='qwen-plus',
            messages=[
                {'role': 'system', 'content': '你是专业的小马分析师，擅长多只小马的对比分析。请根据提供的小马数据进行专业、客观的对比分析。'},
                {'role': 'user', 'content': context}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        analysis = response.choices[0].message.content
        print(f"对比分析完成")
        return jsonify({'analysis': analysis})
        
    except Exception as e:
        print(f"对比分析异常: {str(e)}")
        return jsonify({'error': f'AI对比分析失败: {str(e)}'}), 500


@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    """AI对话（通用问题）"""
    data = request.json
    question = data.get('question', '')
    
    if not question:
        return jsonify({'error': '请提供问题'}), 400
    
    try:
        response = ai_client.chat.completions.create(
            model='qwen-plus',
            messages=[
                {'role': 'system', 'content': '你是专业的小马投资顾问，帮助用户解答投资相关问题。'},
                {'role': 'user', 'content': question}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        answer = response.choices[0].message.content
        return jsonify({'answer': answer})
        
    except Exception as e:
        return jsonify({'error': f'AI对话失败: {str(e)}'}), 500


@app.route('/api/ai/doubao_prompt', methods=['POST'])
def generate_doubao_prompt():
    """生成豆包分析提示词文本（不消耗API Token）"""
    data = request.json
    stocks_data = data.get('stocks', [])
    question = data.get('question', '请分析这些小马')
    
    if not stocks_data:
        return jsonify({'error': '请提供小马数据'}), 400
    
    # 构建提示词
    prompt = f"""你是专业的小马分析师，请帮我分析以下{len(stocks_data)}只小马：

"""
    
    for i, stock_info in enumerate(stocks_data, 1):
        prices = stock_info.get('prices', [])
        if not prices:
            prompt += f"\n{i}. {stock_info['name']}({stock_info['code']}) - 无价格数据\n"
            continue
        
        closes = [p['close'] for p in prices]
        highs = [p['high'] for p in prices]
        lows = [p['low'] for p in prices]
        opens = [p['open'] for p in prices]
        volumes = [p['volume'] for p in prices]
        
        latest_price = closes[0]
        price_change = ((closes[0] - closes[-1]) / closes[-1]) * 100 if len(closes) > 1 else 0
        
        # 计算简单指标
        ma5 = sum(closes[:5]) / min(5, len(closes))
        ma20 = sum(closes[:20]) / min(20, len(closes))
        
        prompt += f"""
{i}. {stock_info['name']}({stock_info['code']}) - {stock_info['market']}
   最新价格：{latest_price}  |  涨跌幅：{price_change:+.2f}%  |  最高：{max(highs)}  |  最低：{min(lows)}
   均线：MA5={ma5:.2f}  |  MA20={ma20:.2f}  |  数据量：{len(prices)}条
   近10日价格：{closes[:10]}
   近10日成交量：{volumes[:10]}
"""
    
    prompt += f"""

分析要求：{question}

请从以下维度分析：
1. 各小马的基本面和技术面
2. 近期走势和趋势判断
3. 支撑位和阻力位
4. 风险收益评估
5. 投资建议

请给出详细的分析报告。"""
    
    return jsonify({'prompt': prompt})


@app.route('/api/ai/doubao_analyze', methods=['POST'])
def doubao_online_analyze():
    """使用豆包API进行在线小马分析（消耗豆包Token）"""
    data = request.json
    stocks_data = data.get('stocks', [])
    question = data.get('question', '请分析这些小马')
    
    if not stocks_data:
        return jsonify({'error': '请提供小马数据'}), 400
    
    # 检查豆包客户端是否已配置
    if doubao_client is None:
        return jsonify({
            'error': '豆包API未配置。请在app.py中填写DOUBAO_API_KEY。\n\n获取方式：\n1. 访问 https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey\n2. 创建API Key\n3. 将API Key填入app.py第26行'
        }), 500
    
    print(f"\n=== 豆包在线分析 ===")
    print(f"小马数量: {len(stocks_data)}")
    print(f"使用模型: {DOUBAO_MODEL}")
    
    # 构建提示词
    prompt = f"""你是专业的小马分析师，请帮我详细分析以下{len(stocks_data)}只小马：

"""
    
    for i, stock_info in enumerate(stocks_data, 1):
        prices = stock_info.get('prices', [])
        if not prices:
            prompt += f"\n{i}. {stock_info['name']}({stock_info['code']}) - 无价格数据\n"
            continue
        
        closes = [p['close'] for p in prices]
        highs = [p['high'] for p in prices]
        lows = [p['low'] for p in prices]
        opens = [p['open'] for p in prices]
        volumes = [p['volume'] for p in prices]
        
        latest_price = closes[0]
        price_change = ((closes[0] - closes[-1]) / closes[-1]) * 100 if len(closes) > 1 else 0
        
        # 计算简单指标
        ma5 = sum(closes[:5]) / min(5, len(closes))
        ma20 = sum(closes[:20]) / min(20, len(closes))
        
        prompt += f"""
{i}. {stock_info['name']}({stock_info['code']}) - {stock_info['market']}
   最新价格：{latest_price}  |  涨跌幅：{price_change:+.2f}%  |  最高：{max(highs)}  |  最低：{min(lows)}
   均线：MA5={ma5:.2f}  |  MA20={ma20:.2f}  |  数据量：{len(prices)}条
   近10日价格：{closes[:10]}
   近10日成交量：{volumes[:10]}
"""
    
    prompt += f"""

分析要求：{question}

请从以下维度进行专业分析：
1. 各小马的基本面和技术面分析
2. 近期走势和趋势判断
3. 关键支撑位和阻力位
4. 风险收益评估
5. 具体投资建议（买入/持有/卖出）
6. 仓位管理建议

请给出详细、专业的分析报告，包含具体数据和逻辑推理。"""
    
    try:
        print("\n" + "="*50)
        print("开始调用豆包API (DeepSeek-V3.2)...")
        print("="*50)
        
        # 使用 Responses API（不是 Chat Completions）
        # 参考官方文档：https://www.volcengine.com/docs/82379/1399008
        print(f"\n使用模型: {DOUBAO_MODEL}")
        print(f"API端点: responses (支持联网搜索)")
        
        # 调用 Responses API
        response = doubao_client.responses.create(
            model=DOUBAO_MODEL,
            input=[
                {
                    'role': 'system',
                    'content': '你是专业的小马分析师，擅长技术分析和基本面分析，能给出专业的投资建议。'
                },
                {
                    'role': 'user',
                    'content': [
                        {
                            'type': 'input_text',
                            'text': prompt
                        }
                    ]
                }
            ],
            # 暂不使用联网搜索（需单独开通）
            # tools=[
            #     {
            #         'type': 'web_search',
            #         'max_keyword': 3
            #     }
            # ],
            temperature=0.3,
            max_output_tokens=3000
        )
        
        print(f"✓ API调用成功")
        print(f"✓ 模型: {DOUBAO_MODEL}")
        
        # 提取分析结果
        analysis = response.output[0].content[0].text
        print(f"豆包分析完成，长度: {len(analysis)}")
        
        return jsonify({
            'analysis': analysis,
            'model': 'doubao'
        })
        
    except Exception as e:
        print(f"豆包API调用失败: {str(e)}")
        return jsonify({'error': f'豆包API调用失败: {str(e)}'}), 500


@app.route('/')
def index():
    """提供前端页面（开发模式重定向，打包后提供静态文件）"""
    if not getattr(sys, 'frozen', False):
        # 开发模式：重定向到 Vite 开发服务器
        return redirect('http://localhost:5173')
    else:
        # 打包后：提供静态文件
        return send_from_directory(STATIC_PATH, 'index.html')

# React SPA catch-all 路由 - 所有非API路由都返回index.html
@app.route('/<path:path>')
def serve_spa(path):
    """为React SPA提供路由支持"""
    # 如果是静态资源，直接返回
    static_file = os.path.join(STATIC_PATH, path)
    if os.path.exists(static_file) and os.path.isfile(static_file):
        return send_from_directory(STATIC_PATH, path)
    # 否则返回index.html，让React Router处理
    return send_from_directory(STATIC_PATH, 'index.html')


@app.route('/api/stats/dashboard', methods=['GET'])
def get_dashboard_stats():
    """获取数据概览全局统计"""
    all_stocks = Stock.query.all()
    all_prices = StockPrice.query.all()
    
    if not all_stocks:
        return jsonify({
            'total_stocks': 0,
            'total_records': 0,
            'active_stocks': 0,
            'latest_date': None
        })
    
    # 统计所有小马的价格记录总数
    total_records = len(all_prices)
    
    # 计算最近7天有数据的小马数量
    from datetime import datetime, timedelta
    seven_days_ago = datetime.now().date() - timedelta(days=7)
    active_stocks = set()
    latest_date = None
    
    for price in all_prices:
        price_date = price.date.date() if hasattr(price.date, 'date') else price.date
        if price_date >= seven_days_ago:
            active_stocks.add(price.stock_id)
        if latest_date is None or price_date > latest_date:
            latest_date = price_date
    
    return jsonify({
        'total_stocks': len(all_stocks),
        'total_records': total_records,
        'active_stocks': len(active_stocks),
        'latest_date': latest_date.isoformat() if latest_date else None
    })


@app.route('/api/stats/<int:stock_id>', methods=['GET'])
def get_stock_stats(stock_id):
    """获取小马统计数据（专业级）"""
    stock = Stock.query.get_or_404(stock_id)
    prices = StockPrice.query.filter_by(stock_id=stock_id).order_by(StockPrice.date).all()
    
    if not prices:
        return jsonify({'error': '没有价格数据'}), 404
    
    closes = [p.close_price for p in prices]
    highs = [p.high_price for p in prices]
    lows = [p.low_price for p in prices]
    opens = [p.open_price for p in prices]
    volumes = [p.volume for p in prices]
    
    # 计算日收益率（同时记录日期）
    daily_returns = []
    for i in range(1, len(closes)):
        daily_return = (closes[i] - closes[i-1]) / closes[i-1] * 100
        daily_returns.append({
            'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
            'return': daily_return
        })
    
    # 累计收益率
    total_return = (closes[-1] - closes[0]) / closes[0] * 100 if len(closes) > 1 else 0
    
    # 波动率（标准差）
    returns_values = [r['return'] for r in daily_returns]
    volatility = (sum((r - sum(returns_values)/len(returns_values))**2 for r in returns_values) / len(returns_values))**0.5 if returns_values else 0
    annualized_volatility = volatility * (252**0.5) if volatility else 0  # 年化波动率
    
    # 最大回撤
    max_drawdown = 0
    peak = closes[0]
    for close in closes:
        if close > peak:
            peak = close
        drawdown = (peak - close) / peak * 100
        if drawdown > max_drawdown:
            max_drawdown = drawdown
    
    # 均线指标
    ma5 = sum(closes[-5:]) / 5 if len(closes) >= 5 else sum(closes) / len(closes)
    ma10 = sum(closes[-10:]) / 10 if len(closes) >= 10 else sum(closes) / len(closes)
    ma20 = sum(closes[-20:]) / 20 if len(closes) >= 20 else sum(closes) / len(closes)
    
    # 涨跌幅统计
    up_days = sum(1 for r in returns_values if r > 0)
    down_days = sum(1 for r in returns_values if r < 0)
    flat_days = len(returns_values) - up_days - down_days
    win_rate = up_days / len(returns_values) * 100 if returns_values else 0
    
    # 夏普比率（假设无风险利率为3%）
    risk_free_rate = 3.0
    excess_return = total_return - risk_free_rate
    sharpe_ratio = (excess_return / annualized_volatility) if annualized_volatility > 0 else 0
    
    # 量价关系
    avg_volume = sum(volumes) / len(volumes)
    recent_volume = sum(volumes[-5:]) / 5 if len(volumes) >= 5 else avg_volume
    volume_ratio = recent_volume / avg_volume if avg_volume > 0 else 1
    
    # RSI (相对强弱指标) - 14日周期
    rsi_period = min(14, len(returns_values))
    if rsi_period > 0:
        recent_returns = returns_values[-rsi_period:]
        gains = sum(r for r in recent_returns if r > 0)
        losses = abs(sum(r for r in recent_returns if r < 0))
        if losses == 0:
            rsi = 100
        else:
            rs = gains / losses
            rsi = 100 - (100 / (1 + rs))
    else:
        rsi = 50
    
    # 价格区间位置（当前价格在历史高低价区间的位置）
    price_range = max(highs) - min(lows)
    if price_range > 0:
        price_position = ((closes[-1] - min(lows)) / price_range) * 100
    else:
        price_position = 50
    
    # 近期涨跌幅
    return_5d = ((closes[-1] - closes[-6]) / closes[-6] * 100) if len(closes) >= 6 else 0
    return_10d = ((closes[-1] - closes[-11]) / closes[-11] * 100) if len(closes) >= 11 else 0
    return_20d = ((closes[-1] - closes[-21]) / closes[-21] * 100) if len(closes) >= 21 else 0
    
    # 趋势判断（短期均线关系）
    trend = '多头排列' if ma5 > ma10 and ma10 > ma20 else ('空头排列' if ma5 < ma10 and ma10 < ma20 else '震荡')
    
    # 波动幅度（最高价与最低价之差）
    price_amplitude = ((max(highs) - min(lows)) / min(lows) * 100) if min(lows) > 0 else 0
    
    # 换手率估算（成交量/流通股本，简化处理）
    avg_daily_volume = avg_volume
    
    # 支撑位和阻力位（简化为近期高低点）
    support = min(lows[-20:]) if len(lows) >= 20 else min(lows)
    resistance = max(highs[-20:]) if len(highs) >= 20 else max(highs)
    
    # ATR (平均真实波幅) - 14日周期
    true_ranges = []
    for i in range(1, min(15, len(highs))):
        tr = max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i-1]),
            abs(lows[i] - closes[i-1])
        )
        true_ranges.append(tr)
    atr = sum(true_ranges) / len(true_ranges) if true_ranges else 0
    
    # 当日预判
    # 预测最高价 = 阻力位 + ATR * 0.5
    predicted_high = resistance + (atr * 0.5) if atr > 0 else resistance * 1.02
    # 预测最低价 = 支撑位 - ATR * 0.5
    predicted_low = support - (atr * 0.5) if atr > 0 else support * 0.98
    
    # 最佳安全线（买入安全价）：支撑位 + 2%缓冲
    safety_line = support * 1.02
    
    # 止损线：支撑位 - 3%
    stop_loss = support * 0.97
    
    # 买卖建议
    # 综合评分（-100到100）
    score = 0
    
    # RSI分数 (-30到30)
    if rsi < 30:
        score += 30  # 超卖，利好买入
    elif rsi > 70:
        score -= 30  # 超买，利好卖出
    
    # 趋势分数 (-20到20)
    if trend == '多头排列':
        score += 20
    elif trend == '空头排列':
        score -= 20
    
    # 价格位置分数 (-20到20)
    if price_position < 30:
        score += 20  # 低位，利好买入
    elif price_position > 70:
        score -= 20  # 高位，利好卖出
    
    # 均线关系分数 (-15到15)
    if closes[-1] > ma5 and ma5 > ma10:
        score += 15
    elif closes[-1] < ma5 and ma5 < ma10:
        score -= 15
    
    # 量价关系分数 (-15到15)
    if volume_ratio > 1.2 and closes[-1] > opens[-1]:
        score += 15  # 放量上涨
    elif volume_ratio < 0.8 and closes[-1] < opens[-1]:
        score -= 15  # 缩量下跌
    
    # 根据评分给出建议
    if score >= 50:
        action = '强烈买入'
        action_color = 'success'
        reason = '技术指标强烈看涨，RSI低位，趋势向上'
    elif score >= 20:
        action = '建议买入'
        action_color = 'success'
        reason = '技术指标偏多，可考虑分批建仓'
    elif score >= -20:
        action = '观望'
        action_color = 'warning'
        reason = '技术指标中性，等待明确信号'
    elif score >= -50:
        action = '建议卖出'
        action_color = 'danger'
        reason = '技术指标偏空，注意风险控制'
    else:
        action = '强烈卖出'
        action_color = 'danger'
        reason = '技术指标强烈看跌，建议及时止损'
    
    # ========== 专业量化指标 (参考Wind/Bloomberg) ==========
    
    # 1. MACD (指数平滑异同移动平均线)
    ema12_list = []
    ema26_list = []
    for i in range(len(closes)):
        if i == 0:
            ema12 = closes[0]
            ema26 = closes[0]
        else:
            ema12 = closes[i] * (2.0/13.0) + ema12_list[-1] * (11.0/13.0)
            ema26 = closes[i] * (2.0/27.0) + ema26_list[-1] * (25.0/27.0)
        ema12_list.append(ema12)
        ema26_list.append(ema26)
    
    dif_list = [ema12_list[i] - ema26_list[i] for i in range(len(closes))]
    
    # 计算DEA (DIF的9日EMA)
    dea_list = []
    for i in range(len(dif_list)):
        if i == 0:
            dea = dif_list[0]
        else:
            dea = dif_list[i] * (2.0/10.0) + dea_list[-1] * (8.0/10.0)
        dea_list.append(dea)
    
    dif = dif_list[-1]
    dea = dea_list[-1]
    macd = 2 * (dif - dea)
    
    # 判断MACD信号：交叉判断（而非位置判断）
    if len(dif_list) >= 2:
        prev_dif = dif_list[-2]
        prev_dea = dea_list[-2]
        # 金叉：DIF从下往上穿过DEA（交叉瞬间）
        if prev_dif <= prev_dea and dif > dea:
            macd_signal = '金叉'
        # 死叉：DIF从上往下穿过DEA（交叉瞬间）
        elif prev_dif >= prev_dea and dif < dea:
            macd_signal = '死叉'
        # 保持原有状态
        elif dif > dea:
            macd_signal = '金叉持续'
        else:
            macd_signal = '死叉持续'
    else:
        macd_signal = '金叉' if dif > dea else '死叉'
    
    # 2. KDJ (随机指标) - 9日周期
    k_period = min(9, len(closes))
    if k_period > 0:
        k_vals = []
        d_vals = []
        for i in range(max(0, len(closes) - k_period), len(closes)):
            low_n = min(lows[max(0, i-k_period+1):i+1])
            high_n = max(highs[max(0, i-k_period+1):i+1])
            rsv = ((closes[i] - low_n) / (high_n - low_n) * 100) if (high_n - low_n) > 0 else 50
            if not k_vals:
                k = 50
                d = 50
            else:
                k = rsv * (1.0/3.0) + k_vals[-1] * (2.0/3.0)
                d = k * (1.0/3.0) + d_vals[-1] * (2.0/3.0)
            k_vals.append(k)
            d_vals.append(d)
        k_val = k_vals[-1] if k_vals else 50
        d_val = d_vals[-1] if d_vals else 50
        j_val = 3 * k_val - 2 * d_val
    else:
        k_val = d_val = j_val = 50
    
    # 3. Bollinger Bands (布林带)
    std_20 = (sum((c - sum(closes[-20:])/min(20,len(closes)))**2 for c in closes[-min(20,len(closes)):]) / min(20,len(closes)))**0.5 if len(closes) >= 20 else volatility
    bb_middle = sum(closes[-min(20,len(closes)):]) / min(20,len(closes))
    bb_upper = bb_middle + 2 * std_20
    bb_lower = bb_middle - 2 * std_20
    bb_width = ((bb_upper - bb_lower) / bb_middle * 100) if bb_middle > 0 else 0
    
    # 4. VaR (Value at Risk, 风险价值) - 95%和99%置信度
    import math
    sorted_returns = sorted(returns_values)
    var_95_idx = int(len(sorted_returns) * 0.05)
    var_99_idx = int(len(sorted_returns) * 0.01)
    var_95 = abs(sorted_returns[var_95_idx]) if var_95_idx < len(sorted_returns) else 0
    var_99 = abs(sorted_returns[var_99_idx]) if var_99_idx < len(sorted_returns) else 0
    
    # 5. CVaR (Conditional VaR, 条件风险价值/预期损失)
    cvar_95 = abs(sum(sorted_returns[:var_95_idx]) / var_95_idx) if var_95_idx > 0 else var_95
    
    # 6. Calmar Ratio (卡玛比率) = 年化收益率 / 最大回撤
    annualized_return = ((closes[-1] / closes[0]) ** (252 / len(closes)) - 1) * 100 if len(closes) > 1 and closes[0] > 0 else 0
    calmar_ratio = (annualized_return / max_drawdown) if max_drawdown > 0 else 0
    
    # 7. Sortino Ratio (索提诺比率) - 仅用下行波动
    downside_returns = [r for r in returns_values if r < 0]
    downside_deviation = (sum(r**2 for r in downside_returns) / len(returns_values))**0.5 if returns_values else 0
    annualized_downside = downside_deviation * (252**0.5)
    sortino_ratio = ((annualized_return - risk_free_rate) / annualized_downside) if annualized_downside > 0 else 0
    
    # 8. 偏度 (Skewness) - 收益率分布对称性
    n = len(returns_values)
    mean_r = sum(returns_values) / n if n > 0 else 0
    skewness = (sum((r - mean_r)**3 for r in returns_values) / n) / (volatility**3) if n > 2 and volatility > 0 else 0
    
    # 9. 峰度 (Kurtosis) - 收益率分布尾部厚度
    kurtosis = (sum((r - mean_r)**4 for r in returns_values) / n) / (volatility**4) - 3 if n > 3 and volatility > 0 else 0
    
    # 10. Gain/Loss Ratio (盈亏比)
    gains = [r for r in returns_values if r > 0]
    losses = [abs(r) for r in returns_values if r < 0]
    avg_gain = sum(gains) / len(gains) if gains else 0
    avg_loss = sum(losses) / len(losses) if losses else 0
    gain_loss_ratio = (avg_gain / avg_loss) if avg_loss > 0 else 0
    
    # 11. Profit Factor (盈利因子) = 总盈利 / 总亏损
    total_gain = sum(gains)
    total_loss = sum(losses)
    profit_factor = (total_gain / total_loss) if total_loss > 0 else 0
    
    # 12. 连续上涨/下跌天数
    max_consecutive_up = 0
    max_consecutive_down = 0
    current_up = 0
    current_down = 0
    for r in returns_values:
        if r > 0:
            current_up += 1
            current_down = 0
            max_consecutive_up = max(max_consecutive_up, current_up)
        elif r < 0:
            current_down += 1
            current_up = 0
            max_consecutive_down = max(max_consecutive_down, current_down)
        else:
            current_up = 0
            current_down = 0
    
    # 13. 最近20日涨幅
    return_20d_detailed = ((closes[-1] - closes[-min(21,len(closes))]) / closes[-min(21,len(closes))] * 100) if len(closes) >= 2 else 0
    
    # 14. 价格突破状态
    price_vs_bb = '上轨外' if closes[-1] > bb_upper else ('下轨外' if closes[-1] < bb_lower else '轨道内')
    
    # 综合评级 (基于多因子模型)
    grade_score = 0
    # 收益因子 (0-25)
    if annualized_return > 20:
        grade_score += 25
    elif annualized_return > 10:
        grade_score += 20
    elif annualized_return > 0:
        grade_score += 10
    
    # 风险调整后收益因子 (0-25)
    if sharpe_ratio > 1.5:
        grade_score += 25
    elif sharpe_ratio > 1:
        grade_score += 20
    elif sharpe_ratio > 0.5:
        grade_score += 10
    
    # 趋势因子 (0-25) - 修正：金叉加分，死叉减分，持续状态中等
    if macd_signal == '金叉' and trend == '多头排列':
        grade_score += 25  # 最佳状态：刚金叉+多头排列
    elif macd_signal == '金叉持续' and trend == '多头排列':
        grade_score += 15  # 良好：金叉持续+多头排列
    elif macd_signal == '金叉持续':
        grade_score += 5   # 一般：只是金叉持续
    elif macd_signal == '死叉持续' and trend == '空头排列':
        grade_score -= 15  # 较差：死叉持续+空头排列
    elif macd_signal == '死叉持续' or macd_signal == '死叉':
        grade_score -= 10  # 死叉减分
    
    # 超买超卖因子 (0-25)
    if 30 < rsi < 70:
        grade_score += 25
    elif rsi < 30:
        grade_score += 20
    elif rsi < 80:
        grade_score += 10
    
    if grade_score >= 80:
        rating = 'A+ (强烈推荐)'
        rating_color = 'success'
    elif grade_score >= 65:
        rating = 'A (推荐)'
        rating_color = 'success'
    elif grade_score >= 50:
        rating = 'B (持有)'
        rating_color = 'warning'
    elif grade_score >= 35:
        rating = 'C (谨慎)'
        rating_color = 'danger'
    else:
        rating = 'D (卖出)'
        rating_color = 'danger'
    
    stats = {
        'stock_code': stock.code,
        'stock_name': stock.name,
        'market': stock.market,
        'data_points': len(prices),
        
        # 价格指标
        'latest_price': closes[-1],
        'highest_price': max(highs),
        'lowest_price': min(lows),
        'average_price': sum(closes) / len(closes),
        'price_position': round(price_position, 2),  # 价格区间位置
        'price_amplitude': round(price_amplitude, 2),  # 波动幅度
        
        # 收益率分析
        'total_return': round(total_return, 2),
        'return_5d': round(return_5d, 2),
        'return_10d': round(return_10d, 2),
        'return_20d': round(return_20d, 2),
        'daily_returns': [{'date': r['date'], 'return': round(r['return'], 2)} for r in daily_returns[-10:]],
        'win_rate': round(win_rate, 2),
        'up_days': up_days,
        'down_days': down_days,
        'flat_days': flat_days,
        
        # 风险评估
        'volatility': round(volatility, 4),
        'annualized_volatility': round(annualized_volatility, 2),
        'max_drawdown': round(max_drawdown, 2),
        'sharpe_ratio': round(sharpe_ratio, 3),
        'rsi': round(rsi, 2),  # RSI指标
        
        # 技术指标
        'macd_dif': round(dif, 3),
        'macd_dea': round(dea, 3),
        'macd_val': round(macd, 3),
        'macd_signal': macd_signal,
        'kdj_k': round(k_val, 2),
        'kdj_d': round(d_val, 2),
        'kdj_j': round(j_val, 2),
        'bb_upper': round(bb_upper, 2),
        'bb_middle': round(bb_middle, 2),
        'bb_lower': round(bb_lower, 2),
        'bb_width': round(bb_width, 2),
        'price_vs_bb': price_vs_bb,
        
        # 风险价值
        'var_95': round(var_95, 2),
        'var_99': round(var_99, 2),
        'cvar_95': round(cvar_95, 2),
        
        # 风险调整后收益
        'annualized_return': round(annualized_return, 2),
        'calmar_ratio': round(calmar_ratio, 3),
        'sortino_ratio': round(sortino_ratio, 3),
        
        # 收益率分布
        'skewness': round(skewness, 3),
        'kurtosis': round(kurtosis, 3),
        'avg_gain': round(avg_gain, 2),
        'avg_loss': round(avg_loss, 2),
        'gain_loss_ratio': round(gain_loss_ratio, 2),
        'profit_factor': round(profit_factor, 2),
        'max_consecutive_up': max_consecutive_up,
        'max_consecutive_down': max_consecutive_down,
        
        # 综合评级
        'rating': rating,
        'rating_color': rating_color,
        'grade_score': grade_score,
        
        # 均线系统
        'ma5': round(ma5, 2),
        'ma10': round(ma10, 2),
        'ma20': round(ma20, 2),
        'trend': trend,
        
        # 成交量分析
        'total_volume': sum(volumes),
        'average_volume': round(avg_volume, 0),
        'recent_volume': round(recent_volume, 0),
        'volume_ratio': round(volume_ratio, 2),
        
        # 支撑阻力
        'support': round(support, 2),
        'resistance': round(resistance, 2),
        
        # 当日预判
        'predicted_high': round(predicted_high, 2),
        'predicted_low': round(predicted_low, 2),
        'safety_line': round(safety_line, 2),
        'stop_loss': round(stop_loss, 2),
        'atr': round(atr, 2),
        
        # 买卖建议
        'action': action,
        'action_color': action_color,
        'reason': reason,
        'score': score
    }
    
    return jsonify(stats)


@app.route('/api/stocks/<int:stock_id>/financial_forecast', methods=['GET'])
def get_financial_forecast(stock_id):
    """获取小马财务预报分析数据 - 从真实API获取"""
    from financial_api import get_financial_reports, get_latest_price, analyze_financial_data
    
    stock = Stock.query.get_or_404(stock_id)
    stock_code = stock.code
    stock_name = stock.name
    
    print(f"\n=== 获取财务预报分析（真实API）===")
    print(f"代码: {stock_code}, 名称: {stock_name}")
    
    # 1. 获取实时股价
    latest_price = get_latest_price(stock_code)
    
    # 2. 从东方财富获取财务数据
    financial_reports = get_financial_reports(stock_code)
    
    if financial_reports and isinstance(financial_reports, list) and len(financial_reports) > 0:
        # 有真实财务数据，直接分析
        print(f"获取到 {len(financial_reports)} 条财务数据，正在分析...")
        result = analyze_financial_data(financial_reports, stock_name, latest_price, stock_code)
        if result:
            return jsonify(result)
        else:
            print("分析失败，使用AI降级方案")
    else:
        print("东方财富API未获取到数据，使用AI降级方案")
    
    # 3. 降级方案：使用AI生成分析
    from datetime import datetime
    current_year = datetime.now().year
    current_month = datetime.now().month
    current_quarter = (current_month - 1) // 3 + 1
    prev_year = current_year - 1
    
    prompt = f"""你是金融分析师，请分析{stock_code}({stock_name})的财务状况。
当前股价约{latest_price or 20}元。
请基于你已知的信息，提供尽可能准确的财务分析。

返回JSON：
{{
  "report_calendar": {{ "latest_quarter": "", "expected_date": "", "annual_report": "", "days_to_next": 30 }},
  "forecasts": [{{ "period": "", "type": "已发布", "profit_change": "", "eps": "", "publish_date": "", "vs_expectation": "已发布" }}],
  "core_metrics": {{ "revenue": "", "revenue_yoy": "", "revenue_qoq": "", "net_profit": "", "profit_yoy": "", "profit_qoq": "", "gross_margin": "", "margin_change": "", "industry_avg_margin": "", "roe": "", "roe_change": "" }},
  "growth_analysis": {{ "revenue_growth_3y": "", "revenue_rating": "", "profit_growth_3y": "", "profit_rating": "", "cash_flow_ratio": 0, "cash_flow_rating": "" }},
  "risks": [{{ "level": "", "title": "", "description": "" }}],
  "recommendation": {{
    "rating": "", "label": "",
    "scores": {{ "fundamentals": 3, "growth": 3, "valuation": 3, "financial_health": 3 }},
    "investment_points": ["", "", "", ""],
    "action_suggestion": {{ "short_term": "", "mid_term": "", "long_term": "" }},
    "price_target": {{ "low": 0, "high": 0, "current": {latest_price or 20} }}
  }}
}}

注意：price_target.low 必须小于 price_target.high（低价在前，高价在后）。只返回JSON。"""
    
    try:
        response = ai_client.chat.completions.create(
            model='qwen-max',
            messages=[
                {'role': 'system', 'content': f'你是专业的金融分析师。当前时间是{current_year}年{current_month}月。请提供{stock_code}({stock_name})的财务分析。直接返回JSON格式。'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.1,
            max_tokens=3000
        )
        
        result = response.choices[0].message.content
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            return jsonify(json.loads(json_match.group()))
        return jsonify({'error': 'AI返回格式不正确'}), 500
    except Exception as e:
        print(f"AI分析失败: {e}")
        return jsonify({'error': f'分析失败: {str(e)}'}), 500


@app.route('/api/stocks/<int:stock_id>/anomalies', methods=['GET'])
def detect_data_anomalies(stock_id):
    """检测小马数据异常（涨跌停、停牌、成交量异动等）"""
    stock = Stock.query.get_or_404(stock_id)
    prices = StockPrice.query.filter_by(stock_id=stock_id).order_by(StockPrice.date).all()
    
    if not prices or len(prices) < 5:
        return jsonify({'error': '数据不足，至少需要5个交易日数据'}), 400
    
    anomalies = []
    closes = [p.close_price for p in prices]
    opens = [p.open_price for p in prices]
    highs = [p.high_price for p in prices]
    lows = [p.low_price for p in prices]
    volumes = [p.volume for p in prices]
    
    # 1. 检测涨跌停（A股涨跌幅限制10%，ST为5%）
    for i in range(1, len(prices)):
        prev_close = closes[i-1]
        curr_close = closes[i]
        change_pct = (curr_close - prev_close) / prev_close * 100
        
        # 判断是否涨停或跌停
        if change_pct >= 9.8:  # 接近涨停
            anomalies.append({
                'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                'type': '涨停',
                'severity': 'warning',
                'description': f'涨幅{change_pct:.2f}%，触及涨停板',
                'value': round(change_pct, 2)
            })
        elif change_pct <= -9.8:  # 接近跌停
            anomalies.append({
                'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                'type': '跌停',
                'severity': 'danger',
                'description': f'跌幅{change_pct:.2f}%，触及跌停板',
                'value': round(change_pct, 2)
            })
    
    # 2. 检测停牌（成交量为0或极低）
    avg_volume = sum(volumes) / len(volumes)
    for i, price in enumerate(prices):
        if volumes[i] == 0 or (avg_volume > 0 and volumes[i] < avg_volume * 0.01):
            anomalies.append({
                'date': price.date.isoformat() if hasattr(price.date, 'isoformat') else str(price.date),
                'type': '疑似停牌',
                'severity': 'info',
                'description': f'成交量异常低（{volumes[i]}手），可能停牌',
                'value': volumes[i]
            })
    
    # 3. 检测成交量异动（超过平均成交量3倍）
    for i in range(len(prices)):
        if avg_volume > 0 and volumes[i] > avg_volume * 3:
            ratio = volumes[i] / avg_volume
            anomalies.append({
                'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                'type': '放量',
                'severity': 'warning',
                'description': f'成交量是平均值的{ratio:.1f}倍',
                'value': round(ratio, 2)
            })
        elif avg_volume > 0 and volumes[i] < avg_volume * 0.3 and volumes[i] > 0:
            ratio = volumes[i] / avg_volume
            anomalies.append({
                'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                'type': '缩量',
                'severity': 'info',
                'description': f'成交量仅为平均值的{ratio:.1f}倍',
                'value': round(ratio, 2)
            })
    
    # 4. 检测价格跳空（开盘价与昨日收盘价差距超过3%）
    for i in range(1, len(prices)):
        prev_close = closes[i-1]
        curr_open = opens[i]
        gap_pct = abs(curr_open - prev_close) / prev_close * 100
        
        if gap_pct > 3:
            direction = '向上跳空' if curr_open > prev_close else '向下跳空'
            anomalies.append({
                'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                'type': direction,
                'severity': 'warning',
                'description': f'{direction}{gap_pct:.2f}%',
                'value': round(gap_pct, 2)
            })
    
    # 5. 检测长上下影线（影线长度超过实体2倍）
    for i, price in enumerate(prices):
        body = abs(closes[i] - opens[i])
        upper_shadow = highs[i] - max(closes[i], opens[i])
        lower_shadow = min(closes[i], opens[i]) - lows[i]
        
        if body > 0:
            if upper_shadow > body * 2:
                anomalies.append({
                    'date': price.date.isoformat() if hasattr(price.date, 'isoformat') else str(price.date),
                    'type': '长上影线',
                    'severity': 'info',
                    'description': f'上影线长度是实体的{upper_shadow/body:.1f}倍，可能有抛压',
                    'value': round(upper_shadow/body, 2)
                })
            if lower_shadow > body * 2:
                anomalies.append({
                    'date': price.date.isoformat() if hasattr(price.date, 'isoformat') else str(price.date),
                    'type': '长下影线',
                    'severity': 'info',
                    'description': f'下影线长度是实体的{lower_shadow/body:.1f}倍，可能有支撑',
                    'value': round(lower_shadow/body, 2)
                })
    
    # 6. 检测连续上涨/下跌
    consecutive_up = 0
    consecutive_down = 0
    for i in range(1, len(prices)):
        if closes[i] > closes[i-1]:
            consecutive_up += 1
            consecutive_down = 0
            if consecutive_up >= 5:
                anomalies.append({
                    'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                    'type': '连续上涨',
                    'severity': 'warning',
                    'description': f'已连续上涨{consecutive_up}天',
                    'value': consecutive_up
                })
        elif closes[i] < closes[i-1]:
            consecutive_down += 1
            consecutive_up = 0
            if consecutive_down >= 5:
                anomalies.append({
                    'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                    'type': '连续下跌',
                    'severity': 'danger',
                    'description': f'已连续下跌{consecutive_down}天',
                    'value': consecutive_down
                })
        else:
            consecutive_up = 0
            consecutive_down = 0
    
    # 按日期排序
    anomalies.sort(key=lambda x: x['date'], reverse=True)
    
    # 统计摘要
    summary = {
        'total_anomalies': len(anomalies),
        'by_type': {},
        'by_severity': {
            'danger': len([a for a in anomalies if a['severity'] == 'danger']),
            'warning': len([a for a in anomalies if a['severity'] == 'warning']),
            'info': len([a for a in anomalies if a['severity'] == 'info'])
        }
    }
    
    for anomaly in anomalies:
        atype = anomaly['type']
        summary['by_type'][atype] = summary['by_type'].get(atype, 0) + 1
    
    return jsonify({
        'stock_code': stock.code,
        'stock_name': stock.name,
        'data_points': len(prices),
        'anomalies': anomalies[:50],  # 最多返回50条
        'summary': summary
    })


@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """获取所有预警规则"""
    # 从文件读取预警规则（简化实现，实际应使用数据库）
    alerts_file = os.path.join(BASE_PATH, 'instance', 'alerts.json')
    if os.path.exists(alerts_file):
        with open(alerts_file, 'r', encoding='utf-8') as f:
            alerts = json.load(f)
        return jsonify(alerts)
    return jsonify([])


@app.route('/api/alerts', methods=['POST'])
def add_alert():
    """添加预警规则"""
    data = request.json
    
    # 验证必要字段
    required_fields = ['stock_id', 'alert_type', 'condition', 'threshold']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必要字段: {field}'}), 400
    
    alerts_file = os.path.join(BASE_PATH, 'instance', 'alerts.json')
    
    # 读取现有预警
    alerts = []
    if os.path.exists(alerts_file):
        with open(alerts_file, 'r', encoding='utf-8') as f:
            alerts = json.load(f)
    
    # 添加新预警
    new_alert = {
        'id': len(alerts) + 1,
        'stock_id': data['stock_id'],
        'alert_type': data['alert_type'],  # 'price', 'volume', 'indicator'
        'condition': data['condition'],  # 'above', 'below', 'equals'
        'threshold': data['threshold'],
        'active': True,
        'created_at': datetime.datetime.now().isoformat(),
        'triggered': False
    }
    alerts.append(new_alert)
    
    # 保存到文件
    os.makedirs(os.path.dirname(alerts_file), exist_ok=True)
    with open(alerts_file, 'w', encoding='utf-8') as f:
        json.dump(alerts, f, ensure_ascii=False, indent=2)
    
    return jsonify({'message': '预警规则添加成功', 'alert': new_alert}), 201


@app.route('/api/alerts/<int:alert_id>', methods=['DELETE'])
def delete_alert(alert_id):
    """删除预警规则"""
    alerts_file = os.path.join(BASE_PATH, 'instance', 'alerts.json')
    
    if not os.path.exists(alerts_file):
        return jsonify({'error': '预警文件不存在'}), 404
    
    with open(alerts_file, 'r', encoding='utf-8') as f:
        alerts = json.load(f)
    
    # 过滤掉要删除的预警
    alerts = [a for a in alerts if a['id'] != alert_id]
    
    with open(alerts_file, 'w', encoding='utf-8') as f:
        json.dump(alerts, f, ensure_ascii=False, indent=2)
    
    return jsonify({'message': '预警规则已删除'})


@app.route('/api/alerts/check', methods=['POST'])
def check_alerts():
    """检查预警是否触发"""
    data = request.json
    stock_id = data.get('stock_id')
    
    if not stock_id:
        return jsonify({'error': '请提供stock_id'}), 400
    
    # 获取该小马的所有活跃预警
    alerts_file = os.path.join(BASE_PATH, 'instance', 'alerts.json')
    if not os.path.exists(alerts_file):
        return jsonify({'triggered': []})
    
    with open(alerts_file, 'r', encoding='utf-8') as f:
        alerts = json.load(f)
    
    stock_alerts = [a for a in alerts if a['stock_id'] == stock_id and a.get('active', True)]
    
    if not stock_alerts:
        return jsonify({'triggered': []})
    
    # 获取最新价格数据
    stock = Stock.query.get(stock_id)
    if not stock:
        return jsonify({'error': '小马不存在'}), 404
    
    latest_price = StockPrice.query.filter_by(stock_id=stock_id).order_by(StockPrice.date.desc()).first()
    if not latest_price:
        return jsonify({'triggered': []})
    
    triggered_alerts = []
    current_price = latest_price.close_price
    
    for alert in stock_alerts:
        is_triggered = False
        
        if alert['alert_type'] == 'price':
            if alert['condition'] == 'above' and current_price > alert['threshold']:
                is_triggered = True
            elif alert['condition'] == 'below' and current_price < alert['threshold']:
                is_triggered = True
            elif alert['condition'] == 'equals' and abs(current_price - alert['threshold']) < 0.01:
                is_triggered = True
        
        if is_triggered:
            triggered_alerts.append({
                'alert_id': alert['id'],
                'message': f"{stock.name}({stock.code}) 当前价格¥{current_price:.2f} {'高于' if alert['condition'] == 'above' else '低于' if alert['condition'] == 'below' else '等于'} ¥{alert['threshold']:.2f}",
                'timestamp': datetime.datetime.now().isoformat()
            })
    
    return jsonify({'triggered': triggered_alerts})


@app.route('/api/stocks/<int:stock_id>/patterns', methods=['GET'])
def detect_kline_patterns(stock_id):
    """识别K线技术形态"""
    stock = Stock.query.get_or_404(stock_id)
    prices = StockPrice.query.filter_by(stock_id=stock_id).order_by(StockPrice.date).all()
    
    if not prices or len(prices) < 20:
        return jsonify({'error': '数据不足，至少需要20个交易日数据'}), 400
    
    patterns = []
    closes = [p.close_price for p in prices]
    opens = [p.open_price for p in prices]
    highs = [p.high_price for p in prices]
    lows = [p.low_price for p in prices]
    
    # 1. 识别锤子线（Hammer）- 看涨反转信号
    for i in range(len(prices)):
        body = abs(closes[i] - opens[i])
        upper_shadow = highs[i] - max(closes[i], opens[i])
        lower_shadow = min(closes[i], opens[i]) - lows[i]
        
        if body > 0 and lower_shadow >= body * 2 and upper_shadow <= body * 0.5:
            if closes[i] > opens[i] or (closes[i] < opens[i] and i > 0 and closes[i] > closes[i-1]):
                patterns.append({
                    'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                    'pattern': '锤子线',
                    'type': 'bullish',
                    'signal': '看涨反转',
                    'confidence': '中等',
                    'description': '下影线较长，显示下方有支撑，可能反弹'
                })
    
    # 2. 识别射击之星（Shooting Star）- 看跌反转信号
    for i in range(len(prices)):
        body = abs(closes[i] - opens[i])
        upper_shadow = highs[i] - max(closes[i], opens[i])
        lower_shadow = min(closes[i], opens[i]) - lows[i]
        
        if body > 0 and upper_shadow >= body * 2 and lower_shadow <= body * 0.5:
            if closes[i] < opens[i] or (closes[i] > opens[i] and i > 0 and closes[i] < closes[i-1]):
                patterns.append({
                    'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                    'pattern': '射击之星',
                    'type': 'bearish',
                    'signal': '看跌反转',
                    'confidence': '中等',
                    'description': '上影线较长，显示上方有压力，可能回调'
                })
    
    # 3. 识别十字星（Doji）- 变盘信号
    for i in range(len(prices)):
        body = abs(closes[i] - opens[i])
        avg_body = sum(abs(closes[j] - opens[j]) for j in range(max(0, i-10), i)) / min(10, i) if i > 0 else body
        
        if avg_body > 0 and body < avg_body * 0.2:
            patterns.append({
                'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                'pattern': '十字星',
                'type': 'neutral',
                'signal': '变盘信号',
                'confidence': '中等',
                'description': '多空力量均衡，可能出现方向选择'
            })
    
    # 4. 识别早晨之星（Morning Star）- 强烈看涨
    for i in range(2, len(prices)):
        day1_body = abs(closes[i-2] - opens[i-2])
        day1_bearish = closes[i-2] < opens[i-2]
        day2_body = abs(closes[i-1] - opens[i-1])
        day3_body = abs(closes[i] - opens[i])
        day3_bullish = closes[i] > opens[i]
        
        if (day1_bearish and day1_body > day2_body * 2 and 
            day2_body < day1_body * 0.5 and 
            day3_bullish and day3_body > day2_body * 2 and
            closes[i] > opens[i-2]):
            patterns.append({
                'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                'pattern': '早晨之星',
                'type': 'bullish',
                'signal': '强烈看涨',
                'confidence': '高',
                'description': '底部反转形态，显示多头开始发力'
            })
    
    # 5. 识别黄昏之星（Evening Star）- 强烈看跌
    for i in range(2, len(prices)):
        day1_body = abs(closes[i-2] - opens[i-2])
        day1_bullish = closes[i-2] > opens[i-2]
        day2_body = abs(closes[i-1] - opens[i-1])
        day3_body = abs(closes[i] - opens[i])
        day3_bearish = closes[i] < opens[i]
        
        if (day1_bullish and day1_body > day2_body * 2 and 
            day2_body < day1_body * 0.5 and 
            day3_bearish and day3_body > day2_body * 2 and
            closes[i] < opens[i-2]):
            patterns.append({
                'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                'pattern': '黄昏之星',
                'type': 'bearish',
                'signal': '强烈看跌',
                'confidence': '高',
                'description': '顶部反转形态，显示空头开始发力'
            })
    
    # 6. 识别三连阳/三连阴
    for i in range(2, len(prices)):
        if (closes[i] > opens[i] and closes[i-1] > opens[i-1] and closes[i-2] > opens[i-2] and
            closes[i] > closes[i-1] and closes[i-1] > closes[i-2]):
            patterns.append({
                'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                'pattern': '三连阳',
                'type': 'bullish',
                'signal': '持续上涨',
                'confidence': '中等',
                'description': '连续三天收阳且价格上涨，多头强势'
            })
        
        if (closes[i] < opens[i] and closes[i-1] < opens[i-1] and closes[i-2] < opens[i-2] and
            closes[i] < closes[i-1] and closes[i-1] < closes[i-2]):
            patterns.append({
                'date': prices[i].date.isoformat() if hasattr(prices[i].date, 'isoformat') else str(prices[i].date),
                'pattern': '三连阴',
                'type': 'bearish',
                'signal': '持续下跌',
                'confidence': '中等',
                'description': '连续三天收阴且价格下跌，空头强势'
            })
    
    # 按日期排序
    patterns.sort(key=lambda x: x['date'], reverse=True)
    
    # 统计摘要
    summary = {
        'total_patterns': len(patterns),
        'bullish_count': len([p for p in patterns if p['type'] == 'bullish']),
        'bearish_count': len([p for p in patterns if p['type'] == 'bearish']),
        'neutral_count': len([p for p in patterns if p['type'] == 'neutral']),
        'high_confidence': len([p for p in patterns if p['confidence'] == '高'])
    }
    
    return jsonify({
        'stock_code': stock.code,
        'stock_name': stock.name,
        'data_points': len(prices),
        'patterns': patterns[:30],
        'summary': summary
    })


@app.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    """获取持仓列表"""
    portfolios = Portfolio.query.order_by(Portfolio.buy_date.desc()).all()
    
    result = []
    for p in portfolios:
        # 获取最新价格
        latest_price = StockPrice.query.filter_by(stock_id=p.stock_id).order_by(StockPrice.date.desc()).first()
        current_price = latest_price.close_price if latest_price else p.avg_cost
        
        # 计算收益
        market_value = current_price * p.quantity
        cost_value = p.avg_cost * p.quantity
        profit = market_value - cost_value
        profit_rate = (profit / cost_value * 100) if cost_value > 0 else 0
        
        result.append({
            'id': p.id,
            'stock_id': p.stock_id,
            'stock_code': p.stock_code,
            'stock_name': p.stock_name,
            'quantity': p.quantity,
            'avg_cost': p.avg_cost,
            'current_price': current_price,
            'market_value': round(market_value, 2),
            'cost_value': round(cost_value, 2),
            'profit': round(profit, 2),
            'profit_rate': round(profit_rate, 2),
            'buy_date': p.buy_date.isoformat() if hasattr(p.buy_date, 'isoformat') else str(p.buy_date),
            'notes': p.notes,
            'created_at': p.created_at.isoformat() if hasattr(p.created_at, 'isoformat') else str(p.created_at)
        })
    
    # 统计汇总
    total_cost = sum(r['cost_value'] for r in result)
    total_market = sum(r['market_value'] for r in result)
    total_profit = total_market - total_cost
    total_profit_rate = (total_profit / total_cost * 100) if total_cost > 0 else 0
    
    return jsonify({
        'positions': result,
        'summary': {
            'total_positions': len(result),
            'total_cost': round(total_cost, 2),
            'total_market_value': round(total_market, 2),
            'total_profit': round(total_profit, 2),
            'total_profit_rate': round(total_profit_rate, 2),
            'winning_count': len([r for r in result if r['profit'] > 0]),
            'losing_count': len([r for r in result if r['profit'] <= 0])
        }
    })


@app.route('/api/portfolio', methods=['POST'])
def add_to_portfolio():
    """添加持仓"""
    data = request.json
    
    required_fields = ['stock_id', 'quantity', 'avg_cost', 'buy_date']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必要字段: {field}'}), 400
    
    # 获取小马信息
    stock = Stock.query.get(data['stock_id'])
    if not stock:
        return jsonify({'error': '小马不存在'}), 404
    
    try:
        buy_date = datetime.datetime.strptime(data['buy_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': '日期格式错误，应为YYYY-MM-DD'}), 400
    
    portfolio = Portfolio(
        stock_id=data['stock_id'],
        stock_code=stock.code,
        stock_name=stock.name,
        quantity=data['quantity'],
        avg_cost=data['avg_cost'],
        buy_date=buy_date,
        notes=data.get('notes', '')
    )
    
    db.session.add(portfolio)
    db.session.commit()
    
    return jsonify({'message': '持仓添加成功', 'portfolio': {
        'id': portfolio.id,
        'stock_code': portfolio.stock_code,
        'stock_name': portfolio.stock_name,
        'quantity': portfolio.quantity,
        'avg_cost': portfolio.avg_cost
    }}), 201


@app.route('/api/portfolio/<int:portfolio_id>', methods=['PUT'])
def update_portfolio(portfolio_id):
    """更新持仓"""
    portfolio = Portfolio.query.get_or_404(portfolio_id)
    data = request.json
    
    if 'quantity' in data:
        portfolio.quantity = data['quantity']
    if 'avg_cost' in data:
        portfolio.avg_cost = data['avg_cost']
    if 'notes' in data:
        portfolio.notes = data['notes']
    
    db.session.commit()
    
    return jsonify({'message': '持仓更新成功'})


@app.route('/api/portfolio/<int:portfolio_id>', methods=['DELETE'])
def delete_portfolio(portfolio_id):
    """删除持仓"""
    portfolio = Portfolio.query.get_or_404(portfolio_id)
    
    db.session.delete(portfolio)
    db.session.commit()
    
    return jsonify({'message': '持仓已删除'})


@app.route('/api/import/csv', methods=['POST'])
def import_csv_data():
    """从CSV/Excel文件批量导入小马数据"""
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '文件名为空'}), 400
    
    # 验证文件类型
    filename = secure_filename(file.filename)
    if not (filename.endswith('.csv') or filename.endswith('.xlsx') or filename.endswith('.xls')):
        return jsonify({'error': '只支持CSV或Excel文件'}), 400
    
    try:
        # 读取文件
        if filename.endswith('.csv'):
            df = pd.read_csv(file, encoding='utf-8')
        else:
            df = pd.read_excel(file)
        
        # 验证必要的列
        required_columns = ['date', 'open', 'high', 'low', 'close', 'volume']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return jsonify({'error': f'缺少必要列: {", ".join(missing_columns)}'}), 400
        
        # 获取小马代码（从请求参数或文件名）
        stock_code = request.form.get('stock_code', '')
        if not stock_code:
            # 尝试从文件名提取小马代码
            import re
            match = re.search(r'(\d{6})', filename)
            if match:
                stock_code = match.group(1)
            else:
                return jsonify({'error': '请提供小马代码或在文件名中包含6位数字代码'}), 400
        
        # 查找或创建小马
        stock = Stock.query.filter_by(code=stock_code).first()
        if not stock:
            # 尝试从AI获取小马名称
            try:
                response = ai_client.chat.completions.create(
                    model='qwen-max',
                    messages=[
                        {'role': 'system', 'content': '你是专业的金融数据助手'},
                        {'role': 'user', 'content': f'请告诉我小马代码{stock_code}对应的公司名称，只返回公司名'}
                    ],
                    temperature=0.1,
                    max_tokens=50
                )
                stock_name = response.choices[0].message.content.strip()
            except:
                stock_name = f'小马{stock_code}'
            
            stock = Stock(code=stock_code, name=stock_name, market='财神')
            db.session.add(stock)
            db.session.flush()  # 获取ID
        
        # 处理数据
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # 解析日期
                date_str = str(row['date']).strip()
                try:
                    trade_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    try:
                        trade_date = datetime.datetime.strptime(date_str, '%Y/%m/%d').date()
                    except ValueError:
                        errors.append(f'第{index+2}行：日期格式错误')
                        error_count += 1
                        continue
                
                # 检查是否已存在
                existing = StockPrice.query.filter_by(
                    stock_id=stock.id,
                    date=trade_date
                ).first()
                
                if existing:
                    # 更新现有记录
                    existing.open_price = float(row['open'])
                    existing.high_price = float(row['high'])
                    existing.low_price = float(row['low'])
                    existing.close_price = float(row['close'])
                    existing.volume = int(float(row['volume']))
                else:
                    # 创建新记录
                    price = StockPrice(
                        stock_id=stock.id,
                        date=trade_date,
                        open_price=float(row['open']),
                        high_price=float(row['high']),
                        low_price=float(row['low']),
                        close_price=float(row['close']),
                        volume=int(float(row['volume']))
                    )
                    db.session.add(price)
                
                success_count += 1
            except Exception as e:
                errors.append(f'第{index+2}行：{str(e)}')
                error_count += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'导入完成：成功{success_count}条，失败{error_count}条',
            'success_count': success_count,
            'error_count': error_count,
            'errors': errors[:10],  # 最多返回10个错误
            'stock_code': stock.code,
            'stock_name': stock.name
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'导入失败: {str(e)}'}), 500


@app.route('/api/import/template', methods=['GET'])
def download_import_template():
    """下载导入模板"""
    # 创建示例DataFrame
    template_df = pd.DataFrame({
        'date': ['2024-01-01', '2024-01-02', '2024-01-03'],
        'open': [10.50, 10.60, 10.70],
        'high': [10.80, 10.90, 11.00],
        'low': [10.40, 10.50, 10.60],
        'close': [10.70, 10.80, 10.90],
        'volume': [1000000, 1200000, 1100000]
    })
    
    # 保存到临时文件
    temp_file = os.path.join(BASE_PATH, 'instance', 'import_template.xlsx')
    template_df.to_excel(temp_file, index=False)
    
    return send_from_directory(
        os.path.dirname(temp_file),
        os.path.basename(temp_file),
        as_attachment=True,
        download_name='小马数据导入模板.xlsx'
    )


@app.route('/api/compare', methods=['POST'])
def compare_stocks():
    """多维度对比多只小马"""
    data = request.json
    stock_ids = data.get('stock_ids', [])
    
    if not stock_ids or len(stock_ids) < 2:
        return jsonify({'error': '请至少选择2只小马进行对比'}), 400
    
    if len(stock_ids) > 5:
        return jsonify({'error': '最多支持5只小马同时对比'}), 400
    
    comparison = []
    
    for stock_id in stock_ids:
        stock = Stock.query.get(stock_id)
        if not stock:
            continue
        
        # 获取最新价格
        latest_price = StockPrice.query.filter_by(stock_id=stock_id).order_by(StockPrice.date.desc()).first()
        
        # 获取统计数据
        prices = StockPrice.query.filter_by(stock_id=stock_id).all()
        if not prices:
            continue
        
        closes = [p.close_price for p in prices]
        volumes = [p.volume for p in prices]
        
        current_price = latest_price.close_price if latest_price else closes[-1]
        avg_volume = sum(volumes) / len(volumes) if volumes else 0
        
        # 计算涨跌幅（最近30天）
        recent_prices = prices[-30:] if len(prices) >= 30 else prices
        if len(recent_prices) >= 2:
            start_price = recent_prices[0].close_price
            end_price = recent_prices[-1].close_price
            change_pct = (end_price - start_price) / start_price * 100
        else:
            change_pct = 0
        
        # 计算波动率
        if len(closes) >= 2:
            daily_returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]
            volatility = (sum(r**2 for r in daily_returns) / len(daily_returns)) ** 0.5 * 100
        else:
            volatility = 0
        
        comparison.append({
            'stock_id': stock.id,
            'stock_code': stock.code,
            'stock_name': stock.name,
            'current_price': round(current_price, 2),
            'change_30d': round(change_pct, 2),
            'avg_volume': round(avg_volume, 0),
            'volatility': round(volatility, 2),
            'data_points': len(prices),
            'max_price': round(max(closes), 2),
            'min_price': round(min(closes), 2)
        })
    
    return jsonify({
        'stocks': comparison,
        'count': len(comparison)
    })


@app.route('/api/screener', methods=['POST'])
def stock_screener():
    """智能选股器 - 根据条件筛选小马"""
    data = request.json
    
    # 筛选条件
    min_price = data.get('min_price', 0)
    max_price = data.get('max_price', 999999)
    min_change = data.get('min_change', -100)
    max_change = data.get('max_change', 100)
    min_volume = data.get('min_volume', 0)
    trend = data.get('trend', 'all')  # 'up', 'down', 'all'
    
    stocks = Stock.query.all()
    results = []
    
    for stock in stocks:
        prices = StockPrice.query.filter_by(stock_id=stock.id).order_by(StockPrice.date.desc()).limit(30).all()
        
        if not prices or len(prices) < 2:
            continue
        
        latest = prices[0]
        current_price = latest.close_price
        
        # 检查价格范围
        if current_price < min_price or current_price > max_price:
            continue
        
        # 计算涨跌幅
        start_price = prices[-1].close_price
        change_pct = (current_price - start_price) / start_price * 100
        
        # 检查涨跌幅范围
        if change_pct < min_change or change_pct > max_change:
            continue
        
        # 检查成交量
        avg_volume = sum(p.volume for p in prices) / len(prices)
        if avg_volume < min_volume:
            continue
        
        # 检查趋势
        if trend == 'up' and change_pct <= 0:
            continue
        if trend == 'down' and change_pct >= 0:
            continue
        
        results.append({
            'stock_id': stock.id,
            'stock_code': stock.code,
            'stock_name': stock.name,
            'current_price': round(current_price, 2),
            'change_30d': round(change_pct, 2),
            'avg_volume': round(avg_volume, 0),
            'data_points': len(prices)
        })
    
    # 按涨跌幅排序
    results.sort(key=lambda x: x['change_30d'], reverse=True)
    
    return jsonify({
        'results': results,
        'count': len(results),
        'filters': {
            'price_range': f'{min_price}-{max_price}',
            'change_range': f'{min_change}%-{max_change}%',
            'min_volume': min_volume,
            'trend': trend
        }
    })


@app.route('/api/export/stocks', methods=['GET'])
def export_all_stocks():
    """导出所有小马数据为Excel"""
    stocks = Stock.query.all()
    
    data = []
    for stock in stocks:
        prices = StockPrice.query.filter_by(stock_id=stock.id).order_by(StockPrice.date.desc()).limit(1).first()
        latest_price = prices.close_price if prices else 0
        
        data.append({
            '小马代码': stock.code,
            '小马名称': stock.name,
            '市场': stock.market,
            '最新价格': latest_price,
            '创建时间': stock.created_at.strftime('%Y-%m-%d') if hasattr(stock.created_at, 'strftime') else str(stock.created_at)
        })
    
    df = pd.DataFrame(data)
    
    # 保存到临时文件
    temp_file = os.path.join(BASE_PATH, 'instance', f'stocks_export_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx')
    df.to_excel(temp_file, index=False)
    
    return send_from_directory(
        os.path.dirname(temp_file),
        os.path.basename(temp_file),
        as_attachment=True,
        download_name=os.path.basename(temp_file)
    )


@app.route('/api/export/prices/<int:stock_id>', methods=['GET'])
def export_stock_prices(stock_id):
    """导出指定小马的所有价格数据"""
    stock = Stock.query.get_or_404(stock_id)
    prices = StockPrice.query.filter_by(stock_id=stock_id).order_by(StockPrice.date).all()
    
    data = []
    for p in prices:
        data.append({
            '日期': p.date.isoformat() if hasattr(p.date, 'isoformat') else str(p.date),
            '开盘价': p.open_price,
            '最高价': p.high_price,
            '最低价': p.low_price,
            '收盘价': p.close_price,
            '成交量': p.volume
        })
    
    df = pd.DataFrame(data)
    
    # 保存到临时文件
    temp_file = os.path.join(BASE_PATH, 'instance', f'{stock.code}_prices_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx')
    df.to_excel(temp_file, index=False)
    
    return send_from_directory(
        os.path.dirname(temp_file),
        os.path.basename(temp_file),
        as_attachment=True,
        download_name=os.path.basename(temp_file)
    )


@app.route('/api/settings', methods=['GET'])
def get_settings():
    """获取系统设置"""
    settings_file = os.path.join(BASE_PATH, 'instance', 'settings.json')
    
    default_settings = {
        'cache_enabled': True,
        'cache_duration': 3600,
        'auto_refresh': True,
        'refresh_interval': 300,
        'theme': 'light',
        'language': 'zh-CN'
    }
    
    if os.path.exists(settings_file):
        with open(settings_file, 'r', encoding='utf-8') as f:
            settings = json.load(f)
        # 合并默认设置
        for key, value in default_settings.items():
            if key not in settings:
                settings[key] = value
        return jsonify(settings)
    
    return jsonify(default_settings)


@app.route('/api/settings', methods=['POST'])
def update_settings():
    """更新系统设置"""
    data = request.json
    settings_file = os.path.join(BASE_PATH, 'instance', 'settings.json')
    
    # 读取现有设置
    settings = {}
    if os.path.exists(settings_file):
        with open(settings_file, 'r', encoding='utf-8') as f:
            settings = json.load(f)
    
    # 更新设置
    settings.update(data)
    
    # 保存
    os.makedirs(os.path.dirname(settings_file), exist_ok=True)
    with open(settings_file, 'w', encoding='utf-8') as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)
    
    return jsonify({'message': '设置已保存'})


@app.route('/api/system/info', methods=['GET'])
def get_system_info():
    """获取系统信息"""
    stock_count = Stock.query.count()
    price_count = StockPrice.query.count()
    portfolio_count = Portfolio.query.count()
    
    # 数据库大小
    db_path = os.path.join(BASE_PATH, 'instance', 'stocks.db')
    db_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0
    
    return jsonify({
        'version': '1.0.0',
        'stock_count': stock_count,
        'price_count': price_count,
        'portfolio_count': portfolio_count,
        'db_size_mb': round(db_size / 1024 / 1024, 2),
        'python_version': sys.version,
        'flask_version': '2.x'
    })


@app.route('/api/stocks/<int:stock_id>/indicators', methods=['GET'])
def get_technical_indicators(stock_id):
    """获取技术指标数据（MA, MACD, RSI等）"""
    stock = Stock.query.get_or_404(stock_id)
    prices = StockPrice.query.filter_by(stock_id=stock_id).order_by(StockPrice.date).all()
    
    if not prices or len(prices) < 30:
        return jsonify({'error': '数据不足，至少需要30个交易日'}), 400
    
    closes = [p.close_price for p in prices]
    dates = [p.date.isoformat() if hasattr(p.date, 'isoformat') else str(p.date) for p in prices]
    
    # 计算移动平均线
    def calculate_ma(data, period):
        ma = []
        for i in range(len(data)):
            if i < period - 1:
                ma.append(None)
            else:
                avg = sum(data[i-period+1:i+1]) / period
                ma.append(round(avg, 2))
        return ma
    
    ma5 = calculate_ma(closes, 5)
    ma10 = calculate_ma(closes, 10)
    ma20 = calculate_ma(closes, 20)
    ma60 = calculate_ma(closes, 60)
    
    # 计算RSI（相对强弱指标）
    def calculate_rsi(data, period=14):
        rsi = []
        gains = []
        losses = []
        
        for i in range(1, len(data)):
            change = data[i] - data[i-1]
            gains.append(max(0, change))
            losses.append(max(0, -change))
        
        for i in range(len(data)):
            if i < period:
                rsi.append(None)
            else:
                avg_gain = sum(gains[i-period:i]) / period
                avg_loss = sum(losses[i-period:i]) / period
                
                if avg_loss == 0:
                    rsi.append(100)
                else:
                    rs = avg_gain / avg_loss
                    rsi_val = 100 - (100 / (1 + rs))
                    rsi.append(round(rsi_val, 2))
        
        return rsi
    
    rsi = calculate_rsi(closes, 14)
    
    # 计算MACD
    def calculate_macd(data):
        ema12 = []
        ema26 = []
        macd_line = []
        signal_line = []
        histogram = []
        
        multiplier_12 = 2 / (12 + 1)
        multiplier_26 = 2 / (26 + 1)
        
        for i in range(len(data)):
            if i == 0:
                ema12.append(data[i])
                ema26.append(data[i])
            else:
                ema12.append((data[i] - ema12[-1]) * multiplier_12 + ema12[-1])
                ema26.append((data[i] - ema26[-1]) * multiplier_26 + ema26[-1])
            
            macd_val = ema12[-1] - ema26[-1]
            macd_line.append(round(macd_val, 4))
        
        # 计算信号线（9日EMA）
        multiplier_signal = 2 / (9 + 1)
        for i in range(len(macd_line)):
            if i == 0:
                signal_line.append(macd_line[i])
            else:
                signal_line.append(round((macd_line[i] - signal_line[-1]) * multiplier_signal + signal_line[-1], 4))
            
            histogram.append(round(macd_line[i] - signal_line[i], 4))
        
        return macd_line, signal_line, histogram
    
    macd_line, signal_line, macd_histogram = calculate_macd(closes)
    
    return jsonify({
        'stock_code': stock.code,
        'stock_name': stock.name,
        'dates': dates[-60:],  # 最近60天
        'prices': closes[-60:],
        'ma5': ma5[-60:],
        'ma10': ma10[-60:],
        'ma20': ma20[-60:],
        'ma60': ma60[-60:],
        'rsi': rsi[-60:],
        'macd': {
            'macd_line': macd_line[-60:],
            'signal_line': signal_line[-60:],
            'histogram': macd_histogram[-60:]
        }
    })


@app.route('/api/longhubang', methods=['GET'])
def get_longhubang():
    """获取龙虎榜数据"""
    from financial_api import get_longhubang_data
    
    date = request.args.get('date')
    
    print(f"\n=== 获取龙虎榜数据 ===")
    print(f"日期: {date or '今天'}")
    
    try:
        data = get_longhubang_data(date)
        if data:
            return jsonify({'data': data, 'date': date or datetime.datetime.now().strftime('%Y-%m-%d')})
        else:
            # 即使没有数据也返回成功状态，只是数据为空
            print("返回空数据而非错误")
            return jsonify({
                'data': [], 
                'date': date or datetime.datetime.now().strftime('%Y-%m-%d'),
                'message': '今日无龙虎榜数据或非交易日'
            }), 200
    except Exception as e:
        print(f"获取龙虎榜数据异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'获取失败: {str(e)}'}), 500


@app.route('/api/auction', methods=['GET'])
def get_auction():
    """获取集合竞价数据"""
    from financial_api import get_auction_data
    
    date = request.args.get('date')
    
    print(f"\n=== 获取集合竞价数据 ===")
    print(f"日期: {date or '今天'}")
    
    try:
        data = get_auction_data(date)
        if data:
            return jsonify({'data': data, 'date': date or datetime.datetime.now().strftime('%Y-%m-%d'), 'count': len(data)})
        return jsonify({'error': '获取集合竞价数据失败', 'data': []}), 200
    except Exception as e:
        return jsonify({'error': f'获取失败: {str(e)}'}), 500


@app.route('/api/auction/top50', methods=['GET'])
def get_auction_top50():
    """获取集合竞价前50名"""
    from financial_api import get_auction_top50
    
    by = request.args.get('by', 'amount')  # 'amount'或'change'
    date = request.args.get('date')
    
    print(f"\n=== 获取竞价前50 ===")
    print(f"排序方式: {by}, 日期: {date or '今天'}")
    
    try:
        data = get_auction_top50(by, date)
        if data:
            return jsonify({
                'data': data, 
                'date': date or datetime.datetime.now().strftime('%Y-%m-%d'),
                'type': by,
                'count': len(data)
            })
        return jsonify({'error': '获取竞价排名失败', 'data': []}), 200
    except Exception as e:
        return jsonify({'error': f'获取失败: {str(e)}'}), 500


# WebSocket事件处理
@socketio.on('connect')
def handle_connect():
    """客户端连接"""
    print(f'客户端连接: {request.sid}')
    emit('status', {'msg': '已连接到实时行情服务器'})

@socketio.on('disconnect')
def handle_disconnect():
    """客户端断开"""
    print(f'客户端断开: {request.sid}')

@socketio.on('subscribe_stock')
def handle_subscribe(data):
    """订阅指定小马的实时行情"""
    stock_id = data.get('stock_id')
    if stock_id:
        print(f'客户端 {request.sid} 订阅小马 {stock_id}')
        # 可以在此处启动定时推送

# 实时行情推送函数（可被其他线程调用）
def push_realtime_price(stock_id, price_data):
    """推送实时价格数据到所有客户端"""
    socketio.emit('price_update', {
        'stock_id': stock_id,
        'data': price_data
    })

if __name__ == '__main__':
    import webbrowser
    import threading
    
    # 延迟打开浏览器
    def open_browser():
        import time
        time.sleep(2)
        webbrowser.open('http://127.0.0.1:5000')
    
    # 在新线程中打开浏览器
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    print("=" * 60)
    print("小马分析系统启动中...")
    print("访问地址: http://127.0.0.1:5000")
    print("按 Ctrl+C 停止服务器")
    print("=" * 60)
    
    app.run(debug=False, host='0.0.0.0', port=5000)
