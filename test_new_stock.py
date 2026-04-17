"""
测试新添加的小马是否能成功获取数据
"""
import requests
import json
from datetime import datetime, timedelta

def test_tencent_api(stock_code):
    """测试腾讯财经API"""
    if stock_code.startswith('6'):
        tencent_code = f'sh{stock_code}'
    else:
        tencent_code = f'sz{stock_code}'
    
    url = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get"
    params = {
        'param': f'{tencent_code},day,,,60,qfq',
    }
    
    headers = {
        'Referer': 'https://stockapp.finance.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    print(f"\n=== 测试腾讯API ===")
    print(f"小马代码: {stock_code}")
    print(f"请求URL: {url}")
    print(f"参数: {params}")
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"HTTP状态码: {response.status_code}")
        
        if response.status_code == 200:
            api_data = response.json()
            print(f"API返回code: {api_data.get('code')}")
            print(f"API返回的data keys: {list(api_data.get('data', {}).keys())[:10]}")
            
            # 尝试多种key格式
            for key in [tencent_code, stock_code]:
                if key in api_data.get('data', {}):
                    stock_data = api_data['data'][key]
                    klines = stock_data.get('qfqday', [])
                    print(f"✓ 找到数据 (key={key}), K线数量: {len(klines)}")
                    if klines and len(klines) > 0:
                        print(f"第一条数据: {klines[0]}")
                        print(f"最后一条数据: {klines[-1]}")
                    return True
            
            print("✗ 未找到小马数据")
            return False
        else:
            print(f"✗ HTTP请求失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ 异常: {str(e)}")
        return False


def test_eastmoney_api(stock_code):
    """测试东方财富API"""
    if stock_code.startswith('6'):
        market = '1'
    else:
        market = '0'
    
    secid = f'{market}.{stock_code}'
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=60)
    
    url = 'http://push2his.eastmoney.com/api/qt/stock/kline/get'
    params = {
        'secid': secid,
        'fields1': 'f1,f2,f3,f4,f5,f6',
        'fields2': 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
        'klt': '101',
        'fqt': '1',
        'beg': start_date.strftime('%Y%m%d'),
        'end': end_date.strftime('%Y%m%d'),
        'lmt': '100',
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'http://quote.eastmoney.com/',
    }
    
    print(f"\n=== 测试东方财富API ===")
    print(f"小马代码: {stock_code}")
    print(f"secid: {secid}")
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"HTTP状态码: {response.status_code}")
        
        if response.status_code == 200:
            api_data = response.json()
            
            if api_data.get('data') and api_data['data'].get('klines'):
                klines = api_data['data']['klines']
                print(f"✓ 获取到 {len(klines)} 条K线数据")
                if klines and len(klines) > 0:
                    print(f"第一条数据: {klines[0]}")
                    print(f"最后一条数据: {klines[-1]}")
                return True
            else:
                print("✗ 无K线数据")
                return False
        else:
            print(f"✗ HTTP请求失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ 异常: {str(e)}")
        return False


if __name__ == '__main__':
    # 测试几个小马代码
    test_codes = ['000815', '600519', '300750']
    
    for code in test_codes:
        print("\n" + "="*60)
        print(f"测试小马: {code}")
        print("="*60)
        
        tencent_result = test_tencent_api(code)
        eastmoney_result = test_eastmoney_api(code)
        
        print(f"\n结果汇总:")
        print(f"  腾讯API: {'✓ 成功' if tencent_result else '✗ 失败'}")
        print(f"  东方财富API: {'✓ 成功' if eastmoney_result else '✗ 失败'}")
