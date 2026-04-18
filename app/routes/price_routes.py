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
    """获取股票历史价格数据"""
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
    """计算并返回股票的技术指标（数组格式适配图表）"""
    stock = Stock.query.get_or_404(stock_id)
    
    # 获取参数，与价格数据接口保持一致
    days = request.args.get('days', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
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
    
    # 确定最终要显示的日期范围（与get_stock_prices返回的一致）
    if days:
        # get_stock_prices返回的是最近N天的数据（DESC取前N条）
        # 我们需要找出这N天对应的数据
        display_prices = sorted(all_prices, key=lambda p: p.date, reverse=True)[:days]
        display_prices = sorted(display_prices, key=lambda p: p.date)  # 转为ASC
        # 转换为ISO格式字符串以匹配前端
        display_dates = set(p.date.isoformat() for p in display_prices)
        print(f'🔍 get_indicators debug: all_prices={len(all_prices)}, display_prices={len(display_prices)}, days={days}')
        print(f'   display_dates sample: {list(display_dates)[:5]}')
    else:
        display_dates = set(p.date.isoformat() for p in all_prices_sorted)
    
    closes = [p.close_price for p in all_prices_sorted]
    all_dates = [p.date.isoformat() for p in all_prices_sorted]
    
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
    
    # 计算所有指标（基于完整数据集）
    full_ma5 = calc_ma_array(closes, 5)
    full_ma10 = calc_ma_array(closes, 10)
    full_ma20 = calc_ma_array(closes, 20)
    full_ma60 = calc_ma_array(closes, 60)
    full_rsi = calc_rsi_array(closes)
    full_macd = calc_macd_array(closes)
    
    # 只提取display_dates对应的指标值
    ma5 = []
    ma10 = []
    ma20 = []
    ma60 = []
    rsi = []
    macd_line = []
    macd_signal = []
    macd_hist = []
    
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
        }
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