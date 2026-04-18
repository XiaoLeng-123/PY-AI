import { useState } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function FinancialForecastPage({ selectedStock, stocks }) {
  const [forecastData, setForecastData] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  
  const loadForecast = async () => {
    if (!selectedStock) {
      toast.warning('请先选择股票')
      return
    }
    
    setForecastLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/stats/${selectedStock}/forecast`)
      setForecastData(response.data)
    } catch (error) {
      toast.error('加载预报数据失败')
    } finally {
      setForecastLoading(false)
    }
  }
  
  if (!selectedStock) {
    return (
      <div className="page-content">
        <div className="card">
          <h3>💰 财务预报分析</h3>
          <p>请先选择一只股票查看财务预报</p>
        </div>
      </div>
    )
  }
  
  const stock = stocks.find(s => s.id === Number(selectedStock))
  
  return (
    <div className="page-content">
      <div className="card">
        <h3>💰 {stock?.name} 财务预报分析</h3>
        <button onClick={loadForecast} className="btn-primary" disabled={forecastLoading}>
          {forecastLoading ? '加载中...' : '加载预报数据'}
        </button>
        
        {forecastData && (
          <div style={{marginTop: '20px'}}>
            <pre>{JSON.stringify(forecastData, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
