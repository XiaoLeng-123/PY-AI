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
    """获取板块概况"""
    # 按市场分类统计
    markets = db.session.query(Stock.market, db.func.count(Stock.id)).all()
    
    result = {
        'markets': [{'name': m[0], 'count': m[1]} for m in markets],
        'total_stocks': Stock.query.count(),
        'total_records': StockPrice.query.count()
    }
    
    return jsonify(result)

@advanced_bp.route('/sectors/rankings', methods=['GET'])
def get_sector_rankings():
    """获取板块涨跌幅排行"""
    date = request.args.get('date')
    if not date:
        # 获取最新交易日
        latest = StockPrice.query.order_by(StockPrice.date.desc()).first()
        date = latest.date if latest else None
    
    if not date:
        return jsonify([])
    
    # 获取当日所有股票
    prices = StockPrice.query.filter_by(date=date).all()
    
    # 计算涨跌幅
    stocks_with_change = []
    for price in prices:
        prev = StockPrice.query.filter(
            StockPrice.stock_id == price.stock_id,
            StockPrice.date < date
        ).order_by(StockPrice.date.desc()).first()
        
        if prev:
            change_pct = ((price.close_price - prev.close_price) / prev.close_price) * 100
            stocks_with_change.append({
                'stock_id': price.stock_id,
                'code': price.stock.code,
                'name': price.stock.name,
                'market': price.stock.market,
                'close_price': price.close_price,
                'change_pct': round(change_pct, 2)
            })
    
    # 排序
    gainers = sorted(stocks_with_change, key=lambda x: x['change_pct'], reverse=True)[:20]
    losers = sorted(stocks_with_change, key=lambda x: x['change_pct'])[:20]
    
    return jsonify({
        'date': date.isoformat(),
        'gainers': gainers,
        'losers': losers
    })

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
