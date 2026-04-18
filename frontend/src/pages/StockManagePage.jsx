import { useState, useMemo } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'
import { exportStockList } from '../utils/export'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function StockManagePage({ stocks, loadStocks }) {
  const [stockForm, setStockForm] = useState({ code: '', name: '', market: '财神' })
  const [stockSearchLoading, setStockSearchLoading] = useState(false)
  const [stockPreview, setStockPreview] = useState(null)
  const [stockDetails, setStockDetails] = useState({})
  
  // 标签页状态
  const [activeTab, setActiveTab] = useState('list') // 'list' 或 'add'
  
  // 搜索功能
  const [searchText, setSearchText] = useState('')
  
  // 添加股票搜索
  const [searchKeyword, setSearchKeyword] = useState('')
  
  // 查询预览功能
  const [previewStock, setPreviewStock] = useState(null)
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryError, setQueryError] = useState('')
  const [queryTimer, setQueryTimer] = useState(null)
  
  // 筛选后的股票列表
  const filteredStocks = useMemo(() => {
    if (!searchText) return stocks
    const lower = searchText.toLowerCase()
    return stocks.filter(s => 
      s.code.toLowerCase().includes(lower) || 
      s.name.toLowerCase().includes(lower) ||
      s.market.toLowerCase().includes(lower)
    )
  }, [stocks, searchText])
  
  const handleAddStock = async (e) => {
    e.preventDefault()
    
    // 如果没有预览信息，先查询
    if (!previewStock && stockForm.code) {
      await handleQueryStock(stockForm.code)
      return
    }
    
    try {
      await axios.post(`${API_BASE}/stocks`, stockForm)
      toast.success('股票添加成功')
      setStockForm({ code: '', name: '', market: '财神' })
      setPreviewStock(null)
      setQueryError('')
      loadStocks(true)
      // 添加成功后自动切换到列表页
      setActiveTab('list')
    } catch (error) {
      toast.error(error.response?.data?.error || '添加失败')
    }
  }
  
  // 查询股票信息（防抖处理）
  const handleQueryStock = async (keyword) => {
    // 清除之前的定时器
    if (queryTimer) {
      clearTimeout(queryTimer)
    }
    
    // 如果关键词为空，清空预览
    if (!keyword || keyword.length < 2) {
      setPreviewStock(null)
      setQueryError('')
      return
    }
    
    // 设置防抖，等待用户输入完成后才查询
    const timer = setTimeout(async () => {
      setQueryLoading(true)
      setQueryError('')
      setPreviewStock(null)
      
      try {
        const params = {}
        // 如果全是数字，认为是代码
        if (/^\d+$/.test(keyword)) {
          params.code = keyword.trim()
        } else {
          params.name = keyword.trim()
        }
        
        const response = await axios.get(`${API_BASE}/stocks/search`, {
          params
        })
        
        if (response.data.exists) {
          setQueryError(`⚠️ 该股票已存在于数据库中：${response.data.stock.name}`)
          setPreviewStock(null)
        } else if (response.data.stock) {
          setPreviewStock(response.data.stock)
          // 自动填充表单
          setStockForm({
            code: response.data.stock.code,
            name: response.data.stock.name,
            market: response.data.stock.market
          })
          // 如果API不可用，显示警告而不是错误
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
    }, 500) // 500ms 防抖
    
    setQueryTimer(timer)
  }
  
  const handleDeleteStock = async (id) => {
    if (!window.confirm('确定删除?')) return
    try {
      await axios.delete(`${API_BASE}/stocks/${id}`)
      toast.success('删除成功')
      loadStocks(true)
    } catch (error) {
      toast.error('删除失败')
    }
  }
  
  const handleExportStocks = () => {
    if (stocks.length === 0) {
      toast.warning('没有可导出的股票数据')
      return
    }
    const result = exportStockList(stocks)
    if (result.success) {
      toast.success(`成功导出 ${result.rows} 条数据`)
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
          <div className="live-time">共 {stocks.length} 只股票</div>
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
            <div className="stat-value">{stocks.length}</div>
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
            <div className="stat-label">搜索结果</div>
            <div className="stat-value">{filteredStocks.length}</div>
            <div className="stat-subtitle">当前显示</div>
          </div>
        </div>
        
        <div className="stat-card-apple" style={{
          '--card-color': '#43e97b',
          '--card-gradient': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          animationDelay: '0.3s'
        }}>
          <div className="stat-icon-pill">✅</div>
          <div className="stat-content">
            <div className="stat-label">筛选状态</div>
            <div className="stat-value" style={{ fontSize: '24px' }}>{searchText ? '已筛选' : '全部'}</div>
            <div className="stat-subtitle">{searchText ? `关键词: ${searchText}` : '无筛选条件'}</div>
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
      {/* 标签页切换 - 苹果风格 */}
      <div className="apple-segmented-control">
        <button
          onClick={() => setActiveTab('list')}
          className={`segmented-btn ${activeTab === 'list' ? 'active' : ''}`}
        >
          📋 股票列表 ({stocks.length})
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
              {/* 搜索框 - 苹果风格 */}
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="搜索代码、名称、市场..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="search-input"
                />
              </div>
              <button onClick={handleExportStocks} className="btn-secondary pill-btn">
                📥 导出
              </button>
            </div>
          </div>
          
          {/* 统计信息条 - 苹果风格 */}
          <div className="info-banner">
            <div className="info-item">
              <span className="info-icon">📊</span>
              <span>共 <strong>{stocks.length}</strong> 只股票</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🔍</span>
              <span>显示 <strong>{filteredStocks.length}</strong> 只</span>
            </div>
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
                {filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      {searchText ? '🔍 未找到匹配的股票' : '📭 暂无股票数据，请切换到“添加股票”标签页'}
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map(stock => (
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
            {/* 搜索框 - 苹果风格 */}
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
            
            {/* 加载状态 - 苹果风格 */}
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
                
                {/* 基本信息 */}
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
                
                {/* 实时行情 */}
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
                  确认无误后，点击下方“添加股票”按钮
                </div>
              </div>
            )}
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-primary pill-btn large"
                disabled={stockSearchLoading || queryLoading || !previewStock}
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
                }}
                className="btn-secondary pill-btn large danger"
              >
                <span>🗑️</span> 清空
              </button>
            </div>
          </form>
          
          {/* 提示框 - 苹果风格 */}
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
