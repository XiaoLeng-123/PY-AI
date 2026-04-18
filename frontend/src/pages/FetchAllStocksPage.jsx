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
      {/* 页面头部卡片 */}
      <div className="dashboard-header-card">
        <div className="header-left">
          <div className="header-icon">📥</div>
          <div className="header-info">
            <h3>批量获取股票</h3>
            <p>从新浪API获取所有A股股票代码和名称</p>
          </div>
        </div>
      </div>
      
      {/* 操作卡片 - 苹果风格 */}
      <div className="apple-card" style={{
        animation: 'fadeInUp 0.5s ease 0.2s',
        animationFillMode: 'backwards'
      }}>
        <div className="card-header">
          <h3 className="card-title">🚀 开始获取</h3>
        </div>
        
        <div className="fetch-action-area">
          <p className="fetch-description">
            从新浪API获取市场上所有A股股票代码和名称，并自动导入数据库。
            <br />
            <span className="fetch-hint">⏱ 预计需要 2-5 分钟，请耐心等待</span>
          </p>
          
          <button 
            onClick={handleFetchAllStocks} 
            className="btn-primary pill-btn"
            disabled={fetchAllLoading}
          >
            {fetchAllLoading ? (
              <>
                <span className="btn-spinner"></span>
                正在获取中...
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                开始获取所有A股股票
              </>
            )}
          </button>
        </div>

        {/* 加载状态 */}
        {fetchAllLoading && (
          <div className="loading-state" style={{ marginTop: '24px' }}>
            <div className="spinner">⏳</div>
            <div>正在从新浪API获取股票列表...</div>
          </div>
        )}

        {/* 成功结果 */}
        {fetchAllResult && !fetchAllResult.error && (
          <div className="success-result-card" style={{
            marginTop: '24px',
            padding: '28px',
            background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
            border: '2px solid #b7eb8f',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 8px 24px rgba(82, 196, 26, 0.15)',
            animation: 'fadeInUp 0.5s ease'
          }}>
            <div className="result-header" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '32px' }}>✅</span>
              <h4 style={{ fontSize: '20px', fontWeight: '700', color: '#52c41a', margin: 0 }}>
                导入成功
              </h4>
            </div>
            <div className="result-stats" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px'
            }}>
              <div className="stat-card" style={{
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid rgba(0, 0, 0, 0.06)'
              }}>
                <div className="stat-value" style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#667eea',
                  lineHeight: '1',
                  marginBottom: '8px'
                }}>
                  {fetchAllResult.total}
                </div>
                <div className="stat-label" style={{
                  fontSize: '13px',
                  color: '#666',
                  fontWeight: '500'
                }}>
                  总股票数
                </div>
              </div>
              <div className="stat-card" style={{
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid rgba(0, 0, 0, 0.06)'
              }}>
                <div className="stat-value" style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#43e97b',
                  lineHeight: '1',
                  marginBottom: '8px'
                }}>
                  {fetchAllResult.added}
                </div>
                <div className="stat-label" style={{
                  fontSize: '13px',
                  color: '#666',
                  fontWeight: '500'
                }}>
                  新增数量
                </div>
              </div>
              <div className="stat-card" style={{
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid rgba(0, 0, 0, 0.06)'
              }}>
                <div className="stat-value" style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#f5576c',
                  lineHeight: '1',
                  marginBottom: '8px'
                }}>
                  {fetchAllResult.skipped}
                </div>
                <div className="stat-label" style={{
                  fontSize: '13px',
                  color: '#666',
                  fontWeight: '500'
                }}>
                  跳过重复
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
