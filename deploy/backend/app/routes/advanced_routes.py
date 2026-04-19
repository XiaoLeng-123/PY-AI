"""
自选股、预警、板块分析、资金流向、交易信号等高级功能路由
"""
from flask import Blueprint, request, jsonify
from app.models.models import db, Stock, StockPrice, Watchlist, StockAlert
from datetime import datetime, timedelta

advanced_bp = Blueprint('advanced', __name__, url_prefix='/api/advanced')

# ==================== 自选股管理 ====================

@advanced_bp.route('/watchlist', methods=['GET'])
def get_watchlist():
    """获取自选股列表"""
    group = request.args.get('group')
    query = Watchlist.query
    
    if group:
        query = query.filter_by(group_name=group)
    
    watchlist_items = query.order_by(Watchlist.created_at.desc()).all()
    
    result = []
    for item in watchlist_items:
        stock = item.stock
        # 获取最新价格
        latest_price = StockPrice.query.filter_by(stock_id=stock.id)\
            .order_by(StockPrice.date.desc()).first()
        
        result.append({
            'id': item.id,
            'stock_id': stock.id,
            'code': stock.code,
            'name': stock.name,
            'market': stock.market,
            'group_name': item.group_name,
            'notes': item.notes,
            'latest_price': latest_price.close_price if latest_price else None,
            'latest_date': latest_price.date.isoformat() if latest_price else None
        })
    
    return jsonify(result)

@advanced_bp.route('/watchlist', methods=['POST'])
def add_to_watchlist():
    """添加自选股"""
    data = request.json
    stock_id = data.get('stock_id')
    group_name = data.get('group_name', '默认分组')
    notes = data.get('notes', '')
    
    # 检查是否已存在
    existing = Watchlist.query.filter_by(stock_id=stock_id, group_name=group_name).first()
    if existing:
        return jsonify({'error': '该股票已在自选股中'}), 400
    
    watchlist_item = Watchlist(
        stock_id=stock_id,
        group_name=group_name,
        notes=notes
    )
    db.session.add(watchlist_item)
    db.session.commit()
    
    return jsonify({'message': '添加成功', 'id': watchlist_item.id}), 201

@advanced_bp.route('/watchlist/<int:id>', methods=['DELETE'])
def remove_from_watchlist(id):
    """删除自选股"""
    item = Watchlist.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': '删除成功'})

@advanced_bp.route('/watchlist/groups', methods=['GET'])
def get_watchlist_groups():
    """获取所有分组"""
    groups = db.session.query(Watchlist.group_name).distinct().all()
    return jsonify([g[0] for g in groups])

# ==================== 预警系统 ====================

@advanced_bp.route('/alerts', methods=['GET'])
def get_alerts():
    """获取预警列表"""
    stock_id = request.args.get('stock_id')
    query = StockAlert.query
    
    if stock_id:
        query = query.filter_by(stock_id=stock_id)
    
    alerts = query.order_by(StockAlert.created_at.desc()).all()
    
    result = []
    for alert in alerts:
        result.append({
            'id': alert.id,
            'stock_id': alert.stock_id,
            'stock_code': alert.stock.code,
            'stock_name': alert.stock.name,
            'alert_type': alert.alert_type,
            'condition': alert.condition,
            'threshold': alert.threshold,
            'is_active': alert.is_active,
            'triggered': alert.triggered,
            'triggered_at': alert.triggered_at.isoformat() if alert.triggered_at else None,
            'created_at': alert.created_at.isoformat()
        })
    
    return jsonify(result)

@advanced_bp.route('/alerts', methods=['POST'])
def create_alert():
    """创建预警"""
    data = request.json
    alert = StockAlert(
        stock_id=data['stock_id'],
        alert_type=data['alert_type'],
        condition=data['condition'],
        threshold=data['threshold'],
        is_active=data.get('is_active', True)
    )
    db.session.add(alert)
    db.session.commit()
    return jsonify({'message': '预警创建成功', 'id': alert.id}), 201

@advanced_bp.route('/alerts/<int:id>', methods=['PUT'])
def update_alert(id):
    """更新预警"""
    alert = StockAlert.query.get_or_404(id)
    data = request.json
    
    alert.is_active = data.get('is_active', alert.is_active)
    if 'threshold' in data:
        alert.threshold = data['threshold']
    
    db.session.commit()
    return jsonify({'message': '更新成功'})

@advanced_bp.route('/alerts/<int:id>', methods=['DELETE'])
def delete_alert(id):
    """删除预警"""
    alert = StockAlert.query.get_or_404(id)
    db.session.delete(alert)
    db.session.commit()
    return jsonify({'message': '删除成功'})

