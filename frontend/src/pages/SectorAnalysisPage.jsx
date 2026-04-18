import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function SectorAnalysisPage() {
  const [rankings, setRankings] = useState(null)
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
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
