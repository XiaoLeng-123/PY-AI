import React, { useState, useEffect } from 'react'
import { stockAPI } from '../../utils/api'
import StockChart from '../Charts/StockChart'
import RealtimePrice from '../Charts/RealtimePrice'
import axios from 'axios'
import { exportPriceData } from '../../utils/export'

const DataViewPage = ({ stocks, toast }) => {
  const [selectedStock, setSelectedStock] = useState(null)
  const [priceData, setPriceData] = useState([])
  const [indicators, setIndicators] = useState({})
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState('30')
  const [moneyflow, setMoneyflow] = useState(null)
  const [period, setPeriod] = useState('day')

  // 股票下拉框状态
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false)
  const [stockSearchText, setStockSearchText] = useState('')
  const [stockDropdownRef, setStockDropdownRef] = useState(null)

  useEffect(() => {
    if (stocks && stocks.length > 0 && !selectedStock) {
      setSelectedStock(stocks[0])
    }
  }, [stocks])

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (stockDropdownRef && !stockDropdownRef.contains(e.target)) {
        setStockDropdownOpen(false)
        setStockSearchText('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [stockDropdownRef])

  useEffect(() => {
    if (selectedStock) {
      loadPriceData()
      loadIndicators()
      loadMoneyflow()
    }
  }, [selectedStock, dateRange, period])

  const loadPriceData = async () => {
    setLoading(true)
    try {
      const response = await stockAPI.getPrices(selectedStock.id, { days: dateRange, period })
      const prices = Array.isArray(response.data) ? response.data : []
      setPriceData(prices)
    } catch (error) {
      toast.error('加载数据失败')
      setPriceData([])
    } finally {
      setLoading(false)
    }
  }

  const loadIndicators = async () => {
    try {
      const response = await stockAPI.getIndicators(selectedStock.id, { days: dateRange, period })
      setIndicators(response.data)
    } catch (error) {
      console.error('加载技术指标失败:', error)
    }
  }

  const loadMoneyflow = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:5000/api/advanced/moneyflow`, {
        params: { stock_id: selectedStock.id, days: dateRange }
      })
      setMoneyflow(response.data)
    } catch (error) {
      console.error('加载资金流向失败:', error)
    }
  }

  const handleExportCSV = () => {
    if (!priceData || priceData.length === 0) {
      toast.warning('没有数据可导出')
      return
    }
    const result = exportPriceData(priceData, selectedStock.name)
    if (result.success) {
      toast.success(`成功导出 ${result.rows} 条数据`)
    }
  }

  // 股票模糊搜索
  const filteredStocks = stockSearchText.trim()
    ? stocks.filter(s => 
        s.code.toLowerCase().includes(stockSearchText.toLowerCase().trim()) || 
        s.name.toLowerCase().includes(stockSearchText.toLowerCase().trim()) ||
        s.code.includes(stockSearchText.trim())
      )
    : stocks.slice(0, 100) // 默认只显示前100只

  const handleSelectStock = (stock) => {
    setSelectedStock(stock)
    setStockDropdownOpen(false)
    setStockSearchText('')
  }

  const sortedAsc = [...priceData].sort((a, b) => new Date(a.date) - new Date(b.date))
  const chartData = {
    stock_code: selectedStock?.code,
    stock_name: selectedStock?.name,
    dates: sortedAsc.map(p => p.date),
    opens: sortedAsc.map(p => p.open),
    highs: sortedAsc.map(p => p.high),
    lows: sortedAsc.map(p => p.low),
    closes: sortedAsc.map(p => p.close),
    volumes: sortedAsc.map(p => p.volume)
  }

  const sortedDesc = [...priceData].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="page-content">
      {/* 页面头部卡片 */}
      <div className="dashboard-header-card">
        <div className="header-left">
          <div className="header-icon">📈</div>
          <div className="header-info">
            <h3>数据查看</h3>
            <p>查看股票K线图、技术指标和历史数据</p>
          </div>
        </div>
        <div className="header-right">
          <button onClick={handleExportCSV} className="btn-secondary pill-btn btn-sm">
            📥 导出
          </button>
        </div>
      </div>

      {/* 控制区 - 苹果风格 */}
      <div className="apple-card" style={{
        marginBottom: '20px',
        animation: 'fadeInUp 0.5s ease 0.1s',
        animationFillMode: 'backwards'
      }}>
        <div className="card-header">
          <h3 className="card-title">🎛️ 控制面板</h3>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {/* 股票选择 - WatchlistPage样式 */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'block' }}>选择股票</label>
            <div ref={setStockDropdownRef} className="apple-dropdown-wrapper">
              <div
                onClick={() => setStockDropdownOpen(!stockDropdownOpen)}
                className="apple-select-trigger"
              >
                <div className="select-content">
                  {selectedStock ? (
                    <div className="selected-stock">
                      <span className="stock-code">{selectedStock.code}</span>
                      <span className="stock-name">{selectedStock.name}</span>
                    </div>
                  ) : <span className="placeholder">请选择股票</span>}
                </div>
                <span className="dropdown-arrow">▼</span>
              </div>
              
              {stockDropdownOpen && (
                <div className="apple-dropdown">
                  <div className="dropdown-search">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="搜索代码或名称"
                      value={stockSearchText}
                      onChange={(e) => setStockSearchText(e.target.value)}
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
                          onClick={() => handleSelectStock(s)}
                          className={`apple-dropdown-item ${selectedStock?.id === s.id ? 'active' : ''}`}
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
          </div>

          {/* 时间范围 */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'block' }}>时间范围</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="apple-select"
              style={{ width: '100%' }}
            >
              <option value="7">最近7天</option>
              <option value="30">最近30天</option>
              <option value="90">最近90天</option>
              <option value="180">最近180天</option>
              <option value="365">最近1年</option>
            </select>
          </div>
        </div>
      </div>

      {/* 实时行情显示 */}
      {selectedStock && (
        <div style={{ marginBottom: '20px', animation: 'fadeInUp 0.5s ease 0.2s', animationFillMode: 'backwards' }}>
          <RealtimePrice 
            stockId={selectedStock.id}
            stockCode={selectedStock.code}
            stockName={selectedStock.name}
          />
        </div>
      )}

      {/* 资金流向卡片 */}
      {moneyflow && moneyflow.summary && (
        <div className="apple-card" style={{
          marginBottom: '20px',
          animation: 'fadeInUp 0.5s ease 0.25s',
          animationFillMode: 'backwards'
        }}>
          <div className="card-header">
            <h3 className="card-title">💰 资金流向分析</h3>
            <div className="info-badge">近{dateRange}天</div>
          </div>
          <div className="dashboard-stats-grid">
            <div className={`stat-card-apple ${moneyflow.summary.total_main_flow >= 0 ? 'positive' : 'negative'}`} style={{
              '--card-gradient': moneyflow.summary.total_main_flow >= 0 
                ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                : 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)'
            }}>
              <div className="stat-icon-pill">🏦</div>
              <div className="stat-content">
                <div className="stat-label">主力净流入</div>
                <div className="stat-value" style={{ fontSize: '20px' }}>
                  {moneyflow.summary.total_main_flow >= 0 ? '+' : ''}{(moneyflow.summary.total_main_flow / 10000).toFixed(2)}万
                </div>
              </div>
            </div>
            <div className={`stat-card-apple ${moneyflow.summary.total_retail_flow >= 0 ? 'positive' : 'negative'}`} style={{
              '--card-gradient': moneyflow.summary.total_retail_flow >= 0 
                ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                : 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
            }}>
              <div className="stat-icon-pill">👥</div>
              <div className="stat-content">
                <div className="stat-label">散户净流入</div>
                <div className="stat-value" style={{ fontSize: '20px' }}>
                  {moneyflow.summary.total_retail_flow >= 0 ? '+' : ''}{(moneyflow.summary.total_retail_flow / 10000).toFixed(2)}万
                </div>
              </div>
            </div>
            <div className={`stat-card-apple ${moneyflow.summary.total_net_flow >= 0 ? 'positive' : 'negative'}`} style={{
              '--card-gradient': moneyflow.summary.total_net_flow >= 0 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            }}>
              <div className="stat-icon-pill">📊</div>
              <div className="stat-content">
                <div className="stat-label">总净流入</div>
                <div className="stat-value" style={{ fontSize: '20px' }}>
                  {moneyflow.summary.total_net_flow >= 0 ? '+' : ''}{(moneyflow.summary.total_net_flow / 10000).toFixed(2)}万
                </div>
              </div>
            </div>
            <div className="stat-card-apple" style={{
              '--card-gradient': moneyflow.summary.main_flow_direction === '流入'
                ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                : 'linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%)'
            }}>
              <div className="stat-icon-pill">🎯</div>
              <div className="stat-content">
                <div className="stat-label">主力动向</div>
                <div className="stat-value" style={{ fontSize: '20px' }}>
                  {moneyflow.summary.main_flow_direction === '流入' ? '🟢 流入' : '🔴 流出'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* K线图 */}
      {selectedStock && (
        <div className="apple-card" style={{
          marginBottom: '20px',
          animation: 'fadeInUp 0.5s ease 0.3s',
          animationFillMode: 'backwards'
        }}>
          <div className="card-header">
            <h3 className="card-title">📈 K线图与技术指标</h3>
          </div>
          {loading ? (
            <div className="loading-state">
              <div className="spinner">⏳</div>
              <div>加载中...</div>
            </div>
          ) : priceData.length === 0 ? (
            <div className="empty-state-large">
              <div className="empty-icon">📊</div>
              <h4>暂无数据</h4>
              <p>请确保已为该股票录入价格数据</p>
            </div>
          ) : (
            <StockChart 
              stockData={chartData} 
              indicators={indicators}
              period={period}
              onPeriodChange={setPeriod}
            />
          )}
        </div>
      )}

      {/* 数据表格 */}
      {priceData.length > 0 && (
        <div className="apple-card" style={{
          animation: 'fadeInUp 0.5s ease 0.35s',
          animationFillMode: 'backwards'
        }}>
          <div className="card-header">
            <h3 className="card-title">📋 历史数据明细</h3>
          </div>
          <div className="table-container">
            <table className="data-table apple-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>开盘价</th>
                  <th>最高价</th>
                  <th>最低价</th>
                  <th>收盘价</th>
                  <th>成交量</th>
                  <th>涨跌幅</th>
                </tr>
              </thead>
              <tbody>
                {sortedDesc.slice(0, 50).map((item, index) => {
                  const prevItem = sortedDesc[index + 1]
                  const prevClose = prevItem ? prevItem.close : item.open
                  const change = ((item.close - prevClose) / prevClose * 100).toFixed(2)
                  
                  return (
                    <tr key={item.date}>
                      <td>{item.date}</td>
                      <td>¥{item.open.toFixed(2)}</td>
                      <td>¥{item.high.toFixed(2)}</td>
                      <td>¥{item.low.toFixed(2)}</td>
                      <td className="price-cell">¥{item.close.toFixed(2)}</td>
                      <td>{item.volume.toLocaleString()}</td>
                      <td className={change >= 0 ? 'change-up' : 'change-down'}>
                        {change >= 0 ? '+' : ''}{change}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 筹码分布估算 */}
      {priceData.length > 0 && (
        <div className="apple-card" style={{
          marginTop: '20px',
          animation: 'fadeInUp 0.5s ease 0.4s',
          animationFillMode: 'backwards'
        }}>
          <div className="card-header">
            <h3 className="card-title">🎯 筹码分布估算</h3>
          </div>
          <div>
            {(() => {
              const recentPrices = sortedAsc.slice(-Math.min(60, sortedAsc.length))
              const prices = recentPrices.map(p => p.close)
              const volumes = recentPrices.map(p => p.volume)
              
              if (prices.length === 0) return null
              
              const minPrice = Math.min(...prices)
              const maxPrice = Math.max(...prices)
              const priceRange = maxPrice - minPrice
              const binCount = 10
              const binSize = priceRange / binCount
              
              const bins = Array(binCount).fill(0)
              const binLabels = []
              
              for (let i = 0; i < binCount; i++) {
                const lower = minPrice + i * binSize
                const upper = lower + binSize
                binLabels.push(`${lower.toFixed(2)}-${upper.toFixed(2)}`)
              }
              
              recentPrices.forEach((p, idx) => {
                const binIndex = Math.min(
                  Math.floor((p.close - minPrice) / binSize),
                  binCount - 1
                )
                bins[binIndex] += p.volume
              })
              
              const maxVolume = Math.max(...bins)
              const currentPrice = prices[prices.length - 1]
              
              return (
                <div>
                  <div className="info-banner" style={{ marginBottom: '20px' }}>
                    <div className="info-item">
                      <span>当前价：<strong>¥{currentPrice.toFixed(2)}</strong></span>
                    </div>
                    <div className="info-item">
                      <span>统计周期：近{recentPrices.length}天</span>
                    </div>
                    <div className="info-item">
                      <span>价格区间：¥{minPrice.toFixed(2)} - ¥{maxPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="chip-bars">
                    {bins.map((vol, idx) => {
                      const percentage = (vol / maxVolume * 100).toFixed(1)
                      const [lower, upper] = binLabels[idx].split('-')
                      const isCurrentLevel = parseFloat(lower) <= currentPrice && currentPrice <= parseFloat(upper)
                      
                      return (
                        <div key={idx} className="chip-row">
                          <div className="chip-label">¥{binLabels[idx]}</div>
                          <div className="chip-bar-container">
                            <div className={`chip-bar ${isCurrentLevel ? 'current' : ''}`} style={{ width: `${percentage}%` }} />
                            <div className="chip-bar-text">
                              {(vol / 10000).toFixed(1)}万手 ({percentage}%)
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="chip-tip" style={{
                    marginTop: '20px',
                    padding: '16px',
                    background: 'rgba(102, 126, 234, 0.05)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    fontSize: '14px',
                    color: '#666',
                    lineHeight: '1.6'
                  }}>
                    💡 <strong>筹码集中度分析：</strong>
                    {(() => {
                      const sortedBins = [...bins].sort((a, b) => b - a)
                      const top3Concentration = (sortedBins.slice(0, 3).reduce((a, b) => a + b, 0) / bins.reduce((a, b) => a + b, 0) * 100).toFixed(1)
                      return top3Concentration > 60 
                        ? `前3个价位集中了${top3Concentration}%的筹码，筹码高度集中，主力控盘度较高`
                        : top3Concentration > 40
                        ? `前3个价位集中了${top3Concentration}%的筹码，筹码较为集中`
                        : `筹码分布较分散，市场分歧较大`
                    })()}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default DataViewPage
