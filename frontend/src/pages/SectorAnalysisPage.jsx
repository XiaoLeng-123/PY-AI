import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function SectorAnalysisPage() {
  const [sectors, setSectors] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [rankings, setRankings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedSector, setSelectedSector] = useState(null)
  const [sectorStocks, setSectorStocks] = useState([])
  const [showStocksModal, setShowStocksModal] = useState(false)
  const [sortBy, setSortBy] = useState('change_pct') // change_pct, amount, main_net_inflow
  const [filterType, setFilterType] = useState('all') // all, rising, falling
  
  useEffect(() => {
    loadOverview()
    loadRankings()
  }, [])
  
  const loadOverview = async () => {
    try {
      const response = await axios.get(`${API_BASE}/advanced/sectors/overview`)
      if (response.data.success) {
        setSectors(response.data.sectors)
        setStatistics(response.data.statistics)
      } else {
        toast.error(response.data.message || '加载板块数据失败')
      }
    } catch (error) {
      console.error('加载概况失败:', error)
      toast.error('无法连接服务器')
    }
  }
  
  const loadRankings = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/advanced/sectors/rankings`)
      if (response.data.success) {
        setRankings(response.data)
      } else {
        toast.error(response.data.message || '加载排行失败')
      }
    } catch (error) {
      console.error('加载排行失败:', error)
      toast.error('无法获取板块排行数据')
    } finally {
      setLoading(false)
    }
  }
  
  const loadSectorStocks = async (sectorCode, sectorName) => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/advanced/sectors/${sectorCode}/stocks`)
      if (response.data.success) {
        setSectorStocks(response.data.stocks)
        setSelectedSector({ code: sectorCode, name: sectorName })
        setShowStocksModal(true)
      } else {
        toast.error(response.data.message || '加载成分股失败')
      }
    } catch (error) {
      console.error('加载成分股失败:', error)
      toast.error('无法获取板块成分股')
    } finally {
      setLoading(false)
    }
  }
  
  // 过滤和排序板块
  const filteredAndSortedSectors = sectors
    .filter(sector => {
      if (filterType === 'rising') return sector.change_pct > 0
      if (filterType === 'falling') return sector.change_pct < 0
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'change_pct') return b.change_pct - a.change_pct
      if (sortBy === 'amount') return b.amount - a.amount
      if (sortBy === 'main_net_inflow') return b.main_net_inflow - a.main_net_inflow
      return 0
    })
  
  return (
    <div className="page-content">
      {/* 头部卡片 */}
      <div className="sector-header-card">
        <div className="header-icon">📊</div>
        <div className="header-info">
          <h3>板块分析</h3>
          <p>实时查看行业板块涨跌排行、资金流向与成分股分析</p>
        </div>
        <button onClick={loadOverview} className="btn-primary pill-btn" disabled={loading}>
          {loading ? '加载中...' : '🔄 刷新'}
        </button>
      </div>
      
      {/* 统计概览 */}
      {statistics && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h4 className="section-title">📈 市场概况</h4>
          <div className="sector-stats-grid">
            <div className="sector-stat-card">
              <div className="stat-label">板块总数</div>
              <div className="stat-value primary">{statistics.total_sectors}</div>
            </div>
            <div className="sector-stat-card">
              <div className="stat-label">上涨板块</div>
              <div className="stat-value positive">{statistics.rising_sectors}</div>
            </div>
            <div className="sector-stat-card">
              <div className="stat-label">下跌板块</div>
              <div className="stat-value negative">{statistics.falling_sectors}</div>
            </div>
            <div className="sector-stat-card">
              <div className="stat-label">平均涨跌幅</div>
              <div className={`stat-value ${statistics.avg_change_pct >= 0 ? 'positive' : 'negative'}`}>
                {statistics.avg_change_pct >= 0 ? '+' : ''}{statistics.avg_change_pct}%
              </div>
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#999', textAlign: 'right' }}>
            更新时间: {statistics.update_time}
          </div>
        </div>
      )}
      
      {/* 查询控制区 - 药丸形状 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="query-control-bar">
          <div className="control-item">
            <label className="control-label">筛选类型</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="apple-select"
            >
              <option value="all">全部板块</option>
              <option value="rising">仅看上涨</option>
              <option value="falling">仅看下跌</option>
            </select>
          </div>
          <div className="control-item">
            <label className="control-label">排序方式</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="apple-select"
            >
              <option value="change_pct">按涨跌幅</option>
              <option value="amount">按成交额</option>
              <option value="main_net_inflow">按主力净流入</option>
            </select>
          </div>
          <button 
            onClick={loadRankings} 
            className="btn-primary pill-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                加载中...
              </>
            ) : (
              <>
                <span className="btn-icon">🔍</span>
                查询排行
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* 板块列表 - 网格布局 */}
      {filteredAndSortedSectors.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h4 className="section-title">🏢 行业板块列表</h4>
          <div className="sector-grid">
            {filteredAndSortedSectors.map((sector, index) => (
              <div 
                key={sector.code}
                className={`sector-card ${sector.change_pct >= 0 ? 'positive' : 'negative'}`}
                onClick={() => loadSectorStocks(sector.code, sector.name)}
              >
                <div className="sector-rank">#{index + 1}</div>
                <div className="sector-name">{sector.name}</div>
                <div className="sector-change">
                  {sector.change_pct >= 0 ? '+' : ''}{sector.change_pct}%
                </div>
                <div className="sector-details">
                  <div className="detail-row">
                    <span>成交额:</span>
                    <strong>{sector.amount}亿</strong>
                  </div>
                  <div className="detail-row">
                    <span>主力:</span>
                    <strong className={sector.main_net_inflow >= 0 ? 'positive' : 'negative'}>
                      {sector.main_net_inflow >= 0 ? '+' : ''}{sector.main_net_inflow}万
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>成分股:</span>
                    <strong>{sector.stock_count}只</strong>
                  </div>
                  <div className="detail-row">
                    <span>涨/跌:</span>
                    <strong>
                      <span className="positive">{sector.rise_count}</span> / 
                      <span className="negative">{sector.fall_count}</span>
                    </strong>
                  </div>
                </div>
                {sector.leading_stock && (
                  <div className="leading-stock">
                    领涨: {sector.leading_stock} ({sector.leading_stock_change >= 0 ? '+' : ''}{sector.leading_stock_change}%)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 涨跌排行 */}
      {rankings && rankings.gainers.length > 0 && (
        <div className="rankings-grid">
          <div className="ranking-card gainers">
            <h4 className="ranking-title">📈 涨幅Top 20</h4>
            <table className="data-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>板块</th>
                  <th>涨跌幅</th>
                  <th>成交额</th>
                  <th>主力流入</th>
                </tr>
              </thead>
              <tbody>
                {rankings.gainers.map((sector, i) => (
                  <tr key={i} onClick={() => loadSectorStocks(sector.code, sector.name)} style={{ cursor: 'pointer' }}>
                    <td><span className="rank-badge top">{i + 1}</span></td>
                    <td><strong>{sector.name}</strong></td>
                    <td className="positive">+{sector.change_pct}%</td>
                    <td>{sector.amount}亿</td>
                    <td className="positive">+{sector.main_net_inflow}万</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="ranking-card losers">
            <h4 className="ranking-title">📉 跌幅Top 20</h4>
            <table className="data-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>板块</th>
                  <th>涨跌幅</th>
                  <th>成交额</th>
                  <th>主力流出</th>
                </tr>
              </thead>
              <tbody>
                {rankings.losers.map((sector, i) => (
                  <tr key={i} onClick={() => loadSectorStocks(sector.code, sector.name)} style={{ cursor: 'pointer' }}>
                    <td><span className="rank-badge bottom">{i + 1}</span></td>
                    <td><strong>{sector.name}</strong></td>
                    <td className="negative">{sector.change_pct}%</td>
                    <td>{sector.amount}亿</td>
                    <td className="negative">{sector.main_net_inflow}万</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* 成分股弹窗 */}
      {showStocksModal && selectedSector && (
        <div className="apple-modal-overlay" onClick={() => setShowStocksModal(false)}>
          <div className="apple-modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>📋 {selectedSector.name} - 成分股</h3>
                <p>共 {sectorStocks.length} 只股票</p>
              </div>
              <button onClick={() => setShowStocksModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              {sectorStocks.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>代码</th>
                      <th>名称</th>
                      <th>最新价</th>
                      <th>涨跌幅</th>
                      <th>成交量</th>
                      <th>成交额</th>
                      <th>换手率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectorStocks.map((stock, i) => (
                      <tr key={i}>
                        <td>{stock.code}</td>
                        <td><strong>{stock.name}</strong></td>
                        <td>¥{stock.close_price.toFixed(2)}</td>
                        <td className={stock.change_pct >= 0 ? 'positive' : 'negative'}>
                          {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct}%
                        </td>
                        <td>{stock.volume}万手</td>
                        <td>{stock.amount}万</td>
                        <td>{stock.turnover_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  暂无成分股数据
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
