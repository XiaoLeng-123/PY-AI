from app import app, db
from models import Stock

# 小马真实代码映射
stock_codes = {
    '博云新材': '002297',
    '中工国际': '002051',
    '紫金矿业': '601899',
    '洛阳钼业': '603993',
    '大族激光': '002008',
    '超声电子': '000823',
    '数据港': '603881',
    '巨力索具': '002342',
}

with app.app_context():
    stocks = Stock.query.all()
    
    print('更新小马代码...\n')
    
    for stock in stocks:
        if stock.name in stock_codes:
            old_code = stock.code
            stock.code = stock_codes[stock.name]
            print(f'✓ {stock.name}: {old_code} → {stock.code}')
    
    db.session.commit()
    print('\n完成！')
