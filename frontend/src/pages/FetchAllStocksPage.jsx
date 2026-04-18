import { useState } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function FetchAllStocksPage({ loadStocks }) {
  const [fetchAllLoading, setFetchAllLoading] = useState(false)
  const [fetchAllResult, setFetchAllResult] = useState(null)
  
  const handleFetchAllStocks = async () => {
    if (!window.confirm('确定要获取市场上所有A股股票吗?这可能需要几分钟时间。')) {
      return
    }
    
    setFetchAllLoading(true)
    setFetchAllResult(null)
    
    try {
      const response = await axios.post(`${API_BASE}/stocks/fetch_all`)
      setFetchAllResult(response.data)
      toast.success(`成功导入 ${response.data.added} 只股票!`, { duration: 5000 })
      loadStocks(true)
    } catch (error) {
      toast.error(error.response?.data?.error || '获取失败', { duration: 3000 })
    } finally {
      setFetchAllLoading(false)
    }
  }
  
  return (
    <div className="page-content">
      <div className="card">
        <h3>📥 批量获取所有A股股票</h3>
        <p className="text-muted" style={{marginBottom: '20px'}}>
          从东方财富API获取市场上所有A股股票代码和名称，并自动导入数据库。
        </p>
        
        <button 
          onClick={handleFetchAllStocks} 
          className="btn-primary" 
          disabled={fetchAllLoading}
          style={{padding: '14px 40px', fontSize: '16px', fontWeight: 'bold'}}
        >
          {fetchAllLoading ? '⏳ 正在获取中...' : '🚀 开始获取所有A股股票'}
        </button>

        {fetchAllLoading && (
          <div style={{marginTop: '20px', padding: '15px', background: '#e6f7ff', borderRadius: '4px'}}>
            <p style={{margin: 0, color: '#1890ff'}}>正在从东方财富API获取股票列表...</p>
          </div>
        )}

        {fetchAllResult && !fetchAllResult.error && (
          <div style={{marginTop: '20px', padding: '20px', background: '#f6ffed', borderRadius: '8px'}}>
            <h4 style={{marginTop: 0, color: '#52c41a'}}>✅ 导入成功</h4>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px'}}>
              <div style={{textAlign: 'center', padding: '15px', background: '#fff', borderRadius: '4px'}}>
                <div style={{fontSize: '32px', fontWeight: 'bold', color: '#1890ff'}}>{fetchAllResult.total}</div>
                <div style={{color: '#666'}}>总股票数</div>
              </div>
              <div style={{textAlign: 'center', padding: '15px', background: '#fff', borderRadius: '4px'}}>
                <div style={{fontSize: '32px', fontWeight: 'bold', color: '#52c41a'}}>{fetchAllResult.added}</div>
                <div style={{color: '#666'}}>新增数量</div>
              </div>
              <div style={{textAlign: 'center', padding: '15px', background: '#fff', borderRadius: '4px'}}>
                <div style={{fontSize: '32px', fontWeight: 'bold', color: '#faad14'}}>{fetchAllResult.skipped}</div>
                <div style={{color: '#666'}}>跳过重复</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
