"""测试001330博纳影业"""
import requests
import json

code = '001330'
tencent_code = f'sz{code}'

print(f"\n=== 测试腾讯API - {code} ===")
url = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get'
params = {'param': f'{tencent_code},day,,,60,qfq'}
headers = {
    'Referer': 'https://stockapp.finance.qq.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

r = requests.get(url, params=params, headers=headers, timeout=10)
print(f'HTTP状态码: {r.status_code}')
data = r.json()
print(f'API返回code: {data.get("code")}')
print(f'API返回的data keys: {list(data.get("data", {}).keys())}')

# 尝试多种key格式
for key in [tencent_code, code, f'sz{code}']:
    if key in data.get('data', {}):
        stock_data = data['data'][key]
        klines = stock_data.get('qfqday', [])
        print(f'✓ 找到数据 (key={key}), K线数量: {len(klines)}')
        if klines:
            print(f'第一条: {klines[0]}')
            print(f'最后一条: {klines[-1]}')
        break
else:
    print('✗ 未找到小马数据')
    # 打印完整的data结构
    print(f'\n完整data结构:')
    print(json.dumps(data, ensure_ascii=False, indent=2)[:1000])

print(f"\n=== 测试东方财富API - {code} ===")
from datetime import datetime, timedelta

if code.startswith('6'):
    market = '1'
else:
    market = '0'

secid = f'{market}.{code}'

end_date = datetime.now()
start_date = end_date - timedelta(days=60)

em_url = 'http://push2his.eastmoney.com/api/qt/stock/kline/get'
em_params = {
    'secid': secid,
    'fields1': 'f1,f2,f3,f4,f5,f6',
    'fields2': 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    'klt': '101',
    'fqt': '1',
    'beg': start_date.strftime('%Y%m%d'),
    'end': end_date.strftime('%Y%m%d'),
    'lmt': '100',
}

em_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'http://quote.eastmoney.com/',
}

em_r = requests.get(em_url, params=em_params, headers=em_headers, timeout=10)
print(f'HTTP状态码: {em_r.status_code}')
em_data = em_r.json()
print(f'东方财富API返回: {list(em_data.keys())}')

if em_data.get('data') and em_data['data'].get('klines'):
    klines = em_data['data']['klines']
    print(f'✓ 获取到 {len(klines)} 条K线数据')
    if klines:
        print(f'第一条: {klines[0]}')
        print(f'最后一条: {klines[-1]}')
else:
    print('✗ 东方财富API无数据')
    print(f'data: {em_data.get("data")}')
