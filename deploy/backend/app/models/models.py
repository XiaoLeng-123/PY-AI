from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Stock(db.Model):
    """小马基本信息表"""
    __tablename__ = 'stocks'
    __table_args__ = {
        'mysql_comment': '小马基本信息表 - 存储股票的基础信息',
        'mysql_charset': 'utf8mb4',
        'mysql_collate': 'utf8mb4_unicode_ci'
    }
    
    id = db.Column(db.Integer, primary_key=True, comment='主键ID')
    code = db.Column(db.String(10), unique=True, nullable=False, index=True, comment='股票代码')  # 小马代码
    name = db.Column(db.String(50), nullable=False, comment='股票名称')  # 小马名称
    market = db.Column(db.String(20), default='财神', comment='市场类型')  # 市场类型
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    
    # 关联价格数据
    prices = db.relationship('StockPrice', backref='stock', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Stock {self.code} - {self.name}>'


class StockPrice(db.Model):
    """小马价格数据表"""
    __tablename__ = 'stock_prices'
    __table_args__ = (
        db.UniqueConstraint('stock_id', 'date', name='unique_stock_date'),
        {
            'mysql_comment': '股票价格数据表 - 存储股票每日行情数据',
            'mysql_charset': 'utf8mb4',
            'mysql_collate': 'utf8mb4_unicode_ci'
        }
    )
    
    id = db.Column(db.Integer, primary_key=True, comment='主键ID')
    stock_id = db.Column(db.Integer, db.ForeignKey('stocks.id'), nullable=False, index=True, comment='股票ID（外键）')
    date = db.Column(db.Date, nullable=False, index=True, comment='交易日期')
    open_price = db.Column(db.Float, nullable=False, comment='开盘价')  # 开盘价
    high_price = db.Column(db.Float, nullable=False, comment='最高价')  # 最高价
    low_price = db.Column(db.Float, nullable=False, comment='最低价')  # 最低价
    close_price = db.Column(db.Float, nullable=False, comment='收盘价')  # 收盘价
    volume = db.Column(db.BigInteger, default=0, comment='成交量')  # 成交量
    
    def __repr__(self):
        return f'<StockPrice {self.stock_id} on {self.date}>'


class Portfolio(db.Model):
    """持仓模拟表"""
    __tablename__ = 'portfolios'
    __table_args__ = {
        'mysql_comment': '持仓模拟表 - 存储用户模拟持仓信息',
        'mysql_charset': 'utf8mb4',
        'mysql_collate': 'utf8mb4_unicode_ci'
    }
    
    id = db.Column(db.Integer, primary_key=True, comment='主键ID')
    stock_id = db.Column(db.Integer, db.ForeignKey('stocks.id'), nullable=False, index=True, comment='股票ID(外键)')
    stock_code = db.Column(db.String(10), nullable=False, comment='股票代码(冗余字段)')
    stock_name = db.Column(db.String(50), nullable=False, comment='股票名称(冗余字段)')
    quantity = db.Column(db.Integer, nullable=False, comment='持仓数量(股)')
    avg_cost = db.Column(db.Float, nullable=False, comment='平均成本价')
    buy_date = db.Column(db.Date, nullable=False, comment='买入日期')
    notes = db.Column(db.Text, comment='备注')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    
    stock = db.relationship('Stock', backref='portfolios')
    
    def __repr__(self):
        return f'<Portfolio {self.stock_code} qty={self.quantity}>'


class Watchlist(db.Model):
    """自选股表"""
    __tablename__ = 'watchlists'
    __table_args__ = {
        'mysql_comment': '自选股表 - 存储用户自选股票及分组',
        'mysql_charset': 'utf8mb4',
        'mysql_collate': 'utf8mb4_unicode_ci'
    }
    
    id = db.Column(db.Integer, primary_key=True, comment='主键ID')
    stock_id = db.Column(db.Integer, db.ForeignKey('stocks.id'), nullable=False, index=True, comment='股票ID')
    group_name = db.Column(db.String(50), default='默认分组', index=True, comment='分组名称')
    notes = db.Column(db.Text, comment='备注')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='添加时间')
    
    stock = db.relationship('Stock', backref='watchlists')
    
    def __repr__(self):
        return f'<Watchlist {self.stock_id} group={self.group_name}>'


class StockAlert(db.Model):
    """股票预警表"""
    __tablename__ = 'stock_alerts'
    __table_args__ = {
        'mysql_comment': '股票预警表 - 存储价格和技术指标预警规则',
        'mysql_charset': 'utf8mb4',
        'mysql_collate': 'utf8mb4_unicode_ci'
    }
    
    id = db.Column(db.Integer, primary_key=True, comment='主键ID')
    stock_id = db.Column(db.Integer, db.ForeignKey('stocks.id'), nullable=False, index=True, comment='股票ID')
    alert_type = db.Column(db.String(20), nullable=False, index=True, comment='预警类型: price/change/volume/technical')
    condition = db.Column(db.String(20), nullable=False, comment='条件: above/below/cross_up/cross_down')
    threshold = db.Column(db.Float, nullable=False, comment='阈值')
    is_active = db.Column(db.Boolean, default=True, comment='是否启用')
    triggered = db.Column(db.Boolean, default=False, comment='是否已触发')
    triggered_at = db.Column(db.DateTime, comment='触发时间')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    
    stock = db.relationship('Stock', backref='alerts')
    
    def __repr__(self):
        return f'<StockAlert {self.stock_id} type={self.alert_type}>'
