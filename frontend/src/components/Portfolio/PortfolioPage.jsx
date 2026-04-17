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
      <div className="page-header">
        <h2>💼 持仓管理</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary">
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
          {/* 统计卡片 */}
          <div className="metrics-grid" style={{marginBottom: '24px'}}>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">💰</span>
                <span className="metric-title">总市值</span>
              </div>
              <div className="metric-value" style={{fontSize: '24px'}}>
                ¥{portfolioData.summary.total_market_value.toLocaleString()}
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">📊</span>
                <span className="metric-title">总成本</span>
              </div>
              <div className="metric-value" style={{fontSize: '24px'}}>
                ¥{portfolioData.summary.total_cost.toLocaleString()}
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">📈</span>
                <span className="metric-title">总收益</span>
              </div>
              <div className={`metric-value ${portfolioData.summary.total_profit >= 0 ? 'positive' : 'negative'}`} style={{fontSize: '24px'}}>
                {portfolioData.summary.total_profit >= 0 ? '+' : ''}¥{portfolioData.summary.total_profit.toLocaleString()}
              </div>
              <div className={`metric-change ${portfolioData.summary.total_profit_rate >= 0 ? 'positive' : 'negative'}`}>
                {portfolioData.summary.total_profit_rate >= 0 ? '↑' : '↓'} {Math.abs(portfolioData.summary.total_profit_rate).toFixed(2)}%
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">🎯</span>
                <span className="metric-title">持仓数量</span>
              </div>
              <div className="metric-value" style={{fontSize: '24px'}}>
                {portfolioData.summary.total_positions} 只
              </div>
              <div className="metric-detail">
                盈利 {portfolioData.summary.winning_count} / 亏损 {portfolioData.summary.losing_count}
              </div>
            </div>
          </div>

          {/* 持仓列表 */}
          <div className="section-card">
            <h3>持仓明细</h3>
            <div style={{overflowX: 'auto'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>小马代码</th>
                    <th>小马名称</th>
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
                          style={{
                            background: '#ff4d4f',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
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
    </div>
  )
}

export default PortfolioPage
