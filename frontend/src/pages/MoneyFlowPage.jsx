import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'
import RealtimePrice from '../components/Charts/RealtimePrice'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function MoneyFlowPage({ stocks }) {
  const [selectedStock, setSelectedStock] = useState('')
  const [moneyflow, setMoneyflow] = useState(null)
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(30)
  
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
      <div className="card">
        <h3>💰 资金流向分析</h3>
        
        <div className="form-row">
          <div className="form-item">
            <label>选择股票</label>
            <select value={selectedStock} onChange={(e) => setSelectedStock(e.target.value)}>
              <option value="">请选择</option>
              {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>
          <div className="form-item">
            <label>时间范围</label>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>近7天</option>
              <option value={30}>近30天</option>
              <option value={60}>近60天</option>
              <option value={90}>近90天</option>
            </select>
          </div>
          <button onClick={loadData} className="btn-primary" disabled={loading}>
            {loading ? '加载中...' : '查询'}
          </button>
        </div>
        
        {moneyflow && (
          <div>
            <div className="stat-cards" style={{marginBottom: '20px'}}>
              <div className="stat-box">
                <div className="label">主力总流向</div>
                <div className={`value ${moneyflow.summary.total_main_flow >= 0 ? 'success' : 'danger'}`}>
                  {moneyflow.summary.total_main_flow >= 0 ? '+' : ''}{moneyflow.summary.total_main_flow}
                </div>
              </div>
              <div className="stat-box">
                <div className="label">散户总流向</div>
                <div className={`value ${moneyflow.summary.total_retail_flow >= 0 ? 'success' : 'danger'}`}>
                  {moneyflow.summary.total_retail_flow >= 0 ? '+' : ''}{moneyflow.summary.total_retail_flow}
                </div>
              </div>
              <div className="stat-box">
                <div className="label">净流入</div>
                <div className={`value ${moneyflow.summary.total_net_flow >= 0 ? 'success' : 'danger'}`}>
                  {moneyflow.summary.total_net_flow >= 0 ? '+' : ''}{moneyflow.summary.total_net_flow}
                </div>
              </div>
              <div className="stat-box">
                <div className="label">主力动向</div>
                <div className={`value ${moneyflow.summary.main_flow_direction === '流入' ? 'success' : 'danger'}`}>
                  {moneyflow.summary.main_flow_direction}
                </div>
              </div>
            </div>
            
            <RealtimePrice data={moneyflow.daily_data} />
          </div>
        )}
      </div>
    </div>
  )
}
