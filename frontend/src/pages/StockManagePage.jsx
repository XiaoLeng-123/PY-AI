import { useState, useEffect, useCallback } from 'react'
import { toast } from '../components/Toast'
import { exportStockList } from '../utils/export'
import Pagination from '../components/Pagination'
import { stockAPI } from '../utils/api'

export default function StockManagePage({ loadStocks: refreshParentStocks }) {
  const [stockForm, setStockForm] = useState({ code: '', name: '', market: '财神' })
  const [stockPreview, setStockPreview] = useState(null)
  
  // 标签页状态
  const [activeTab, setActiveTab] = useState('list')
  
  // 后端分页状态
  const [stocks, setStocks] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  
  // 添加股票搜索
  const [searchKeyword, setSearchKeyword] = useState('')
  
  // 查询预览功能
  const [previewStock, setPreviewStock] = useState(null)
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryError, setQueryError] = useState('')
  const [queryTimer, setQueryTimer] = useState(null)
  
  // 从后端加载股票列表（分页）
  const loadStocksFromBackend = useCallback(async (currentPage = page, currentPageSize = pageSize, search = searchText) => {
    setLoading(true)
    try {
      console.log('=== 开始加载股票列表 ===')
      console.log('请求参数:', { page: currentPage, page_size: currentPageSize, search })
      
      const response = await stockAPI.getAll({
        page: currentPage,
        page_size: currentPageSize,
        search: search
      })
      
      console.log('API 完整响应:', response)
      console.log('response.data:', response.data)
      console.log('response.data 类型:', typeof response.data)
      
      // 检查返回的数据结构
      if (Array.isArray(response.data)) {
        // 如果返回的是数组（旧格式）
        console.log('返回的是数组格式，长度:', response.data.length)
        setStocks(response.data)
        setTotal(response.data.length)
      } else if (response.data && typeof response.data === 'object') {
        // 新格式：{items, total, page, ...}
        console.log('返回的是对象格式')
        console.log('items:', response.data.items)
        console.log('total:', response.data.total)
        setStocks(response.data.items || [])
        setTotal(response.data.total || 0)
      } else {
        console.error('未知的数据格式:', response.data)
        setStocks([])
        setTotal(0)
      }
    } catch (error) {
      console.error('加载股票列表失败:', error)
      console.error('错误详情:', error.response?.data)
      console.error('错误状态码:', error.response?.status)
      toast.error('加载股票列表失败: ' + (error.response?.data?.error || error.message))
      setStocks([])
      setTotal(0)
    } finally {
      setLoading(false)
      console.log('=== 加载完成 ===')
    }
  }, [page, pageSize, searchText])
  
  // 初始加载和分页/搜索变化时重新加载
  useEffect(() => {
    loadStocksFromBackend(page, pageSize, searchText)
  }, [page, pageSize, searchText, loadStocksFromBackend])
  
  // 搜索/分页大小变更时重置到第1页
  const handleSearchChange = (value) => {
    setSearchText(value)
    setPage(1)
  }
  
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize)
    setPage(1)
  }
  
  const handleAddStock = async (e) => {
    e.preventDefault()
    
    if (!previewStock && stockForm.code) {
      await handleQueryStock(stockForm.code)
      return
    }
    
    try {
      await stockAPI.add(stockForm)
      toast.success('股票添加成功')
      setStockForm({ code: '', name: '', market: '财神' })
      setPreviewStock(null)
      setQueryError('')
      setSearchKeyword('')
      // 刷新列表
      loadStocksFromBackend()
      refreshParentStocks && refreshParentStocks(true)
      setActiveTab('list')
    } catch (error) {
      toast.error(error.response?.data?.error || '添加失败')
    }
  }
  
  // 查询股票信息（防抖处理）
  const handleQueryStock = async (keyword) => {
    if (queryTimer) {
      clearTimeout(queryTimer)
    }
    
    if (!keyword || keyword.length < 2) {
      setPreviewStock(null)
      setQueryError('')
      return
    }
    
    const timer = setTimeout(async () => {
      setQueryLoading(true)
      setQueryError('')
      setPreviewStock(null)
      
      try {
        const params = {}
        if (/^\d+$/.test(keyword)) {
          params.code = keyword.trim()
        } else {
          params.name = keyword.trim()
        }
        
        const response = await stockAPI.search(params)
        
        if (response.data.exists) {
          setQueryError(`⚠️ 该股票已存在于数据库中：${response.data.stock.name}`)
          setPreviewStock(null)
        } else if (response.data.stock) {
          setPreviewStock(response.data.stock)
          setStockForm({
            code: response.data.stock.code,
            name: response.data.stock.name,
            market: response.data.stock.market
          })
          if (response.data.api_unavailable) {
            setQueryError('⚠️ 无法获取实时行情，请手动确认信息后添加')
          } else {
            setQueryError('')
          }
        } else {
          setQueryError(response.data.error || '查询失败')
        }
      } catch (error) {
        if (error.response?.status === 404) {
          setQueryError('❌ 未找到该股票，请检查代码或名称是否正确')
        } else if (error.response?.status === 409) {
          setQueryError('⚠️ 该股票已存在于数据库中')
        } else {
          setQueryError(error.response?.data?.error || '查询失败')
        }
      } finally {
        setQueryLoading(false)
      }
    }, 500)
    
    setQueryTimer(timer)
  }
  
  const handleDeleteStock = async (id) => {
    if (!window.confirm('确定删除?')) return
    try {
      await stockAPI.delete(id)
      toast.success('删除成功')
      loadStocksFromBackend()
      refreshParentStocks && refreshParentStocks(true)
    } catch (error) {
      toast.error('删除失败')
    }
  }
  
  const handleExportStocks = async () => {
    if (total === 0) {
      toast.warning('没有可导出的股票数据')
      return
    }
    
    // 导出时获取所有数据
    try {
      const response = await stockAPI.getAll({ page: 1, page_size: 10000 })
      const allStocks = response.data.items
      const result = exportStockList(allStocks)
      if (result.success) {
        toast.success(`成功导出 ${result.rows} 条数据`)
      }
    } catch (error) {
      toast.error('导出失败')
    }
  }
  
  return (
    <div className="page-content">
      {/* 页面头部卡片 */}
      <div className="dashboard-header-card">
        <div className="header-left">
          <div className="header-icon">🐎</div>
          <div className="header-info">
            <h3>小马管理</h3>
            <p>管理您的股票列表，添加或删除股票</p>
          </div>
        </div>
        <div className="header-right">
          <div className="live-time">共 {total} 只股票</div>
        </div>
      </div>
      
      {/* 统计卡片 */}
      <div className="dashboard-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card-apple" style={{
          '--card-color': '#667eea',
          '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          animationDelay: '0.1s'
        }}>
          <div className="stat-icon-pill">📊</div>
          <div className="stat-content">
            <div className="stat-label">股票总数</div>
            <div className="stat-value">{total}</div>
            <div className="stat-subtitle">已收录股票</div>
          </div>
        </div>
        
        <div className="stat-card-apple" style={{
          '--card-color': '#4facfe',
          '--card-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          animationDelay: '0.2s'
        }}>
          <div className="stat-icon-pill">🔍</div>
          <div className="stat-content">
            <div className="stat-label">当前页</div>
            <div className="stat-value">{stocks.length}</div>
            <div className="stat-subtitle">显示数量</div>
          </div>
        </div>
        
        <div className="stat-card-apple" style={{
          '--card-color': '#43e97b',
          '--card-gradient': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          animationDelay: '0.3s'
        }}>
          <div className="stat-icon-pill">✅</div>
          <div className="stat-content">
            <div className="stat-label">搜索状态</div>
            <div className="stat-value" style={{ fontSize: '24px' }}>{searchText ? '已搜索' : '全部'}</div>
            <div className="stat-subtitle">{searchText ? `关键词: ${searchText}` : '无搜索条件'}</div>
          </div>
        </div>
        
        <div className="stat-card-apple" style={{
          '--card-color': '#fa709a',
          '--card-gradient': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          animationDelay: '0.4s'
        }}>
          <div className="stat-icon-pill">📈</div>
          <div className="stat-content">
            <div className="stat-label">操作状态</div>
            <div className="stat-value" style={{ fontSize: '24px' }}>{activeTab === 'list' ? '浏览' : '添加'}</div>
            <div className="stat-subtitle">{activeTab === 'list' ? '查看股票列表' : '添加新股票'}</div>
          </div>
        </div>
      </div>
      
      {/* 标签页切换 */}
      <div className="apple-segmented-control">
        <button
          onClick={() => setActiveTab('list')}
          className={`segmented-btn ${activeTab === 'list' ? 'active' : ''}`}
        >
          📋 股票列表 ({total})
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`segmented-btn ${activeTab === 'add' ? 'active' : ''}`}
        >
          ➕ 添加股票
        </button>
      </div>

      {/* 列表标签页 */}
      {activeTab === 'list' && (
        <div className="apple-card" style={{
          animation: 'fadeInUp 0.5s ease 0.5s',
          animationFillMode: 'backwards'
        }}>
          <div className="card-header">
            <h3 className="card-title">📋 股票列表</h3>
            <div className="card-actions">
              {/* 搜索框 */}
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="搜索代码、名称、市场..."
                  value={searchText}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="search-input"
                />
              </div>
              <button onClick={handleExportStocks} className="btn-secondary pill-btn">
                📥 导出
              </button>
            </div>
          </div>
          
          {/* 统计信息条 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '8px 12px',
            marginBottom: '12px',
            background: 'rgba(102, 126, 234, 0.06)',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#666'
          }}>
            <span>📊 共 <strong style={{ color: '#667eea' }}>{total}</strong> 只</span>
            <span style={{ color: '#ddd' }}>|</span>
            <span>📄 第 <strong style={{ color: '#667eea' }}>{page}</strong> 页</span>
            <span style={{ color: '#ddd' }}>|</span>
            <span>🔍 每页 <strong style={{ color: '#667eea' }}>{pageSize}</strong> 条</span>
            {loading && <span style={{ marginLeft: 'auto' }}>⏳ 加载中...</span>}
          </div>
          
          <div className="table-container">
            <table className="data-table apple-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>代码</th>
                  <th>名称</th>
                  <th>市场</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {stocks.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      {searchText ? '🔍 未找到匹配的股票' : '📭 暂无股票数据，请切换到“添加股票”标签页'}
                    </td>
                  </tr>
                ) : (
                  stocks.map(stock => (
                    <tr key={stock.id}>
                      <td>{stock.id}</td>
                      <td className="code-cell">{stock.code}</td>
                      <td>{stock.name}</td>
                      <td><span className="tag pill-tag">{stock.market}</span></td>
                      <td>
                        <button className="btn-danger pill-btn btn-sm" onClick={() => handleDeleteStock(stock.id)}>
                          🗑️ 删除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {/* 添加标签页 */}
      {activeTab === 'add' && (
        <div className="apple-card" style={{
          animation: 'fadeInUp 0.5s ease 0.5s',
          animationFillMode: 'backwards'
        }}>
          <div className="card-header">
            <h3 className="card-title">➕ 添加新股票</h3>
          </div>
          
          <form onSubmit={handleAddStock}>
            <div className="form-group">
              <div className="search-input-wrapper large">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => {
                    const keyword = e.target.value
                    setSearchKeyword(keyword)
                    handleQueryStock(keyword)
                  }}
                  placeholder="搜索股票代码或名称，如：600652 或 中安科"
                  className="search-input"
                />
              </div>
              <div className="form-hint">
                💡 支持代码、名称、拼音搜索
              </div>
            </div>
            
            {queryLoading && (
              <div className="loading-state">
                <div className="spinner">⏳</div>
                <div>正在查询股票信息...</div>
              </div>
            )}
            
            {queryError && (
              <div className="error-banner">
                {queryError}
              </div>
            )}
            
            {previewStock && (
              <div className="preview-card">
                <div className="preview-header">
                  <span className="preview-icon">✅</span>
                  <span>查询成功！请确认以下信息：</span>
                </div>
                
                <div className="preview-grid">
                  <div className="preview-item">
                    <div className="item-label">股票代码</div>
                    <div className="item-value code">{previewStock.code}</div>
                  </div>
                  <div className="preview-item">
                    <div className="item-label">股票名称</div>
                    <div className="item-value name">{previewStock.name}</div>
                  </div>
                  <div className="preview-item">
                    <div className="item-label">所属市场</div>
                    <div className="item-value market">{previewStock.market}</div>
                  </div>
                </div>
                
                {(previewStock.price || previewStock.price === 0) && (
                  <div className="preview-grid">
                    <div className="preview-item">
                      <div className="item-label">最新价</div>
                      <div className={`item-value price ${previewStock.change >= 0 ? 'up' : 'down'}`}>
                        ¥{previewStock.price}
                      </div>
                    </div>
                    <div className="preview-item">
                      <div className="item-label">涨跌幅</div>
                      <div className={`item-value change ${previewStock.change >= 0 ? 'up' : 'down'}`}>
                        {previewStock.change >= 0 ? '+' : ''}{previewStock.change}%
                      </div>
                    </div>
                    <div className="preview-item">
                      <div className="item-label">最高/最低</div>
                      <div className="item-value range">
                        <span className="up">¥{previewStock.high}</span>
                        {' / '}
                        <span className="down">¥{previewStock.low}</span>
                      </div>
                    </div>
                  </div>
                )}
                            
                <div className="preview-footer">
                  确认无误后，点击下方"添加股票"按钮
                </div>
              </div>
            )}
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-primary pill-btn large"
                disabled={queryLoading || !previewStock}
              >
                {!previewStock ? (
                  <><span>🔍</span> 先查询股票信息</>
                ) : (
                  <><span>✅</span> 确认添加</>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setStockForm({ code: '', name: '', market: '财神' })
                  setPreviewStock(null)
                  setQueryError('')
                  setSearchKeyword('')
                }}
                className="btn-secondary pill-btn large danger"
              >
                <span>🗑️</span> 清空
              </button>
            </div>
          </form>
          
          <div className="tip-banner">
            💡 <strong>提示：</strong>
            <ul>
              <li>在任一输入框中输入代码或名称即可自动查询</li>
              <li>查询成功后会显示预览信息，确认无误后再点击添加</li>
              <li>如果股票已存在于数据库中，会提示您无需重复添加</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