@advanced_bp.route('/alerts/check', methods=['POST'])
def check_alerts():
    """检查预警是否触发"""
    # 获取所有活跃的预警
    active_alerts = StockAlert.query.filter_by(is_active=True, triggered=False).all()
    
    triggered = []
    for alert in active_alerts:
        # 获取最新价格
        latest = StockPrice.query.filter_by(stock_id=alert.stock_id)\
            .order_by(StockPrice.date.desc()).first()
        
        if not latest:
            continue
        
        price = latest.close_price
        change_pct = 0
        if alert.alert_type == 'change':
            prev = StockPrice.query.filter(
                StockPrice.stock_id == alert.stock_id,
                StockPrice.date < latest.date
            ).order_by(StockPrice.date.desc()).first()
            if prev:
                change_pct = ((price - prev.close_price) / prev.close_price) * 100
        
        should_trigger = False
        if alert.alert_type == 'price':
            if alert.condition == 'above' and price >= alert.threshold:
                should_trigger = True
            elif alert.condition == 'below' and price <= alert.threshold:
                should_trigger = True
        elif alert.alert_type == 'change':
            if alert.condition == 'above' and change_pct >= alert.threshold:
                should_trigger = True
            elif alert.condition == 'below' and change_pct <= -alert.threshold:
                should_trigger = True
        
        if should_trigger:
            alert.triggered = True
            alert.triggered_at = datetime.utcnow()
            triggered.append({
                'alert_id': alert.id,
                'stock_code': alert.stock.code,
                'stock_name': alert.stock.name,
                'current_price': price,
                'threshold': alert.threshold
            })
    
    if triggered:
        db.session.commit()
    
    return jsonify({'triggered': triggered, 'count': len(triggered)})

# ==================== 板块分析 ====================

