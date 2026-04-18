"""
股票管理路由蓝图
"""
from flask import Blueprint, request, jsonify
from app.models.models import db, Stock
from app.services.financial_api import get_all_stock_codes
from openai import OpenAI
import os
import re
import json

stock_bp = Blueprint('stocks', __name__, url_prefix='/api/stocks')

# AI客户端
AI_API_KEY = os.getenv('ALIYUN_API_KEY', 'sk-dac7de24ee3a4f6ea4bd557197e98972')
AI_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
ai_client = OpenAI(api_key=AI_API_KEY, base_url=AI_BASE_URL)


@stock_bp.route('/fetch_all', methods=['POST'])
def fetch_all_stocks():
    """获取市场上所有A股股票代码和名称，并批量导入数据库"""
    print("\n=== 开始获取所有A股股票 ===")
    
    try:
        stock_list = get_all_stock_codes()
        
        if not stock_list:
            return jsonify({'error': '获取股票列表失败'}), 500
        
        total_count = len(stock_list)
        added_count = 0
        skipped_count = 0
        
        print(f"共获取到 {total_count} 只股票，开始导入数据库...")
        
        for stock_info in stock_list:
            try:
                code = stock_info['code']
                name = stock_info['name']
                
                existing = Stock.query.filter_by(code=code).first()
                if existing:
                    skipped_count += 1
                    continue
                
                market = '上证' if code.startswith('6') else ('深证' if code.startswith(('0', '3')) else '其他')
                
                new_stock = Stock(code=code, name=name, market=market)
                db.session.add(new_stock)
                added_count += 1
                
                if added_count % 100 == 0:
                    db.session.commit()
                    print(f"已导入 {added_count} 条...")
                    
            except Exception as e:
                print(f"导入股票 {stock_info.get('code', '')} 失败: {e}")
                continue
        
        db.session.commit()
        
        print(f"\n导入完成！新增: {added_count}, 跳过: {skipped_count}")
        
        return jsonify({
            'success': True,
            'total': total_count,
            'added': added_count,
            'skipped': skipped_count,
            'message': f'成功导入 {added_count} 只股票'
        })
        
    except Exception as e:
        print(f"获取股票列表异常: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'获取失败: {str(e)}'}), 500


@stock_bp.route('/search', methods=['GET'])
def search_stock():
    """根据股票代码或名称查询股票信息（用于添加前预览）"""
    code = request.args.get('code', '').strip()
    name = request.args.get('name', '').strip()
    
    if not code and not name:
        return jsonify({'error': '请提供股票代码或名称'}), 400
    
    try:
        # 先检查数据库中是否已存在
        existing = None
        if code and code.isdigit():  # 只在code是纯数字时才作为代码查询
            existing = Stock.query.filter_by(code=code).first()
        if not existing and name:
            existing = Stock.query.filter_by(name=name).first()
        
        if existing:
            return jsonify({
                'exists': True,
                'stock': {
                    'id': existing.id,
                    'code': existing.code,
                    'name': existing.name,
                    'market': existing.market
                },
                'message': '该股票已存在于数据库中'
            }), 409
        
        # 从东方财富API查询股票信息
        from app.services.financial_api import search_stock_by_code, search_stock_by_name
        
        stock_info = None
        # 如果code是纯数字，优先按代码查询
        if code and code.isdigit():
            stock_info = search_stock_by_code(code)
            print(f"按代码查询 {code}: {'成功' if stock_info else '失败'}")
        # 否则按名称查询
        if not stock_info and name:
            stock_info = search_stock_by_name(name)
            print(f"按名称查询 {name}: {'成功' if stock_info else '失败'}")
        # 如果code不是数字且name为空，尝试按code作为名称查询
        elif not stock_info and code and not code.isdigit():
            stock_info = search_stock_by_name(code)
            print(f"按代码作为名称查询 {code}: {'成功' if stock_info else '失败'}")
        
        if stock_info:
            # 确保返回的数据包含code字段
            if not stock_info.get('code'):
                if code and code.isdigit():
                    stock_info['code'] = code
                elif name:
                    # 如果按名称查询成功但没code，从本地数据库找
                    from app.services.stock_database import search_stock_by_name_local
                    local_result = search_stock_by_name_local(name)
                    if local_result:
                        stock_info['code'] = local_result['code']
            
            return jsonify({
                'exists': False,
                'stock': stock_info,
                'message': '查询成功'
            })
        else:
            # 外部API查询失败，尝试本地数据库
            from app.services.stock_database import search_stock_by_name_local, search_stock_by_code_local
            local_result = None
            if name:
                local_result = search_stock_by_name_local(name)
            elif code and code.isdigit():
                local_result = search_stock_by_code_local(code)
            
            if local_result:
                return jsonify({
                    'exists': False,
                    'stock': local_result,
                    'message': '从本地数据库查询成功'
                })
            
            # 本地数据库也没有，返回基本信息让用户手动填写
            final_code = code if (code and code.isdigit()) else (local_result['code'] if local_result else '')
            return jsonify({
                'exists': False,
                'stock': {
                    'code': final_code,
                    'name': name or (code if not code.isdigit() else ''),
                    'market': '深证' if (code.isdigit() and code.startswith(('0', '3'))) else ('上证' if (code.isdigit() and code.startswith('6')) else '其他'),
                    'price': None,
                    'high': None,
                    'low': None,
                    'open': None,
                    'close': None,
                    'change': None
                },
                'message': '无法获取实时行情，请手动确认信息后添加',
                'api_unavailable': True
            })
            
    except Exception as e:
        print(f"查询股票失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'查询失败: {str(e)}'}), 500


@stock_bp.route('', methods=['GET'])
def get_stocks():
    """获取所有股票列表"""
    stocks = Stock.query.all()
    return jsonify([{
        'id': stock.id,
        'code': stock.code,
        'name': stock.name,
        'market': stock.market,
        'created_at': stock.created_at.isoformat()
    } for stock in stocks])


@stock_bp.route('/<int:stock_id>', methods=['GET'])
def get_stock(stock_id):
    """获取单个股票信息"""
    stock = Stock.query.get_or_404(stock_id)
    return jsonify({
        'id': stock.id,
        'code': stock.code,
        'name': stock.name,
        'market': stock.market,
        'created_at': stock.created_at.isoformat()
    })


@stock_bp.route('', methods=['POST'])
def add_stock():
    """添加新股票"""
    data = request.json
    
    existing_stock = Stock.query.filter_by(code=data['code']).first()
    if existing_stock:
        return jsonify({'error': '股票代码已存在'}), 400
    
    stock = Stock(
        code=data['code'],
        name=data['name'],
        market=data.get('market', '沪深')
    )
    
    db.session.add(stock)
    db.session.commit()
    
    return jsonify({
        'message': '股票添加成功',
        'id': stock.id
    }), 201


@stock_bp.route('/<int:stock_id>', methods=['DELETE'])
def delete_stock(stock_id):
    """删除股票"""
    stock = Stock.query.get_or_404(stock_id)
    db.session.delete(stock)
    db.session.commit()
    
    return jsonify({'message': '股票删除成功'})


@stock_bp.route('/<int:stock_id>/info', methods=['GET'])
def get_stock_detail_info(stock_id):
    """获取股票详细信息(板块、最新消息等)"""
    stock = Stock.query.get_or_404(stock_id)
    
    prompt = f"""请联网搜索股票 {stock.code}({stock.name}) 的以下信息，只返回JSON格式：
{{
  "sectors": ["所属板块1", "所属板块2", "所属板块3"],
  "latest_news": "最新重要消息（50字以内）",
  "concept": "核心概念题材"
}}

只返回JSON，不要markdown格式。"""
    
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
            json_str = json_match.group()
            stock_info = json.loads(json_str)
            return jsonify(stock_info)
        else:
            return jsonify({'error': 'AI返回格式不正确'}), 500
            
    except Exception as e:
        return jsonify({'error': f'查询失败: {str(e)}'}), 500
