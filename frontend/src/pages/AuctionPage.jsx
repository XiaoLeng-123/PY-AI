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
      <div className="card">
        <h3>⏰ 集合竞价</h3>
        
        <div className="form-row" style={{marginBottom: '20px'}}>
          <div className="form-item">
            <label>日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-item">
            <label>排序</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="amount">成交额</option>
              <option value="change">涨跌幅</option>
            </select>
          </div>
          <button onClick={loadData} className="btn-primary" disabled={auctionLoading}>
            {auctionLoading ? '加载中...' : '查询'}
          </button>
        </div>
        
        {auctionData && (
          <div>
            <pre>{JSON.stringify(auctionData, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