@advanced_bp.route('/sectors/overview', methods=['GET'])
def get_sectors_overview():
    """获取板块概况 - 使用AkShare新浪行业板块接口（稳定可靠）"""
    try:
        import akshare as ak
        
        print("\n[板块概况] 开始获取新浪行业板块数据...")
        
        # 获取新浪行业板块实时行情
        df = ak.stock_sector_spot(indicator='新浪行业')
        
        if df is None or len(df) == 0:
            return jsonify({
                'success': False,
                'error': '未获取到板块数据',
                'message': '新浪行业板块数据为空，请稍后重试',
                'sectors': [],
                'statistics': {}
            }), 503
        
        # 转换为列表格式
        sectors = []
        for _, row in df.iterrows():
            sectors.append({
                'code': str(row.get('label', '')),  # 板块代码
                'name': str(row.get('板块', '')),  # 板块名称
                'change_pct': round(float(row.get('涨跌幅', 0)), 2),  # 涨跌幅
                'change_amount': round(float(row.get('涨跌额', 0)), 2),  # 涨跌额
                'average_price': round(float(row.get('平均价格', 0)), 2),  # 平均价格
                'volume': round(float(row.get('总成交量', 0)) / 10000, 2),  # 成交量(万手)
                'amount': round(float(row.get('总成交额', 0)) / 100000000, 2),  # 成交额(亿)
                'stock_count': int(row.get('公司家数', 0)),  # 成分股数量
                'leading_stock_code': str(row.get('股票代码', '')),  # 领涨股票代码
                'leading_stock_change': round(float(row.get('个股-涨跌幅', 0)), 2),  # 领涨股涨跌幅
                'leading_stock_price': round(float(row.get('个股-当前价', 0)), 2),  # 领涨股当前价
                'leading_stock_name': str(row.get('股票名称', '')),  # 领涨股名称
            })
        
        # 统计信息
        total_sectors = len(sectors)
        rising_sectors = sum(1 for s in sectors if s['change_pct'] > 0)
        falling_sectors = sum(1 for s in sectors if s['change_pct'] < 0)
        avg_change = round(sum(s['change_pct'] for s in sectors) / total_sectors, 2) if total_sectors > 0 else 0
        
        print(f"[板块概况] ✅ 成功获取 {total_sectors} 个新浪行业板块数据")
        return jsonify({
            'success': True,
            'sectors': sectors,
            'statistics': {
                'total_sectors': total_sectors,
                'rising_sectors': rising_sectors,
                'falling_sectors': falling_sectors,
                'avg_change_pct': avg_change,
                'update_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        })
        
    except Exception as e:
        print(f"[板块概况] ❌ 获取数据失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '无法获取新浪行业板块数据，请稍后重试',
            'sectors': [],
            'statistics': {}
        }), 500

@advanced_bp.route('/sectors/rankings', methods=['GET'])
def get_sector_rankings():
    """获取板块涨跌幅排行 - 使用AkShare新浪行业板块接口（稳定可靠）"""
    try:
        import akshare as ak
        
        print("\n[板块排行] 开始获取新浪行业板块数据...")
        
        # 获取新浪行业板块实时行情
        df = ak.stock_sector_spot(indicator='新浪行业')
        
        if df is None or len(df) == 0:
            return jsonify({
                'success': False,
                'error': '未获取到板块数据',
                'message': '新浪行业板块数据为空，请稍后重试',
                'gainers': [],
                'losers': [],
                'all_sectors': []
            }), 503
        
        # 转换为列表格式并按涨跌幅排序
        all_sectors = []
        for _, row in df.iterrows():
            all_sectors.append({
                'rank': len(all_sectors) + 1,
                'code': str(row.get('label', '')),
                'name': str(row.get('板块', '')),
                'change_pct': round(float(row.get('涨跌幅', 0)), 2),
                'change_amount': round(float(row.get('涨跌额', 0)), 2),
                'average_price': round(float(row.get('平均价格', 0)), 2),
                'volume': round(float(row.get('总成交量', 0)) / 10000, 2),
                'amount': round(float(row.get('总成交额', 0)) / 100000000, 2),
                'stock_count': int(row.get('公司家数', 0)),
                'leading_stock_code': str(row.get('股票代码', '')),
                'leading_stock_change': round(float(row.get('个股-涨跌幅', 0)), 2),
                'leading_stock_price': round(float(row.get('个股-当前价', 0)), 2),
                'leading_stock_name': str(row.get('股票名称', '')),
            })
        
        # 按涨跌幅降序排列
        all_sectors.sort(key=lambda x: x['change_pct'], reverse=True)
        
        # 更新排名
        for i, sector in enumerate(all_sectors):
            sector['rank'] = i + 1
        
        # 涨幅前20名
        gainers = all_sectors[:20]
        # 跌幅前20名（倒序）
        losers = all_sectors[-20:][::-1]
        
        print(f"[板块排行] ✅ 成功获取 {len(all_sectors)} 个新浪行业板块数据")
        return jsonify({
            'success': True,
            'date': datetime.now().strftime('%Y-%m-%d'),
            'gainers': gainers,
            'losers': losers,
            'all_sectors': all_sectors
        })
        
    except Exception as e:
        print(f"[板块排行] ❌ 获取数据失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '无法获取新浪行业板块排行数据，请稍后重试',
            'gainers': [],
            'losers': [],
            'all_sectors': []
        }), 500

@advanced_bp.route('/sectors/<sector_code>/stocks', methods=['GET'])
def get_sector_stocks(sector_code):
    """获取板块成分股列表"""
    import requests
    
    # 安全转换函数
    def safe_float(value, default=0):
        try:
            if value is None or value == '-' or value == '':
                return default
            return float(value)
        except (ValueError, TypeError):
            return default
    
    def safe_int(value, default=0):
        try:
            if value is None or value == '-' or value == '':
                return default
            return int(value)
        except (ValueError, TypeError):
            return default
    
    try:
        # 从东方财富获取板块成分股
        url = "http://push2.eastmoney.com/api/qt/clist/get"
        params = {
            'pn': 1,
            'pz': 100,
            'po': 1,
            'np': 1,
            'ut': 'bd1d9ddb04089700cf9c27f6f7426281',
            'fltt': 2,
            'invt': 2,
            'fid': 'f3',
            'fs': f'b:{sector_code} f:!50',  # 板块成分股
            'fields': 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f26'
        }
        
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if data.get('data') and data['data'].get('diff'):
            stocks = []
            for item in data['data']['diff']:
                stocks.append({
                    'code': str(item.get('f12', '')),
                    'name': str(item.get('f14', '')),
                    'close_price': round(safe_float(item.get('f2')), 2),
                    'change_pct': round(safe_float(item.get('f3')), 2),
                    'change_amount': round(safe_float(item.get('f4')), 2),
                    'volume': round(safe_float(item.get('f5')) / 100, 2),
                    'amount': round(safe_float(item.get('f6')) / 10000, 2),
                    'turnover_rate': round(safe_float(item.get('f8')), 2),
                    'pe_ratio': round(safe_float(item.get('f9')), 2),
                    'market_cap': round(safe_float(item.get('f20')) / 100000000, 2),
                })
            
            return jsonify({
                'success': True,
                'sector_code': sector_code,
                'stocks': stocks,
                'total': len(stocks)
            })
        else:
            raise Exception("API返回数据为空")
            
    except requests.exceptions.RequestException as e:
        print(f"网络请求失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': '网络连接失败',
            'message': '无法连接东方财富API，请检查网络连接',
            'stocks': []
        }), 500
    except Exception as e:
        print(f"获取板块成分股失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '无法获取板块成分股数据，请稍后重试',
            'stocks': []
        }), 500

# ==================== 资金流向分析 ====================

