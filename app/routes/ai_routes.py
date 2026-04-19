"""
AI智能分析路由蓝图
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.models import db, Stock, StockPrice
from openai import OpenAI
import os
import re
import json

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

# AI客户端配置
AI_API_KEY = os.getenv('ALIYUN_API_KEY', 'sk-dac7de24ee3a4f6ea4bd557197e98972')
AI_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
ai_client = OpenAI(api_key=AI_API_KEY, base_url=AI_BASE_URL)


@ai_bp.route('/fetch_stock', methods=['POST'])
@jwt_required()
def ai_fetch_stock():
    """AI实时查询指定股票指定日期的数据(支持联网搜索)"""
    data = request.json
    stock_code = data.get('stock_code')
    query_date = data.get('date')
    
    if not stock_code or not query_date:
        return jsonify({'error': '请提供股票代码和日期'}), 400
    
    prompt = f"""请联网搜索股票{stock_code}在{query_date}的真实交易数据。
返回纯JSON格式：{{"date": "", "stock_name": "", "open": 0, "high": 0, "low": 0, "close": 0, "volume": 0}}
只返回JSON对象。"""
    
    try:
        response = ai_client.chat.completions.create(
            model='qwen-max',
            messages=[
                {'role': 'system', 'content': '你是专业的金融数据助手'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.1,
            max_tokens=500,
            extra_body={'enable_search': True}
        )
        
        result = response.choices[0].message.content
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            stock_data = json.loads(json_match.group())
            return jsonify(stock_data)
        else:
            return jsonify({'error': 'AI返回格式不正确'}), 500
    
    except Exception as e:
        return jsonify({'error': f'AI查询失败: {str(e)}'}), 500


@ai_bp.route('/analyze', methods=['POST'])
@jwt_required()
def ai_analyze():
    """AI分析股票数据"""
    data = request.json
    stock_id = data.get('stock_id')
    question = data.get('question', '请分析这只股票')
    
    if not stock_id:
        return jsonify({'error': '请提供股票ID'}), 400
    
    stock = Stock.query.get_or_404(stock_id)
    prices = StockPrice.query.filter_by(stock_id=stock_id).order_by(StockPrice.date.desc()).limit(30).all()
    
    if not prices:
        return jsonify({'error': '没有价格数据可供分析'}), 404
    
    price_data = [{
        'date': p.date.isoformat(),
        'open': p.open_price,
        'high': p.high_price,
        'low': p.low_price,
        'close': p.close_price,
        'volume': p.volume
    } for p in prices]
    
    closes = [p.close_price for p in prices]
    latest_price = closes[0]
    price_change = ((closes[0] - closes[-1]) / closes[-1]) * 100 if len(closes) > 1 else 0
    
    context = f"""股票信息：
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
                {'role': 'system', 'content': '你是专业的股票分析师'},
                {'role': 'user', 'content': context}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        analysis = response.choices[0].message.content
        return jsonify({'analysis': analysis})
        
    except Exception as e:
        return jsonify({'error': f'AI分析失败: {str(e)}'}), 500


@ai_bp.route('/compare_analyze', methods=['POST'])
@jwt_required()
def ai_compare_analyze():
    """AI对比分析多只股票"""
    data = request.json
    stocks_data = data.get('stocks', [])
    question = data.get('question', '请对比分析这些股票')
    
    if not stocks_data or len(stocks_data) < 2:
        return jsonify({'error': '请提供至少2只股票进行对比'}), 400
    
    context = f"""请对比分析以下{len(stocks_data)}只股票：\n\n"""
    
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
"""
    
    context += f"\n对比分析要求：{question}\n\n请从收益性、风险性、技术指标等维度进行专业对比分析。"
    
    try:
        response = ai_client.chat.completions.create(
            model='qwen-plus',
            messages=[
                {'role': 'system', 'content': '你是专业的股票分析师，擅长多只股票的对比分析'},
                {'role': 'user', 'content': context}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        analysis = response.choices[0].message.content
        return jsonify({'analysis': analysis})
        
    except Exception as e:
        return jsonify({'error': f'AI对比分析失败: {str(e)}'}), 500


@ai_bp.route('/chat', methods=['POST'])
@jwt_required()
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
                {'role': 'system', 'content': '你是专业的股票投资顾问'},
                {'role': 'user', 'content': question}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        answer = response.choices[0].message.content
        return jsonify({'answer': answer})
        
    except Exception as e:
        return jsonify({'error': f'AI对话失败: {str(e)}'}), 500
