import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function LonghubangPage() {
  const [longhubangData, setLonghubangData] = useState(null)
  const [longhubangLoading, setLonghubangLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  const loadData = async () => {
    setLonghubangLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/market/longhubang`, { params: { date } })
      setLonghubangData(response.data)
    } catch (error) {
      toast.error('加载龙虎榜数据失败')
    } finally {
      setLonghubangLoading(false)
    }
  }
  
  useEffect(() => {
    loadData()
  }, [])
  
  return (
    <div className="page-content">
      <div className="card">
        <h3>🏆 龙虎榜</h3>
        
        <div className="form-item" style={{marginBottom: '20px'}}>
          <label>选择日期</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={loadData} className="btn-primary" disabled={longhubangLoading} style={{marginLeft: '10px'}}>
            {longhubangLoading ? '加载中...' : '查询'}
          </button>
        </div>
        
        {longhubangData && (
          <div>
            <pre>{JSON.stringify(longhubangData, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
