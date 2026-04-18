import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function WatchlistPage({ stocks, toast, loadStocks }) {
  const [watchlist, setWatchlist] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ stock_id: '', group_name: '默认分组', notes: '' })
  const [loading, setLoading] = useState(false)
  
  // 下拉框状态
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const dropdownRef = useRef(null)
  const [selectedItems, setSelectedItems] = useState([])
  
  // 列表筛选条件
  const [filterStock, setFilterStock] = useState('')
  const [filterMarket, setFilterMarket] = useState('')
  
  useEffect(() => {
    loadWatchlist()
    loadGroups()
  }, [selectedGroup])
  
  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // 搜索股票（同步，立即响应）
  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchText(value)
    
    if (!value.trim()) {
      setSearchResults([])
      return
    }
    
    const results = stocks.filter(s => 
      s.code.toLowerCase().includes(value.toLowerCase()) || 
      s.name.toLowerCase().includes(value.toLowerCase())
    ).map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      market: s.market
    }))
    
    setSearchResults(results.slice(0, 30))
  }
  
  // 查询并添加新股票
  const handleQueryAndAdd = async (keyword) => {
    setSearching(true)
    try {
      const response = await axios.get(`${API_BASE}/stocks/search`, {
        params: { 
          code: keyword.trim(),
          name: keyword.trim()
        }
      })
      
      if (response.data.exists) {
        setAddForm({...addForm, stock_id: response.data.stock.id})
        setDropdownOpen(false)
        setSearchText('')
        setSearchResults([])
        toast.success(`已选择: ${response.data.stock.code} - ${response.data.stock.name}`)
      } else if (response.data.stock) {
        const addResponse = await axios.post(`${API_BASE}/stocks`, {
          code: response.data.stock.code,
          name: response.data.stock.name,
          market: response.data.stock.market || '深证'
        })
        
        setAddForm({...addForm, stock_id: addResponse.data.id})
        setDropdownOpen(false)
        setSearchText('')
        setSearchResults([])
        if (loadStocks) loadStocks()
        toast.success(`已添加新股票: ${response.data.stock.code} - ${response.data.stock.name}`)
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('未找到该股票，请检查代码或名称')
      } else {
        toast.error(error.response?.data?.error || '查询失败')
      }
    } finally {
      setSearching(false)
    }
  }
  
  // 选择股票
  const handleSelectStock = (stock) => {
    setAddForm({...addForm, stock_id: stock.id})
    setDropdownOpen(false)
    setSearchText('')
    setSearchResults([])
  }
  
  const loadWatchlist = async () => {
    setLoading(true)
    try {
      const url = selectedGroup 
        ? `${API_BASE}/advanced/watchlist?group=${selectedGroup}`
        : `${API_BASE}/advanced/watchlist`
      const response = await axios.get(url)
      setWatchlist(response.data)
    } catch (error) {
      toast.error('加载自选股失败')
    } finally {
      setLoading(false)
    }
  }
  
  const loadGroups = async () => {
    try {
      const response = await axios.get(`${API_BASE}/advanced/watchlist/groups`)
      setGroups(response.data)
    } catch (error) {
      console.error('加载分组失败:', error)
    }
  }
  
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!addForm.stock_id) {
      toast.warning('请选择股票')
      return
    }
    
    try {
      await axios.post(`${API_BASE}/advanced/watchlist`, addForm)
      toast.success('添加成功')
      setShowAddModal(false)
      setAddForm({ stock_id: '', group_name: '默认分组', notes: '' })
      loadWatchlist()
      if (loadStocks) loadStocks()
    } catch (error) {
      toast.error(error.response?.data?.error || '添加失败')
    }
  }
  
  const handleRemove = async (id) => {
    if (!window.confirm('确定删除?')) return
    try {
      await axios.delete(`${API_BASE}/advanced/watchlist/${id}`)
      toast.success('删除成功')
      loadWatchlist()
    } catch (error) {
      toast.error('删除失败')
    }
  }
  
  // 批量删除
  const handleBatchRemove = async () => {
    if (selectedItems.length === 0) {
      toast.warning('请先选择要删除的项')
      return
    }
    
    if (!window.confirm(`确定删除选中的 ${selectedItems.length} 项？`)) return
    
    try {
      for (const id of selectedItems) {
        await axios.delete(`${API_BASE}/advanced/watchlist/${id}`)
      }
      toast.success(`成功删除 ${selectedItems.length} 项`)
      setSelectedItems([])
      loadWatchlist()
    } catch (error) {
      toast.error('删除失败')
    }
  }
  
  // 切换全选
  const toggleSelectAll = () => {
    if (selectedItems.length === watchlist.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(watchlist.map(item => item.id))
    }
  }
  
  // 切换单个选中
  const toggleSelectItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id))
    } else {
      setSelectedItems([...selectedItems, id])
    }
  }
  
  // 应用筛选条件
  const filteredWatchlist = watchlist.filter(item => {
    const matchStock = !filterStock || 
      item.code.toLowerCase().includes(filterStock.toLowerCase()) ||
      item.name.toLowerCase().includes(filterStock.toLowerCase())
    const matchMarket = !filterMarket || item.market === filterMarket
    return matchStock && matchMarket
  })
  
  return (
    <div className="page-content">
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h3>⭐ 自选股管理</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedItems.length > 0 && (
              <button onClick={handleBatchRemove} className="btn-danger">
                🗑️ 批量删除 ({selectedItems.length})
              </button>
            )}
            <button onClick={() => setShowAddModal(true)} className="btn-primary">+ 添加自选股</button>
          </div>
        </div>
        
        {/* 筛选条件 - 苹果风格 */}
        <div className="filter-bar">
          <div className="filter-icon">🔍</div>
          <div className="filter-item">
            <label className="filter-label">分组</label>
            <select 
              value={selectedGroup} 
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="apple-select"
            >
              <option value="">全部分组</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label className="filter-label">股票</label>
            <input
              type="text"
              placeholder="搜索代码或名称"
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value)}
              className="apple-input"
            />
          </div>
          <div className="filter-item">
            <label className="filter-label">市场</label>
            <select 
              value={filterMarket} 
              onChange={(e) => setFilterMarket(e.target.value)}
              className="apple-select"
            >
              <option value="">全部市场</option>
              <option value="上证">上证</option>
              <option value="深证">深证</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={watchlist.length > 0 && selectedItems.length === watchlist.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>代码</th>
                <th>名称</th>
                <th>市场</th>
                <th>最新价</th>
                <th>分组</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredWatchlist.map(item => (
                <tr key={item.id} style={{ background: selectedItems.includes(item.id) ? '#e6f7ff' : 'transparent' }}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                    />
                  </td>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td><span className="tag">{item.market}</span></td>
                  <td>{item.latest_price ? `¥${item.latest_price.toFixed(2)}` : '-'}</td>
                  <td>{item.group_name}</td>
                  <td>{item.notes || '-'}</td>
                  <td>
                    <button className="btn-danger btn-sm" onClick={() => handleRemove(item.id)}>
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {filteredWatchlist.length === 0 && (
                <tr>
                  <td colSpan="8" style={{textAlign: 'center', color: '#999', padding: '40px'}}>
                    {watchlist.length === 0 ? '暂无自选股，点击右上角添加' : '没有匹配的股票'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {/* 添加自选股弹窗 - 苹果风格 */}
      {showAddModal && (
        <div className="apple-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="apple-modal" onClick={(e) => e.stopPropagation()}>
            {/* 头部 */}
            <div className="apple-modal-header">
              <div className="apple-modal-title">
                <div className="apple-modal-icon">⭐</div>
                <div>
                  <h3>添加自选股</h3>
                  <p>快速添加您关注的股票到自选列表</p>
                </div>
              </div>
              <button className="apple-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAdd}>
              {/* 股票选择器 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">📊</span>
                  选择股票
                </label>
                <div ref={dropdownRef} className="apple-dropdown-wrapper">
                  <div
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="apple-select-trigger"
                  >
                    <div className="select-content">
                      {addForm.stock_id ? (() => {
                        const s = stocks.find(st => st.id === Number(addForm.stock_id))
                        return s ? (
                          <div className="selected-stock">
                            <span className="stock-code">{s.code}</span>
                            <span className="stock-name">{s.name}</span>
                          </div>
                        ) : <span className="placeholder">请选择股票</span>
                      })() : <span className="placeholder">搜索股票代码或名称...</span>}
                    </div>
                    <span className="dropdown-arrow">▼</span>
                  </div>
                  
                  {dropdownOpen && (
                    <div className="apple-dropdown">
                      <div className="dropdown-search">
                        <span className="search-icon">🔍</span>
                        <input
                          type="text"
                          placeholder="搜索代码或名称"
                          value={searchText}
                          onChange={handleSearchChange}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchText.trim() && searchResults.length === 0) {
                              handleQueryAndAdd(searchText)
                            }
                          }}
                          className="apple-input search-input"
                          autoFocus
                        />
                      </div>
                      
                      <div className="dropdown-list">
                        {searching ? (
                          <div className="apple-loading">
                            <div className="loading-spinner"></div>
                            <span>查询中...</span>
                          </div>
                        ) : searchResults.length === 0 && searchText.trim() ? (
                          <div className="apple-empty">
                            <div className="empty-icon">🔍</div>
                            <div>未找到匹配股票</div>
                            <div className="empty-hint">按回车键联网查询并添加</div>
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className="apple-empty">
                            <div className="empty-icon">💡</div>
                            <div>输入关键词开始搜索</div>
                          </div>
                        ) : (
                          searchResults.map(s => (
                            <div
                              key={s.id}
                              onClick={() => handleSelectStock(s)}
                              className={`apple-dropdown-item ${addForm.stock_id === s.id ? 'active' : ''}`}
                            >
                              <div className="item-left">
                                <span className="item-code">{s.code}</span>
                                <span className="item-name">{s.name}</span>
                              </div>
                              <span className="item-tag">{s.market}</span>
                            </div>
                          ))
                        )}
                      </div>
                      
                      {searchResults.length > 0 && (
                        <div className="dropdown-stats">
                          共 <strong>{searchResults.length}</strong> 只股票
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 分组名称 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">📁</span>
                  分组名称
                </label>
                <input 
                  type="text" 
                  value={addForm.group_name} 
                  onChange={(e) => setAddForm({...addForm, group_name: e.target.value})} 
                  placeholder="例如：科技股、蓝筹股"
                  className="apple-input"
                />
              </div>
              
              {/* 备注 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">📝</span>
                  备注
                  <span className="label-optional">可选</span>
                </label>
                <textarea 
                  value={addForm.notes} 
                  onChange={(e) => setAddForm({...addForm, notes: e.target.value})} 
                  rows={3}
                  placeholder="添加一些备注信息，方便后续管理..."
                  className="apple-input apple-textarea"
                />
              </div>
              
              {/* 底部按钮 */}
              <div className="apple-modal-actions">
                <button 
                  type="button" 
                  className="apple-btn apple-btn-cancel" 
                  onClick={() => setShowAddModal(false)}
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="apple-btn apple-btn-submit"
                >
                  <span className="btn-icon">✓</span>
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
