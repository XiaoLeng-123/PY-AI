"""
统计数据路由蓝图
提供数据概览、统计分析等接口
"""
from flask import Blueprint, jsonify
from app.models.models import db, Stock, StockPrice, Portfolio, Watchlist, StockAlert
from sqlalchemy import func
from datetime import date

stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')


@stats_bp.route('/dashboard', methods=['GET'])
def get_dashboard_stats():
    """获取数据概览统计信息"""
    try:
        # 股票总数
        total_stocks = Stock.query.count()
        
        # 数据记录总数
        total_records = StockPrice.query.count()
        
        # 活跃股票数（有价格数据的股票）
        active_stocks = db.session.query(StockPrice.stock_id).distinct().count()
        
        # 最新数据日期
        latest_price = StockPrice.query.order_by(StockPrice.date.desc()).first()
        latest_date = latest_price.date.isoformat() if latest_price else None
        
        # 持仓总数
        portfolio_count = Portfolio.query.count()
        
        # 自选股总数
        watchlist_count = Watchlist.query.count()
        
        # 预警规则数
        alert_count = StockAlert.query.count()
        
        return jsonify({
            'total_stocks': total_stocks,
            'total_records': total_records,
            'active_stocks': active_stocks,
            'latest_date': latest_date,
            'portfolio_count': portfolio_count,
            'watchlist_count': watchlist_count,
            'alert_count': alert_count
        })
        
    except Exception as e:
        print(f"获取统计数据失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'获取统计数据失败: {str(e)}'}), 500


@stats_bp.route('/<int:stock_id>', methods=['GET'])
def get_stock_stats(stock_id):
    """获取单个股票的完整统计信息（专业分析）"""
    try:
        stock = Stock.query.get_or_404(stock_id)
        
        # 获取该股票的所有价格记录（按时间正序）
        prices = StockPrice.query.filter_by(
            stock_id=stock_id
        ).order_by(StockPrice.date.asc()).all()
        
        if not prices or len(prices) < 2:
            return jsonify({'error': '没有足够的数据'}), 404
        
        # 基础数据
        closes = [p.close_price for p in prices]
        highs = [p.high_price for p in prices]
        lows = [p.low_price for p in prices]
        opens = [p.open_price for p in prices]
        
        latest_price = closes[-1]
        
        # 计算累计收益率
        total_return = round((closes[-1] - closes[0]) / closes[0] * 100, 2)
        
        # 计算上涨/下跌天数
        up_days = 0
        down_days = 0
        for i in range(1, len(closes)):
            if closes[i] > closes[i-1]:
                up_days += 1
            elif closes[i] < closes[i-1]:
                down_days += 1
        
        win_rate = round(up_days / (up_days + down_days) * 100, 2) if (up_days + down_days) > 0 else 0
        
        # 计算近5日、近10日收益
        return_5d = round((closes[-1] - closes[-min(6, len(closes))]) / closes[-min(6, len(closes))] * 100, 2) if len(closes) >= 6 else 0
        return_10d = round((closes[-1] - closes[-min(11, len(closes))]) / closes[-min(11, len(closes))] * 100, 2) if len(closes) >= 11 else 0
        
        # 计算最大回撤
        max_drawdown = 0
        peak = closes[0]
        for price in closes:
            if price > peak:
                peak = price
            drawdown = (peak - price) / peak * 100
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        max_drawdown = round(max_drawdown, 2)
        
        # 计算波动率（年化）
        daily_returns = []
        for i in range(1, len(closes)):
            daily_returns.append((closes[i] - closes[i-1]) / closes[i-1])
        
        if daily_returns:
            avg_return = sum(daily_returns) / len(daily_returns)
            variance = sum((r - avg_return) ** 2 for r in daily_returns) / len(daily_returns)
            std_dev = variance ** 0.5
            annualized_volatility = round(std_dev * (252 ** 0.5) * 100, 2)
            
            # 夏普比率（假设无风险利率为3%）
            risk_free_rate = 0.03
            excess_return = avg_return * 252 - risk_free_rate
            sharpe_ratio = round(excess_return / (std_dev * (252 ** 0.5)), 2) if std_dev > 0 else 0
        else:
            annualized_volatility = 0
            sharpe_ratio = 0
        
        # 计算RSI（14日）
        rsi = 50  # 默认值
        if len(closes) >= 15:
            gains = []
            losses = []
            for i in range(-14, 0):
                diff = closes[i] - closes[i-1]
                gains.append(max(0, diff))
                losses.append(max(0, -diff))
            
            avg_gain = sum(gains) / 14
            avg_loss = sum(losses) / 14
            
            if avg_loss == 0:
                rsi = 100
            else:
                rs = avg_gain / avg_loss
                rsi = round(100 - (100 / (1 + rs)), 2)
        
        # 计算均线
        ma5 = round(sum(closes[-5:]) / 5, 2) if len(closes) >= 5 else closes[-1]
        ma10 = round(sum(closes[-10:]) / 10, 2) if len(closes) >= 10 else closes[-1]
        ma20 = round(sum(closes[-20:]) / 20, 2) if len(closes) >= 20 else closes[-1]
        
        # 计算支撑位（最近20日最低价）
        support = round(min(lows[-20:]), 2) if len(lows) >= 20 else round(min(lows), 2)
        
        # 判断趋势（简单版：基于均线排列）
        trend = '震荡'
        if ma5 > ma10 > ma20:
            trend = '多头排列'
        elif ma5 < ma10 < ma20:
            trend = '空头排列'
        
        # ===== 专业量价分析指标 =====
        
        # 1. OBV (能量潮) - 通过成交量累计判断资金流向
        obv = 0
        for i in range(1, len(closes)):
            if closes[i] > closes[i-1]:
                obv += prices[i].volume
            elif closes[i] < closes[i-1]:
                obv -= prices[i].volume
        
        # 2. 成交量比 (Volume Ratio) - 最近5日平均成交量 / 20日平均成交量
        volumes = [p.volume for p in prices]
        vol_5d_avg = sum(volumes[-5:]) / 5 if len(volumes) >= 5 else volumes[-1]
        vol_20d_avg = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else volumes[-1]
        volume_ratio = round(vol_5d_avg / vol_20d_avg, 2) if vol_20d_avg > 0 else 1.0
        
        # 3. VWAP (成交量加权平均价) - 最近20日
        if len(prices) >= 20:
            recent_prices = prices[-20:]
            total_pv = sum(p.close_price * p.volume for p in recent_prices)
            total_v = sum(p.volume for p in recent_prices)
            vwap = round(total_pv / total_v, 2) if total_v > 0 else latest_price
        else:
            vwap = latest_price
        
        # 4. MFI (资金流量指标) 0-100
        mfi = 50
        if len(prices) >= 15:
            typical_prices = []
            money_flows = []
            for i in range(-14, 0):
                tp = (highs[i] + lows[i] + closes[i]) / 3
                typical_prices.append(tp)
                mf = tp * volumes[i]
                money_flows.append(mf)
            
            positive_flow = 0
            negative_flow = 0
            for i in range(1, 14):
                if typical_prices[i] > typical_prices[i-1]:
                    positive_flow += money_flows[i]
                else:
                    negative_flow += money_flows[i]
            
            if negative_flow == 0:
                mfi = 100
            else:
                money_ratio = positive_flow / negative_flow
                mfi = round(100 - (100 / (1 + money_ratio)), 2)
        
        # 5. CMF (柴金资金流量) - 20日
        cmf = 0
        if len(prices) >= 21:
            cmf_sum = 0
            vol_sum = 0
            for i in range(-20, 0):
                if highs[i] != lows[i]:
                    mfm = ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i])
                    cmf_sum += mfm * volumes[i]
                    vol_sum += volumes[i]
            cmf = round(cmf_sum / vol_sum, 3) if vol_sum > 0 else 0
        
        # 6. ATR (平均真实波幅) - 14日
        atr = 0
        if len(prices) >= 15:
            tr_list = []
            for i in range(-14, 0):
                tr1 = highs[i] - lows[i]
                tr2 = abs(highs[i] - closes[i-1]) if i > -len(closes) + 1 else tr1
                tr3 = abs(lows[i] - closes[i-1]) if i > -len(closes) + 1 else tr1
                tr_list.append(max(tr1, tr2, tr3))
            atr = round(sum(tr_list) / 14, 2)
        
        # 7. 换手率估算 (Turnover Rate) - 成交量/流通股本（近似）
        # 由于没有流通股本数据，使用成交量绝对值作为活跃度指标
        avg_volume = round(sum(volumes[-20:]) / min(20, len(volumes)), 0) if len(volumes) > 0 else 0
        
        return jsonify({
            'latest_price': latest_price,
            'total_return': total_return,
            'win_rate': win_rate,
            'trend': trend,
            'return_5d': return_5d,
            'return_10d': return_10d,
            'up_days': up_days,
            'down_days': down_days,
            'max_drawdown': max_drawdown,
            'annualized_volatility': annualized_volatility,
            'sharpe_ratio': sharpe_ratio,
            'rsi': rsi,
            'ma5': ma5,
            'ma10': ma10,
            'ma20': ma20,
            'support': support,
            # 专业量价分析指标
            'obv': obv,
            'volume_ratio': volume_ratio,
            'vwap': vwap,
            'mfi': mfi,
            'cmf': cmf,
            'atr': atr,
            'avg_volume': avg_volume
        })
        
    except Exception as e:
        print(f"获取股票统计失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'获取股票统计失败: {str(e)}'}), 500
