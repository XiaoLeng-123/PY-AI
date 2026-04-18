import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function SectorAnalysisPage({ stocks }) {
  const [rankings, setRankings] = useState(null)
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMarket, setSelectedMarket] = useState('') // 选中的市场类型
  
  useEffect(() => {
    loadOverview()
    loadRankings()
  }, [])
  
  const loadOverview = async () => {
    try {
      const response = await axios.get(`${API_BASE}/advanced/sectors/overview`)
      setOverview(response.data)
    } catch (error) {
      console.error('加载概况失败:', error)
    }
  }
  
  const loadRankings = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/advanced/sectors/rankings`, { params: { date } })
      setRankings(response.data)
    } catch (error) {
      toast.error('加载排行失败')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="page-content">
      <div className="card">
        <h3>📊 板块分析</h3>
        
        {overview && (
          <div style={{marginBottom: '20px'}}>
            <h4>市场概况</h4>
            <div className="stat-cards">
              <div className="stat-box">
                <div className="label">总股票数</div>
                <div className="value primary">{overview.total_stocks}</div>
              </div>
              <div className="stat-box">
                <div className="label">数据记录</div>
                <div className="value">{overview.total_records}</div>
              </div>
              {overview.markets.map(m => (
                <div className="stat-box" key={m.name}>
                  <div className="label">{m.name}</div>
                  <div className="value">{m.count}只</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="form-item" style={{marginBottom: '20px'}}>
          <label>查询日期</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={loadRankings} className="btn-primary" style={{marginLeft: '10px'}}>
            {loading ? '加载中...' : '查询'}
          </button>
        </div>
        
        {/* 同行业股票对比 */}
        {stocks && stocks.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '16px', background: '#f0f5ff', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '12px', color: '#1890ff' }}>🔗 同行业股票对比</h4>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#666', marginRight: '8px' }}>选择市场类型：</label>
                <select 
                  value={selectedMarket} 
                  onChange={(e) => setSelectedMarket(e.target.value)}
                  style={{ padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                >
                  <option value="">全部</option>
                  {[...new Set(stocks.map(s => s.market))].map(market => (
                    <option key={market} value={market}>{market}</option>
                  ))}
                </select>
              </div>
              
              {(() => {
                const filteredStocks = selectedMarket 
                  ? stocks.filter(s => s.market === selectedMarket)
                  : stocks
                
                if (filteredStocks.length === 0) return null
                
                return (
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    共 <strong style={{ color: '#1890ff' }}>{filteredStocks.length}</strong> 只股票
                  </div>
                )
              })()}
            </div>
            
            {/* 显示该市场的股票列表 */}
            {(() => {
              const filteredStocks = selectedMarket 
                ? stocks.filter(s => s.market === selectedMarket)
                : stocks.slice(0, 10) // 默认显示前10只
              
              if (filteredStocks.length === 0) return null
              
              return (
                <div style={{ marginTop: '12px', overflowX: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>代码</th>
                        <th>名称</th>
                        <th>市场</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStocks.map(stock => (
                        <tr key={stock.id}>
                          <td>{stock.code}</td>
                          <td>{stock.name}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px',
                              background: '#e6f7ff',
                              color: '#1890ff',
                              borderRadius: '4px',
                              fontSize: '11px'
                            }}>
                              {stock.market}
                            </span>
                          </td>
                          <td>
                            <button 
                              onClick={() => {
                                // 可以在这里添加跳转到数据查看页面的逻辑
                                toast.info(`查看 ${stock.name} 详情`)
                              }}
                              style={{
                                padding: '4px 8px',
                                background: '#1890ff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              查看详情
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        )}
        
        {rankings && (
          <div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div>
                <h4 style={{color: '#52c41a'}}>📈 涨幅Top 20</h4>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>代码</th>
                      <th>名称</th>
                      <th>最新价</th>
                      <th>涨跌幅</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.gainers.map((s, i) => (
                      <tr key={i}>
                        <td>{s.code}</td>
                        <td>{s.name}</td>
                        <td>¥{s.close_price.toFixed(2)}</td>
                        <td style={{color: '#f5222d', fontWeight: 'bold'}}>+{s.change_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div>
                <h4 style={{color: '#f5222d'}}>📉 跌幅Top 20</h4>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>代码</th>
                      <th>名称</th>
                      <th>最新价</th>
                      <th>涨跌幅</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.losers.map((s, i) => (
                      <tr key={i}>
                        <td>{s.code}</td>
                        <td>{s.name}</td>
                        <td>¥{s.close_price.toFixed(2)}</td>
                        <td style={{color: '#52c41a', fontWeight: 'bold'}}>{s.change_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
