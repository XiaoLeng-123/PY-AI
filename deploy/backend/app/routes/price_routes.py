"""
价格数据管理路由蓝图
"""
from flask import Blueprint, request, jsonify
from app.models.models import db, Stock, StockPrice
from app.services.financial_api import get_stock_history_kline
import datetime

price_bp = Blueprint('prices', __name__, url_prefix='/api/stocks')


@price_bp.route('/<int:stock_id>/prices', methods=['GET'])
def get_stock_prices(stock_id):
    """获取股票历史价格数据（支持日K/周K/月K）"""
    stock = Stock.query.get_or_404(stock_id)
    
    # 可选的日期范围参数
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    days = request.args.get('days', type=int)  # 最近N天
    period = request.args.get('period', 'day')  # day/week/month
    
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
    
    # 如果是日K，直接返回
    if period == 'day':
        return jsonify([{
            'id': price.id,
            'date': price.date.isoformat(),
            'open': price.open_price,
            'high': price.high_price,
            'low': price.low_price,
            'close': price.close_price,
            'volume': price.volume
        } for price in prices])
    
    # 周K或月K需要聚合
    # 先按时间正序排列
    prices_sorted = sorted(prices, key=lambda p: p.date)
    
    # 聚合函数
    def aggregate_prices(prices_list, period_type):
        """将日线数据聚合为周线或月线"""
        if not prices_list:
            return []
        
        aggregated = {}
        
        for price in prices_list:
            if period_type == 'week':
                # 使用ISO日历的年和周
                iso_cal = price.date.isocalendar()
                key = f"{iso_cal[0]}-W{iso_cal[1]:02d}"
                # 记录该周的周一作为日期
                week_start = price.date - datetime.timedelta(days=price.date.weekday())
            else:  # month
                key = price.date.strftime('%Y-%m')
                week_start = price.date.replace(day=1)
            
            if key not in aggregated:
                aggregated[key] = {
                    'date': week_start,
                    'open': price.open_price,
                    'high': price.high_price,
                    'low': price.low_price,
                    'close': price.close_price,
                    'volume': price.volume
                }
            else:
                # 更新最高价和最低价
                aggregated[key]['high'] = max(aggregated[key]['high'], price.high_price)
                aggregated[key]['low'] = min(aggregated[key]['low'], price.low_price)
                # 收盘价更新为最后一个交易日的收盘价
                aggregated[key]['close'] = price.close_price
                # 累加成交量
                aggregated[key]['volume'] += price.volume
        
        # 转换为列表并按日期排序
        result = list(aggregated.values())
        result.sort(key=lambda x: x['date'])
        
        return [{
            'id': None,
            'date': item['date'].isoformat(),
            'open': round(item['open'], 2),
            'high': round(item['high'], 2),
            'low': round(item['low'], 2),
            'close': round(item['close'], 2),
            'volume': item['volume']
        } for item in result]
    
    aggregated_prices = aggregate_prices(prices_sorted, period)
    return jsonify(aggregated_prices)


@price_bp.route('/<int:stock_id>/prices', methods=['POST'])
def add_stock_price(stock_id):
    """添加股票价格数据(单条)"""
    print(f"\n=== 添加价格数据请求 ===")
    print(f"stock_id: {stock_id}")
    print(f"request.json: {request.json}")
    
    stock = Stock.query.get_or_404(stock_id)
    data = request.json
    
    try:
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


@price_bp.route('/<int:stock_id>/prices/batch', methods=['POST'])
def batch_add_stock_prices(stock_id):
    """批量添加股票价格数据"""
    stock = Stock.query.get_or_404(stock_id)
    data = request.json
    
    prices_added = 0
    errors = []
    
    for item in data.get('prices', []):
        try:
            date_obj = datetime.datetime.strptime(item['date'], '%Y-%m-%d').date()
            
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