@advanced_bp.route('/moneyflow', methods=['GET'])
def get_moneyflow():
    """获取资金流向分析"""
    stock_id = request.args.get('stock_id')
    days = int(request.args.get('days', 30))
    
    if not stock_id:
        return jsonify({'error': '请提供stock_id'}), 400
    
    # 获取指定天数的价格数据
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    
    prices = StockPrice.query.filter(
        StockPrice.stock_id == stock_id,
        StockPrice.date >= start_date,
        StockPrice.date <= end_date
    ).order_by(StockPrice.date).all()
    
    # 模拟资金流向分析 (基于价格和成交量)
    moneyflow_data = []
    for i, price in enumerate(prices):
        change = price.close_price - price.open_price
        volume = price.volume or 0
        
        # 简化的资金流向计算
        if change > 0:
            main_flow = volume * 0.6  # 主力流入
            retail_flow = volume * 0.4  # 散户流入
        else:
            main_flow = -volume * 0.6  # 主力流出
            retail_flow = -volume * 0.4  # 散户流出
        
        moneyflow_data.append({
            'date': price.date.isoformat(),
            'close_price': price.close_price,
            'volume': volume,
            'main_flow': round(main_flow, 2),
            'retail_flow': round(retail_flow, 2),
            'net_flow': round(main_flow + retail_flow, 2)
        })
    
    # 统计汇总
    total_main = sum(d['main_flow'] for d in moneyflow_data)
    total_retail = sum(d['retail_flow'] for d in moneyflow_data)
    
    return jsonify({
        'stock_id': stock_id,
        'period': f'{days}天',
        'summary': {
            'total_main_flow': round(total_main, 2),
            'total_retail_flow': round(total_retail, 2),
            'total_net_flow': round(total_main + total_retail, 2),
            'main_flow_direction': '流入' if total_main > 0 else '流出'
        },
        'daily_data': moneyflow_data
    })

# ==================== 交易信号系统 ====================

@advanced_bp.route('/signals', methods=['GET'])
def get_trading_signals():
    """获取交易信号"""
    stock_id = request.args.get('stock_id')
    if not stock_id:
        return jsonify({'error': '请提供stock_id'}), 400
    
    # 获取最近30天数据
    prices = StockPrice.query.filter_by(stock_id=stock_id)\
        .order_by(StockPrice.date.desc()).limit(30).all()
    
    if len(prices) < 20:
        return jsonify({'error': '数据不足,需要至少20天数据'}), 400
    
    prices.reverse()
    close_prices = [p.close_price for p in prices]
    high_prices = [p.high_price for p in prices]
    low_prices = [p.low_price for p in prices]
    
    # 计算均线
    ma5 = sum(close_prices[-5:]) / 5
    ma10 = sum(close_prices[-10:]) / 10
    ma20 = sum(close_prices[-20:]) / 20
    
    latest_price = close_prices[-1]
    
    # 生成信号
    signals = []
    
    # 均线信号
    if latest_price > ma5 and ma5 > ma10 and ma10 > ma20:
        signals.append({'type': 'buy', 'indicator': 'MA', 'strength': 'strong', 'message': '多头排列,强烈买入信号'})
    elif latest_price < ma5 and ma5 < ma10 and ma10 < ma20:
        signals.append({'type': 'sell', 'indicator': 'MA', 'strength': 'strong', 'message': '空头排列,强烈卖出信号'})
    elif latest_price > ma20:
        signals.append({'type': 'buy', 'indicator': 'MA', 'strength': 'weak', 'message': '价格在20日均线上方,偏多'})
    else:
        signals.append({'type': 'sell', 'indicator': 'MA', 'strength': 'weak', 'message': '价格在20日均线下方,偏空'})
    
    # 支撑阻力位
    support = min(low_prices[-20:])
    resistance = max(high_prices[-20:])
    
    if latest_price <= support * 1.02:
        signals.append({'type': 'buy', 'indicator': 'Support', 'strength': 'medium', 
                       'message': f'接近支撑位{support:.2f},可能反弹'})
    elif latest_price >= resistance * 0.98:
        signals.append({'type': 'sell', 'indicator': 'Resistance', 'strength': 'medium',
                       'message': f'接近阻力位{resistance:.2f},可能回调'})
    
    # 止损止盈建议
    stop_loss = support * 0.97
    take_profit = resistance
    
    return jsonify({
        'stock_id': stock_id,
        'latest_price': latest_price,
        'indicators': {
            'ma5': round(ma5, 2),
            'ma10': round(ma10, 2),
            'ma20': round(ma20, 2),
            'support': round(support, 2),
            'resistance': round(resistance, 2)
        },
        'signals': signals,
        'suggestions': {
            'stop_loss': round(stop_loss, 2),
            'take_profit': round(take_profit, 2),
            'risk_reward_ratio': round((take_profit - latest_price) / (latest_price - stop_loss), 2) if latest_price > stop_loss else 0
        }
    })

# ==================== 策略回测 ====================

