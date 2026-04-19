import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { stockAPI } from '../utils/api'
import { getCache, setCache } from '../utils/cache'
import { exportStatsData } from '../utils/export'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function StatisticsPage({ selectedStock, stocks: initialStocks }) {
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [localSelectedStock, setLocalSelectedStock] = useState(null)
  
  // 下拉框状态
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [dropdownStocks, setDropdownStocks] = useState([])
  const [dropdownTotal, setDropdownTotal] = useState(0)
  const [dropdownPage, setDropdownPage] = useState(1)
  const [dropdownLoading, setDropdownLoading] = useState(false)
  const dropdownRef = useRef(null)
  
  const currentStock = localSelectedStock || selectedStock
  
  // 从后端加载下拉框股票列表
  const loadDropdownStocks = useCallback(async () => {
    if (!searchOpen) return
    setDropdownLoading(true)
    try {
      const response = await stockAPI.getAll({
        page: dropdownPage,
        page_size: 20,
        search: searchText
      })
      const data = response.data || {}
      setDropdownStocks(data.items || [])
      setDropdownTotal(data.total || 0)
    } catch (error) {
      console.error('加载股票列表失败:', error)
      setDropdownStocks([])
      setDropdownTotal(0)
    } finally {
      setDropdownLoading(false)
    }
  }, [searchOpen, dropdownPage, searchText])
  
  useEffect(() => {
    loadDropdownStocks()
  }, [loadDropdownStocks])
  
  // 使用后端返回的数据
  const filteredStocks = dropdownStocks
  
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
      console.log('请求统计数据, stock:', currentStock)
      const response = await axios.get(`${API_BASE}/stats/${currentStock}`)
      console.log('API返回数据:', response.data)
      
      // 验证返回数据的完整性
      if (response.data && typeof response.data === 'object') {
        setStats(response.data)
        console.log('数据已设置到state')
      } else {
        toast.error('数据格式错误')
        setStats(null)
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
      toast.error('加载统计数据失败')
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }
  
  const handleExport = () => {
    if (!stats) {
      toast.warning('没有可导出的数据')
      return
    }
    const currentStockData = stock || initialStocks?.find(s => s.id === Number(currentStock))
    const result = exportStatsData(stats, currentStockData)
    if (result.success) {
      toast.success('导出成功')
    }
  }
  
  // 页面主渲染逻辑
  
  const stock = filteredStocks.find(s => s.id === Number(currentStock)) || initialStocks?.find(s => s.id === Number(currentStock))
  
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
          <div ref={dropdownRef} className="apple-dropdown-wrapper" style={{ minWidth: '300px' }}>
            <div
              onClick={() => setSearchOpen(!searchOpen)}
              className="apple-select-trigger"
              style={{ minWidth: '300px' }}
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
                    onChange={(e) => { setSearchText(e.target.value); setDropdownPage(1) }}
                    className="apple-input search-input"
                    autoFocus
                  />
                  {dropdownLoading && <span style={{ marginLeft: '8px' }}>⏳</span>}
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
                
                {/* 分页控制 */}
                {dropdownTotal > 20 && (
                  <div className="dropdown-pagination" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderTop: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    <button 
                      onClick={() => setDropdownPage(p => Math.max(1, p - 1))}
                      disabled={dropdownPage === 1 || dropdownLoading}
                      style={{ 
                        padding: '4px 12px', 
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '6px',
                        background: dropdownPage === 1 ? '#f5f5f5' : '#fff',
                        cursor: dropdownPage === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ← 上一页
                    </button>
                    <span style={{ fontSize: '13px', color: '#666' }}>
                      第 {dropdownPage} 页 / 共 {Math.ceil(dropdownTotal / 20)} 页
                    </span>
                    <button 
                      onClick={() => setDropdownPage(p => p + 1)}
                      disabled={dropdownPage >= Math.ceil(dropdownTotal / 20) || dropdownLoading}
                      style={{ 
                        padding: '4px 12px', 
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '6px',
                        background: dropdownPage >= Math.ceil(dropdownTotal / 20) ? '#f5f5f5' : '#fff',
                        cursor: dropdownPage >= Math.ceil(dropdownTotal / 20) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      下一页 →
                    </button>
                  </div>
                )}
                
                {filteredStocks.length > 0 && (
                  <div className="dropdown-stats">
                    共 <strong>{dropdownTotal}</strong> 只股票，当前显示 {filteredStocks.length} 只
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
      
      {/* 未选择股票提示 */}
      {!currentStock && (
        <div className="apple-card" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="empty-state-large">
            <div className="empty-icon">📉</div>
            <h4>请先选择股票</h4>
            <p>点击上方下拉框选择一只股票查看统计数据</p>
          </div>
        </div>
      )}
      
      {/* 加载中 */}
      {currentStock && statsLoading && (
        <div className="apple-card" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="loading-state">
            <div className="spinner">⏳</div>
            <div>加载中...</div>
          </div>
        </div>
      )}
      
      {/* 暂无数据 */}
      {currentStock && !statsLoading && !stats && (
        <div className="apple-card" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="empty-state-large">
            <div className="empty-icon">📊</div>
            <h4>暂无数据</h4>
            <p>该股票暂无统计数据</p>
          </div>
        </div>
      )}
      
      {/* 概览 */}
      {currentStock && !statsLoading && stats && activeTab === 'overview' && (
        <div className="dashboard-stats-grid" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>价格指标</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>最新价格</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.latest_price !== undefined && stats.latest_price !== null ? 
                    `¥${stats.latest_price.toFixed(2)}` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>💰</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.total_return >= 0 
              ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              : 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>收益指标</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>累计收益率</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.total_return !== undefined && stats.total_return !== null ? 
                    `${stats.total_return >= 0 ? '+' : ''}${stats.total_return}%` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>📈</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>胜率指标</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>交易胜率</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.win_rate !== undefined && stats.win_rate !== null ? 
                    `${stats.win_rate}%` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>🎯</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.trend === '多头排列'
              ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>趋势指标</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>均线趋势</div>
                <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.trend !== undefined && stats.trend !== null ? 
                    stats.trend : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>📊</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 收益 */}
      {currentStock && !statsLoading && stats && activeTab === 'returns' && (
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>短期收益</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>近5日收益</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.return_5d !== undefined && stats.return_5d !== null ? 
                    `${stats.return_5d >= 0 ? '+' : ''}${stats.return_5d}%` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>5️⃣</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.return_10d >= 0 
              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              : 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>短期收益</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>近10日收益</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.return_10d !== undefined && stats.return_10d !== null ? 
                    `${stats.return_10d >= 0 ? '+' : ''}${stats.return_10d}%` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>🔟</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>涨跌统计</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>上涨天数</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.up_days !== undefined && stats.up_days !== null ? 
                    `${stats.up_days}天` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>📈</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>涨跌统计</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>下跌天数</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.down_days !== undefined && stats.down_days !== null ? 
                    `${stats.down_days}天` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>📉</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 风险 */}
      {currentStock && !statsLoading && stats && activeTab === 'risk' && (
        <div className="dashboard-stats-grid" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>风险指标</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>最大回撤</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.max_drawdown !== undefined && stats.max_drawdown !== null ? 
                    `${stats.max_drawdown}%` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>⚠️</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>风险指标</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>年化波动率</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.annualized_volatility !== undefined && stats.annualized_volatility !== null ? 
                    `${stats.annualized_volatility}%` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>📊</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>收益风险比</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>夏普比率</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.sharpe_ratio !== undefined && stats.sharpe_ratio !== null ? 
                    stats.sharpe_ratio : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>🎯</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>技术指标</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>RSI 相对强弱</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.rsi !== undefined && stats.rsi !== null ? 
                    stats.rsi : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>💡</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 均线 */}
      {currentStock && !statsLoading && stats && activeTab === 'ma' && (
        <div className="dashboard-stats-grid" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>均线指标</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>MA5 五日</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.ma5 !== undefined && stats.ma5 !== null ? 
                    `¥${stats.ma5.toFixed(2)}` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>5️⃣</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>均线指标</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>MA10 十日</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.ma10 !== undefined && stats.ma10 !== null ? 
                    `¥${stats.ma10.toFixed(2)}` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>🔟</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>均线指标</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>MA20 二十日</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.ma20 !== undefined && stats.ma20 !== null ? 
                    `¥${stats.ma20.toFixed(2)}` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>2️⃣</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>技术位</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>支撑位</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.support !== undefined && stats.support !== null ? 
                    `¥${stats.support.toFixed(2)}` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>📍</div>
            </div>
          </div>
        </div>
      )}
      {/* 量价分析 */}
      {currentStock && !statsLoading && stats && activeTab === 'volume' && (
        <div className="dashboard-stats-grid" style={{
          animation: 'fadeInUp 0.5s ease 0.2s',
          animationFillMode: 'backwards'
        }}>
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>资金流向</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>OBV 能量潮</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.obv !== undefined && stats.obv !== null ? 
                    `${stats.obv > 0 ? '+' : ''}${(stats.obv / 1000000).toFixed(2)}M` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>💹</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': stats.volume_ratio > 1.5
              ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              : stats.volume_ratio < 0.5
              ? 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)'
              : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>成交活跃度</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>成交量比</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.volume_ratio !== undefined && stats.volume_ratio !== null ? 
                    stats.volume_ratio.toFixed(2) : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>📊</div>
            </div>
          </div>
          
          <div className="stat-card-apple" style={{
            '--card-gradient': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>机构成本</div>
                <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', marginBottom: '12px' }}>VWAP 成交量加权均价</div>
                <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', color: '#fff', letterSpacing: '-0.5px' }}>
                  {stats.vwap !== undefined && stats.vwap !== null ? 
                    `¥${stats.vwap.toFixed(2)}` : 
                    '--'
                  }
                </div>
              </div>
              <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>💰</div>
            </div>
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
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>
              {stats.mfi !== undefined && stats.mfi !== null ? 
                stats.mfi.toFixed(1) : 
                '--'
              }
            </div>
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
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>
              {stats.cmf !== undefined && stats.cmf !== null ? 
                stats.cmf.toFixed(3) : 
                '--'
              }
            </div>
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
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>
              {stats.atr !== undefined && stats.atr !== null ? 
                stats.atr.toFixed(2) : 
                '--'
              }
            </div>
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
            <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: '#fff' }}>
              {stats.avg_volume !== undefined && stats.avg_volume !== null ? 
                `${(stats.avg_volume / 10000).toFixed(0)}万` : 
                '--'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