@price_bp.route('/<int:stock_id>/prices/fetch_history', methods=['POST'])
def fetch_history_prices(stock_id):
    """从网络获取股票历史K线数据并保存到数据库"""
    stock = Stock.query.get_or_404(stock_id)
    data = request.json
    
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not start_date or not end_date:
        return jsonify({'error': '请提供开始日期和结束日期'}), 400
    
    try:
        # 从东方财富API获取历史K线数据
        kline_data = get_stock_history_kline(stock.code, start_date, end_date)
        
        if not kline_data:
            return jsonify({'error': '未能从网络获取到数据'}), 404
        
        # 保存到数据库
        prices_added = 0
        prices_skipped = 0
        errors = []
        
        for kline in kline_data:
            try:
                date_obj = datetime.datetime.strptime(kline['date'], '%Y-%m-%d').date()
                
                # 检查是否已存在
                existing = StockPrice.query.filter_by(
                    stock_id=stock_id,
                    date=date_obj
                ).first()
                
                if existing:
                    prices_skipped += 1
                    continue
                
                # 创建新的价格记录
                price = StockPrice(
                    stock_id=stock_id,
                    date=date_obj,
                    open_price=float(kline['open']),
                    high_price=float(kline['high']),
                    low_price=float(kline['low']),
                    close_price=float(kline['close']),
                    volume=int(kline['volume'])
                )
                
                db.session.add(price)
                prices_added += 1
                
            except Exception as e:
                errors.append(f"处理日期 {kline.get('date', '未知')} 时出错: {str(e)}")
        
        db.session.commit()
        
        print(f"股票 {stock.code} 历史数据获取完成: 新增 {prices_added} 条，跳过 {prices_skipped} 条")
        
        return jsonify({
            'success': True,
            'added': prices_added,
            'skipped': prices_skipped,
            'total': len(kline_data),
            'message': f'成功获取 {prices_added} 条数据，{prices_skipped} 条已存在'
        })
        
    except Exception as e:
        print(f"获取历史数据失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'获取失败: {str(e)}'}), 500


@price_bp.route('/<int:stock_id>/indicators', methods=['GET'])
def get_indicators(stock_id):
    """计算并返回股票的技术指标（数组格式适配图表，支持日K/周K/月K）"""
    stock = Stock.query.get_or_404(stock_id)
    
    # 获取参数，与价格数据接口保持一致
    days = request.args.get('days', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    period = request.args.get('period', 'day')  # day/week/month
    
    # 构建查询 - 与get_stock_prices完全一致的过滤条件
    query = StockPrice.query.filter_by(stock_id=stock_id)
    
    if start_date:
        query = query.filter(StockPrice.date >= datetime.datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(StockPrice.date <= datetime.datetime.strptime(end_date, '%Y-%m-%d').date())
    
    # 获取足够的数据用于计算指标（至少需要 60 天来计算 MA60）
    if days:
        # 先获取更多数据用于计算
        all_prices = query.order_by(StockPrice.date.desc()).limit(days + 60).all()
    else:
        all_prices = query.order_by(StockPrice.date.desc()).all()
    
    if len(all_prices) < 20:
        return jsonify({'error': '没有足够的数据计算技术指标'}), 404
    
    # 按时间正序排列（用于计算）
    all_prices_sorted = sorted(all_prices, key=lambda p: p.date)
    
    # 如果是周K或月K，先进行数据聚合
    if period != 'day':
        def aggregate_for_indicators(prices_list, period_type):
            """为指标计算聚合数据"""
            if not prices_list:
                return []
            
            aggregated = {}
            
            for price in prices_list:
                if period_type == 'week':
                    iso_cal = price.date.isocalendar()
                    key = f"{iso_cal[0]}-W{iso_cal[1]:02d}"
                    week_start = price.date - datetime.timedelta(days=price.date.weekday())
                else:  # month
                    key = price.date.strftime('%Y-%m')
                    week_start = price.date.replace(day=1)
                
                if key not in aggregated:
                    aggregated[key] = {
                        'date': week_start,
                        'open': price.open_price,
                        'high': price.high_price,
                        'low': price.low_price,
                        'close': price.close_price,
                        'volume': price.volume
                    }
                else:
                    aggregated[key]['high'] = max(aggregated[key]['high'], price.high_price)
                    aggregated[key]['low'] = min(aggregated[key]['low'], price.low_price)
                    aggregated[key]['close'] = price.close_price
                    aggregated[key]['volume'] += price.volume
            
            result = list(aggregated.values())
            result.sort(key=lambda x: x['date'])
            return result
        
        all_prices_sorted = aggregate_for_indicators(all_prices_sorted, period)
    
    # 确定最终要显示的日期范围（与get_stock_prices返回的一致）
    if days:
        # get_stock_prices返回的是最近N天的数据（DESC取前N条）
        # 我们需要找出这N天对应的数据
        display_prices = sorted(all_prices, key=lambda p: p.date, reverse=True)[:days]
        
        # 如果是周K/月K，也需要聚合显示数据
        if period != 'day':
            display_prices = aggregate_for_indicators(display_prices, period)
        else:
            display_prices = sorted(display_prices, key=lambda p: p.date)  # 转为ASC
        
        # 转换为ISO格式字符串以匹配前端（兼容StockPrice对象和字典）
        def get_date_str(p):
            if isinstance(p, dict):
                return p['date'].isoformat() if isinstance(p['date'], datetime.date) else p['date']
            else:  # StockPrice object
                return p.date.isoformat()
        
        display_dates = set(get_date_str(p) for p in display_prices)
        print(f'🔍 get_indicators debug: period={period}, all_prices={len(all_prices_sorted)}, display_prices={len(display_prices)}, days={days}')
        print(f'   display_dates sample: {list(display_dates)[:5]}')
    else:
        def get_date_str(p):
            if isinstance(p, dict):
                return p['date'].isoformat() if isinstance(p['date'], datetime.date) else p['date']
            else:  # StockPrice object
                return p.date.isoformat()
        
        display_dates = set(get_date_str(p) for p in all_prices_sorted)
    
    closes = [p['close'] if isinstance(p, dict) else p.close_price for p in all_prices_sorted]
    all_dates = [p['date'].isoformat() if isinstance(p, dict) and isinstance(p['date'], datetime.date) else (p['date'] if isinstance(p, dict) else p.date.isoformat()) for p in all_prices_sorted]
    
    # 计算移动平均线数组
    def calc_ma_array(data, period):
        result = []
        for i in range(len(data)):
            if i < period - 1:
                result.append(None)
            else:
                result.append(round(sum(data[i-period+1:i+1]) / period, 2))
        return result
    
    # 计算RSI数组
    def calc_rsi_array(data, period=14):
        result = []
        gains = []
        losses = []
        for i in range(1, len(data)):
            diff = data[i] - data[i-1]
            gains.append(max(0, diff))
            losses.append(max(0, -diff))
            
            if len(gains) < period:
                result.append(None)
            else:
                avg_gain = sum(gains[-period:]) / period
                avg_loss = sum(losses[-period:]) / period
                if avg_loss == 0:
                    result.append(100)
                else:
                    rs = avg_gain / avg_loss
                    result.append(round(100 - (100 / (1 + rs)), 2))
        result.insert(0, None)
        return result
    
    # 计算MACD数组
    def calc_macd_array(data):
        def ema(arr, period):
            result = []
            multiplier = 2 / (period + 1)
            result.append(sum(arr[:period]) / period)
            for i in range(period, len(arr)):
                result.append((arr[i] - result[-1]) * multiplier + result[-1])
            return result
        
        ema12 = ema(data, 12)
        ema26 = ema(data, 26)
        
        diff_len = len(ema12) - len(ema26)
        macd_line = [ema12[i+diff_len] - ema26[i] for i in range(len(ema26))]
        
        if len(macd_line) >= 9:
            signal = ema(macd_line, 9)
            sig_len = len(signal)
            signal_line = [None] * (len(macd_line) - sig_len) + signal
            histogram = [round(macd_line[i] - signal_line[i], 2) if signal_line[i] is not None else None for i in range(len(macd_line))]
        else:
            signal_line = [None] * len(macd_line)
            histogram = [None] * len(macd_line)
        
        prefix_none = [None] * (len(data) - len(macd_line))
        return {
            'macd_line': prefix_none + macd_line,
            'signal_line': prefix_none + signal_line,
            'histogram': prefix_none + histogram
        }
    
    # 计算KDJ数组
    def calc_kdj_array(highs, lows, closes, n=9, m1=3, m2=3):
        rsv_list = []
        k_values = []
        d_values = []
        j_values = []
        
        for i in range(len(closes)):
            if i < n - 1:
                rsv_list.append(None)
                k_values.append(None)
                d_values.append(None)
                j_values.append(None)
            else:
                llv = min(lows[i-n+1:i+1])
                hhv = max(highs[i-n+1:i+1])
                if hhv == llv:
                    rsv = 50
                else:
                    rsv = (closes[i] - llv) / (hhv - llv) * 100
                rsv_list.append(rsv)
                
                if i == n - 1:
                    k = 50
                    d = 50
                else:
                    prev_k = k_values[i-1] if k_values[i-1] is not None else 50
                    prev_d = d_values[i-1] if d_values[i-1] is not None else 50
                    k = (m1 - 1) / m1 * prev_k + 1 / m1 * rsv
                    d = (m2 - 1) / m2 * prev_d + 1 / m2 * k
                
                j = 3 * k - 2 * d
                k_values.append(round(k, 2))
                d_values.append(round(d, 2))
                j_values.append(round(j, 2))
        
        return {
            'k': k_values,
            'd': d_values,
            'j': j_values
        }
    
    # 计算BOLL布林带
    def calc_boll_array(data, period=20, std_dev=2):
        middle = []
        upper = []
        lower = []
        
        for i in range(len(data)):
            if i < period - 1:
                middle.append(None)
                upper.append(None)
                lower.append(None)
            else:
                window = data[i-period+1:i+1]
                ma = sum(window) / period
                variance = sum([(x - ma) ** 2 for x in window]) / period
                std = variance ** 0.5
                
                middle.append(round(ma, 2))
                upper.append(round(ma + std_dev * std, 2))
                lower.append(round(ma - std_dev * std, 2))
        
        return {
            'middle': middle,
            'upper': upper,
            'lower': lower
        }
    
    # 计算EMA数组
    def calc_ema_array(data, period):
        result = []
        multiplier = 2 / (period + 1)
        
        for i in range(len(data)):
            if i < period - 1:
                result.append(None)
            elif i == period - 1:
                result.append(round(sum(data[:period]) / period, 2))
            else:
                ema_val = (data[i] - result[-1]) * multiplier + result[-1]
                result.append(round(ema_val, 2))
        
        return result
    
    # 计算所有指标（基于完整数据集）
    full_ma5 = calc_ma_array(closes, 5)
    full_ma10 = calc_ma_array(closes, 10)
    full_ma20 = calc_ma_array(closes, 20)
    full_ma60 = calc_ma_array(closes, 60)
    full_rsi = calc_rsi_array(closes)
    full_macd = calc_macd_array(closes)
    
    # 提取高低价用于KDJ
    highs = [p['high'] if isinstance(p, dict) else p.high_price for p in all_prices_sorted]
    lows = [p['low'] if isinstance(p, dict) else p.low_price for p in all_prices_sorted]
    full_kdj = calc_kdj_array(highs, lows, closes)
    
    # BOLL布林带
    full_boll = calc_boll_array(closes)
    
    # EMA指数移动平均
    full_ema12 = calc_ema_array(closes, 12)
    full_ema26 = calc_ema_array(closes, 26)
    
    # 成交量均线
    volumes = [p['volume'] if isinstance(p, dict) else p.volume for p in all_prices_sorted]
    full_vol_ma5 = calc_ma_array(volumes, 5)
    full_vol_ma10 = calc_ma_array(volumes, 10)
    
    # 只提取display_dates对应的指标值
    ma5 = []
    ma10 = []
    ma20 = []
    ma60 = []
    rsi = []
    macd_line = []
    macd_signal = []
    macd_hist = []
    kdj_k = []
    kdj_d = []
    kdj_j = []
    boll_upper = []
    boll_middle = []
    boll_lower = []
    ema12 = []
    ema26 = []
    vol_ma5 = []
    vol_ma10 = []
    
    for i, date in enumerate(all_dates):
        if date in display_dates:
            ma5.append(full_ma5[i])
            ma10.append(full_ma10[i])
            ma20.append(full_ma20[i])
            ma60.append(full_ma60[i])
            rsi.append(full_rsi[i])
            macd_line.append(full_macd['macd_line'][i])
            macd_signal.append(full_macd['signal_line'][i])
            macd_hist.append(full_macd['histogram'][i])
            kdj_k.append(full_kdj['k'][i])
            kdj_d.append(full_kdj['d'][i])
            kdj_j.append(full_kdj['j'][i])
            boll_upper.append(full_boll['upper'][i])
            boll_middle.append(full_boll['middle'][i])
            boll_lower.append(full_boll['lower'][i])
            ema12.append(full_ema12[i])
            ema26.append(full_ema26[i])
            vol_ma5.append(full_vol_ma5[i])
            vol_ma10.append(full_vol_ma10[i])
    
    indicators = {
        'ma5': ma5,
        'ma10': ma10,
        'ma20': ma20,
        'ma60': ma60,
        'rsi': rsi,
        'macd': {
            'macd_line': macd_line,
            'signal_line': macd_signal,
            'histogram': macd_hist
        },
        'kdj': {
            'k': kdj_k,
            'd': kdj_d,
            'j': kdj_j
        },
        'boll': {
            'upper': boll_upper,
            'middle': boll_middle,
            'lower': boll_lower
        },
        'ema12': ema12,
        'ema26': ema26,
        'vol_ma5': vol_ma5,
        'vol_ma10': vol_ma10
    }
    
    print(f'📊 Indicators: total={len(all_prices_sorted)}, display={len(ma5)}, days={days}')
    print(f'   MA5: {ma5[:5]}')
    print(f'   MA60: {ma60[:5]}')
    
    return jsonify(indicators)


@price_bp.route('/batch_fetch_history', methods=['POST'])
def batch_fetch_history_prices():
    """批量获取多只股票的历史K线数据"""
    data = request.json
    stock_ids = data.get('stock_ids', [])
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not stock_ids or not start_date or not end_date:
        return jsonify({'error': '请提供股票ID列表、开始日期和结束日期'}), 400
    
    try:
        total_added = 0
        total_skipped = 0
        total_errors = 0
        stock_results = []
        
        for stock_id in stock_ids:
            stock = Stock.query.get(stock_id)
            if not stock:
                stock_results.append({
                    'stock_id': stock_id,
                    'success': False,
                    'message': '股票不存在'
                })
                total_errors += 1
                continue
            
            try:
                # 从东方财富API获取历史K线数据
                kline_data = get_stock_history_kline(stock.code, start_date, end_date)
                
                if not kline_data:
                    stock_results.append({
                        'stock_id': stock_id,
                        'stock_code': stock.code,
                        'success': False,
                        'message': '未能获取到数据'
                    })
                    total_errors += 1
                    continue
                
                # 保存到数据库
                prices_added = 0
                prices_skipped = 0
                
                for kline in kline_data:
                    try:
                        date_obj = datetime.datetime.strptime(kline['date'], '%Y-%m-%d').date()
                        
                        existing = StockPrice.query.filter_by(
                            stock_id=stock_id,
                            date=date_obj
                        ).first()
                        
                        if existing:
                            prices_skipped += 1
                            continue
                        
                        price = StockPrice(
                            stock_id=stock_id,
                            date=date_obj,
                            open_price=float(kline['open']),
                            high_price=float(kline['high']),
                            low_price=float(kline['low']),
                            close_price=float(kline['close']),
                            volume=int(kline['volume'])
                        )
                        
                        db.session.add(price)
                        prices_added += 1
                        
                    except Exception as e:
                        print(f"处理 {stock.code} {kline.get('date')} 时出错: {e}")
                
                db.session.commit()
                
                total_added += prices_added
                total_skipped += prices_skipped
                
                stock_results.append({
                    'stock_id': stock_id,
                    'stock_code': stock.code,
                    'stock_name': stock.name,
                    'success': True,
                    'added': prices_added,
                    'skipped': prices_skipped,
                    'total': len(kline_data)
                })
                
                print(f"{stock.code} {stock.name}: 新增 {prices_added} 条，跳过 {prices_skipped} 条")
                
            except Exception as e:
                print(f"获取 {stock.code} 历史数据失败: {e}")
                stock_results.append({
                    'stock_id': stock_id,
                    'stock_code': stock.code,
                    'success': False,
                    'message': str(e)
                })
                total_errors += 1
        
        return jsonify({
            'success': True,
            'total_added': total_added,
            'total_skipped': total_skipped,
            'total_errors': total_errors,
            'stock_results': stock_results,
            'message': f'批量获取完成：新增 {total_added} 条，跳过 {total_skipped} 条，失败 {total_errors} 只股票'
        })
        
    except Exception as e:
        print(f"批量获取历史数据失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'批量获取失败: {str(e)}'}), 500