import { useState, useEffect } from 'react'
import axios from 'axios'
import { getCache, setCache } from '../utils/cache'
import { exportStatsData } from '../utils/export'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function StatisticsPage({ selectedStock, stocks }) {
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  useEffect(() => {
    if (selectedStock) {
      loadStats()
    }
  }, [selectedStock])
  
  const loadStats = async () => {
    if (!selectedStock) return
    
    setStatsLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/stats/${selectedStock}`)
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
    const result = exportStatsData(stats, stocks.find(s => s.id === Number(selectedStock)))
    if (result.success) {
      toast.success('导出成功')
    }
  }
  
  if (!selectedStock) {
    return (
      <div className="page-content">
        <div className="card">
          <h3>📉 统计分析</h3>
          <p>请先在顶部选择一只股票查看统计数据</p>
        </div>
      </div>
    )
  }
  
  if (statsLoading) {
    return <div className="loading">加载中...</div>
  }
  
  if (!stats) {
    return (
      <div className="page-content">
        <div className="card">
          <h3>暂无数据</h3>
        </div>
      </div>
    )
  }
  
  const stock = stocks.find(s => s.id === Number(selectedStock))
  
  return (
    <div className="page-content">
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h3>📈 {stock?.name}({stock?.code}) 专业分析</h3>
          <button onClick={handleExport} className="btn-secondary">📥 导出数据</button>
        </div>
        
        {/* 标签页 */}
        <div className="tabs" style={{marginBottom: '20px'}}>
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>概览</button>
          <button className={`tab ${activeTab === 'returns' ? 'active' : ''}`} onClick={() => setActiveTab('returns')}>收益</button>
          <button className={`tab ${activeTab === 'risk' ? 'active' : ''}`} onClick={() => setActiveTab('risk')}>风险</button>
          <button className={`tab ${activeTab === 'ma' ? 'active' : ''}`} onClick={() => setActiveTab('ma')}>均线</button>
        </div>
        
        {activeTab === 'overview' && (
          <div className="stat-cards">
            <div className="stat-box">
              <div className="label">最新价</div>
              <div className="value primary">¥{stats.latest_price.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="label">累计收益</div>
              <div className={`value ${stats.total_return >= 0 ? 'success' : 'danger'}`}>
                {stats.total_return >= 0 ? '+' : ''}{stats.total_return}%
              </div>
            </div>
            <div className="stat-box">
              <div className="label">胜率</div>
              <div className="value">{stats.win_rate}%</div>
            </div>
            <div className="stat-box">
              <div className="label">趋势</div>
              <div className={`value ${stats.trend === '多头排列' ? 'success' : 'danger'}`}>{stats.trend}</div>
            </div>
          </div>
        )}
        
        {activeTab === 'returns' && (
          <div className="stat-cards">
            <div className="stat-box">
              <div className="label">近5日</div>
              <div className={`value ${stats.return_5d >= 0 ? 'success' : 'danger'}`}>{stats.return_5d}%</div>
            </div>
            <div className="stat-box">
              <div className="label">近10日</div>
              <div className={`value ${stats.return_10d >= 0 ? 'success' : 'danger'}`}>{stats.return_10d}%</div>
            </div>
            <div className="stat-box">
              <div className="label">上涨天数</div>
              <div className="value success">{stats.up_days}天</div>
            </div>
            <div className="stat-box">
              <div className="label">下跌天数</div>
              <div className="value danger">{stats.down_days}天</div>
            </div>
          </div>
        )}
        
        {activeTab === 'risk' && (
          <div className="stat-cards">
            <div className="stat-box">
              <div className="label">最大回撤</div>
              <div className="value danger">{stats.max_drawdown}%</div>
            </div>
            <div className="stat-box">
              <div className="label">波动率</div>
              <div className="value">{stats.annualized_volatility}%</div>
            </div>
            <div className="stat-box">
              <div className="label">夏普比率</div>
              <div className="value">{stats.sharpe_ratio}</div>
            </div>
            <div className="stat-box">
              <div className="label">RSI</div>
              <div className="value">{stats.rsi}</div>
            </div>
          </div>
        )}
        
        {activeTab === 'ma' && (
          <div className="stat-cards">
            <div className="stat-box">
              <div className="label">MA5</div>
              <div className="value">¥{stats.ma5.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="label">MA10</div>
              <div className="value">¥{stats.ma10.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="label">MA20</div>
              <div className="value">¥{stats.ma20.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="label">支撑位</div>
              <div className="value success">¥{stats.support.toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
