import { useState, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'
import { stockAPI, forecastAPI } from '../utils/api'
import { toast } from '../components/Toast'
import AppleDatePicker from '../components/AppleDatePicker'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function FinancialForecastPage({ stocks }) {
  const [selectedStock, setSelectedStock] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [forecastData, setForecastData] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  
  // 调试信息
  useEffect(() => {
    console.log('[FinancialForecastPage] Component mounted, stocks:', stocks)
  }, [])
  
  // 股票下拉框状态
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false)
  const [stockSearchText, setStockSearchText] = useState('')
  const [stockDropdownRef, setStockDropdownRef] = useState(null)
  const [dropdownStocks, setDropdownStocks] = useState([])
  const [dropdownTotal, setDropdownTotal] = useState(0)
  const [dropdownPage, setDropdownPage] = useState(1)
  const [dropdownLoading, setDropdownLoading] = useState(false)
  
  // 从后端加载下拉框股票列表
  const loadDropdownStocks = useCallback(async () => {
    if (!stockDropdownOpen) return
    setDropdownLoading(true)
    try {
      const response = await stockAPI.getAll({
        page: dropdownPage,
        page_size: 20,
        search: stockSearchText
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
  }, [stockDropdownOpen, dropdownPage, stockSearchText])
  
  useEffect(() => {
    loadDropdownStocks()
  }, [loadDropdownStocks])
  
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
  
  const loadForecast = async () => {
    if (!selectedStock) {
      toast.warning('请先选择股票')
      return
    }
    
    setForecastLoading(true)
    try {
      const params = {}
      if (selectedDate) {
        params.date = selectedDate
      }
      const response = await forecastAPI.get(selectedStock, params)
      setForecastData(response.data)
      toast.success('财务数据加载成功')
    } catch (error) {
      console.error('加载财务数据失败:', error)
      const errorMsg = error.response?.data?.error || error.response?.data?.message || '加载财务数据失败'
      toast.error(errorMsg)
      setForecastData(null)
    } finally {
      setForecastLoading(false)
    }
  }
  
  const selectedStockData = stocks?.find(s => s.id === Number(selectedStock))
  
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
          <div ref={setStockDropdownRef} className="apple-dropdown-wrapper" style={{ minWidth: '315px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'block' }}>选择股票</label>
            <div
              onClick={() => setStockDropdownOpen(!stockDropdownOpen)}
              className="apple-select-trigger"
              style={{ minWidth: '315px' }}
            >
              <div className="select-content">
                {selectedStock ? (() => {
                  const s = dropdownStocks.find(st => st.id === Number(selectedStock))
                  return s ? (
                    <div className="selected-stock">
                      <span className="stock-code">{s.code}</span>
                      <span className="stock-name">{s.name}</span>
                    </div>
                  ) : <span className="placeholder">请选择股票</span>
                })() : <span className="placeholder">搜索股票代码或名称...</span>}
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
                    onChange={(e) => { setStockSearchText(e.target.value); setDropdownPage(1) }}
                    className="apple-input search-input"
                    autoFocus
                  />
                  {dropdownLoading && <span style={{ marginLeft: '8px' }}>⏳</span>}
                </div>
                
                <div className="dropdown-list">
                  {dropdownStocks.length === 0 && stockSearchText.trim() ? (
                    <div className="apple-empty">
                      <div className="empty-icon">🔍</div>
                      <div>未找到匹配股票</div>
                    </div>
                  ) : dropdownStocks.length === 0 ? (
                    <div className="apple-empty">
                      <div className="empty-icon">💡</div>
                      <div>输入关键词开始搜索</div>
                    </div>
                  ) : (
                    dropdownStocks.map(s => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedStock(s.id)
                          setStockDropdownOpen(false)
                          setStockSearchText('')
                        }}
                        className={`apple-dropdown-item ${selectedStock === s.id ? 'active' : ''}`}
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
                
                {dropdownStocks.length > 0 && (
                  <div className="dropdown-stats">
                    共 <strong>{dropdownTotal}</strong> 只股票，当前显示 {dropdownStocks.length} 只
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 日期选择器 */}
          <AppleDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="选择报告期"
            width="200px"
            label="报告期"
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
      
      {/* 加载状态 */}
      {forecastLoading && (
        <div className="empty-state">
          <div style={{fontSize: '48px', marginBottom: '16px'}}>⏳</div>
          <h3>正在加载财务数据...</h3>
          <p>请稍候，正在从服务器获取最新财务信息</p>
        </div>
      )}
      
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
                <h3 style={{ margin: 0, fontSize: '20px' }}>{forecastData.stock_name || selectedStockData?.name || '未知股票'}</h3>
                <p style={{ margin: '4px 0 0 0', color: '#999', fontSize: '14px' }}>
                  {forecastData.stock_code || selectedStockData?.code} · {selectedStockData?.market || ''}
                  {forecastData.report_date && (
                    <span style={{ marginLeft: '12px', padding: '2px 8px', background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)', borderRadius: '6px', color: '#667eea', fontSize: '12px', fontWeight: 600 }}>
                      📅 报告期: {forecastData.report_date}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          {/* 核心财务指标网格 */}
          <div className="forecast-metrics-grid" style={{marginBottom: '24px'}}>
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">💰</span>
                <span className="metric-title">ROE</span>
              </div>
              <div className="metric-value primary">
                {forecastData.roe !== null && forecastData.roe !== undefined ? `${forecastData.roe.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">📊</span>
                <span className="metric-title">毛利率</span>
              </div>
              <div className={`metric-value ${forecastData.gross_profit_margin >= 30 ? 'positive' : forecastData.gross_profit_margin >= 20 ? '' : 'negative'}`}>
                {forecastData.gross_profit_margin !== null && forecastData.gross_profit_margin !== undefined ? `${forecastData.gross_profit_margin.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">💵</span>
                <span className="metric-title">净利润率</span>
              </div>
              <div className="metric-value">
                {forecastData.net_profit_margin !== null && forecastData.net_profit_margin !== undefined ? `${forecastData.net_profit_margin.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            
            <div className="metric-card-pill danger">
              <div className="metric-header">
                <span className="metric-icon">⚠️</span>
                <span className="metric-title">资产负债率</span>
              </div>
              <div className="metric-value negative">
                {forecastData.debt_ratio !== null && forecastData.debt_ratio !== undefined ? `${forecastData.debt_ratio.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">📈</span>
                <span className="metric-title">营收增长</span>
              </div>
              <div className={`metric-value ${forecastData.revenue_yoy >= 0 ? 'positive' : 'negative'}`}>
                {forecastData.revenue_yoy !== null && forecastData.revenue_yoy !== undefined ? `${forecastData.revenue_yoy.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">⭐</span>
                <span className="metric-title">财务评分</span>
              </div>
              <div className="detail-value">
                {forecastData.financial_score !== null && forecastData.financial_score !== undefined ? forecastData.financial_score : 0}/100
              </div>
              <div className="metric-detail" style={{ color: forecastData.rating_color || '#667eea' }}>
                {forecastData.rating || '未评级'}
              </div>
            </div>
          </div>
          
          {/* 财务详情 - 大圆角卡片 */}
          <div className="card" style={{marginBottom: '24px'}}>
            <h3 className="section-title">财务健康指标</h3>
            <div className="forecast-details-grid">
              <div className="detail-item">
                <div className="detail-label">ROA（资产回报率）</div>
                <div className={`detail-value ${forecastData.roa > 10 ? 'success' : forecastData.roa < 5 ? 'danger' : ''}`}>
                  {forecastData.roa !== null && forecastData.roa !== undefined ? `${forecastData.roa.toFixed(2)}%` : 'N/A'}
                </div>
                <div className="detail-desc">
                  {forecastData.roa !== null && forecastData.roa !== undefined ? (forecastData.roa > 10 ? '优秀' : forecastData.roa < 5 ? '偏低' : '良好') : '无数据'}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">流动比率</div>
                <div className={`detail-value ${forecastData.current_ratio > 2 ? 'success' : forecastData.current_ratio < 1 ? 'danger' : ''}`}>
                  {forecastData.current_ratio !== null && forecastData.current_ratio !== undefined ? forecastData.current_ratio.toFixed(2) : 'N/A'}
                </div>
                <div className="detail-desc">
                  {forecastData.current_ratio !== null && forecastData.current_ratio !== undefined ? (forecastData.current_ratio > 2 ? '偿债能力强' : forecastData.current_ratio < 1 ? '偿债风险' : '正常') : '无数据'}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">速动比率</div>
                <div className="detail-value">
                  {forecastData.quick_ratio !== null && forecastData.quick_ratio !== undefined ? forecastData.quick_ratio.toFixed(2) : 'N/A'}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">每股收益（EPS）</div>
                <div className="detail-value success">
                  ¥{forecastData.eps !== null && forecastData.eps !== undefined ? forecastData.eps.toFixed(2) : 'N/A'}
                </div>
              </div>
              
              <div className="detail-item highlight">
                <div className="detail-label">每股净资产（BPS）</div>
                <div className="detail-value">
                  ¥{forecastData.bps !== null && forecastData.bps !== undefined ? forecastData.bps.toFixed(2) : 'N/A'}
                </div>
                <div className="detail-desc">股东权益</div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">净利润增长</div>
                <div className={`detail-value trend-badge ${forecastData.profit_yoy > 20 ? 'success' : forecastData.profit_yoy < 0 ? 'danger' : ''}`}>
                  {forecastData.profit_yoy !== null && forecastData.profit_yoy !== undefined ? `${forecastData.profit_yoy.toFixed(2)}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
          
          {/* 营运能力 - 药丸形状卡片 */}
          <div className="card">
            <h3 className="section-title">营运能力分析</h3>
            <div className="recent-performance-grid">
              <div className="performance-card">
                <div className="perf-label">存货周转率</div>
                <div className="perf-value">
                  {forecastData.inventory_turnover !== null && forecastData.inventory_turnover !== undefined ? forecastData.inventory_turnover.toFixed(2) : 'N/A'}
                </div>
              </div>
              
              <div className="performance-card">
                <div className="perf-label">应收账款周转率</div>
                <div className="perf-value">
                  {forecastData.receivables_turnover !== null && forecastData.receivables_turnover !== undefined ? forecastData.receivables_turnover.toFixed(2) : 'N/A'}
                </div>
              </div>
              
              <div className="performance-card">
                <div className="perf-label">总资产周转率</div>
                <div className="perf-value">
                  {forecastData.total_asset_turnover !== null && forecastData.total_asset_turnover !== undefined ? forecastData.total_asset_turnover.toFixed(2) : 'N/A'}
                </div>
              </div>
              
              <div className="performance-card">
                <div className="perf-label">经营现金流</div>
                <div className={`perf-value ${forecastData.operating_cash_flow >= 0 ? 'positive' : 'negative'}`}>
                  {forecastData.operating_cash_flow !== null && forecastData.operating_cash_flow !== undefined ? `${(forecastData.operating_cash_flow / 10000).toFixed(2)}万` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
