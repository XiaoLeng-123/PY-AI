import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { stockAPI } from '../utils/api'
import { toast } from '../components/Toast'
import StockChart from '../components/Charts/StockChart'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function TradingSignalsPage({ stocks, selectedStock }) {
  const [signals, setSignals] = useState(null)
  const [loading, setLoading] = useState(false)
  const [localSelected, setLocalSelected] = useState(selectedStock || '')
  
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
  
  const loadSignals = async () => {
    if (!localSelected) {
      toast.warning('请选择股票')
      return
    }
    
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/advanced/signals`, {
        params: { stock_id: localSelected }
      })
      setSignals(response.data)
    } catch (error) {
      toast.error(error.response?.data?.error || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content">
      {/* 头部卡片 */}
      <div className="signals-header-card">
        <div className="header-icon">🎯</div>
        <div className="header-info">
          <h3>交易信号系统</h3>
          <p>基于技术指标分析生成智能买卖信号与操作建议</p>
        </div>
      </div>
      
      {/* 查询控制区 - 药丸形状 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="signals-controls">
          {/* 股票选择下拉框 */}
          <div className="control-item">
            <label className="control-label">选择股票</label>
            <div ref={setStockDropdownRef} className="apple-dropdown-wrapper" style={{ minWidth: '210px' }}>
              <div
                onClick={() => setStockDropdownOpen(!stockDropdownOpen)}
                className="apple-select-trigger"
                style={{ minWidth: '210px' }}
              >
                <div className="select-content">
                  {localSelected ? (() => {
                    const s = dropdownStocks.find(st => st.id === Number(localSelected))
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
                            setLocalSelected(s.id)
                            setStockDropdownOpen(false)
                            setStockSearchText('')
                          }}
                          className={`apple-dropdown-item ${localSelected === s.id ? 'active' : ''}`}
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
          
          <button 
            onClick={loadSignals} 
            className="btn-primary pill-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                分析中...
              </>
            ) : (
              <>
                <span className="btn-icon">⚡</span>
                生成信号
              </>
            )}
          </button>
        </div>
      </div>
        
      {signals && (
        <div>
          {/* 指标统计卡片网格 - 药丸形状 */}
          <div className="signals-grid" style={{marginBottom: '20px'}}>
            <div className="signal-stat-card">
              <div className="stat-label">最新价</div>
              <div className="stat-value primary">¥{signals.latest_price.toFixed(2)}</div>
            </div>
            
            <div className="signal-stat-card">
              <div className="stat-label">MA5</div>
              <div className="stat-value">¥{signals.indicators.ma5.toFixed(2)}</div>
            </div>
            
            <div className="signal-stat-card">
              <div className="stat-label">MA10</div>
              <div className="stat-value">¥{signals.indicators.ma10.toFixed(2)}</div>
            </div>
            
            <div className="signal-stat-card">
              <div className="stat-label">MA20</div>
              <div className="stat-value">¥{signals.indicators.ma20.toFixed(2)}</div>
            </div>
            
            <div className="signal-stat-card success">
              <div className="stat-label">支撑位</div>
              <div className="stat-value">¥{signals.indicators.support.toFixed(2)}</div>
            </div>
            
            <div className="signal-stat-card danger">
              <div className="stat-label">阻力位</div>
              <div className="stat-value">¥{signals.indicators.resistance.toFixed(2)}</div>
            </div>
          </div>
            
          {/* 交易信号列表 - 药丸形状 */}
          <div className="card" style={{marginBottom: '20px'}}>
            <h4 className="section-title">交易信号</h4>
            <div className="signals-list">
              {signals.signals.map((signal, i) => (
                <div 
                  key={i} 
                  className={`signal-item ${signal.type}`}
                >
                  <div className="signal-header">
                    <div className="signal-type-badge">
                      {signal.type === 'buy' ? '📈 买入' : '📉 卖出'}
                    </div>
                    <div className="signal-message">{signal.message}</div>
                  </div>
                  <div className="signal-meta">
                    <span className="meta-tag">指标: {signal.indicator}</span>
                    <span className={`strength-badge ${signal.strength}`}>
                      强度: {signal.strength === 'strong' ? '强' : signal.strength === 'medium' ? '中' : '弱'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
            
          {/* 操作建议 - 大圆角容器 */}
          <div className="suggestions-container">
            <h4 className="section-title">💡 操作建议</h4>
            <div className="suggestions-grid">
              <div className="suggestion-card stop-loss">
                <div className="suggestion-label">止损价</div>
                <div className="suggestion-value">¥{signals.suggestions.stop_loss.toFixed(2)}</div>
                <div className="suggestion-desc">风险控制线</div>
              </div>
              
              <div className="suggestion-card take-profit">
                <div className="suggestion-label">止盈价</div>
                <div className="suggestion-value">¥{signals.suggestions.take_profit.toFixed(2)}</div>
                <div className="suggestion-desc">目标收益点</div>
              </div>
              
              <div className="suggestion-card ratio">
                <div className="suggestion-label">盈亏比</div>
                <div className="suggestion-value">{signals.suggestions.risk_reward_ratio}:1</div>
                <div className="suggestion-desc">风险收益比</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
