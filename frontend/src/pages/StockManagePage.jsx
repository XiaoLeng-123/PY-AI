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
      {/* 页面标题区域 */}
      <div style={{
        marginBottom: '24px',
        animation: 'fadeInUp 0.5s ease',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#333',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '28px' }}>🐎</span>
            小马管理
          </h2>
          <p style={{
            marginTop: '8px',
            color: '#999',
            fontSize: '14px',
            margin: 0
          }}>
            管理您的股票列表，添加或删除股票
          </p>
        </div>
      </div>
      
      {/* 统计卡片 */}
      <div className="dashboard-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="modern-stat-card" style={{
          animationDelay: '0.1s',
          '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '--card-shadow': 'rgba(102, 126, 234, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            📊
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">股票总数</div>
            <div className="stat-card-value" style={{ color: '#667eea' }}>
              {stocks.length}
            </div>
            <div className="stat-card-subtitle">已收录股票</div>
          </div>
        </div>
        
        <div className="modern-stat-card" style={{
          animationDelay: '0.2s',
          '--card-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          '--card-shadow': 'rgba(79, 172, 254, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            🔍
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">搜索结果</div>
            <div className="stat-card-value" style={{ color: '#4facfe' }}>
              {filteredStocks.length}
            </div>
            <div className="stat-card-subtitle">当前显示</div>
          </div>
        </div>
        
        <div className="modern-stat-card" style={{
          animationDelay: '0.3s',
          '--card-gradient': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          '--card-shadow': 'rgba(67, 233, 123, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            ✅
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">筛选状态</div>
            <div className="stat-card-value" style={{ color: '#43e97b', fontSize: '24px' }}>
              {searchText ? '已筛选' : '全部'}
            </div>
            <div className="stat-card-subtitle">{searchText ? `关键词: ${searchText}` : '无筛选条件'}</div>
          </div>
        </div>
        
        <div className="modern-stat-card" style={{
          animationDelay: '0.4s',
          '--card-gradient': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          '--card-shadow': 'rgba(250, 112, 154, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            📈
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">操作状态</div>
            <div className="stat-card-value" style={{ color: '#fa709a', fontSize: '24px' }}>
              {activeTab === 'list' ? '浏览' : '添加'}
            </div>
            <div className="stat-card-subtitle">{activeTab === 'list' ? '查看股票列表' : '添加新股票'}</div>
          </div>
        </div>
      </div>
      {/* 标签页切换 */}
      <div className="card" style={{marginBottom: '20px', padding: '0'}}>
        <div style={{display: 'flex', borderBottom: '2px solid #f0f0f0'}}>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: activeTab === 'list' ? '#fff' : '#fafafa',
              color: activeTab === 'list' ? '#1890ff' : '#666',
              fontWeight: activeTab === 'list' ? 'bold' : 'normal',
              fontSize: '15px',
              cursor: 'pointer',
              borderBottom: activeTab === 'list' ? '3px solid #1890ff' : '3px solid transparent',
              transition: 'all 0.3s'
            }}
          >
            📋 股票列表 ({stocks.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: activeTab === 'add' ? '#fff' : '#fafafa',
              color: activeTab === 'add' ? '#1890ff' : '#666',
              fontWeight: activeTab === 'add' ? 'bold' : 'normal',
              fontSize: '15px',
              cursor: 'pointer',
              borderBottom: activeTab === 'add' ? '3px solid #1890ff' : '3px solid transparent',
              transition: 'all 0.3s'
            }}
          >
            ➕ 添加股票
          </button>
        </div>
      </div>

      {/* 列表标签页 */}
      {activeTab === 'list' && (
        <div className="card" style={{
          animation: 'fadeInUp 0.5s ease 0.5s',
          animationFillMode: 'backwards'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>📋 股票列表</h3>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              {/* 搜索框 - 现代设计 */}
              <div style={{
                position: 'relative',
                width: '300px'
              }}>
                <div style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  color: '#999',
                  zIndex: 1,
                  pointerEvents: 'none'
                }}>
                  🔍
                </div>
                <input
                  type="text"
                  placeholder="搜索代码、名称、市场..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px 10px 40px',
                    border: '2px solid #e8e8e8',
                    borderRadius: '20px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1890ff'
                    e.target.style.boxShadow = '0 0 0 3px rgba(24, 144, 255, 0.15), 0 4px 10px rgba(0,0,0,0.06)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e8e8e8'
                    e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                />
              </div>
              <button 
                onClick={handleExportStocks} 
                className="btn-secondary"
                style={{
                  padding: '10px 20px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '600'
                }}
              >
                📥 导出
              </button>
            </div>
          </div>
          
          {/* 统计信息 - 现代卡片 */}
          <div style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#1565c0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(21, 101, 192, 0.1)',
            border: '1px solid #90caf9'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📊</span>
              <span style={{ fontWeight: '600' }}>
                共 <span style={{ fontSize: '18px', color: '#0d47a1' }}>{stocks.length}</span> 只股票
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🔍</span>
              <span style={{ fontWeight: '600' }}>
                显示 <span style={{ fontSize: '18px', color: '#0d47a1' }}>{filteredStocks.length}</span> 只
              </span>
            </div>
          </div>
          
          <div style={{maxHeight: '600px', overflowY: 'auto'}}>
            <table className="data-table">
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
                    <td colSpan="5" style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                      {searchText ? '🔍 未找到匹配的股票' : '📭 暂无股票数据，请切换到"添加股票"标签页'}
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map(stock => (
                    <tr key={stock.id}>
                      <td>{stock.id}</td>
                      <td style={{fontWeight: 'bold', color: '#1890ff'}}>{stock.code}</td>
                      <td>{stock.name}</td>
                      <td><span className="tag">{stock.market}</span></td>
                      <td>
                        <button className="btn-danger btn-sm" onClick={() => handleDeleteStock(stock.id)}>
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
        <div className="card" style={{
          animation: 'fadeInUp 0.5s ease 0.5s',
          animationFillMode: 'backwards'
        }}>
          <h3 style={{
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '18px',
            fontWeight: '700'
          }}>➕ 添加新股票</h3>
          
          <form onSubmit={handleAddStock}>
            {/* 搜索框 - 现代简洁设计 */}
            <div style={{
              marginBottom: '28px',
              position: 'relative'
            }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                {/* 左侧搜索图标 */}
                <div style={{
                  position: 'absolute',
                  left: '16px',
                  fontSize: '20px',
                  color: '#999',
                  zIndex: 1,
                  pointerEvents: 'none'
                }}>
                  🔍
                </div>
                
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => {
                    const keyword = e.target.value
                    setSearchKeyword(keyword)
                    handleQueryStock(keyword)
                  }}
                  placeholder="搜索股票代码或名称，如：600652 或 中安科"
                  style={{
                    width: '100%',
                    padding: '14px 20px 14px 48px',
                    fontSize: '15px',
                    border: '2px solid #e8e8e8',
                    borderRadius: '24px',
                    outline: 'none',
                    background: '#fff',
                    color: '#333',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    fontWeight: '400'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1890ff'
                    e.target.style.boxShadow = '0 0 0 3px rgba(24, 144, 255, 0.15), 0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e8e8e8'
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                />
              </div>
              
              {/* 简洁提示 */}
              <div style={{
                marginTop: '10px',
                paddingLeft: '8px',
                fontSize: '12px',
                color: '#999'
              }}>
                💡 支持代码、名称、拼音搜索
              </div>
            </div>
            
            {/* 加载状态 - 简洁设计 */}
            {queryLoading && (
              <div style={{
                marginBottom: '24px',
                padding: '20px',
                background: '#fff',
                border: '2px solid #1890ff',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#1890ff',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)'
              }}>
                <div style={{fontSize: '24px', marginBottom: '8px', animation: 'spin 1s linear infinite'}}>⏳</div>
                <div style={{fontWeight: '500'}}>正在查询股票信息...</div>
              </div>
            )}
            
            {queryError && (
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                background: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: '8px',
                color: '#ff4d4f',
                fontSize: '14px'
              }}>
                {queryError}
              </div>
            )}
            
            {previewStock && (
              <div style={{
                marginBottom: '24px',
                padding: '24px',
                background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                border: '2px solid #b7eb8f',
                borderRadius: '16px',
                boxShadow: '0 4px 16px rgba(82, 196, 26, 0.15)',
                animation: 'fadeInUp 0.3s ease'
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  marginBottom: '20px',
                  color: '#52c41a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  查询成功！请确认以下信息：
                </div>
                
                {/* 基本信息 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    padding: '16px',
                    background: '#fff',
                    borderRadius: '12px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid #f0f0f0'
                  }}>
                    <div style={{fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '500'}}>股票代码</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#1890ff'}}>
                      {previewStock.code}
                    </div>
                  </div>
                  <div style={{
                    padding: '16px',
                    background: '#fff',
                    borderRadius: '12px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid #f0f0f0'
                  }}>
                    <div style={{fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '500'}}>股票名称</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#52c41a'}}>
                      {previewStock.name}
                    </div>
                  </div>
                  <div style={{
                    padding: '16px',
                    background: '#fff',
                    borderRadius: '12px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid #f0f0f0'
                  }}>
                    <div style={{fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '500'}}>所属市场</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#722ed1'}}>
                      {previewStock.market}
                    </div>
                  </div>
                </div>
                
                {/* 实时行情 */}
                {(previewStock.price || previewStock.price === 0) && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      padding: '16px',
                      background: '#fff',
                      borderRadius: '12px',
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      border: '1px solid #f0f0f0'
                    }}>
                      <div style={{fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '500'}}>最新价</div>
                      <div style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: previewStock.change >= 0 ? '#f5222d' : '#52c41a'
                      }}>
                        ¥{previewStock.price}
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      background: '#fff',
                      borderRadius: '12px',
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      border: '1px solid #f0f0f0'
                    }}>
                      <div style={{fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '500'}}>涨跌幅</div>
                      <div style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: previewStock.change >= 0 ? '#f5222d' : '#52c41a'
                      }}>
                        {previewStock.change >= 0 ? '+' : ''}{previewStock.change}%
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      background: '#fff',
                      borderRadius: '12px',
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      border: '1px solid #f0f0f0'
                    }}>
                      <div style={{fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '500'}}>最高/最低</div>
                      <div style={{fontSize: '18px', fontWeight: 'bold', color: '#333'}}>
                        <span style={{color: '#f5222d'}}>¥{previewStock.high}</span>
                        {' / '}
                        <span style={{color: '#52c41a'}}>¥{previewStock.low}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div style={{
                  fontSize: '13px',
                  color: '#999',
                  textAlign: 'center'
                }}>
                  确认无误后，点击下方"添加股票"按钮
                </div>
              </div>
            )}
            
            <div style={{display: 'flex', gap: '16px', marginTop: '24px'}}>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={stockSearchLoading || queryLoading || !previewStock}
                style={{
                  flex: 1,
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '700',
                  borderRadius: '24px',
                  border: 'none',
                  background: !previewStock ? '#d9d9d9' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: !previewStock ? '#999' : '#fff',
                  cursor: !previewStock ? 'not-allowed' : 'pointer',
                  boxShadow: previewStock ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
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
                style={{
                  padding: '16px 32px',
                  fontSize: '16px',
                  fontWeight: '700',
                  borderRadius: '24px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
                  color: '#fff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(255, 154, 158, 0.4)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>🗑️</span> 清空
              </button>
            </div>
          </form>
          
          {/* 提示框 */}
          <div style={{
            marginTop: '24px',
            padding: '15px',
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#d48806'
          }}>
            💡 <strong>提示：</strong>
            <ul style={{margin: '8px 0 0 20px', padding: 0}}>
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
