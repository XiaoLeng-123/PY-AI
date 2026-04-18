import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { getCache, setCache } from '../utils/cache'
import { exportStatsData } from '../utils/export'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function StatisticsPage({ selectedStock, stocks }) {
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [localSelectedStock, setLocalSelectedStock] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const dropdownRef = useRef(null)
  
  useEffect(() => {
    if (stocks && stocks.length > 0 && !localSelectedStock) {
      setLocalSelectedStock(stocks[0].id.toString())
    }
  }, [stocks])
  
  const currentStock = localSelectedStock || selectedStock
  
  const filteredStocks = searchText.trim()
    ? stocks.filter(s => 
        s.code.toLowerCase().includes(searchText.toLowerCase().trim()) || 
        s.name.toLowerCase().includes(searchText.toLowerCase().trim()) ||
        s.code.includes(searchText.trim())
      )
    : stocks
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSearchOpen(false)
        setSearchText('')
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  useEffect(() => {
    if (currentStock) {
      loadStats()
    }
  }, [currentStock])
  
  const loadStats = async () => {
    if (!currentStock) return
    
    setStatsLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/stats/${currentStock}`)
      setStats(response.data)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      setStatsLoading(false)
    }
  }
  
  const handleExport = () => {
    if (!stats) {
      toast.warning('没有可导出的数据')
      return
    }
    const result = exportStatsData(stats, stocks.find(s => s.id === Number(currentStock)))
    if (result.success) {
      toast.success('导出成功')
    }
  }
  
  if (!currentStock) {
    return (
      <div className="page-content">
        <div className="empty-state-large">
          <div className="empty-icon">📉</div>
          <h4>请先选择股票</h4>
          <p>在左侧菜单选择一只股票查看统计数据</p>
        </div>
      </div>
    )
  }
  
  if (statsLoading) {
    return (
      <div className="page-content">
        <div className="loading-state">
          <div className="spinner">⏳</div>
          <div>加载中...</div>
        </div>
      </div>
    )
  }
  
  if (!stats) {
    return (
      <div className="page-content">
        <div className="empty-state-large">
          <div className="empty-icon">📊</div>
          <h4>暂无数据</h4>
          <p>该股票暂无统计数据</p>
        </div>
      </div>
    )
  }
  
  const stock = stocks.find(s => s.id === Number(currentStock))
  
  return (
    <div className="page-content">
      {/* 页面头部 */}
      <div className="dashboard-header-card" style={{ position: 'relative', zIndex: 100 }}>
        <div className="header-left">
          <div className="header-icon">📊</div>
          <div className="header-info">
            <h3>统计分析</h3>
            <p>{stock?.name}({stock?.code}) 专业分析</p>
          </div>
        </div>
        <div className="header-right">
          {/* 股票选择下拉框 - WatchlistPage样式 */}
          <div ref={dropdownRef} className="apple-dropdown-wrapper" style={{ position: 'relative', zIndex: 10000 }}>
            <div
              onClick={() => setSearchOpen(!searchOpen)}
              className="apple-select-trigger"
            >
              <div className="select-content">
                {stock ? (
                  <div className="selected-stock">
                    <span className="stock-code">{stock.code}</span>
                    <span className="stock-name">{stock.name}</span>
                  </div>
                ) : <span className="placeholder">请选择股票</span>}
              </div>
              <span className="dropdown-arrow">▼</span>
            </div>
            
            {searchOpen && (
              <div className="apple-dropdown">
                <div className="dropdown-search">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="搜索代码或名称"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="apple-input search-input"
                    autoFocus
                  />
                </div>
                
                <div className="dropdown-list">
                  {filteredStocks.length === 0 ? (
                    <div className="apple-empty">
                      <div className="empty-icon">🔍</div>
                      <div>未找到匹配股票</div>
                    </div>
                  ) : (
                    filteredStocks.map(s => (
                      <div
                        key={s.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setLocalSelectedStock(s.id.toString())
                          setSearchOpen(false)
                          setSearchText('')
                        }}
                        className={`apple-dropdown-item ${currentStock === s.id.toString() ? 'active' : ''}`}
                      >
                        <div className="item-left">
                          <span className="item-code">{s.code}</span>
                          <span className="item-name">{s.name}</span>
                        </div>
                        <span className="item-tag">{s.market}</span>
                      </div>
                    ))
                  )}
                </div>
                
                {filteredStocks.length > 0 && (
                  <div className="dropdown-stats">
                    共 <strong>{filteredStocks.length}</strong> 只股票
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={handleExport} className="btn-secondary pill-btn btn-sm">
            📥 导出
          </button>
        </div>
      </div>
      
      {/* 标签页切换 */}
      <div className="apple-segmented-control" style={{
        marginBottom: '24px',
        animation: 'fadeInUp 0.5s ease 0.1s',
        animationFillMode: 'backwards'
      }}>
        <button className={`segmented-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 概览</button>
        <button className={`segmented-btn ${activeTab === 'returns' ? 'active' : ''}`} onClick={() => setActiveTab('returns')}>💹 收益</button>
        <button className={`segmented-btn ${activeTab === 'risk' ? 'active' : ''}`} onClick={() => setActiveTab('risk')}>⚠️ 风险</button>
        <button className={`segmented-btn ${activeTab === 'ma' ? 'active' : ''}`} onClick={() => setActiveTab('ma')}>📈 均线</button>
        <button className={`segmented-btn ${activeTab === 'volume' ? 'active' : ''}`} onClick={() => setActiveTab('volume')}>💹 量价</button>
      </div>
      
      {/* 概览 */}
      {activeTab === 'overview' && (
        <div className="dashboard-stats-grid" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>价格指标</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>最新价格</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💰</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>¥{stats.latest_price.toFixed(2)}</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.total_return >= 0 
              ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              : 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>收益指标</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>累计收益率</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📈</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>
              {stats.total_return >= 0 ? '+' : ''}{stats.total_return}%
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>胜率指标</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>交易胜率</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎯</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.win_rate}%</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.trend === '多头排列'
              ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>趋势指标</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>均线趋势</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📊</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.trend}</div>
          </div>
        </div>
      )}
      
      {/* 收益 */}
      {activeTab === 'returns' && (
        <div className="dashboard-stats-grid" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.return_5d >= 0 
              ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              : 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>短期收益</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>近5日收益</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>5️⃣</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>
              {stats.return_5d >= 0 ? '+' : ''}{stats.return_5d}%
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.return_10d >= 0 
              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              : 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>短期收益</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>近10日收益</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔟</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>
              {stats.return_10d >= 0 ? '+' : ''}{stats.return_10d}%
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>涨跌统计</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>上涨天数</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📈</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.up_days}天</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>涨跌统计</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>下跌天数</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📉</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.down_days}天</div>
          </div>
        </div>
      )}
      
      {/* 风险 */}
      {activeTab === 'risk' && (
        <div className="dashboard-stats-grid" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>风险指标</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>最大回撤</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚠️</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.max_drawdown}%</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>风险指标</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>年化波动率</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📊</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.annualized_volatility}%</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>收益风险比</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>夏普比率</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎯</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.sharpe_ratio}</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>技术指标</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>RSI 相对强弱</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💡</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.rsi}</div>
          </div>
        </div>
      )}
      
      {/* 均线 */}
      {activeTab === 'ma' && (
        <div className="dashboard-stats-grid" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>均线指标</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>MA5 五日</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>5️⃣</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>¥{stats.ma5.toFixed(2)}</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>均线指标</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>MA10 十日</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔟</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>¥{stats.ma10.toFixed(2)}</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>均线指标</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>MA20 二十日</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>2️⃣</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>¥{stats.ma20.toFixed(2)}</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>技术位</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>支撑位</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📍</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>¥{stats.support.toFixed(2)}</div>
          </div>
        </div>
      )}
      {/* 量价分析 */}
      {activeTab === 'volume' && (
        <div className="dashboard-stats-grid" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>资金流向</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>OBV 能量潮</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💹</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.obv > 0 ? '+' : ''}{(stats.obv / 1000000).toFixed(2)}M</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.volume_ratio > 1.5
              ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              : stats.volume_ratio < 0.5
              ? 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)'
              : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>成交活跃度</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>成交量比</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📊</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.volume_ratio.toFixed(2)}</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>机构成本</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>VWAP 成交量加权均价</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💰</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>¥{stats.vwap.toFixed(2)}</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.mfi > 80
              ? 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)'
              : stats.mfi < 20
              ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>超买超卖</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>MFI 资金流量指标</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎯</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.mfi.toFixed(1)}</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.cmf > 0.1
              ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              : stats.cmf < -0.1
              ? 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)'
              : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>资金进出</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>CMF 柴金资金流量</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💎</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.cmf.toFixed(3)}</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.atr > 0.5
              ? 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)'
              : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>波动能量</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>ATR 平均真实波幅</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚡</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{stats.atr.toFixed(2)}</div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: '4px' }}>成交规模</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>平均成交量</div>
              </div>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📈</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>{(stats.avg_volume / 10000).toFixed(0)}万</div>
          </div>
        </div>
      )}
    </div>
  )
}
