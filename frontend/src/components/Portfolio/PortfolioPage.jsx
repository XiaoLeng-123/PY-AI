import React, { useState, useEffect, useCallback } from 'react'
import { portfolioAPI, stockAPI } from '../../utils/api'
import AppleDatePicker from '../AppleDatePicker'

const PortfolioPage = ({ stocks, toast }) => {
  const [portfolioData, setPortfolioData] = useState(null)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    stock_id: '',
    quantity: '',
    avg_cost: '',
    buy_date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  
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
  const loadPortfolio = async () => {
    setPortfolioLoading(true)
    try {
      const response = await portfolioAPI.getAll()
      setPortfolioData(response.data)
    } catch (error) {
      console.error('加载持仓数据失败:', error)
    } finally {
      setPortfolioLoading(false)
    }
  }

  // 添加持仓
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.stock_id || !form.quantity || !form.avg_cost) {
      toast.error('请填写完整信息')
      return
    }
    
    try {
      await portfolioAPI.add({
        stock_id: Number(form.stock_id),
        quantity: Number(form.quantity),
        avg_cost: parseFloat(form.avg_cost),
        buy_date: form.buy_date,
        notes: form.notes
      })
      toast.success('持仓添加成功')
      setShowModal(false)
      setForm({
        stock_id: '',
        quantity: '',
        avg_cost: '',
        buy_date: new Date().toISOString().split('T')[0],
        notes: ''
      })
      loadPortfolio()
    } catch (error) {
      toast.error(error.response?.data?.error || '添加失败')
    }
  }

  // 删除持仓
  const handleDelete = async (id) => {
    if (!confirm('确定删除此持仓？')) return
    
    try {
      await portfolioAPI.delete(id)
      toast.success('持仓已删除')
      loadPortfolio()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  React.useEffect(() => {
    loadPortfolio()
  }, [])

  return (
    <div className="page-content">
      {/* 头部卡片 */}
      <div className="portfolio-header-card">
        <div className="header-icon">💼</div>
        <div className="header-info">
          <h3>持仓管理</h3>
          <p>实时追踪您的模拟投资组合表现与盈亏情况</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary pill-btn">
          + 添加持仓
        </button>
      </div>

      {portfolioLoading ? (
        <div className="empty-state">
          <div style={{fontSize: '32px', marginBottom: '12px'}}>⏳</div>
          <p>加载中...</p>
        </div>
      ) : !portfolioData || !portfolioData.positions ? (
        <div className="empty-state">
          <div style={{fontSize: '48px', marginBottom: '16px'}}>📭</div>
          <h3>暂无持仓</h3>
          <p>点击上方按钮添加您的第一笔模拟持仓</p>
        </div>
      ) : (
        <div>
          {/* 统计卡片网格 - 药丸形状 */}
          <div className="portfolio-metrics-grid" style={{marginBottom: '24px'}}>
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">💰</span>
                <span className="metric-title">总市值</span>
              </div>
              <div className="metric-value">
                ¥{portfolioData.summary.total_market_value.toLocaleString()}
              </div>
            </div>
            
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">📊</span>
                <span className="metric-title">总成本</span>
              </div>
              <div className="metric-value">
                ¥{portfolioData.summary.total_cost.toLocaleString()}
              </div>
            </div>
            
            <div className="metric-card-pill highlight">
              <div className="metric-header">
                <span className="metric-icon">📈</span>
                <span className="metric-title">总收益</span>
              </div>
              <div className={`metric-value ${portfolioData.summary.total_profit >= 0 ? 'positive' : 'negative'}`}>
                {portfolioData.summary.total_profit >= 0 ? '+' : ''}¥{portfolioData.summary.total_profit.toLocaleString()}
              </div>
              <div className={`metric-change ${portfolioData.summary.total_profit_rate >= 0 ? 'positive' : 'negative'}`}>
                {portfolioData.summary.total_profit_rate >= 0 ? '↑' : '↓'} {Math.abs(portfolioData.summary.total_profit_rate).toFixed(2)}%
              </div>
            </div>
            
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">🎯</span>
                <span className="metric-title">持仓数量</span>
              </div>
              <div className="metric-value">
                {portfolioData.summary.total_positions} 只
              </div>
              <div className="metric-detail">
                盈利 {portfolioData.summary.winning_count} / 亏损 {portfolioData.summary.losing_count}
              </div>
            </div>
          </div>

          {/* 持仓列表 - 大圆角 */}
          <div className="card">
            <h3 className="section-title">持仓明细</h3>
            <div className="portfolio-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>代码</th>
                    <th>名称</th>
                    <th>持仓数量</th>
                    <th>成本价</th>
                    <th>现价</th>
                    <th>市值</th>
                    <th>盈亏</th>
                    <th>收益率</th>
                    <th>买入日期</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioData.positions.map(pos => (
                    <tr key={pos.id}>
                      <td><strong>{pos.stock_code}</strong></td>
                      <td>{pos.stock_name}</td>
                      <td>{pos.quantity.toLocaleString()}</td>
                      <td>¥{pos.avg_cost.toFixed(2)}</td>
                      <td>¥{pos.current_price.toFixed(2)}</td>
                      <td>¥{pos.market_value.toLocaleString()}</td>
                      <td className={pos.profit >= 0 ? 'positive' : 'negative'}>
                        {pos.profit >= 0 ? '+' : ''}¥{pos.profit.toLocaleString()}
                      </td>
                      <td className={pos.profit_rate >= 0 ? 'positive' : 'negative'}>
                        {pos.profit_rate >= 0 ? '↑' : '↓'} {Math.abs(pos.profit_rate).toFixed(2)}%
                      </td>
                      <td>{pos.buy_date}</td>
                      <td>
                        <button 
                          onClick={() => handleDelete(pos.id)}
                          className="btn-danger pill-btn-sm"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 添加持仓弹窗 - 苹果风格 */}
      {showModal && (
        <div className="apple-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="apple-modal" onClick={(e) => e.stopPropagation()}>
            {/* 头部 */}
            <div className="apple-modal-header">
              <div className="apple-modal-title">
                <div className="apple-modal-icon">💼</div>
                <div>
                  <h3>添加持仓</h3>
                  <p>录入新的股票持仓信息</p>
                </div>
              </div>
              <button className="apple-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAdd}>
              {/* 股票选择 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">📊</span>
                  选择股票
                </label>
                <div ref={setStockDropdownRef} className="apple-dropdown-wrapper" style={{ minWidth: '300px' }}>
                  <div
                    onClick={() => setStockDropdownOpen(!stockDropdownOpen)}
                    className="apple-select-trigger"
                    style={{ minWidth: '300px' }}
                  >
                    <div className="select-content">
                      {form.stock_id ? (() => {
                        const s = dropdownStocks.find(st => st.id === Number(form.stock_id))
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
                                setForm({...form, stock_id: s.id})
                                setStockDropdownOpen(false)
                                setStockSearchText('')
                              }}
                              className={`apple-dropdown-item ${form.stock_id === s.id ? 'active' : ''}`}
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
              
              {/* 持仓数量 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">🔢</span>
                  持仓数量
                </label>
                <input 
                  type="number" 
                  value={form.quantity} 
                  onChange={(e) => setForm({...form, quantity: e.target.value})}
                  placeholder="输入持股数量"
                  className="apple-input"
                  required
                  min="1"
                />
              </div>
              
              {/* 成本价 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">💰</span>
                  成本价
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={form.avg_cost} 
                  onChange={(e) => setForm({...form, avg_cost: e.target.value})}
                  placeholder="输入每股成本价"
                  className="apple-input"
                  required
                  min="0.01"
                />
              </div>
              
              {/* 买入日期 */}
              <div className="apple-form-group">
                <AppleDatePicker
                  value={form.buy_date}
                  onChange={(date) => setForm({...form, buy_date: date})}
                  label="📅 买入日期"
                  width="100%"
                  placeholder="选择买入日期"
                />
              </div>
              
              {/* 备注 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">📝</span>
                  备注（可选）
                </label>
                <textarea 
                  value={form.notes} 
                  onChange={(e) => setForm({...form, notes: e.target.value})}
                  placeholder="添加备注信息..."
                  className="apple-input apple-textarea"
                  rows="3"
                />
              </div>
              
              {/* 按钮组 */}
              <div className="apple-modal-footer">
                <button type="button" className="btn-secondary pill-btn" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn-primary pill-btn">确认添加</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PortfolioPage
