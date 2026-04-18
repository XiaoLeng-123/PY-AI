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


@stats_bp.route('/stock/<int:stock_id>', methods=['GET'])
def get_stock_stats(stock_id):
    """获取单个股票的统计信息"""
    try:
        stock = Stock.query.get_or_404(stock_id)
        
        # 获取该股票的价格记录数
        record_count = StockPrice.query.filter_by(stock_id=stock_id).count()
        
        # 获取最早和最晚的日期
        first_record = StockPrice.query.filter_by(
            stock_id=stock_id
        ).order_by(StockPrice.date.asc()).first()
        
        last_record = StockPrice.query.filter_by(
            stock_id=stock_id
        ).order_by(StockPrice.date.desc()).first()
        
        # 计算涨跌幅
        price_change = None
        price_change_percent = None
        if first_record and last_record:
            price_change = last_record.close_price - first_record.close_price
            price_change_percent = (price_change / first_record.close_price * 100) if first_record.close_price > 0 else 0
        
        # 获取最新价格
        latest_price = None
        if last_record:
            latest_price = {
                'date': last_record.date.isoformat(),
                'open': last_record.open_price,
                'high': last_record.high_price,
                'low': last_record.low_price,
                'close': last_record.close_price,
                'volume': last_record.volume
            }
        
        return jsonify({
            'stock': {
                'id': stock.id,
                'code': stock.code,
                'name': stock.name,
                'market': stock.market
            },
            'stats': {
                'record_count': record_count,
                'first_date': first_record.date.isoformat() if first_record else None,
                'last_date': last_record.date.isoformat() if last_record else None,
                'price_change': round(price_change, 2) if price_change else None,
                'price_change_percent': round(price_change_percent, 2) if price_change_percent else None,
                'latest_price': latest_price
            }
        })
        
    except Exception as e:
        print(f"获取股票统计失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'获取股票统计失败: {str(e)}'}), 500
