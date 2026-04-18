import { useState, useMemo } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function DataEntryPage({ stocks }) {
  // 股票选择状态
  const [selectedStocks, setSelectedStocks] = useState([])
  const [searchText, setSearchText] = useState('')
  
  // 时间范围
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  
  // 加载状态
  const [fetching, setFetching] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  
  // 获取结果
  const [fetchResult, setFetchResult] = useState(null)
  
  // 筛选后的股票列表
  const safeStocks = stocks || []
  const filteredStocks = useMemo(() => {
    if (!searchText) return safeStocks
    const lower = searchText.toLowerCase()
    return safeStocks.filter(s => 
      s.code.toLowerCase().includes(lower) || 
      s.name.toLowerCase().includes(lower)
    )
  }, [safeStocks, searchText])
  
  // 切换股票选择（统一使用 Number 类型）
  const toggleStockSelection = (stockId) => {
    const idNum = Number(stockId)
    setSelectedStocks(prev => {
      if (prev.includes(idNum)) {
        return prev.filter(id => id !== idNum)
      } else {
        return [...prev, idNum]
      }
    })
  }
  
  // 智能全选/取消全选
  const toggleSelectAll = () => {
    const currentIds = filteredStocks.map(s => Number(s.id))
    if (currentIds.length === 0) return

    const allSelected = currentIds.every(id => selectedStocks.includes(id))
    
    if (allSelected) {
      setSelectedStocks(prev => prev.filter(id => !currentIds.includes(id)))
    } else {
      setSelectedStocks(prev => {
        const existing = new Set(prev)
        currentIds.forEach(id => existing.add(id))
        return Array.from(existing)
      })
    }
  }
  
  // 获取历史数据
  const handleFetchHistory = async () => {
    if (selectedStocks.length === 0) {
      toast.warning('请至少选择一只股票')
      return
    }
    
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.warning('请选择完整的日期范围')
      return
    }
    
    if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
      toast.warning('开始日期不能晚于结束日期')
      return
    }
    
    setFetching(true)
    setProgress({ current: 0, total: selectedStocks.length })
    setFetchResult(null)
    
    try {
      if (selectedStocks.length === 1) {
        const stockId = selectedStocks[0]
        const response = await axios.post(`${API_BASE}/stocks/${stockId}/prices/fetch_history`, {
          start_date: dateRange.startDate,
          end_date: dateRange.endDate
        })
        
        setFetchResult({
          success: true,
          added: response.data.added,
          skipped: response.data.skipped,
          total: response.data.total
        })
        
        toast.success(`成功获取 ${response.data.added} 条数据${response.data.skipped > 0 ? `，${response.data.skipped} 条已存在` : ''}`)
      } else {
        const response = await axios.post(`${API_BASE}/stocks/batch_fetch_history`, {
          stock_ids: selectedStocks,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate
        })
        
        setFetchResult({
          success: true,
          added: response.data.total_added,
          skipped: response.data.total_skipped,
          errors: response.data.total_errors,
          stockResults: response.data.stock_results
        })
        
        toast.success(`批量获取完成：新增 ${response.data.total_added} 条，跳过 ${response.data.total_skipped} 条`)
      }
    } catch (error) {
      toast.error(error.response?.data?.error || '获取失败')
    } finally {
      setFetching(false)
      setProgress({ current: 0, total: 0 })
    }
  }
  
  // 快速选择日期范围
  const setQuickRange = (days) => {
    const endDate = new Date()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    })
  }
  
  return (
    <div className="page-content">
      {/* 页面头部卡片 */}
      <div className="dashboard-header-card">
        <div className="header-left">
          <div className="header-icon">📊</div>
          <div className="header-info">
            <h3>数据录入</h3>
            <p>从东方财富自动获取股票历史K线数据</p>
          </div>
        </div>
        <div className="header-right">
          <div className="live-time">已选 {selectedStocks.length} 只</div>
        </div>
      </div>
      
      {/* 主操作区 */}
      <div className="apple-card" style={{
        animation: 'fadeInUp 0.5s ease 0.2s',
        animationFillMode: 'backwards'
      }}>
        <div className="card-header">
          <h3 className="card-title">🎯 选择股票</h3>
          <div className="card-actions">
            <button 
              onClick={toggleSelectAll}
              className="btn-secondary pill-btn btn-sm"
            >
              {filteredStocks.length > 0 && filteredStocks.every(s => selectedStocks.includes(Number(s.id))) ? '取消全选' : '全选'}
            </button>
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className="search-input-wrapper" style={{ marginBottom: '16px' }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索股票代码或名称..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
          />
        </div>
        
        {/* 股票列表 - 网格布局 */}
        <div className="stock-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '4px'
        }}>
          {filteredStocks.length > 0 ? (
            filteredStocks.map(s => {
              const idNum = Number(s.id)
              const isSelected = selectedStocks.includes(idNum)
              return (
                <div 
                  key={s.id}
                  onClick={() => toggleStockSelection(s.id)}
                  className={`stock-grid-item ${isSelected ? 'selected' : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    padding: '8px 6px',
                    background: isSelected ? 'rgba(102, 126, 234, 0.08)' : 'rgba(255, 255, 255, 0.8)',
                    border: `2px solid ${isSelected ? 'rgba(102, 126, 234, 0.4)' : 'transparent'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)',
                    minHeight: '56px',
                    position: 'relative'
                  }}
                >
                  <span style={{ fontWeight: '700', color: '#667eea', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.2' }}>{s.code}</span>
                  <span style={{ fontSize: '10px', color: '#666', lineHeight: '1.2', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  {isSelected && (
                    <span style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#667eea',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>✓</span>
                  )}
                </div>
              )
            })
          ) : (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '40px',
              color: '#999'
            }}>
              🔍 未找到匹配的股票
            </div>
          )}
        </div>
        
        {/* 分隔线 */}
        <div style={{
          margin: '24px 0',
          height: '1px',
          background: 'rgba(0, 0, 0, 0.06)'
        }}></div>
        
        {/* 时间范围选择 */}
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '16px' }}>📅 时间范围</h4>
          
          {/* 快速选择按钮 */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            flexWrap: 'wrap'
          }}>
            {[7, 30, 90, 180, 365].map(days => (
              <button 
                key={days}
                onClick={() => setQuickRange(days)}
                className="btn-secondary pill-btn btn-sm"
              >
                {days >= 365 ? `${days / 365}年` : `${days}天`}
              </button>
            ))}
          </div>
          
          {/* 日期选择器 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'block' }}>开始日期</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="apple-input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px', display: 'block' }}>结束日期</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="apple-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* 获取按钮 */}
      <div className="apple-card" style={{
        marginTop: '20px',
        animation: 'fadeInUp 0.5s ease 0.3s',
        animationFillMode: 'backwards'
      }}>
        <button 
          onClick={handleFetchHistory}
          className="btn-primary pill-btn"
          disabled={fetching || selectedStocks.length === 0}
          style={{
            width: '100%',
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {fetching ? (
            <>
              <span className="btn-spinner"></span>
              正在获取数据... ({progress.current}/{progress.total})
            </>
          ) : (
            <>
              <span className="btn-icon">🚀</span>
              从网络获取历史数据 ({selectedStocks.length} 只股票)
            </>
          )}
        </button>
        
        {fetching && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: 'rgba(102, 126, 234, 0.05)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            <div style={{ fontSize: '14px', color: '#667eea', marginBottom: '8px' }}>正在从东方财富获取数据，请稍候...</div>
            <div style={{
              height: '6px',
              background: 'rgba(0, 0, 0, 0.06)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${progress.total > 0 ? (progress.current / progress.total * 100) : 0}%`,
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '3px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </div>
      
      {/* 获取结果 */}
      {fetchResult && fetchResult.success && (
        <div className="apple-card" style={{
          marginTop: '20px',
          animation: 'fadeInUp 0.5s ease'
        }}>
          <div className="card-header">
            <h3 className="card-title">✅ 获取结果</h3>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px',
            marginBottom: fetchResult.stockResults ? '24px' : '0'
          }}>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              border: '1px solid #b7eb8f'
            }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#52c41a', lineHeight: '1', marginBottom: '8px' }}>
                {fetchResult.added}
              </div>
              <div style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>新增数据</div>
            </div>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              border: '1px solid #ffd591'
            }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#fa8c16', lineHeight: '1', marginBottom: '8px' }}>
                {fetchResult.skipped}
              </div>
              <div style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>已存在</div>
            </div>
            {fetchResult.errors > 0 && (
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                border: '1px solid #ffa39e'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#f5222d', lineHeight: '1', marginBottom: '8px' }}>
                  {fetchResult.errors}
                </div>
                <div style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>失败</div>
              </div>
            )}
          </div>
          
          {/* 每只股票的详细结果 */}
          {fetchResult.stockResults && fetchResult.stockResults.length > 0 && (
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '16px' }}>📊 各股票获取详情</h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {fetchResult.stockResults.map((result, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: result.success ? 'rgba(82, 196, 26, 0.05)' : 'rgba(245, 34, 45, 0.05)',
                    border: `1px solid ${result.success ? '#b7eb8f' : '#ffa39e'}`,
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                        {result.stock_code} - {result.stock_name || '未知'}
                      </div>
                      <div style={{ color: result.success ? '#52c41a' : '#f5222d' }}>
                        {result.success 
                          ? `成功: 新增 ${result.added} 条，跳过 ${result.skipped} 条`
                          : `失败: ${result.message}`}
                      </div>
                    </div>
                    <span style={{ fontSize: '20px' }}>{result.success ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 使用提示 */}
      <div className="apple-card" style={{
        marginTop: '20px',
        animation: 'fadeInUp 0.5s ease 0.4s',
        animationFillMode: 'backwards'
      }}>
        <h3 className="card-title" style={{ marginBottom: '16px' }}>💡 使用说明</h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '14px',
          color: '#666',
          lineHeight: '1.6'
        }}>
          <p style={{ margin: 0 }}>1. 在上方搜索并选择需要获取数据的股票（支持多选）</p>
          <p style={{ margin: 0 }}>2. 选择时间范围，可以使用快捷按钮或手动选择日期</p>
          <p style={{ margin: 0 }}>3. 点击"从网络获取历史数据"按钮，系统将自动从东方财富下载数据</p>
          <p style={{ margin: 0 }}>4. 数据会自动去重，已存在的数据不会重复添加</p>
        </div>
      </div>
    </div>
  )
}
