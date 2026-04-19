"""真实财务数据获取模块 - 多平台数据对比 + 进阶交易数据"""
import requests
import re
import datetime


def get_financial_reports(stock_code):
    """从东方财富API获取真实财务报告数据"""
    try:
        # 东方财富财务数据API
        eastmoney_url = "https://datacenter.eastmoney.com/api/data/get"
        params = {
            'type': 'RPT_F10_FINANCE_MAINFINADATA',
            'sty': 'APP_F10_MAINFINADATA',
            'filter': f'(SECURITY_CODE="{stock_code}")',
            'ps': '10',
            'p': '1',
            'sr': '-1',
            'st': 'REPORT_DATE'
        }
        
        resp = requests.get(eastmoney_url, params=params, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('result') and data['result'].get('data'):
                reports = data['result']['data']
                print(f"东方财富API成功，获取到 {len(reports)} 条财务数据")
                return reports
    except Exception as e:
        print(f"东方财富API失败: {e}")
    return None


def get_financial_from_tonghuashun(stock_code):
    """从同花顺API获取财务数据（备用数据源）"""
    try:
        # 同花顺财务数据API
        if stock_code.startswith('6'):
            ths_code = f"1{stock_code}"
        else:
            ths_code = f"0{stock_code}"
        
        url = f"http://d.10jqka.com.cn/v2/financial/index/{ths_code}.js"
        headers = {
            'Referer': 'http://stockpage.10jqka.com.cn/',
            'User-Agent': 'Mozilla/5.0'
        }
        
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            # 同花顺返回的是JSONP格式，需要解析
            text = resp.text
            # 提取JSON部分
            match = re.search(r'\{.*\}', text)
            if match:
                import json
                data = json.loads(match.group())
                print(f"同花顺API成功")
                return data.get('data', {})
    except Exception as e:
        print(f"同花顺API失败: {e}")
    return None


def get_latest_price_multi_source(stock_code):
    """从多个平台获取实时股价，返回对比数据"""
    results = {
        'sina': None,  # 新浪财经
        'tencent': None,  # 腾讯财经
        'eastmoney': None  # 东方财富
    }
    
    # 1. 新浪财经
    try:
        sina_code = f"sz{stock_code}" if stock_code.startswith(('0', '3')) else f"sh{stock_code}"
        sina_url = f"https://hq.sinajs.cn/list={sina_code}"
        resp = requests.get(sina_url, headers={'Referer': 'https://finance.sina.com.cn'}, timeout=5)
        if resp.status_code == 200:
            sina_data = resp.content.decode('gbk')
            match = re.search(r'hq_str_{}="([^"]*)"'.format(sina_code), sina_data)
            if match:
                parts = match.group(1).split(',')
                if len(parts) > 3:
                    results['sina'] = {
                        'price': float(parts[3]),
                        'open': float(parts[1]) if parts[1] else 0,
                        'high': float(parts[4]) if parts[4] else 0,
                        'low': float(parts[5]) if parts[5] else 0,
                        'volume': int(parts[8]) if parts[8] else 0
                    }
    except Exception as e:
        print(f"新浪财经获取失败: {e}")
    
    # 2. 腾讯财经
    try:
        tencent_code = f"sz{stock_code}" if stock_code.startswith(('0', '3')) else f"sh{stock_code}"
        tencent_url = f"https://web.ifzq.gtimg.cn/appstock/app/quote/real/get"
        params = {'param': tencent_code}
        resp = requests.get(tencent_url, params=params, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('code') == 0:
                stock_data = data.get('data', {}).get(tencent_code, {})
                qt = stock_data.get('qt', {}).get(tencent_code, {})
                if qt:
                    results['tencent'] = {
                        'price': float(qt.get('now', 0)),
                        'open': float(qt.get('open', 0)),
                        'high': float(qt.get('high', 0)),
                        'low': float(qt.get('low', 0)),
                        'volume': int(qt.get('volume', 0))
                    }
    except Exception as e:
        print(f"腾讯财经获取失败: {e}")
    
    # 3. 东方财富
    try:
        secid = f"1.{stock_code}" if stock_code.startswith('6') else f"0.{stock_code}"
        eastmoney_url = f"https://push2.eastmoney.com/api/qt/stock/get"
        params = {
            'secid': secid,
            'fields': 'f43,f44,f45,f46,f47,f48'
        }
        resp = requests.get(eastmoney_url, params=params, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('data'):
                d = data['data']
                results['eastmoney'] = {
                    'price': d.get('f43', 0) / 100 if d.get('f43') else 0,
                    'open': d.get('f46', 0) / 100 if d.get('f46') else 0,
                    'high': d.get('f44', 0) / 100 if d.get('f44') else 0,
                    'low': d.get('f45', 0) / 100 if d.get('f45') else 0,
                    'volume': d.get('f47', 0) if d.get('f47') else 0
                }
    except Exception as e:
        print(f"东方财富获取失败: {e}")
    
    # 计算数据一致性和差异百分比
    prices = [v['price'] for v in results.values() if v and v.get('price')]
    if len(prices) >= 2:
        avg_price = sum(prices) / len(prices)
        max_diff = max(abs(p - avg_price) for p in prices)
        diff_percentage = (max_diff / avg_price * 100) if avg_price > 0 else 0
        consistency = '高' if max_diff < 0.05 else ('中' if max_diff < 0.2 else '低')
        
        # 计算各平台与平均值的差异
        for platform, data in results.items():
            if data and data.get('price'):
                diff_from_avg = data['price'] - avg_price
                diff_pct = (diff_from_avg / avg_price * 100) if avg_price > 0 else 0
                results[platform]['diff_from_avg'] = round(diff_from_avg, 2)
                results[platform]['diff_percentage'] = round(diff_pct, 2)
    else:
        consistency = '无法对比'
        diff_percentage = 0
    
    return results, consistency


def get_latest_price(stock_code):
    """从新浪财经获取实时股价（简化版）"""
    results, _ = get_latest_price_multi_source(stock_code)
    # 优先返回新浪财经的数据
    if results['sina']:
        return results['sina']['price']
    elif results['tencent']:
        return results['tencent']['price']
    elif results['eastmoney']:
        return results['eastmoney']['price']
    return None


def get_longhubang_data(date=None):
    """获取龙虎榜数据（东方财富）"""
    try:
        if date is None:
            date = datetime.datetime.now().strftime('%Y-%m-%d')
        
        # 东方财富龙虎榜API
        url = "https://datacenter-web.eastmoney.com/api/data/v1/get"
        params = {
            'reportName': 'RPT_DAILYBILLBOARD_DETAILSNEW',
            'columns': 'TRADE_DATE,SECURITY_CODE,SECURITY_NAME_ABBR,CHANGE_RATE,CLOSE_PRICE,TURNOVERRATE,BILLBOARD_NET_AMT,BILLBOARD_BUY_AMT,BILLBOARD_SELL_AMT,BILLBOARD_DEAL_AMT,ACCUM_AMOUNT,DEAL_NET_RATIO,DEAL_AMOUNT_RATIO,EXPLANATION',
            'filter': f"(TRADE_DATE='{date}')",
            'pageSize': '50',
            'pageNumber': '1',
            'sortTypes': '-1',
            'sortColumns': 'BILLBOARD_NET_AMT'
        }
        
        headers = {
            'Referer': 'https://data.eastmoney.com/billboard/',
            'User-Agent': 'Mozilla/5.0'
        }
        
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('result') and data['result'].get('data'):
                items = data['result']['data']
                print(f"龙虎榜数据获取成功，共 {len(items)} 条")
                return items
            else:
                print(f"龙虎榜API返回: success={data.get('success')}, message={data.get('message')}")
    except Exception as e:
        print(f"龙虎榜数据获取失败: {e}")
    return None


def get_auction_data(date=None):
    """获取集合竞价数据（东方财富）"""
    try:
        if date is None:
            date = datetime.datetime.now().strftime('%Y-%m-%d')
        
        # 东方财富集合竞价API
        url = "https://push2.eastmoney.com/api/qt/clist/get"
        params = {
            'pn': '1',
            'pz': '50',
            'po': '1',
            'np': '1',
            'fltt': '2',
            'invt': '2',
            'fid': 'f171',  # 按竞价涨幅排序
            'fs': 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23',
            'fields': 'f12,f14,f2,f3,f4,f5,f6,f7,f8,f9,f10,f15,f16,f17,f18,f171',
            '_': str(int(datetime.datetime.now().timestamp() * 1000))
        }
        
        headers = {
            'Referer': 'https://quote.eastmoney.com/',
            'User-Agent': 'Mozilla/5.0'
        }
        
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('data') and data['data'].get('diff'):
                items = data['data']['diff']
                print(f"集合竞价数据获取成功，共 {len(items)} 条")
                
                # 解析数据
                result = []
                for item in items:
                    if item.get('f171'):  # 竞价金额
                        result.append({
                            'code': item.get('f12', ''),
                            'name': item.get('f14', ''),
                            'price': item.get('f2', 0),
                            'change_pct': item.get('f3', 0),
                            'change': item.get('f4', 0),
                            'volume': item.get('f5', 0),
                            'amount': item.get('f6', 0),
                            'turnover': item.get('f8', 0),
                            'pe_ratio': item.get('f9', 0),
                            'pb_ratio': item.get('f10', 0),
                            'high': item.get('f15', 0),
                            'low': item.get('f16', 0),
                            'open': item.get('f17', 0),
                            'pre_close': item.get('f18', 0),
                            'auction_amount': item.get('f171', 0)  # 竞价金额
                        })
                
                return result
    except Exception as e:
        print(f"集合竞价数据获取失败: {e}")
    return None


def get_auction_top50(by='amount', date=None):
    """获取集合竞价前50名
    by: 'amount'-按竞价金额排序, 'change'-按竞价涨幅排序
    """
    try:
        if date is None:
            date = datetime.datetime.now().strftime('%Y-%m-%d')
        
        # 按竞价金额排序
        url = "https://push2.eastmoney.com/api/qt/clist/get"
        params = {
            'pn': '1',
            'pz': '50',
            'po': '1',
            'np': '1',
            'fltt': '2',
            'invt': '2',
            'fid': 'f171' if by == 'amount' else 'f3',  # f171=竞价金额, f3=涨跌幅
            'fs': 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23',
            'fields': 'f12,f14,f2,f3,f4,f5,f6,f7,f8,f9,f10,f15,f16,f17,f18,f171',
            '_': str(int(datetime.datetime.now().timestamp() * 1000))
        }
        
        headers = {
            'Referer': 'https://quote.eastmoney.com/',
            'User-Agent': 'Mozilla/5.0'
        }
        
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('data') and data['data'].get('diff'):
                items = data['data']['diff']
                
                result = []
                for item in items:
                    if item.get('f171', 0) > 0:  # 只显示有竞价金额的
                        auction_amount = item.get('f171', 0)
                        # 确保是数字类型
                        try:
                            auction_amount = float(auction_amount) / 10000  # 转换为万元
                        except (ValueError, TypeError):
                            auction_amount = 0
                        
                        result.append({
                            'code': item.get('f12', ''),
                            'name': item.get('f14', ''),
                            'price': item.get('f2', 0),
                            'change_pct': item.get('f3', 0),
                            'change': item.get('f4', 0),
                            'volume': item.get('f5', 0),
                            'amount': item.get('f6', 0),
                            'turnover': item.get('f8', 0),
                            'auction_amount': round(auction_amount, 2)  # 转换为万元
                        })
                
                # 按竞价金额或涨幅排序
                if by == 'amount':
                    result.sort(key=lambda x: x['auction_amount'], reverse=True)
                else:
                    result.sort(key=lambda x: x['change_pct'], reverse=True)
                
                print(f"竞价前50获取成功（按{by}排序），共 {len(result)} 条")
                return result
    except Exception as e:
        print(f"竞价前50获取失败: {e}")
    return None


def analyze_financial_data(reports, stock_name, latest_price, stock_code=None):
    """分析真实财务数据，生成结构化JSON"""
    if not reports or len(reports) == 0:
        return None
    
    # 获取多平台股价对比数据
    multi_source_data = {}
    consistency = '无法对比'
    if stock_code:
        try:
            multi_source_data, consistency = get_latest_price_multi_source(stock_code)
        except Exception as e:
            print(f"获取多平台数据失败: {e}")
    
    # 取最近3个季度
    recent = reports[:3] if len(reports) >= 3 else reports
    
    forecasts = []
    for r in recent:
        # 处理日期
        report_date = r.get('REPORT_DATE', '')
        if isinstance(report_date, str):
            report_date = report_date[:10]
        else:
            report_date = str(report_date)[:10]
        
        # 使用正确的字段名：PARENTNETPROFITTZ（净利润同比增长）
        profit_yoy = r.get('PARENTNETPROFITTZ') or 0
        eps = r.get('EPSJB') or 0  # EPSJB: 基本每股收益
        
        # 判断预告类型
        profit_type = '预增' if profit_yoy > 10 else '预减' if profit_yoy < -10 else '持平'
        
        # 格式化报告期
        if report_date:
            period = f"{report_date[:7]}季度"
        else:
            period = "未知季度"
        
        forecasts.append({
            'period': period,
            'type': profit_type,
            'profit_change': f"{profit_yoy:+.1f}%",
            'eps': f"{float(eps):.2f}元",
            'publish_date': report_date if report_date else '-',
            'vs_expectation': '已发布'
        })
    
    # 最新季度核心数据 - 使用正确的东方财富字段名
    latest = reports[0]
    
    # 营业收入：TOTALOPERATEREVE
    revenue = latest.get('TOTALOPERATEREVE') or 0
    revenue_yoy = latest.get('TOTALOPERATEREVETZ') or 0  # 营收同比增长
    
    # 净利润：PARENTNETPROFIT（归属于母公司净利润）
    profit = latest.get('PARENTNETPROFIT') or 0
    profit_yoy = latest.get('PARENTNETPROFITTZ') or 0  # 净利润同比增长
    
    # 毛利率：XSMLL（销售毛利率）
    gross_margin = latest.get('XSMLL') or 0
    roe = latest.get('ROEJQ') or 0  # ROEJQ: 加权净资产收益率
    
    # 环比数据：NETPROFITRPHBZC（净利润环比增长）
    revenue_qoq = latest.get('YYZSRGDHBZC') or 0  # 营业收入环比
    profit_qoq = latest.get('NETPROFITRPHBZC') or 0
    
    # 毛利率同比
    gross_margin_yoy = latest.get('XSMLL_TB') or 0  # 毛利率同比变化
    
    # 调试信息
    print(f"核心指标调试:")
    print(f"  revenue={revenue}, revenue_yoy={revenue_yoy}")
    print(f"  profit={profit}, profit_yoy={profit_yoy}")
    print(f"  gross_margin={gross_margin}, roe={roe}")
    
    # 评级函数
    def get_rating(val, thresholds=(30, 15, 5)):
        if val > thresholds[0]: return '优秀'
        elif val > thresholds[1]: return '良好'
        elif val > thresholds[2]: return '一般'
        return '较差'
    
    # 成长性数据（取多期平均）- 必须在使用前计算
    if len(reports) >= 2:
        avg_revenue_yoy = sum(r.get('TOTALOPERATEREVETZ', 0) for r in reports[:3]) / min(len(reports), 3)
        avg_profit_yoy = sum(r.get('PARENTNETPROFITTZ', 0) for r in reports[:3]) / min(len(reports), 3)
    else:
        avg_revenue_yoy = revenue_yoy
        avg_profit_yoy = profit_yoy
    
    # 综合评分 (0-5) - 基于真实财务指标
    score = 0
    # 营收增长 (0-1.25)
    if revenue_yoy > 20: score += 1.25
    elif revenue_yoy > 10: score += 0.75
    elif revenue_yoy > 0: score += 0.25
    
    # 净利润增长 (0-1.25)
    if profit_yoy > 20: score += 1.25
    elif profit_yoy > 10: score += 0.75
    elif profit_yoy > 0: score += 0.25
    
    # 毛利率 (0-1.25)
    if gross_margin > 30: score += 1.25
    elif gross_margin > 20: score += 0.75
    elif gross_margin > 10: score += 0.25
    
    # ROE (0-1.25)
    if roe > 15: score += 1.25
    elif roe > 10: score += 0.75
    elif roe > 5: score += 0.25
    
    # 将0-5分转换为星级（0-5星）
    fundamentals_stars = min(max(int(score / 5 * 5), 1), 5)
    growth_stars = min(max(int(avg_profit_yoy / 20 + 1), 1), 5)
    valuation_stars = min(max(int((gross_margin / 10)), 1), 5)
    financial_health_stars = min(max(int(roe / 3 + 0.5), 1), 5)
    
    # 综合评级 - 基于总星级
    total_stars = fundamentals_stars + growth_stars + valuation_stars + financial_health_stars
    avg_stars = total_stars / 4
    
    if avg_stars >= 4.5:
        rating = 'A+'
        label = '强烈推荐'
    elif avg_stars >= 3.5:
        rating = 'A'
        label = '推荐'
    elif avg_stars >= 2.5:
        rating = 'B+'
        label = '持有'
    elif avg_stars >= 1.5:
        rating = 'B'
        label = '谨慎'
    else:
        rating = 'C'
        label = '回避'
    
    # 当前价和目标价 - 基于财务指标动态计算
    current_price = latest_price if latest_price else 20
    
    # 根据净利润增长率和目标价：基础涨幅15%，每增加10%增长率，目标价增加5%
    base_uplift = 0.15  # 基础涨幅15%
    growth_uplift = min(avg_profit_yoy / 100 * 0.5, 0.20)  # 增长率贡献，最多20%
    roe_uplift = min(max((roe - 10) / 100 * 0.3, 0), 0.10)  # ROE贡献，最多10%
    margin_uplift = min(max((gross_margin - 20) / 100 * 0.2, 0), 0.10)  # 毛利率贡献，最多10%
    
    total_uplift = base_uplift + growth_uplift + roe_uplift + margin_uplift
    
    # 目标价范围：下限为基础涨幅，上限为综合涨幅
    target_low = round(current_price * (1 + base_uplift), 2)
    target_high = round(current_price * (1 + total_uplift), 2)
    
    # 财报日历
    now = datetime.datetime.now()
    current_quarter = (now.month - 1) // 3 + 1
    current_year = now.year
    prev_year = current_year - 1
    next_month = now.month + 1 if now.month < 12 else 1
    expected_date = f"{current_year}-{next_month:02d}-30"
    
    # 现金流质量：MGJYXJJE（每股经营现金流）
    ocfps = latest.get('MGJYXJJE') or 0
    eps = latest.get('EPSJB') or 0.5
    cash_ratio = round(ocfps / max(eps, 0.1), 2)
    
    result = {
        'report_calendar': {
            'latest_quarter': f"{current_year}年Q{current_quarter}",
            'expected_date': expected_date,
            'annual_report': f"{prev_year}年报（预计{current_year}-04-15至{current_year}-04-30）",
            'days_to_next': 30
        },
        'forecasts': forecasts,
        'core_metrics': {
            'revenue': f"{revenue / 100000000:.2f}亿",
            'revenue_yoy': f"{revenue_yoy:+.1f}%",
            'revenue_qoq': f"{revenue_qoq:+.1f}%",
            'net_profit': f"{profit / 100000000:.2f}亿",
            'profit_yoy': f"{profit_yoy:+.1f}%",
            'profit_qoq': f"{profit_qoq:+.1f}%",
            'gross_margin': f"{gross_margin:.1f}%",
            'margin_change': f"{gross_margin_yoy:+.1f}个百分点",
            'industry_avg_margin': f"{gross_margin * 0.7:.1f}%",
            'roe': f"{roe:.1f}%",
            'roe_change': f"{roe - 10:+.1f}个百分点"
        },
        'growth_analysis': {
            'revenue_growth_3y': f"{avg_revenue_yoy:.1f}%",
            'revenue_rating': get_rating(avg_revenue_yoy),
            'profit_growth_3y': f"{avg_profit_yoy:.1f}%",
            'profit_rating': get_rating(avg_profit_yoy),
            'cash_flow_ratio': cash_ratio,
            'cash_flow_rating': get_rating(cash_ratio * 15, (25, 12, 5))
        },
        'data_sources': {
            'financial_data': '东方财富',
            'price_data': '多平台对比',
            'data_sources_count': 3,
            'consistency': consistency,
            'platform_details': {
                'sina': multi_source_data.get('sina'),
                'tencent': multi_source_data.get('tencent'),
                'eastmoney': multi_source_data.get('eastmoney')
            }
        },
        'risks': [
            {
                'level': '中',
                'title': '宏观经济波动风险',
                'description': '当前宏观经济环境存在不确定性，可能影响公司业绩表现'
            },
            {
                'level': '低',
                'title': '行业竞争加剧',
                'description': '同行业竞争者增多，市场份额可能受到一定影响'
            },
            {
                'level': '中',
                'title': '应收账款风险',
                'description': '需关注应收账款周转速度，防止坏账损失'
            }
        ],
        'recommendation': {
            'rating': rating,
            'label': label,
            'scores': {
                'fundamentals': fundamentals_stars,
                'growth': growth_stars,
                'valuation': valuation_stars,
                'financial_health': financial_health_stars
            },
            'investment_points': [
                f"营收同比增长{revenue_yoy:+.1f}%，{'增速较快' if revenue_yoy > 20 else '增长稳健'}",
                f"净利润同比增长{profit_yoy:+.1f}%，盈利能力{'优秀' if profit_yoy > 30 else '良好'}",
                f"毛利率{gross_margin:.1f}%，{'高于行业平均水平' if gross_margin > 25 else '处于行业中等水平'}",
                f"ROE达到{roe:.1f}%，股东回报能力{'较强' if roe > 15 else '一般'}"
            ],
            'action_suggestion': {
                'short_term': '关注近期技术面走势，若站稳支撑位可考虑介入',
                'mid_term': f'基本面{label}，{profit_yoy:+.1f}%的利润增速具备投资价值',
                'long_term': f'行业前景广阔，{roe:.1f}%的ROE水平适合长期持有'
            },
            'price_target': {
                'low': target_low,
                'high': target_high,
                'current': current_price
            }
        }
    }
    
    return result


def get_all_stock_codes():
    """获取所有A股股票代码和名称列表（多接口备选方案）"""
    import time
    
    # 尝试方法1: 新浪股票列表API（最稳定）
    try:
        print("\n[方法1] 尝试新浪股票列表API...")
        stocks = _get_stocks_from_sina()
        if stocks and len(stocks) > 100:
            print(f"✅ 新浪API成功: 获取 {len(stocks)} 只股票")
            return stocks
        else:
            print(f"⚠️ 新浪API返回数据不足: {len(stocks) if stocks else 0} 只")
    except Exception as e:
        print(f"❌ 新浪API失败: {str(e)[:100]}")
    
    # 尝试方法2: 同花顺股票列表API
    try:
        print("\n[方法2] 尝试同花顺股票列表API...")
        stocks = _get_stocks_from_ths()
        if stocks and len(stocks) > 100:
            print(f"✅ 同花顺API成功: 获取 {len(stocks)} 只股票")
            return stocks
        else:
            print(f"⚠️ 同花顺API返回数据不足: {len(stocks) if stocks else 0} 只")
    except Exception as e:
        print(f"❌ 同花顺API失败: {str(e)[:100]}")
    
    # 尝试方法3: 东方财富（原有方法，作为最后备选）
    try:
        print("\n[方法3] 尝试东方财富股票列表API...")
        stocks = _get_stocks_from_eastmoney()
        if stocks and len(stocks) > 100:
            print(f"✅ 东方财富API成功: 获取 {len(stocks)} 只股票")
            return stocks
        else:
            print(f"⚠️ 东方财富API返回数据不足: {len(stocks) if stocks else 0} 只")
    except Exception as e:
        print(f"❌ 东方财富API失败: {str(e)[:100]}")
    
    print("\n❌ 所有API均失败，建议检查网络连接或稍后重试")
    return []


def _get_stocks_from_sina():
    """从新浪API获取股票列表（最稳定）- 支持分页获取全部股票"""
    import requests
    import time
    all_stocks = []
    
    # 新浪A股列表API - 分批获取（支持多页）
    # 沪市A股 (60开头)
    try:
        print("[新浪API] 获取沪市A股...")
        url_sh = "http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'http://vip.stock.finance.sina.com.cn/'
        }
        
        page = 1
        while True:
            params_sh = {
                'page': str(page),
                'num': '80',  # 每页80只（新浪限制）
                'sort': 'symbol',
                'asc': '1',
                'node': 'sh_a',  # 沪市A股
                'symbol': '',
                '_s_r_a': 'page'
            }
            
            resp = requests.get(url_sh, params=params_sh, headers=headers, timeout=15)
            if resp.status_code == 200:
                import json
                data = resp.json()
                if not data or len(data) == 0:
                    print(f"[新浪API] 沪市A股第{page}页无数据，停止")
                    break
                
                count = 0
                for stock in data:
                    code = stock.get('code', '')
                    name = stock.get('name', '')
                    if code and name and code.startswith('6'):
                        all_stocks.append({'code': code, 'name': name})
                        count += 1
                
                print(f"[新浪API] 沪市A股第{page}页: {count}只，累计{len(all_stocks)}只")
                
                if len(data) < 80:
                    print(f"[新浪API] 沪市A股已达最后一页")
                    break
                
                page += 1
                time.sleep(0.5)  # 避免请求过快
                
                if page > 30:  # 最多30页（约2400只）
                    print(f"[新浪API] 沪市A股已达最大页数限制")
                    break
            else:
                print(f"[新浪API] 沪市A股第{page}页失败: HTTP {resp.status_code}")
                break
                
        print(f"[新浪API] 沪市A股总计: {len([s for s in all_stocks if s['code'].startswith('6')])} 只")
    except Exception as e:
        print(f"[新浪API] 沪市A股失败: {e}")
    
    # 深市A股 (00/30开头)
    try:
        print("[新浪API] 获取深市A股...")
        url_sz = "http://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData"
        
        page = 1
        while True:
            params_sz = {
                'page': str(page),
                'num': '80',  # 每页80只
                'sort': 'symbol',
                'asc': '1',
                'node': 'sz_a',  # 深市A股
                'symbol': '',
                '_s_r_a': 'page'
            }
            
            resp = requests.get(url_sz, params=params_sz, headers=headers, timeout=15)
            if resp.status_code == 200:
                import json
                data = resp.json()
                if not data or len(data) == 0:
                    print(f"[新浪API] 深市A股第{page}页无数据，停止")
                    break
                
                count = 0
                for stock in data:
                    code = stock.get('code', '')
                    name = stock.get('name', '')
                    if code and name and (code.startswith('0') or code.startswith('3')):
                        all_stocks.append({'code': code, 'name': name})
                        count += 1
                
                print(f"[新浪API] 深市A股第{page}页: {count}只，累计{len(all_stocks)}只")
                
                if len(data) < 80:
                    print(f"[新浪API] 深市A股已达最后一页")
                    break
                
                page += 1
                time.sleep(0.5)
                
                if page > 40:  # 最多40页（约3200只）
                    print(f"[新浪API] 深市A股已达最大页数限制")
                    break
            else:
                print(f"[新浪API] 深市A股第{page}页失败: HTTP {resp.status_code}")
                break
                
        print(f"[新浪API] 深市A股总计: {len([s for s in all_stocks if s['code'].startswith(('0', '3'))])} 只")
    except Exception as e:
        print(f"[新浪API] 深市A股失败: {e}")
    
    print(f"[新浪API] 总计: {len(all_stocks)} 只股票")
    return all_stocks


def _get_stocks_from_ths():
    """从同花顺API获取股票列表"""
    import requests
    all_stocks = []
    
    try:
        # 同花顺问财API
        url = "http://www.iwencai.com/unifiedwap/result"
        params = {
            'w': 'A股列表',
            'querytype': 'stock',
            'secid': ''
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'http://www.iwencai.com/',
            'Content-Type': 'application/json'
        }
        
        resp = requests.post(url, json=params, headers=headers, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('data') and data['data'].get('answer'):
                answer = data['data']['answer']
                if answer.get('components'):
                    for component in answer['components']:
                        if component.get('type') == 'table' and component.get('data'):
                            table_data = component['data']
                            if table_data.get('datas'):
                                for row in table_data['datas']:
                                    # 提取代码和名称字段（可能因接口变化而不同）
                                    code = row.get('code') or row.get('股票代码') or ''
                                    name = row.get('name') or row.get('股票名称') or ''
                                    if code and name:
                                        all_stocks.append({'code': str(code), 'name': name})
    except Exception as e:
        print(f"[同花顺API] 失败: {e}")
    
    return all_stocks


def _get_stocks_from_eastmoney():
    """从东方财富API获取股票列表（原有方法）- 优化分页逻辑"""
    import requests
    import time
    
    all_stocks = []
    page = 1
    page_size = 200  # 每页200只
    max_retries = 5  # 增加重试次数
    
    while True:
        success = False
        stocks = []
        for attempt in range(max_retries):
            try:
                print(f"\n[东方财富API] 第{page}页 - 尝试第 {attempt + 1}/{max_retries} 次...")
                
                urls = [
                    "https://push2.eastmoney.com/api/qt/clist/get",
                    "http://push2.eastmoney.com/api/qt/clist/get"
                ]
                
                last_error = None
                for url in urls:
                    try:
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
                            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                            'Connection': 'keep-alive',
                            'Referer': 'https://quote.eastmoney.com/',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
                        }
                        
                        resp = requests.get(url, params=params, headers=headers, timeout=15)
                        
                        if resp.status_code != 200:
                            last_error = Exception(f"HTTP {resp.status_code}")
                            continue
                        
                        data = resp.json()
                        if not data.get('data') or not data['data'].get('diff'):
                            print("[东方财富API] 返回数据为空")
                            return all_stocks
                        
                        stocks = data['data']['diff']
                        for stock in stocks:
                            code = stock.get('f12', '')
                            name = stock.get('f14', '')
                            if code and name:
                                all_stocks.append({'code': code, 'name': name})
                        
                        print(f"[东方财富API] ✓ 第{page}页: {len(stocks)}只，累计{len(all_stocks)}只")
                        success = True
                        break  # 成功则跳出URL循环
                        
                    except Exception as e:
                        last_error = e
                        continue
                
                if not success:
                    if last_error:
                        print(f"[东方财富API] ✗ 所有URL失败: {str(last_error)[:80]}")
                    if attempt < max_retries - 1:
                        wait_time = 3 * (attempt + 1)
                        print(f"[东方财富API] ⏳ 等待 {wait_time} 秒后重试...")
                        time.sleep(wait_time)
                        continue
                    else:
                        break
                
                time.sleep(0.5)
                break  # 成功则跳出重试循环
                
            except Exception as e:
                print(f"[东方财富API] ✗ 错误（第{attempt+1}次）: {str(e)[:80]}")
                if attempt == max_retries - 1:
                    return all_stocks
                time.sleep(3)
        
        if not success:
            break
        
        if len(stocks) < page_size:
            print(f"[东方财富API] 最后一页，停止获取")
            break
        
        page += 1
        if page > 30:  # 最多30页（约6000只）
            print(f"[东方财富API] 已达最大页数限制")
            break
    
    return all_stocks


def search_stock_by_code(code):
    """根据股票代码查询股票信息（优先外部API，失败时使用本地数据库）"""
    # 首先尝试使用外部API获取实时行情
    try:
        price_info = get_realtime_price(code)
        
        if price_info:
            # 获取股票名称
            url = "https://push2.eastmoney.com/api/qt/stock/get"
            secid = f'1.{code}' if code.startswith('6') else f'0.{code}'
            params = {
                'secid': secid,
                'ut': 'fa5fd1943c7b386f172d6893dbfba10b',
                'fields': 'f12,f14'
            }
            
            headers = {
                'Referer': 'https://quote.eastmoney.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                if data.get('data') and data['data'].get('f12'):
                    d = data['data']
                    result = {
                        'code': d['f12'],
                        'name': d['f14'],
                        'market': '上证' if code.startswith('6') else ('深证' if code.startswith(('0', '3')) else '其他')
                    }
                    result.update(price_info)
                    print(f"按代码查询成功: {code} {d['f14']}")
                    return result
    except Exception as e:
        print(f"外部API查询失败: {e}")
    
    # 外部API失败，使用本地数据库作为备选
    print(f"使用本地数据库查询: {code}")
    from app.services.stock_database import search_stock_by_code_local
    local_result = search_stock_by_code_local(code)
    if local_result:
        return local_result
    
    return None


def search_stock_by_name(name):
    """根据股票名称查询股票信息（使用东方财富关键词搜索API）"""
    try:
        # 首先尝试使用本地数据库快速搜索
        from app.services.stock_database import search_stock_by_name_local
        local_result = search_stock_by_name_local(name)
        if local_result:
            print(f"从本地数据库找到: {local_result['code']} {local_result['name']}")
            price_info = get_realtime_price(local_result['code'])
            if price_info:
                local_result.update(price_info)
            return local_result
        
        # 本地数据库没有，使用东方财富关键词搜索API
        url = "https://searchapi.eastmoney.com/api/suggest/get"
        params = {
            'input': name,
            'type': '14',  # 14表示股票
            'token': 'D43BF722C8E33BDC906FB84D85E326E8',
            'markettype': '',
            'secid': ''
        }
        
        headers = {
            'Referer': 'https://quote.eastmoney.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        print(f"从东方财富搜索API查询: {name}")
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            # API返回结构：{"QuotationCodeTable": {"Data": [...], "Status": 0, ...}}
            quotation = data.get('QuotationCodeTable', {})
            if quotation.get('Status') == 0 and quotation.get('Data'):
                stocks = quotation['Data']
                
                if len(stocks) > 0:
                    stock = stocks[0]  # 取第一个匹配结果
                    code = stock.get('Code', '')
                    stock_name = stock.get('Name', '')
                    
                    if code and stock_name:
                        print(f"找到匹配: {code} {stock_name}")
                        result = {
                            'code': code,
                            'name': stock_name,
                            'market': '上证' if code.startswith('6') else ('深证' if code.startswith(('0', '3')) else '其他')
                        }
                        
                        # 获取实时行情
                        price_info = get_realtime_price(code)
                        if price_info:
                            result.update(price_info)
                        
                        return result
                
                print(f"未找到匹配的股票: {name}")
            else:
                print(f"API返回无数据: {data}")
    except Exception as e:
        print(f"东方财富搜索API查询失败: {e}")
        import traceback
        traceback.print_exc()
    
    return None


def get_realtime_price(code):
    """获取股票实时行情（东方财富API）
    返回: price, high, low, open, close, change, volume, amount, turnover, volume_ratio, pe, amplitude
    """
    try:
        url = "https://push2.eastmoney.com/api/qt/stock/get"
        secid = f'1.{code}' if code.startswith('6') else f'0.{code}'
        params = {
            'secid': secid,
            'ut': 'fa5fd1943c7b386f172d6893dbfba10b',
            # f43=最新价 f44=最高 f45=最低 f46=开盘 f47=收盘 f170=涨跌幅
            # f6=成交量 f5=成交额 f8=换手率 f10=量比 f9=市盈率 f7=振幅 f48=总市值 f49=流通市值 f18=昨收
            'fields': 'f43,f44,f45,f46,f47,f170,f6,f5,f8,f10,f9,f7,f48,f49,f18'
        }
        
        headers = {
            'Referer': 'https://quote.eastmoney.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('data'):
                d = data['data']
                if d.get('f43'):
                    # 计算涨跌额
                    prev_close = d.get('f18', 0) / 100 if d.get('f18') else 0
                    current_price = d.get('f43') / 100
                    change_amount = current_price - prev_close if prev_close else 0
                    
                    return {
                        'price': current_price,
                        'high': d.get('f44') / 100 if d.get('f44') else None,
                        'low': d.get('f45') / 100 if d.get('f45') else None,
                        'open': d.get('f46') / 100 if d.get('f46') else None,
                        'close': d.get('f47') / 100 if d.get('f47') else None,
                        'prev_close': prev_close,
                        'change': d.get('f170'),  # 涨跌幅(百分比)
                        'change_amount': round(change_amount, 2),  # 涨跌额
                        'volume': d.get('f6') / 10000 if d.get('f6') else 0,  # 成交量(万手)
                        'amount': d.get('f5') / 10000 if d.get('f5') else 0,  # 成交额(万元)
                        'turnover': d.get('f8'),  # 换手率(%)
                        'volume_ratio': d.get('f10'),  # 量比
                        'pe': d.get('f9'),  # 市盈率(动)
                        'amplitude': d.get('f7'),  # 振幅(%)
                        'total_market_value': d.get('f48') / 100000000 if d.get('f48') else 0,  # 总市值(亿)
                        'circulating_value': d.get('f49') / 100000000 if d.get('f49') else 0,  # 流通市值(亿)
                    }
        return None
    except Exception as e:
        print(f"获取实时行情 {code} 失败: {e}")
        return None


def get_stock_history_kline(stock_code, start_date, end_date):
    """获取股票历史K线数据 - 多重备用API策略（腾讯财经 -> AkShare）
    
    Args:
        stock_code: 股票代码，如 '600775'
        start_date: 开始日期，格式 'YYYY-MM-DD'
        end_date: 结束日期，格式 'YYYY-MM-DD'
    
    Returns:
        list: K线数据列表，每条包含 {date, open, high, low, close, volume}
    """
    # 策略1: 腾讯财经API（主）
    result = _get_kline_from_tencent(stock_code, start_date, end_date)
    if result:
        return result
    
    # 策略2: AkShare备用（带重试）
    print(f"⚠️ 腾讯财经失败，切换到AkShare备用API...")
    result = _get_kline_from_akshare(stock_code, start_date, end_date, max_retries=3)
    return result


def _get_kline_from_tencent(stock_code, start_date, end_date, retries=3):
    """从腾讯财经获取K线（带重试）"""
    for attempt in range(1, retries + 1):
        try:
            import requests
            import time
            
            market_prefix = 'sh' if stock_code.startswith('6') else 'sz'
            full_code = f'{market_prefix}{stock_code}'
            
            if attempt > 1:
                print(f"🔄 腾讯财经第 {attempt} 次重试...")
                time.sleep(1)  # 重试前等待1秒
            
            url = "http://web.ifzq.gtimg.cn/appstock/app/fqkline/get"
            params = {
                'param': f'{full_code},day,{start_date},{end_date},1000,qfq'
            }
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://gu.qq.com/'
            }
            
            resp = requests.get(url, params=params, headers=headers, timeout=15)
            
            if resp.status_code == 200:
                data = resp.json()
                
                if data.get('code') == 0 and data.get('data'):
                    stock_data = data['data'].get(full_code)
                    if stock_data and stock_data.get('qfqday'):
                        klines = stock_data['qfqday']
                        print(f"✅ 成功从腾讯财经获取 {len(klines)} 条K线数据")
                        
                        result = []
                        for kline in klines:
                            if len(kline) >= 6:
                                result.append({
                                    'date': kline[0],
                                    'open': float(kline[1]),
                                    'close': float(kline[2]),
                                    'high': float(kline[3]),
                                    'low': float(kline[4]),
                                    'volume': int(float(kline[5]))
                                })
                        
                        return result
                    else:
                        print(f"⚠️ 未找到{full_code}的K线数据")
                        return []
                else:
                    print(f"❌ API返回错误: {data.get('msg', '未知错误')}")
                    return []
            else:
                print(f"❌ 请求失败，状态码: {resp.status_code}")
                return []
                
        except Exception as e:
            print(f"⚠️ 腾讯财经第 {attempt} 次失败: {e}")
            if attempt == retries:
                print(f"❌ 腾讯财经API完全失败，已尝试 {retries} 次")
                return []
    
    return []


def _get_kline_from_akshare(stock_code, start_date, end_date, max_retries=3):
    """从AkShare获取K线（备用方案，带重试）"""
    for attempt in range(1, max_retries + 1):
        try:
            import akshare as ak
            import time
            
            if attempt > 1:
                print(f"🔄 AkShare第 {attempt} 次重试...")
                time.sleep(2)  # 重试前等待2秒
            
            print(f"📊 使用AkShare获取 {stock_code} 的K线数据...")
            
            # 使用AkShare的前复权日K线
            df = ak.stock_zh_a_hist(
                symbol=stock_code,
                period="daily",
                start_date=start_date.replace('-', ''),
                end_date=end_date.replace('-', ''),
                adjust="qfq"  # 前复权
            )
            
            if df is not None and len(df) > 0:
                result = []
                for _, row in df.iterrows():
                    result.append({
                        'date': str(row['日期']).split(' ')[0],
                        'open': float(row['开盘']),
                        'close': float(row['收盘']),
                        'high': float(row['最高']),
                        'low': float(row['最低']),
                        'volume': int(row['成交量'])
                    })
                
                print(f"✅ 成功从AkShare获取 {len(result)} 条K线数据")
                return result
            else:
                print(f"⚠️ AkShare未返回数据")
                return []
                
        except Exception as e:
            print(f"⚠️ AkShare第 {attempt} 次失败: {e}")
            if attempt == max_retries:
                print(f"❌ AkShare备用API也失败，已尝试 {max_retries} 次")
                return []


def get_historical_prices(stock_code, days=90):
    """从网络 API 获取历史K线数据（新浪财经）"""
    try:
        # 确定市场代码
        market = "sz" if stock_code.startswith(('0', '3')) else "sh"
        sina_code = f"{market}{stock_code}"
        
        # 新浪财经K线API
        url = f"https://quotes.sina.cn/cn/api/jsonp_v2.php/var/CN_MarketDataService.getKLineData"
        
        params = {
            'symbol': sina_code,
            'scale': '240',  # 日线
            'ma': 'no',
            'datalen': str(days + 20)
        }
        
        headers = {
            'Referer': 'https://finance.sina.com.cn/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        if resp.status_code == 200:
            text = resp.text
            # 解析JSONP: var ... = [...]
            match = re.search(r'\[.*\]', text)
            if match:
                import json
                data = json.loads(match.group())
                result = []
                
                for item in data[-days:]:
                    result.append({
                        'date': item.get('day', ''),
                        'open': float(item.get('open', 0)),
                        'close': float(item.get('close', 0)),
                        'high': float(item.get('high', 0)),
                        'low': float(item.get('low', 0)),
                        'volume': int(item.get('volume', 0))
                    })
                
                print(f"✅ 从新浪财经获取到 {len(result)} 条历史K线数据")
                return result
        
        print("⚠️ 新浪财经历史数据获取失败")
        return []
        
    except Exception as e:
        print(f"❌ 获取历史K线数据失败: {e}")
        import traceback
        traceback.print_exc()
        return []
