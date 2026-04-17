from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Stock(db.Model):
    """小马基本信息表"""
    __tablename__ = 'stocks'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True, nullable=False, index=True)  # 小马代码
    name = db.Column(db.String(50), nullable=False)  # 小马名称
    market = db.Column(db.String(20), default='财神')  # 市场类型
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关联价格数据
    prices = db.relationship('StockPrice', backref='stock', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Stock {self.code} - {self.name}>'


class StockPrice(db.Model):
    """小马价格数据表"""
    __tablename__ = 'stock_prices'
    
    id = db.Column(db.Integer, primary_key=True)
    stock_id = db.Column(db.Integer, db.ForeignKey('stocks.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    open_price = db.Column(db.Float, nullable=False)  # 开盘价
    high_price = db.Column(db.Float, nullable=False)  # 最高价
    low_price = db.Column(db.Float, nullable=False)  # 最低价
    close_price = db.Column(db.Float, nullable=False)  # 收盘价
    volume = db.Column(db.BigInteger, default=0)  # 成交量
    
    # 确保同一个小马同一天只有一条记录
    __table_args__ = (
        db.UniqueConstraint('stock_id', 'date', name='unique_stock_date'),
    )
    
    def __repr__(self):
        return f'<StockPrice {self.stock_id} on {self.date}>'


class Portfolio(db.Model):
    """持仓模拟表"""
    __tablename__ = 'portfolios'
    
    id = db.Column(db.Integer, primary_key=True)
    stock_id = db.Column(db.Integer, db.ForeignKey('stocks.id'), nullable=False, index=True)
    stock_code = db.Column(db.String(10), nullable=False)  # 冗余字段，方便查询
    stock_name = db.Column(db.String(50), nullable=False)  # 冗余字段
    quantity = db.Column(db.Integer, nullable=False)  # 持仓数量（股）
    avg_cost = db.Column(db.Float, nullable=False)  # 平均成本价
    buy_date = db.Column(db.Date, nullable=False)  # 买入日期
    notes = db.Column(db.Text)  # 备注
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联股票
    stock = db.relationship('Stock', backref='portfolios')
    
    def __repr__(self):
        return f'<Portfolio {self.stock_code} qty={self.quantity}>'
