import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'
import AppleSelect from '../components/AppleSelect'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function FinancialForecastPage({ stocks }) {
  const [selectedStock, setSelectedStock] = useState('')
  const [forecastData, setForecastData] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  
  // 转换股票数据为选项格式
  const stockOptions = useMemo(() => {
    return stocks.map(s => ({
      value: s.id,
      label: `${s.code} - ${s.name}`,
      code: s.code,
      name: s.name
    }))
  }, [stocks])
  
  const loadForecast = async () => {
    if (!selectedStock) {
      toast.warning('请先选择股票')
      return
    }
    
    setForecastLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/stats/${selectedStock}`)
      setForecastData(response.data)
    } catch (error) {
      toast.error('加载财务数据失败')
    } finally {
      setForecastLoading(false)
    }
  }
  
  const selectedStockData = stocks.find(s => s.id === Number(selectedStock))
  
  return (
    <div className="page-content">
      {/* 头部卡片 */}
      <div className="forecast-header-card">
        <div className="header-icon">💰</div>
        <div className="header-info">
          <h3>财务预报分析</h3>
          <p>基于历史数据预测未来财务表现与估值趋势</p>
        </div>
      </div>
      
      {/* 股票选择区 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <AppleSelect
            options={stockOptions}
            value={selectedStock}
            onChange={setSelectedStock}
            label="选择股票"
            placeholder="搜索股票代码或名称..."
            filterFields={['code', 'name', 'label']}
            width="320px"
          />
          <button 
            onClick={loadForecast} 
            className="btn-primary pill-btn"
            disabled={forecastLoading || !selectedStock}
            style={{ alignSelf: 'flex-end' }}
          >
            {forecastLoading ? (
              <>
                <span className="btn-spinner"></span>
                加载中...
              </>
            ) : (
              <>
                <span className="btn-icon">🔍</span>
                查询
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* 空状态 */}
      {!forecastData && !forecastLoading && (
        <div className="empty-state">
          <div style={{fontSize: '48px', marginBottom: '16px'}}>📊</div>
          <h3>请选择一只股票</h3>
          <p>使用上方的搜索框选择要分析的股票</p>
        </div>
      )}
        
      {forecastData && (
        <div>
          {/* 股票信息卡片 */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>📈</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedStockData?.name || '未知股票'}</h3>
                <p style={{ margin: '4px 0 0 0', color: '#999', fontSize: '14px' }}>
                  {selectedStockData?.code} · {selectedStockData?.market}
                </p>
              </div>
            </div>
          </div>
          
          {/* 核心指标网格 - 药丸形状 */}
          <div className="forecast-metrics-grid" style={{marginBottom: '24px'}}>
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">💵</span>
                <span className="metric-title">最新价</span>
              </div>
              <div className="metric-value primary">
                ¥{forecastData.latest_price.toFixed(2)}
              </div>
            </div>
            
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">📈</span>
                <span className="metric-title">累计收益</span>
              </div>
              <div className={`metric-value ${forecastData.total_return >= 0 ? 'positive' : 'negative'}`}>
                {forecastData.total_return >= 0 ? '+' : ''}{forecastData.total_return}%
              </div>
            </div>
            
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">🎯</span>
                <span className="metric-title">胜率</span>
              </div>
              <div className="metric-value">
                {forecastData.win_rate}%
              </div>
              <div className="metric-detail">
                上涨 {forecastData.up_days} / 下跌 {forecastData.down_days}
              </div>
            </div>
            
            <div className="metric-card-pill danger">
              <div className="metric-header">
                <span className="metric-icon">⚠️</span>
                <span className="metric-title">最大回撤</span>
              </div>
              <div className="metric-value negative">
                {forecastData.max_drawdown}%
              </div>
            </div>
            
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">📊</span>
                <span className="metric-title">波动率</span>
              </div>
              <div className="metric-value">
                {forecastData.annualized_volatility}%
              </div>
            </div>
            
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">⭐</span>
                <span className="metric-title">夏普比率</span>
              </div>
              <div className="metric-value">
                {forecastData.sharpe_ratio}
              </div>
            </div>
          </div>
          
          {/* 技术指标详情 - 大圆角卡片 */}
          <div className="card" style={{marginBottom: '24px'}}>
            <h3 className="section-title">技术指标分析</h3>
            <div className="forecast-details-grid">
              <div className="detail-item">
                <div className="detail-label">RSI (14日)</div>
                <div className={`detail-value ${forecastData.rsi > 70 ? 'danger' : forecastData.rsi < 30 ? 'success' : ''}`}>
                  {forecastData.rsi}
                </div>
                <div className="detail-desc">
                  {forecastData.rsi > 70 ? '超买区' : forecastData.rsi < 30 ? '超卖区' : '中性区'}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">MA5</div>
                <div className="detail-value">¥{forecastData.ma5}</div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">MA10</div>
                <div className="detail-value">¥{forecastData.ma10}</div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">MA20</div>
                <div className="detail-value">¥{forecastData.ma20}</div>
              </div>
              
              <div className="detail-item highlight">
                <div className="detail-label">支撑位</div>
                <div className="detail-value success">¥{forecastData.support}</div>
                <div className="detail-desc">关键防守位置</div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">当前趋势</div>
                <div className={`detail-value trend-badge ${forecastData.trend === '多头排列' ? 'success' : forecastData.trend === '空头排列' ? 'danger' : ''}`}>
                  {forecastData.trend}
                </div>
              </div>
            </div>
          </div>
          
          {/* 近期表现 - 药丸形状卡片 */}
          <div className="card">
            <h3 className="section-title">近期表现</h3>
            <div className="recent-performance-grid">
              <div className="performance-card">
                <div className="perf-label">近5日收益</div>
                <div className={`perf-value ${forecastData.return_5d >= 0 ? 'positive' : 'negative'}`}>
                  {forecastData.return_5d >= 0 ? '+' : ''}{forecastData.return_5d}%
                </div>
              </div>
              
              <div className="performance-card">
                <div className="perf-label">近10日收益</div>
                <div className={`perf-value ${forecastData.return_10d >= 0 ? 'positive' : 'negative'}`}>
                  {forecastData.return_10d >= 0 ? '+' : ''}{forecastData.return_10d}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