@advanced_bp.route('/backtest', methods=['POST'])
def run_backtest():
    """运行策略回测"""
    data = request.json
    stock_id = data.get('stock_id')
    strategy = data.get('strategy', 'ma_cross')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not stock_id:
        return jsonify({'error': '请提供股票ID'}), 400
    
    # 获取价格数据
    query = StockPrice.query.filter_by(stock_id=stock_id)
    if start_date:
        query = query.filter(StockPrice.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(StockPrice.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    
    prices = query.order_by(StockPrice.date).all()
    
    if len(prices) < 30:
        return jsonify({'error': '数据不足，需要至少30天数据'}), 400
    
    # 初始化回测变量
    trades = []
    position = 0  # 持仓数量
    cash = 100000  # 初始资金10万
    initial_capital = cash
    
    closes = [p.close_price for p in prices]
    dates = [p.date.isoformat() for p in prices]
    
    # 计算技术指标
    def calc_ma(data, period):
        result = []
        for i in range(len(data)):
            if i < period - 1:
                result.append(None)
            else:
                result.append(sum(data[i-period+1:i+1]) / period)
        return result
    
    ma5 = calc_ma(closes, 5)
    ma20 = calc_ma(closes, 20)
    
    # 执行策略
    for i in range(1, len(prices)):
        signal = None
        
        if strategy == 'ma_cross':
            # 均线金叉/死叉
            if ma5[i] and ma5[i-1] and ma20[i] and ma20[i-1]:
                if ma5[i-1] <= ma20[i-1] and ma5[i] > ma20[i]:
                    signal = 'buy'
                elif ma5[i-1] >= ma20[i-1] and ma5[i] < ma20[i]:
                    signal = 'sell'
        
        elif strategy == 'macd':
            # MACD金叉/死叉（简化版）
            if i >= 26:
                ema12 = sum(closes[max(0,i-11):i+1]) / min(12, i+1)
                ema26 = sum(closes[max(0,i-25):i+1]) / min(26, i+1)
                macd_line = ema12 - ema26
                
                if i >= 35:
                    prev_ema12 = sum(closes[max(0,i-12):i]) / min(12, i)
                    prev_ema26 = sum(closes[max(0,i-26):i]) / min(26, i)
                    prev_macd = prev_ema12 - prev_ema26
                    
                    if prev_macd <= 0 and macd_line > 0:
                        signal = 'buy'
                    elif prev_macd >= 0 and macd_line < 0:
                        signal = 'sell'
        
        elif strategy == 'rsi':
            # RSI超买超卖
            if i >= 14:
                gains = []
                losses = []
                for j in range(i-13, i+1):
                    diff = closes[j] - closes[j-1]
                    gains.append(max(0, diff))
                    losses.append(max(0, -diff))
                
                avg_gain = sum(gains) / 14
                avg_loss = sum(losses) / 14
                
                if avg_loss == 0:
                    rsi = 100
                else:
                    rs = avg_gain / avg_loss
                    rsi = 100 - (100 / (1 + rs))
                
                if rsi < 30:
                    signal = 'buy'
                elif rsi > 70:
                    signal = 'sell'
        
        # 执行交易
        if signal == 'buy' and position == 0 and cash > 0:
            # 买入
            quantity = int(cash / closes[i])
            if quantity > 0:
                cost = quantity * closes[i]
                cash -= cost
                position = quantity
                trades.append({
                    'date': dates[i],
                    'type': 'buy',
                    'price': closes[i],
                    'quantity': quantity,
                    'amount': round(cost, 2),
                    'profit': None
                })
        
        elif signal == 'sell' and position > 0:
            # 卖出
            revenue = position * closes[i]
            profit = revenue - (trades[-1]['amount'] if trades else 0)
            cash += revenue
            
            trades.append({
                'date': dates[i],
                'type': 'sell',
                'price': closes[i],
                'quantity': position,
                'amount': round(revenue, 2),
                'profit': round(profit, 2)
            })
            position = 0
    
    # 计算回测结果
    final_capital = cash + (position * closes[-1] if position > 0 else 0)
    total_return = ((final_capital - initial_capital) / initial_capital) * 100
    
    # 计算年化收益
    days = (prices[-1].date - prices[0].date).days
    years = days / 365.25 if days > 0 else 1
    annualized_return = ((final_capital / initial_capital) ** (1 / years) - 1) * 100 if years > 0 else 0
    
    # 计算胜率和盈亏比
    sell_trades = [t for t in trades if t['type'] == 'sell']
    win_trades = [t for t in sell_trades if t['profit'] > 0]
    loss_trades = [t for t in sell_trades if t['profit'] <= 0]
    
    win_count = len(win_trades)
    loss_count = len(loss_trades)
    win_rate = (win_count / len(sell_trades) * 100) if sell_trades else 0
    
    # 计算最大回撤
    peak = initial_capital
    max_drawdown = 0
    capital_curve = [initial_capital]
    
    for trade in trades:
        if trade['type'] == 'buy':
            capital_curve.append(capital_curve[-1] - trade['amount'])
        else:
            capital_curve.append(capital_curve[-1] + trade['amount'])
        
        if capital_curve[-1] > peak:
            peak = capital_curve[-1]
        
        drawdown = (peak - capital_curve[-1]) / peak * 100
        if drawdown > max_drawdown:
            max_drawdown = drawdown
    
    # 计算夏普比率（简化版）
    if len(sell_trades) > 1:
        profits = [t['profit'] for t in sell_trades]
        avg_profit = sum(profits) / len(profits)
        std_profit = (sum([(p - avg_profit) ** 2 for p in profits]) / len(profits)) ** 0.5
        sharpe_ratio = (avg_profit / std_profit) if std_profit > 0 else 0
    else:
        sharpe_ratio = 0
    
    # 生成资金曲线数据
    equity_curve = []
    peak = initial_capital  # 初始化峰值
    for i, price in enumerate(prices):
        # 计算当前持仓市值
        position_value = position * price.close_price if position > 0 else 0
        total_value = cash + position_value
        
        # 先计算回撤（使用当前峰值）
        drawdown = ((peak - total_value) / peak * 100) if peak > 0 else 0
        
        equity_curve.append({
            'date': dates[i],
            'equity': round(total_value, 2),
            'drawdown': round(drawdown, 2)
        })
        
        # 更新峰值
        if total_value > peak:
            peak = total_value
    
    return jsonify({
        'total_return': round(total_return, 2),
        'annualized_return': round(annualized_return, 2),
        'win_rate': round(win_rate, 1),
        'win_count': win_count,
        'loss_count': loss_count,
        'max_drawdown': round(max_drawdown, 2),
        'sharpe_ratio': round(sharpe_ratio, 2),
        'trade_count': len(trades),
        'final_capital': round(final_capital, 2),
        'trades': trades,
        'equity_curve': equity_curve
    })

@advanced_bp.route('/backtest/optimize', methods=['POST'])
def optimize_strategy():
    """策略参数优化"""
    data = request.json
    stock_id = data.get('stock_id')
    strategy = data.get('strategy', 'ma_cross')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not stock_id:
        return jsonify({'error': '请提供股票ID'}), 400
    
    # 获取价格数据
    query = StockPrice.query.filter_by(stock_id=stock_id)
    if start_date:
        query = query.filter(StockPrice.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(StockPrice.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    
    prices = query.order_by(StockPrice.date).all()
    
    if len(prices) < 60:
        return jsonify({'error': '数据不足，需要至少60天数据'}), 400
    
    closes = [p.close_price for p in prices]
    dates = [p.date.isoformat() for p in prices]
    
    results = []
    
    if strategy == 'ma_cross':
        # 优化均线周期组合
        for short_period in [5, 10, 15]:
            for long_period in [20, 30, 60]:
                if short_period >= long_period:
                    continue
                
                # 计算均线
                def calc_ma(data, period):
                    result = []
                    for i in range(len(data)):
                        if i < period - 1:
                            result.append(None)
                        else:
                            result.append(sum(data[i-period+1:i+1]) / period)
                    return result
                
                ma_short = calc_ma(closes, short_period)
                ma_long = calc_ma(closes, long_period)
                
                # 执行回测
                trades_count = 0
                wins = 0
                losses = 0
                total_profit = 0
                position = 0
                cash = 100000
                
                for i in range(1, len(prices)):
                    if ma_short[i] and ma_short[i-1] and ma_long[i] and ma_long[i-1]:
                        if ma_short[i-1] <= ma_long[i-1] and ma_short[i] > ma_long[i] and position == 0:
                            # 买入
                            quantity = int(cash / closes[i])
                            if quantity > 0:
                                cash -= quantity * closes[i]
                                position = quantity
                        elif ma_short[i-1] >= ma_long[i-1] and ma_short[i] < ma_long[i] and position > 0:
                            # 卖出
                            revenue = position * closes[i]
                            profit = revenue - (cash + position * closes[i-1] - 100000)
                            cash += revenue
                            total_profit += profit
                            if profit > 0:
                                wins += 1
                            else:
                                losses += 1
                            trades_count += 1
                            position = 0
                
                final_capital = cash + (position * closes[-1] if position > 0 else 0)
                total_return = ((final_capital - 100000) / 100000) * 100
                win_rate = (wins / trades_count * 100) if trades_count > 0 else 0
                
                results.append({
                    'params': f'MA{short_period}/MA{long_period}',
                    'short_period': short_period,
                    'long_period': long_period,
                    'total_return': round(total_return, 2),
                    'win_rate': round(win_rate, 1),
                    'trade_count': trades_count,
                    'final_capital': round(final_capital, 2)
                })
    
    elif strategy == 'rsi':
        # 优化RSI阈值
        for oversold in [20, 25, 30]:
            for overbought in [70, 75, 80]:
                if oversold >= overbought:
                    continue
                
                # 简化的RSI回测
                trades_count = 0
                wins = 0
                losses = 0
                position = 0
                cash = 100000
                
                for i in range(14, len(prices)):
                    gains = []
                    losses_list = []
                    for j in range(i-13, i+1):
                        diff = closes[j] - closes[j-1]
                        gains.append(max(0, diff))
                        losses_list.append(max(0, -diff))
                    
                    avg_gain = sum(gains) / 14
                    avg_loss = sum(losses_list) / 14
                    
                    if avg_loss == 0:
                        rsi = 100
                    else:
                        rs = avg_gain / avg_loss
                        rsi = 100 - (100 / (1 + rs))
                    
                    if rsi < oversold and position == 0:
                        quantity = int(cash / closes[i])
                        if quantity > 0:
                            cash -= quantity * closes[i]
                            position = quantity
                    elif rsi > overbought and position > 0:
                        revenue = position * closes[i]
                        profit = revenue - (cash + position * closes[i-1] - 100000)
                        cash += revenue
                        if profit > 0:
                            wins += 1
                        else:
                            losses += 1
                        trades_count += 1
                        position = 0
                
                final_capital = cash + (position * closes[-1] if position > 0 else 0)
                total_return = ((final_capital - 100000) / 100000) * 100
                win_rate = (wins / trades_count * 100) if trades_count > 0 else 0
                
                results.append({
                    'params': f'RSI<{oversold}/>{overbought}',
                    'oversold': oversold,
                    'overbought': overbought,
                    'total_return': round(total_return, 2),
                    'win_rate': round(win_rate, 1),
                    'trade_count': trades_count,
                    'final_capital': round(final_capital, 2)
                })
    
    # 按收益率排序
    results.sort(key=lambda x: x['total_return'], reverse=True)
    
    return jsonify({
        'best_params': results[0] if results else None,
        'all_results': results[:20]  # 返回前20个结果
    })

# ==================== 智能选股器 ====================

@advanced_bp.route('/screener', methods=['POST'])
def screen_stocks():
    """智能选股 - 根据条件筛选股票"""
    data = request.json
    
    # 获取筛选条件
    min_price = data.get('min_price', 0)
    max_price = data.get('max_price', 1000)
    min_change = data.get('min_change', -100)
    max_change = data.get('max_change', 100)
    min_volume = data.get('min_volume', 0)
    trend = data.get('trend', 'all')  # 'all', 'up', 'down'
    
    try:
        # 获取所有股票的最新价格数据
        latest_prices = db.session.query(
            StockPrice.stock_id,
            StockPrice.close_price,
            StockPrice.volume,
            StockPrice.date
        ).filter(
            StockPrice.date == db.session.query(db.func.max(StockPrice.date)).scalar_subquery()
        ).all()
        
        if not latest_prices:
            return jsonify({
                'success': False,
                'error': '没有可用的价格数据',
                'results': [],
                'count': 0
            })
        
        # 筛选符合条件的股票
        filtered_stocks = []
        for price_record in latest_prices:
            stock = Stock.query.get(price_record.stock_id)
            if not stock:
                continue
            
            current_price = price_record.close_price
            volume = price_record.volume or 0
            
            # 价格筛选
            if current_price < min_price or current_price > max_price:
                continue
            
            # 成交量筛选
            if volume < min_volume:
                continue
            
            # 计算30日涨跌幅
            thirty_days_ago = price_record.date - timedelta(days=30)
            old_price = StockPrice.query.filter(
                StockPrice.stock_id == stock.id,
                StockPrice.date <= thirty_days_ago
            ).order_by(StockPrice.date.desc()).first()
            
            change_30d = 0
            if old_price and old_price.close_price > 0:
                change_30d = ((current_price - old_price.close_price) / old_price.close_price) * 100
            
            # 涨跌幅筛选
            if change_30d < min_change or change_30d > max_change:
                continue
            
            # 趋势方向筛选
            if trend == 'up' and change_30d <= 0:
                continue
            if trend == 'down' and change_30d >= 0:
                continue
            
            # 计算平均成交量（最近30天）
            recent_prices = StockPrice.query.filter(
                StockPrice.stock_id == stock.id,
                StockPrice.date >= thirty_days_ago
            ).all()
            
            avg_volume = 0
            if recent_prices:
                volumes = [p.volume for p in recent_prices if p.volume]
                avg_volume = sum(volumes) / len(volumes) if volumes else 0
            
            filtered_stocks.append({
                'stock_id': stock.id,
                'stock_code': stock.code,
                'stock_name': stock.name,
                'current_price': current_price,
                'change_30d': round(change_30d, 2),
                'avg_volume': round(avg_volume, 0),
                'volume': volume
            })
        
        # 按30日涨跌幅排序
        filtered_stocks.sort(key=lambda x: x['change_30d'], reverse=True)
        
        return jsonify({
            'success': True,
            'results': filtered_stocks,
            'count': len(filtered_stocks),
            'filters': {
                'price_range': f'{min_price}-{max_price}',
                'change_range': f'{min_change}%-{max_change}%',
                'min_volume': min_volume,
                'trend': trend
            }
        })
        
    except Exception as e:
        print(f"智能选股失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'results': [],
            'count': 0
        }), 500

# ==================== 对比分析 ====================

@advanced_bp.route('/compare', methods=['POST'])
def compare_stocks():
    """对比多只股票"""
    try:
        data = request.json
        stock_ids = data.get('stock_ids', [])
        
        if not stock_ids or len(stock_ids) < 2:
            return jsonify({'error': '请至少选择2只股票'}), 400
        
        if len(stock_ids) > 5:
            return jsonify({'error': '最多对比5只股票'}), 400
        
        stocks_data = []
        
        for stock_id in stock_ids:
            stock = Stock.query.get(stock_id)
            if not stock:
                continue
            
            # 获取近30天的价格数据
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            prices = StockPrice.query.filter(
                StockPrice.stock_id == stock_id,
                StockPrice.date >= thirty_days_ago
            ).order_by(StockPrice.date.asc()).all()
            
            if not prices:
                continue
            
            # 计算指标
            current_price = prices[-1].close_price
            first_price = prices[0].close_price
            change_30d = ((current_price - first_price) / first_price) * 100
            
            volumes = [p.volume for p in prices if p.volume]
            avg_volume = sum(volumes) / len(volumes) if volumes else 0
            
            prices_list = [p.close_price for p in prices]
            max_price = max(prices_list)
            min_price = min(prices_list)
            
            # 计算波动率
            if len(prices_list) > 1:
                returns = [(prices_list[i] - prices_list[i-1]) / prices_list[i-1] 
                          for i in range(1, len(prices_list))]
                avg_return = sum(returns) / len(returns)
                variance = sum((r - avg_return) ** 2 for r in returns) / len(returns)
                volatility = (variance ** 0.5) * 100  # 转换为百分比
            else:
                volatility = 0
            
            stocks_data.append({
                'stock_id': stock.id,
                'stock_code': stock.code,
                'stock_name': stock.name,
                'market': stock.market,
                'current_price': current_price,
                'change_30d': change_30d,
                'avg_volume': avg_volume,
                'volatility': volatility,
                'max_price': max_price,
                'min_price': min_price,
                'data_points': len(prices)
            })
        
        return jsonify({
            'stocks': stocks_data,
            'count': len(stocks_data)
        })
        
    except Exception as e:
        print(f"对比分析失败: {str(e)}")
        return jsonify({'error': f'对比失败: {str(e)}'}), 500

# ==================== 财务预报 ====================

@advanced_bp.route('/forecast/<int:stock_id>', methods=['GET'])
def get_financial_forecast(stock_id):
    """获取财务报表分析数据 - 从网络API获取真实财务数据"""
    try:
        from app.services.financial_api import get_financial_reports
        
        stock = Stock.query.get_or_404(stock_id)
        
        # 从东方财富获取真实财务报表数据
        print(f"正在获取 {stock.code} 的财务报表数据...")
        financial_data = get_financial_reports(stock.code)
        
        if not financial_data or len(financial_data) == 0:
            return jsonify({'error': '暂无财务数据'}), 404
        
        # 获取最新一期财报
        latest_report = financial_data[0]
        
        # 解析关键财务指标
        result = {
            'stock_id': stock.id,
            'stock_code': stock.code,
            'stock_name': stock.name,
            'report_date': latest_report.get('REPORT_DATE', ''),
            
            # 盈利能力
            'roe': latest_report.get('ROE', 0),
            'roa': latest_report.get('ROA', 0),
            'gross_profit_margin': latest_report.get('GROSS_PROFIT_MARGIN', 0),
            'net_profit_margin': latest_report.get('NET_PROFIT_MARGIN', 0),
            
            # 成长能力
            'revenue': latest_report.get('TOTAL_REVENUE_TTM', 0),
            'net_profit': latest_report.get('PARENT_NETPROFIT_TTM', 0),
            'revenue_yoy': latest_report.get('TOTAL_REVENUE_YOY', 0),
            'profit_yoy': latest_report.get('PARENT_NETPROFIT_YOY', 0),
            
            # 偿债能力
            'debt_ratio': latest_report.get('ASSET_LIABILITY_RATIO', 0),
            'current_ratio': latest_report.get('CURRENT_RATIO', 0),
            'quick_ratio': latest_report.get('QUICK_RATIO', 0),
            
            # 营运能力
            'inventory_turnover': latest_report.get('INVENTORY_TURNOVER', 0),
            'receivables_turnover': latest_report.get('AR_TURNOVER', 0),
            'total_asset_turnover': latest_report.get('TOTAL_ASSET_TURNOVER', 0),
            
            # 每股指标
            'eps': latest_report.get('EPS', 0),
            'bps': latest_report.get('BPS', 0),
            
            # 现金流
            'operating_cash_flow': latest_report.get('OPERATE_CASH_FLOW', 0),
        }
        
        # 财务健康评分
        score = 0
        
        if result['roe'] > 15: score += 25
        elif result['roe'] > 10: score += 15
        elif result['roe'] > 5: score += 5
        
        if result['gross_profit_margin'] > 30: score += 25
        elif result['gross_profit_margin'] > 20: score += 15
        elif result['gross_profit_margin'] > 10: score += 5
        
        if result['debt_ratio'] < 40: score += 25
        elif result['debt_ratio'] < 60: score += 15
        elif result['debt_ratio'] < 70: score += 5
        
        if result['revenue_yoy'] > 20: score += 25
        elif result['revenue_yoy'] > 10: score += 15
        elif result['revenue_yoy'] > 0: score += 5
        
        result['financial_score'] = score
        
        if score >= 80:
            result['rating'] = '优秀'
            result['rating_color'] = '#52c41a'
        elif score >= 60:
            result['rating'] = '良好'
            result['rating_color'] = '#1890ff'
        elif score >= 40:
            result['rating'] = '一般'
            result['rating_color'] = '#faad14'
        else:
            result['rating'] = '较差'
            result['rating_color'] = '#f5222d'
        
        print(f"✅ 成功获取财务数据")
        return jsonify(result)
        
    except Exception as e:
        print(f"获取财务预报失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'获取数据失败: {str(e)}'}), 500
