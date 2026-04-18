import React, { useState } from 'react'
import { portfolioAPI } from '../../utils/api'

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

  // 加载持仓数据
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
                <select 
                  value={form.stock_id} 
                  onChange={(e) => setForm({...form, stock_id: e.target.value})} 
                  className="apple-select"
                  required
                >
                  <option value="">请选择股票</option>
                  {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
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
                <label className="apple-label">
                  <span className="label-icon">📅</span>
                  买入日期
                </label>
                <input 
                  type="date" 
                  value={form.buy_date} 
                  onChange={(e) => setForm({...form, buy_date: e.target.value})}
                  className="apple-input date-input"
                  required
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
