"""
市场数据路由：龙虎榜、集合竞价等
"""
from flask import Blueprint, request, jsonify
from datetime import datetime

market_bp = Blueprint('market', __name__, url_prefix='/api/market')

# ==================== 龙虎榜 ====================

@market_bp.route('/longhubang', methods=['GET'])
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
def get_auction_data():
    """获取集合竞价数据"""
    import time
    date = request.args.get('date')
    sort_by = request.args.get('sort_by', 'amount')
    
    if not date:
        date = datetime.now().strftime('%Y-%m-%d')
    
    max_retries = 3  # 增加到3次重试
    for attempt in range(max_retries):
        try:
            print(f"[集合竞价] 尝试第 {attempt + 1} 次请求...")
            
            import requests
            
            # 东方财富集合竞价API
            url = "http://push2.eastmoney.com/api/qt/clist/get"
            params = {
                'pn': 1,
                'pz': 50,
                'po': 1,
                'np': 1,
                'fltt': 2,
                'invt': 2,
                'fid': 'f12',
                'fs': 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23',
                'fields': 'f2,f3,f4,f5,f6,f12,f14',
                '_': int(datetime.now().timestamp() * 1000)
            }
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'http://quote.eastmoney.com/center/gridlist.html'
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=12)  # 增加超时时间
            response.raise_for_status()
            data = response.json()
            
            if data.get('data') and data['data'].get('diff'):
                stocks = data['data']['diff']
                
                result = []
                for stock in stocks:
                    result.append({
                        'code': stock.get('f12'),
                        'name': stock.get('f14'),
                        'price': round(float(stock.get('f2', 0)), 2),
                        'change_pct': round(float(stock.get('f3', 0)), 2),
                        'change_amount': round(float(stock.get('f4', 0)), 2),
                        'volume': int(stock.get('f5', 0)),
                        'amount': round(float(stock.get('f6', 0)), 2)
                    })
                
                # 根据排序方式排序
                if sort_by == 'change':
                    result.sort(key=lambda x: x['change_pct'], reverse=True)
                else:
                    result.sort(key=lambda x: x['amount'], reverse=True)
                
                print(f"[集合竞价] 成功获取 {len(result)} 条数据")
                return jsonify({
                    'success': True,
                    'date': date,
                    'count': len(result),
                    'data': result[:20]  # 只返回前20条
                })
            else:
                print("[集合竞价] API返回数据为空")
                return jsonify({
                    'success': True,
                    'date': date,
                    'count': 0,
                    'data': [],
                    'message': '暂无集合竞价数据'
                })
        
        except requests.exceptions.Timeout:
            error_msg = f"请求超时（第 {attempt + 1} 次）"
            print(f"[集合竞价] {error_msg}")
            if attempt == max_retries - 1:
                return jsonify({
                    'success': False,
                    'error': '请求超时',
                    'message': '东方财富API响应超时，请稍后重试或检查网络连接',
                    'date': date,
                    'data': []
                }), 503
            time.sleep(3)  # 超时后等待3秒
        except requests.exceptions.ConnectionError as e:
            error_msg = f"连接失败（第 {attempt + 1} 次）: {str(e)}"
            print(f"[集合竞价] {error_msg}")
            if attempt == max_retries - 1:
                return jsonify({
                    'success': False,
                    'error': '连接失败',
                    'message': '无法连接东方财富API，请检查网络设置或稍后重试',
                    'date': date,
                    'data': []
                }), 503
            time.sleep(3)  # 连接失败后等待3秒
        except requests.exceptions.RequestException as e:
            error_msg = f"网络请求失败（第 {attempt + 1} 次）: {str(e)}"
            print(f"[集合竞价] {error_msg}")
            if attempt == max_retries - 1:
                return jsonify({
                    'success': False,
                    'error': '网络错误',
                    'message': f'网络请求失败: {str(e)}',
                    'date': date,
                    'data': []
                }), 503
            time.sleep(3)
        except Exception as e:
            print(f"[集合竞价] 获取数据失败: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'message': '获取集合竞价数据失败',
                'date': date,
                'data': []
            }), 500
