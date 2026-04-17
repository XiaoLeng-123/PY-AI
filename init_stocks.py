import requests
import json

API_BASE = 'http://localhost:5000/api'

# 小马列表
stocks = [
    {'code': '博云新材', 'name': '博云新材', 'market': '财神'},
    {'code': '中工国际', 'name': '中工国际', 'market': '财神'},
    {'code': '紫金矿业', 'name': '紫金矿业', 'market': '财神'},
    {'code': '洛阳钼业', 'name': '洛阳钼业', 'market': '财神'},
    {'code': '大族激光', 'name': '大族激光', 'market': '财神'},
    {'code': '超声电子', 'name': '超声电子', 'market': '财神'},
    {'code': '数据港', 'name': '数据港', 'market': '财神'},
    {'code': '巨力索具', 'name': '巨力索具', 'market': '财神'},
]

print('开始添加小马数据...\n')

for stock in stocks:
    try:
        response = requests.post(
            f'{API_BASE}/stocks',
            json=stock,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 201:
            print(f'✓ {stock["name"]} 添加成功')
        elif response.status_code == 400:
            print(f'- {stock["name"]} 已存在，跳过')
        else:
            print(f'✗ {stock["name"]} 添加失败: {response.text}')
    except Exception as e:
        print(f'✗ {stock["name"]} 错误: {str(e)}')

print('\n完成！')
