import { useState, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'
import { stockAPI } from '../utils/api'
import { toast } from '../components/Toast'
import RealtimePrice from '../components/Charts/RealtimePrice'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function MoneyFlowPage({ stocks }) {
  const [selectedStock, setSelectedStock] = useState('')
  const [moneyflow, setMoneyflow] = useState(null)
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(30)
  
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
  
  // 时间范围选项
  const dayOptions = [
    { value: 7, label: '近7天' },
    { value: 30, label: '近30天' },
    { value: 60, label: '近60天' },
    { value: 90, label: '近90天' }
  ]
  
  const loadData = async () => {
    if (!selectedStock) {
      toast.warning('请选择股票')
      return
    }
    
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/advanced/moneyflow`, {
        params: { stock_id: selectedStock, days }
      })
      setMoneyflow(response.data)
    } catch (error) {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="page-content">
      {/* 头部卡片 */}
      <div className="moneyflow-header-card">
        <div className="header-icon">💰</div>
        <div className="header-info">
          <h3>资金流向分析</h3>
          <p>实时追踪主力资金与散户资金的流入流出情况</p>
        </div>
      </div>
      
      {/* 查询控制区 - 药丸形状 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="moneyflow-controls">
          {/* 股票选择下拉框 */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'block' }}>选择股票</label>
            <div ref={setStockDropdownRef} className="apple-dropdown-wrapper" style={{ minWidth: '300px' }}>
              <div
                onClick={() => setStockDropdownOpen(!stockDropdownOpen)}
                className="apple-select-trigger"
                style={{ minWidth: '300px' }}
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
          </div>
          
          {/* 时间范围选择 */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'block' }}>时间范围</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="apple-select"
              style={{ width: '180px' }}
            >
              {dayOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={loadData} 
            className="btn-primary pill-btn"
            disabled={loading}
            style={{ alignSelf: 'flex-end' }}
          >
            {loading ? (
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
        
      {moneyflow && (
        <div>
          {/* 统计卡片网格 - 药丸形状 */}
          <div className="moneyflow-grid" style={{marginBottom: '20px'}}>
            <div className="moneyflow-stat-card">
              <div className="stat-label">主力总流向</div>
              <div className={`stat-value ${moneyflow.summary.total_main_flow >= 0 ? 'success' : 'danger'}`}>
                {moneyflow.summary.total_main_flow >= 0 ? '+' : ''}{moneyflow.summary.total_main_flow}
              </div>
              <div className="stat-trend">{moneyflow.summary.total_main_flow >= 0 ? '↑ 流入' : '↓ 流出'}</div>
            </div>
            
            <div className="moneyflow-stat-card">
              <div className="stat-label">散户总流向</div>
              <div className={`stat-value ${moneyflow.summary.total_retail_flow >= 0 ? 'success' : 'danger'}`}>
                {moneyflow.summary.total_retail_flow >= 0 ? '+' : ''}{moneyflow.summary.total_retail_flow}
              </div>
              <div className="stat-trend">{moneyflow.summary.total_retail_flow >= 0 ? '↑ 流入' : '↓ 流出'}</div>
            </div>
            
            <div className="moneyflow-stat-card highlight">
              <div className="stat-label">净流入</div>
              <div className={`stat-value ${moneyflow.summary.total_net_flow >= 0 ? 'success' : 'danger'}`}>
                {moneyflow.summary.total_net_flow >= 0 ? '+' : ''}{moneyflow.summary.total_net_flow}
              </div>
              <div className="stat-trend">{moneyflow.summary.total_net_flow >= 0 ? '↑ 净流入' : '↓ 净流出'}</div>
            </div>
            
            <div className="moneyflow-stat-card">
              <div className="stat-label">主力动向</div>
              <div className={`stat-value ${moneyflow.summary.main_flow_direction === '流入' ? 'success' : 'danger'}`}>
                {moneyflow.summary.main_flow_direction}
              </div>
              <div className="stat-trend">{moneyflow.summary.main_flow_direction === '流入' ? '💪 强势' : '⚠️ 弱势'}</div>
            </div>
          </div>
            
          {/* 图表容器 - 大圆角 */}
          <div className="chart-container">
            <RealtimePrice 
              stockId={selectedStock} 
              stockCode={moneyflow.stock_code}
              stockName={moneyflow.stock_name}
              data={moneyflow.daily_data} 
            />
          </div>
        </div>
      )}
    </div>
  )
}
