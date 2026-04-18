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

    // 检查当前列表是否已全部选中
    const allSelected = currentIds.every(id => selectedStocks.includes(id))
    
    if (allSelected) {
      // 取消全选：移除当前列表中的股票
      setSelectedStocks(prev => prev.filter(id => !currentIds.includes(id)))
    } else {
      // 全选：将当前列表追加到已选列表（去重）
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
      // 如果只选了一只股票，使用单只接口
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
        // 多只股票使用批量接口
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
      {/* 顶部说明 */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>📊 数据录入</h2>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '14px', lineHeight: '1.6' }}>
          从东方财富自动获取股票历史K线数据，选择股票和时间范围后一键批量下载
        </p>
      </div>
      
      {/* 主录入卡片 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>🎯 选择股票</h3>
        
        {/* 搜索框 */}
        <input
          type="text"
          placeholder="🔍 搜索股票代码或名称..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 15px',
            border: '2px solid #e8e8e8',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '15px',
            transition: 'all 0.3s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#1890ff'}
          onBlur={(e) => e.target.style.borderColor = '#e8e8e8'}
        />
        
        {/* 全选按钮 */}
        <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={toggleSelectAll}
            className="btn-secondary"
            style={{ padding: '6px 16px', fontSize: '13px' }}
          >
            {/* 修复：只有当列表有股票且全部选中时才显示取消，否则显示全选 */}
            {filteredStocks.length > 0 && filteredStocks.every(s => selectedStocks.includes(Number(s.id))) ? '🚫 取消全选' : '☐ 全选'}
          </button>
          {selectedStocks.length > 0 && (
            <span style={{ color: '#1890ff', fontSize: '14px', fontWeight: 'bold' }}>
              已选择 {selectedStocks.length} 只股票
            </span>
          )}
        </div>
        
        {/* 股票列表 */}
        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          border: '2px solid #e8e8e8',
          borderRadius: '8px',
          padding: '10px'
        }}>
          {filteredStocks.length > 0 ? (
            filteredStocks.map(s => {
              const idNum = Number(s.id)
              const isSelected = selectedStocks.includes(idNum)
              return (
                <div 
                  key={s.id}
                  onClick={() => toggleStockSelection(s.id)}
                  style={{
                    padding: '10px 12px',
                    marginBottom: '4px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isSelected ? '#e6f7ff' : '#fff',
                    border: isSelected ? '2px solid #1890ff' : '2px solid #f0f0f0',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#fafafa'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#fff'
                    }
                  }}
                >
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: isSelected ? '2px solid #1890ff' : '2px solid #d9d9d9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    color: '#fff',
                    background: isSelected ? '#1890ff' : 'transparent',
                    transition: 'all 0.2s'
                  }}>
                    {isSelected && '✓'}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{s.code}</span>
                  <span style={{ fontSize: '14px', color: '#666' }}>{s.name}</span>
                </div>
              )
            })
          ) : (
            <div style={{ color: '#999', fontSize: '14px', textAlign: 'center', padding: '30px' }}>
              未找到匹配的股票
            </div>
          )}
        </div>
      </div>
      
      {/* 时间范围选择 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>📅 时间范围</h3>
        
        {/* 快速选择按钮 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setQuickRange(7)}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            最近7天
          </button>
          <button 
            onClick={() => setQuickRange(30)}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            最近30天
          </button>
          <button 
            onClick={() => setQuickRange(90)}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            最近90天
          </button>
          <button 
            onClick={() => setQuickRange(180)}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            最近180天
          </button>
          <button 
            onClick={() => setQuickRange(365)}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            最近1年
          </button>
        </div>
        
        {/* 日期选择器 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              开始日期
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e8e8e8',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              结束日期
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e8e8e8',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </div>
      
      {/* 获取按钮 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleFetchHistory}
          className="btn-primary"
          disabled={fetching || selectedStocks.length === 0}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: fetching || selectedStocks.length === 0 ? 0.6 : 1
          }}
        >
          {fetching ? (
            <>
              ⏳ 正在获取数据... ({progress.current}/{progress.total})
            </>
          ) : (
            <>
              🚀 从网络获取历史数据 ({selectedStocks.length} 只股票)
            </>
          )}
        </button>
        
        {fetching && (
          <div style={{
            marginTop: '15px',
            padding: '15px',
            background: '#e6f7ff',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', color: '#1890ff', marginBottom: '8px' }}>
              正在从东方财富获取数据，请稍候...
            </div>
            <div style={{
              height: '6px',
              background: '#d9d9d9',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${progress.total > 0 ? (progress.current / progress.total * 100) : 0}%`,
                background: 'linear-gradient(90deg, #1890ff, #36cfc9)',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
        )}
      </div>
      
      {/* 获取结果 */}
      {fetchResult && fetchResult.success && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#52c41a' }}>✅ 获取结果</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              padding: '15px',
              background: '#f6ffed',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #b7eb8f'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                {fetchResult.added}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>新增数据</div>
            </div>
            <div style={{
              padding: '15px',
              background: '#fff7e6',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #ffd591'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fa8c16' }}>
                {fetchResult.skipped}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>已存在</div>
            </div>
            {fetchResult.errors > 0 && (
              <div style={{
                padding: '15px',
                background: '#fff1f0',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #ffa39e'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4d4f' }}>
                  {fetchResult.errors}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>失败</div>
              </div>
            )}
          </div>
          
          {/* 每只股票的详细结果 */}
          {fetchResult.stockResults && fetchResult.stockResults.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📊 各股票获取详情</h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {fetchResult.stockResults.map((result, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: result.success ? '#f6ffed' : '#fff1f0',
                    border: `1px solid ${result.success ? '#b7eb8f' : '#ffa39e'}`,
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {result.stock_code} - {result.stock_name || '未知'}
                      </div>
                      {result.success ? (
                        <div style={{ fontSize: '13px', color: '#52c41a' }}>
                          成功: 新增 {result.added} 条，跳过 {result.skipped} 条
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#ff4d4f' }}>
                          失败: {result.message}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '20px' }}>
                      {result.success ? '✅' : '❌'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 使用提示 */}
      <div className="card">
        <h3 style={{ margin: '0 0 15px 0' }}>💡 使用说明</h3>
        <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#666' }}>
          <p style={{ margin: '0 0 10px 0' }}>1. 在上方搜索并选择需要获取数据的股票（支持多选）</p>
          <p style={{ margin: '0 0 10px 0' }}>2. 选择时间范围，可以使用快捷按钮或手动选择日期</p>
          <p style={{ margin: '0 0 10px 0' }}>3. 点击"从网络获取历史数据"按钮，系统将自动从东方财富下载数据</p>
          <p style={{ margin: '0' }}>4. 数据会自动去重，已存在的数据不会重复添加</p>
        </div>
      </div>
    </div>
  )
}
