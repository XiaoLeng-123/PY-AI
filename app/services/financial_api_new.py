def get_all_stock_codes():
    """获取所有A股股票代码和名称列表（多接口备选方案）"""
    import time
    try:
        all_stocks = []
        
        # ===== 方案1: 新浪财经API（最稳定，免费）=====
        print("\n[方案1] 尝试新浪财经API...")
        try:
            headers = {
                'Referer': 'https://finance.sina.com.cn/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            # 新浪接口：获取沪深A股列表
            url = "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData"
            params = {
                'page': '1',
                'num': '100',
                'sort': 'symbol',
                'asc': '1',
                'node': 'hs_a',  # 沪深A股
                'symbol': '',
                '_s_r_a': 'page'
            }
            
            resp = requests.get(url, params=params, headers=headers, timeout=15)
            if resp.status_code == 200:
                import json
                # 新浪返回的是JSON数组字符串
                import re
                text = resp.text
                # 清理可能的前缀
                if text.startswith('null'):
                    text = text[4:]
                stocks_data = json.loads(text)
                
                if stocks_data and len(stocks_data) > 0:
                    print(f"[方案1] ✓ 新浪API成功，获取到 {len(stocks_data)} 只股票")
                    for s in stocks_data:
                        code = s.get('code', '')
                        name = s.get('name', '')
                        if code and name:
                            all_stocks.append({'code': code, 'name': name})
                    
                    # 继续获取剩余页面
                    total_pages = 55  # 新浪大约55页
                    for page in range(2, total_pages + 1):
                        try:
                            params['page'] = str(page)
                            resp = requests.get(url, params=params, headers=headers, timeout=10)
                            if resp.status_code == 200:
                                text = resp.text
                                if text.startswith('null'):
                                    text = text[4:]
                                stocks_data = json.loads(text)
                                if stocks_data and len(stocks_data) > 0:
                                    for s in stocks_data:
                                        code = s.get('code', '')
                                        name = s.get('name', '')
                                        if code and name:
                                            all_stocks.append({'code': code, 'name': name})
                                    print(f"[方案1] 第{page}页: {len(stocks_data)}只，累计{len(all_stocks)}只")
                                else:
                                    break
                            time.sleep(0.5)
                        except:
                            break
                    
                    print(f"\n✅ [方案1] 成功获取 {len(all_stocks)} 只A股股票")
                    return all_stocks
                else:
                    print("[方案1] 新浪API返回数据为空，尝试方案2")
        except Exception as e:
            print(f"[方案1] 失败: {str(e)[:100]}，尝试方案2")
        
        # ===== 方案2: 同花顺API =====
        print("\n[方案2] 尝试同花顺API...")
        try:
            url = "https://d.10jqka.com.cn/v2/line/hs_a/01/last.js"
            headers = {
                'Referer': 'https://q.10jqka.com.cn/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code == 200:
                import re
                text = resp.text
                # 同花顺返回格式: quotebridge_v2_line_hs_a_01_last({...})
                match = re.search(r'\((\{.*\})\)', text)
                if match:
                    import json
                    data = json.loads(match.group(1))
                    items = data.get('items', [])
                    
                    for item in items:
                        # 格式: code~name~...
                        parts = item.split('~')
                        if len(parts) >= 2:
                            code = parts[0]
                            name = parts[1]
                            if code and name:
                                all_stocks.append({'code': code, 'name': name})
                    
                    if len(all_stocks) > 0:
                        print(f"\n✅ [方案2] 成功获取 {len(all_stocks)} 只A股股票")
                        return all_stocks
                    else:
                        print("[方案2] 同花顺API解析失败，尝试方案3")
                else:
                    print("[方案2] 同花顺API格式不匹配，尝试方案3")
        except Exception as e:
            print(f"[方案2] 失败: {str(e)[:100]}，尝试方案3")
        
        # ===== 方案3: 东方财富API（最后尝试）=====
        print("\n[方案3] 尝试东方财富API...")
        try:
            page = 1
            page_size = 500
            max_retries = 3
            
            while True:
                success = False
                stocks = []
                for attempt in range(max_retries):
                    try:
                        url = "https://push2.eastmoney.com/api/qt/clist/get"
                        params = {
                            'pn': str(page),
                            'pz': str(page_size),
                            'po': '1',
                            'np': '1',
                            'ut': 'bd1d9ddb04089700cf9c27f6f7426281',
                            'fltt': '2',
                            'invt': '2',
                            'fid': 'f3',
                            'fs': 'm:0 t:6,m:0 t:80,m:1 t:2,m:1 t:23,m:0 t:81 s:2048',
                            'fields': 'f12,f14'
                        }
                        
                        headers = {
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'zh-CN,zh;q=0.9',
                            'Referer': 'https://quote.eastmoney.com/',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                        
                        resp = requests.get(url, params=params, headers=headers, timeout=15)
                        if resp.status_code != 200:
                            if attempt < max_retries - 1:
                                time.sleep(3)
                                continue
                            else:
                                break
                        
                        data = resp.json()
                        if not data.get('data') or not data['data'].get('diff'):
                            return all_stocks
                        
                        stocks = data['data']['diff']
                        for stock in stocks:
                            code = stock.get('f12', '')
                            name = stock.get('f14', '')
                            if code and name:
                                all_stocks.append({'code': code, 'name': name})
                        
                        print(f"[方案3] 第{page}页: {len(stocks)}只，累计{len(all_stocks)}只")
                        success = True
                        time.sleep(1)
                        break
                        
                    except:
                        if attempt == max_retries - 1:
                            return all_stocks
                        time.sleep(3)
                
                if not success:
                    break
                if len(stocks) < page_size:
                    break
                page += 1
                if page > 60:
                    break
            
            if len(all_stocks) > 0:
                print(f"\n✅ [方案3] 成功获取 {len(all_stocks)} 只A股股票")
            else:
                print(f"\n❌ [方案3] 东方财富API也失败了")
            return all_stocks
            
        except Exception as e:
            print(f"[方案3] 失败: {str(e)[:100]}")
        
        # ===== 全部失败 =====
        print(f"\n❌ 所有接口均失败，返回已获取的 {len(all_stocks)} 只股票")
        return all_stocks
        
    except Exception as e:
        print(f"获取股票列表失败: {e}")
        import traceback
        traceback.print_exc()
        return []
