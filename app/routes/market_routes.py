"""
市场数据路由：龙虎榜、集合竞价等
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime

market_bp = Blueprint('market', __name__, url_prefix='/api/market')

# ==================== 龙虎榜 ====================

@market_bp.route('/longhubang', methods=['GET'])
@jwt_required()
def get_longhubang():
    """获取龙虎榜数据"""
    date = request.args.get('date')
    
    if not date:
        date = datetime.now().strftime('%Y-%m-%d')
    
    max_retries = 2
    for attempt in range(max_retries):
        try:
            print(f"[龙虎榜] 尝试第 {attempt + 1} 次请求...")
            
            import requests
            
            # 东方财富龙虎榜API
            url = "http://datacenter-web.eastmoney.com/api/data/v1/get"
            params = {
                'reportName': 'RPT_DAILYBILLBOARD_DETAILSNEW',
                'columns': 'ALL',
                'filter': f"(TRADE_DATE='{date}')",
                'pageSize': 50,
                'pageNumber': 1,
                'sortColumns': 'BUY_TOTAL_AMT',
                'sortTypes': -1
            }
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'http://data.eastmoney.com/stock/tradedetail.html'
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=8)
            response.raise_for_status()
            data = response.json()
            
            if data.get('success') and data.get('result') and data['result'].get('data'):
                stocks = data['result']['data']
                
                result = []
                for stock in stocks:
                    result.append({
                        'code': stock.get('SECURITY_CODE'),
                        'name': stock.get('SECURITY_NAME_ABBR'),
                        'change_pct': round(float(stock.get('CHANGE_RATE', 0)), 2),
                        'close_price': round(float(stock.get('CLOSE_PRICE', 0)), 2),
                        'buy_amount': round(float(stock.get('BUY_TOTAL_AMT', 0)), 2),
                        'sell_amount': round(float(stock.get('SELL_TOTAL_AMT', 0)), 2),
                        'net_amount': round(float(stock.get('NET_BUY_AMT', 0)), 2),
                        'reason': stock.get('EXPLAIN', ''),
                        'date': stock.get('TRADE_DATE', date)
                    })
                
                print(f"[龙虎榜] 成功获取 {len(result)} 条数据")
                return jsonify({
                    'success': True,
                    'date': date,
                    'count': len(result),
                    'data': result
                })
            else:
                print("[龙虎榜] API返回数据为空")
                return jsonify({
                    'success': True,
                    'date': date,
                    'count': 0,
                    'data': [],
                    'message': '该日期暂无龙虎榜数据'
                })
        
        except requests.exceptions.Timeout:
            error_msg = f"请求超时（第 {attempt + 1} 次）"
            print(f"[龙虎榜] {error_msg}")
            if attempt == max_retries - 1:
                return jsonify({
                    'success': False,
                    'error': '请求超时',
                    'message': '东方财富API响应超时，请稍后重试或检查网络连接',
                    'date': date,
                    'data': []
                }), 503
        except requests.exceptions.ConnectionError as e:
            error_msg = f"连接失败（第 {attempt + 1} 次）: {str(e)}"
            print(f"[龙虎榜] {error_msg}")
            if attempt == max_retries - 1:
                return jsonify({
                    'success': False,
                    'error': '连接失败',
                    'message': '无法连接东方财富API，请检查网络设置或稍后重试',
                    'date': date,
                    'data': []
                }), 503
        except requests.exceptions.RequestException as e:
            error_msg = f"网络请求失败（第 {attempt + 1} 次）: {str(e)}"
            print(f"[龙虎榜] {error_msg}")
            if attempt == max_retries - 1:
                return jsonify({
                    'success': False,
                    'error': '网络错误',
                    'message': f'网络请求失败: {str(e)}',
                    'date': date,
                    'data': []
                }), 503
        except Exception as e:
            print(f"[龙虎榜] 获取数据失败: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'message': '获取龙虎榜数据失败',
                'date': date,
                'data': []
            }), 500

# ==================== 集合竞价 ====================

@market_bp.route('/auction', methods=['GET'])
@jwt_required()
def get_auction_data():
    """获取集合竞价数据 - 使用新浪财经数据源"""
    import time
    import requests
    
    date = request.args.get('date')
    sort_by = request.args.get('sort_by', 'amount')
    
    if not date:
        date = datetime.now().strftime('%Y-%m-%d')
    
    # 尝试多个数据源
    data_sources = [
        ('新浪', _get_auction_from_sina),
        ('腾讯', _get_auction_from_tencent)
    ]
    
    for source_name, source_func in data_sources:
        try:
            print(f"[集合竞价] 尝试从{source_name}获取数据...")
            result = source_func(sort_by)
            if result:
                print(f"[集合竞价] 从{source_name}成功获取 {len(result)} 条数据")
                return jsonify({
                    'success': True,
                    'date': date,
                    'count': len(result),
                    'data': result[:20],
                    'source': source_name
                })
        except Exception as e:
            print(f"[集合竞价] {source_name}数据源失败: {str(e)}")
            continue
    
    # 所有数据源都失败
    return jsonify({
        'success': False,
        'error': '所有数据源均不可用',
        'message': '新浪、腾讯等数据源均无法连接，请检查网络或稍后重试',
        'date': date,
        'data': []
    }), 503


def _get_auction_from_sina(sort_by='amount'):
    """从新浪财经获取集合竞价数据"""
    import requests
    
    # 新浪财经实时行情API - 获取涨幅排行（集合竞价期间）
    url = "http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'http://vip.stock.finance.sina.com.cn/'
    }
    
    all_stocks = []
    
    # 获取沪市数据
    params_sh = {
        'page': '1',
        'num': '40',
        'sort': 'changepercent' if sort_by == 'change' else 'amount',
        'asc': '0',
        'node': 'sh_a',
        'symbol': '',
        '_s_r_a': 'page'
    }
    
    resp = requests.get(url, params=params_sh, headers=headers, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        for stock in data:
            all_stocks.append({
                'code': stock.get('code', ''),
                'name': stock.get('name', ''),
                'price': float(stock.get('trade', 0)),
                'change_pct': float(stock.get('changepercent', 0)),
                'change_amount': float(stock.get('pricechange', 0)),
                'volume': int(stock.get('volume', 0)),
                'amount': float(stock.get('amount', 0)) * 10000  # 转换为元
            })
    
    # 获取深市数据
    params_sz = {
        'page': '1',
        'num': '40',
        'sort': 'changepercent' if sort_by == 'change' else 'amount',
        'asc': '0',
        'node': 'sz_a',
        'symbol': '',
        '_s_r_a': 'page'
    }
    
    resp = requests.get(url, params=params_sz, headers=headers, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        for stock in data:
            all_stocks.append({
                'code': stock.get('code', ''),
                'name': stock.get('name', ''),
                'price': float(stock.get('trade', 0)),
                'change_pct': float(stock.get('changepercent', 0)),
                'change_amount': float(stock.get('pricechange', 0)),
                'volume': int(stock.get('volume', 0)),
                'amount': float(stock.get('amount', 0)) * 10000
            })
    
    # 排序
    if sort_by == 'change':
        all_stocks.sort(key=lambda x: x['change_pct'], reverse=True)
    else:
        all_stocks.sort(key=lambda x: x['amount'], reverse=True)
    
    return all_stocks[:50]


def _get_auction_from_tencent(sort_by='amount'):
    """从腾讯财经获取集合竞价数据"""
    import requests
    
    # 腾讯财经API - 获取沪深A股排行
    url = "https://web.ifzq.gtimg.cn/appstock/app/quote/rank/get"
    
    params = {
        'param': 'rank_a/changepercent',  # 涨幅排行
        'page': '1',
        'num': '50'
    }
    
    if sort_by == 'amount':
        params['param'] = 'rank_a/amount'  # 成交额排行
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://stockapp.finance.qq.com/'
    }
    
    resp = requests.get(url, params=params, headers=headers, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        if data.get('code') == 0:
            stocks_data = data.get('data', {}).get('rank_a', [])
            result = []
            for stock in stocks_data:
                result.append({
                    'code': stock.get('code', ''),
                    'name': stock.get('name', ''),
                    'price': float(stock.get('price', 0)),
                    'change_pct': float(stock.get('changepercent', 0)),
                    'change_amount': float(stock.get('pricechange', 0)),
                    'volume': int(stock.get('volume', 0)),
                    'amount': float(stock.get('amount', 0))
                })
            return result
    
    return []
