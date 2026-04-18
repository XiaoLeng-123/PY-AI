import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function AuctionPage() {
  const [auctionData, setAuctionData] = useState(null)
  const [auctionLoading, setAuctionLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [sortBy, setSortBy] = useState('amount')
  
  const loadData = async () => {
    setAuctionLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/market/auction`, { 
        params: { date, sort_by: sortBy } 
      })
      setAuctionData(response.data)
    } catch (error) {
      toast.error('加载集合竞价数据失败')
    } finally {
      setAuctionLoading(false)
    }
  }
  
  useEffect(() => {
    loadData()
  }, [])
  
  return (
    <div className="page-content">
      {/* 头部卡片 */}
      <div className="auction-header-card">
        <div className="header-icon">⏰</div>
        <div className="header-info">
          <h3>集合竞价</h3>
          <p>分析开盘前集合竞价阶段的交易数据</p>
        </div>
      </div>
        
      {/* 查询控制区 - 药丸形状 */}
      <div className="card" style={{marginBottom: '24px'}}>
        <div className="auction-controls">
          <div className="control-item">
            <label className="control-label">日期</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="apple-input date-input"
            />
          </div>
          
          <div className="control-item">
            <label className="control-label">排序方式</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="apple-select"
            >
              <option value="amount">成交额</option>
              <option value="change">涨跌幅</option>
            </select>
          </div>
          
          <button 
            onClick={loadData} 
            className="btn-primary pill-btn"
            disabled={auctionLoading}
          >
            {auctionLoading ? (
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
        
      {/* 数据展示区 */}
      {auctionLoading ? (
        <div className="loading-state">
          <div className="spinner">⏳</div>
          <div>正在加载集合竞价数据...</div>
        </div>
      ) : auctionData ? (
        <div className="apple-card">
          {auctionData.success && auctionData.data && auctionData.data.length > 0 ? (
            <>
              <div className="card-header">
                <h3 className="card-title">⏰ 集合竞价数据</h3>
                <div className="info-badge">
                  {auctionData.date} · 共 {auctionData.count} 条记录 · 按{sortBy === 'amount' ? '成交额' : '涨跌幅'}排序
                </div>
              </div>
              <div className="table-container">
                <table className="data-table apple-table">
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>股票代码</th>
                      <th>股票名称</th>
                      <th>最新价</th>
                      <th>涨跌幅</th>
                      <th>涨跌额</th>
                      <th>成交量</th>
                      <th>成交额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auctionData.data.map((item, index) => (
                      <tr key={index}>
                        <td><span className="rank-badge">{index + 1}</span></td>
                        <td className="code-cell">{item.code}</td>
                        <td className="name-cell">{item.name}</td>
                        <td className="price-cell">¥{item.price?.toFixed(2)}</td>
                        <td className={item.change_pct >= 0 ? 'change-up' : 'change-down'}>
                          {item.change_pct >= 0 ? '+' : ''}{item.change_pct}%
                        </td>
                        <td className={item.change_amount >= 0 ? 'change-up' : 'change-down'}>
                          {item.change_amount >= 0 ? '+' : ''}{item.change_amount}
                        </td>
                        <td>{(item.volume / 10000).toFixed(2)}万手</td>
                        <td>¥{(item.amount / 100000000).toFixed(2)}亿</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="empty-state-large">
              <div className="empty-icon">📭</div>
              <h4>暂无集合竞价数据</h4>
              <p>{auctionData.message || '该日期没有集合竞价记录，请尝试选择其他日期'}</p>
              <p className="empty-hint">集合竞价数据通常在交易日9:25后更新</p>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state-large">
          <div className="empty-icon">⏰</div>
          <h4>等待查询</h4>
          <p>请选择日期并点击查询按钮</p>
        </div>
      )}
    </div>
  )
}
