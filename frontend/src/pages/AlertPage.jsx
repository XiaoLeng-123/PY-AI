import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import axios from 'axios'
import { stockAPI } from '../utils/api'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function AlertPage({ stocks, selectedStock, toast }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [alertForm, setAlertForm] = useState({
    stock_id: selectedStock || '',
    alert_type: 'price',
    condition: 'above',
    threshold: ''
  })
  
  // 股票下拉框状态
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false)
  const [stockSearchText, setStockSearchText] = useState('')
  const [stockDropdownRef, setStockDropdownRef] = useState(null)
  const [dropdownStocks, setDropdownStocks] = useState([])
  const [dropdownTotal, setDropdownTotal] = useState(0)
  const [dropdownPage, setDropdownPage] = useState(1)
  const [dropdownLoading, setDropdownLoading] = useState(false)
  
  // 从后端加载下拉框股票列表
  const loadDropdownStocks = useCallback(async () => {
    if (!stockDropdownOpen) return
    setDropdownLoading(true)
    try {
      const response = await stockAPI.getAll({
        page: dropdownPage,
        page_size: 20,
        search: stockSearchText
      })
      const data = response.data || {}
      setDropdownStocks(data.items || [])
      setDropdownTotal(data.total || 0)
    } catch (error) {
      console.error('加载股票列表失败:', error)
      setDropdownStocks([])
      setDropdownTotal(0)
    } finally {
      setDropdownLoading(false)
    }
  }, [stockDropdownOpen, dropdownPage, stockSearchText])
  
  useEffect(() => {
    loadDropdownStocks()
  }, [loadDropdownStocks])
  
  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (stockDropdownRef && !stockDropdownRef.contains(e.target)) {
        setStockDropdownOpen(false)
        setStockSearchText('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [stockDropdownRef])
  
  // 预警类型选项
  const alertTypeOptions = [
    { value: 'price', label: '💰 价格预警' },
    { value: 'change', label: '📈 涨跌幅预警' },
    { value: 'volume', label: '📊 成交量预警' },
    { value: 'technical', label: '🎯 技术指标预警' }
  ]
  
  // 触发条件选项（根据预警类型动态变化）
  const conditionOptions = useMemo(() => {
    if (alertForm.alert_type === 'technical') {
      return [
        { value: 'cross_up', label: 'MACD金叉' },
        { value: 'cross_down', label: 'MACD死叉' },
        { value: 'above', label: 'RSI超买(>70)' },
        { value: 'below', label: 'RSI超卖(<30)' },
        { value: 'ma_cross_up', label: '均线金叉' },
        { value: 'ma_cross_down', label: '均线死叉' }
      ]
    } else {
      return [
        { value: 'above', label: '高于' },
        { value: 'below', label: '低于' },
        { value: 'cross_up', label: '上穿' },
        { value: 'cross_down', label: '下穿' }
      ]
    }
  }, [alertForm.alert_type])
  
  useEffect(() => {
    loadAlerts()
  }, [selectedStock])
  
  const loadAlerts = async () => {
    setLoading(true)
    try {
      const url = selectedStock 
        ? `${API_BASE}/advanced/alerts?stock_id=${selectedStock}`
        : `${API_BASE}/advanced/alerts`
      const response = await axios.get(url)
      setAlerts(response.data)
    } catch (error) {
      toast.error('加载预警失败')
    } finally {
      setLoading(false)
    }
  }
  
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!alertForm.stock_id || !alertForm.threshold) {
      toast.warning('请填写完整信息')
      return
    }
    
    try {
      await axios.post(`${API_BASE}/advanced/alerts`, {
        ...alertForm,
        threshold: parseFloat(alertForm.threshold)
      })
      toast.success('预警创建成功')
      setShowAddModal(false)
      setAlertForm({ stock_id: selectedStock || '', alert_type: 'price', condition: 'above', threshold: '' })
      loadAlerts()
    } catch (error) {
      toast.error('创建失败')
    }
  }
  
  const handleToggle = async (id, isActive) => {
    try {
      await axios.put(`${API_BASE}/advanced/alerts/${id}`, { is_active: isActive })
      toast.success(isActive ? '预警已启用' : '预警已禁用')
      loadAlerts()
    } catch (error) {
      toast.error('操作失败')
    }
  }
  
  const handleDelete = async (id) => {
    if (!window.confirm('确定删除?')) return
    try {
      await axios.delete(`${API_BASE}/advanced/alerts/${id}`)
      toast.success('删除成功')
      loadAlerts()
    } catch (error) {
      toast.error('删除失败')
    }
  }
  
  const handleCheckAlerts = async () => {
    try {
      const response = await axios.post(`${API_BASE}/advanced/alerts/check`)
      if (response.data.triggered.length > 0) {
        toast.success(`触发了 ${response.data.count} 个预警!`, { duration: 5000 })
      } else {
        toast.info('没有预警被触发')
      }
    } catch (error) {
      toast.error('检查失败')
    }
  }
  
  return (
    <div className="page-content">
      <div className="alert-header-card">
        <div className="alert-header-content">
          <div className="alert-header-icon">🔔</div>
          <div className="alert-header-info">
            <h3>预警系统</h3>
            <p>实时监控股票价格、涨跌幅和技术指标变化</p>
          </div>
        </div>
        <div className="alert-header-actions">
          <button onClick={handleCheckAlerts} className="btn-secondary pill-btn">检查预警</button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary pill-btn">+ 新建预警</button>
        </div>
      </div>
        
      <div className="card">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>股票</th>
                <th>预警类型</th>
                <th>条件</th>
                <th>阈值</th>
                <th>状态</th>
                <th>触发时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => (
                <tr key={alert.id}>
                  <td>{alert.stock_code} - {alert.stock_name}</td>
                  <td>
                    <span className="tag">
                      {alert.alert_type === 'price' ? '💰 价格' : 
                       alert.alert_type === 'change' ? '📈 涨跌幅' : 
                       alert.alert_type === 'volume' ? '📊 成交量' : '🎯 技术指标'}
                    </span>
                  </td>
                  <td>
                    {alert.condition === 'above' ? '高于' : 
                     alert.condition === 'below' ? '低于' : 
                     alert.condition === 'cross_up' ? (alert.alert_type === 'technical' ? '金叉/超买' : '上穿') : 
                     alert.condition === 'ma_cross_up' ? '均线金叉' :
                     alert.condition === 'ma_cross_down' ? '均线死叉' : '下穿'}
                  </td>
                  <td>{alert.threshold}</td>
                  <td>
                    <label style={{cursor: 'pointer'}}>
                      <input 
                        type="checkbox" 
                        checked={alert.is_active} 
                        onChange={(e) => handleToggle(alert.id, e.target.checked)}
                      />
                      {' '}{alert.is_active ? '启用' : '禁用'}
                    </label>
                  </td>
                  <td>{alert.triggered ? alert.triggered_at : '-'}</td>
                  <td>
                    <button className="btn-danger btn-sm" onClick={() => handleDelete(alert.id)}>删除</button>
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan="7" style={{textAlign: 'center', color: '#999'}}>暂无预警</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {/* 创建预警弹窗 - 苹果风格 */}
      {showAddModal && (
        <div className="apple-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="apple-modal" onClick={(e) => e.stopPropagation()}>
            {/* 头部 */}
            <div className="apple-modal-header">
              <div className="apple-modal-title">
                <div className="apple-modal-icon">🔔</div>
                <div>
                  <h3>创建预警</h3>
                  <p>设置股票价格、涨跌幅或技术指标的预警条件</p>
                </div>
              </div>
              <button className="apple-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAdd}>
              {/* 股票选择 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">📊</span>
                  选择股票
                </label>
                <div ref={setStockDropdownRef} className="apple-dropdown-wrapper" style={{ minWidth: '300px' }}>
                  <div
                    onClick={() => setStockDropdownOpen(!stockDropdownOpen)}
                    className="apple-select-trigger"
                    style={{ minWidth: '300px' }}
                  >
                    <div className="select-content">
                      {alertForm.stock_id ? (() => {
                        const s = dropdownStocks.find(st => st.id === Number(alertForm.stock_id))
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
                  
                  {stockDropdownOpen && (
                    <div className="apple-dropdown">
                      <div className="dropdown-search">
                        <span className="search-icon">🔍</span>
                        <input
                          type="text"
                          placeholder="搜索代码或名称"
                          value={stockSearchText}
                          onChange={(e) => { setStockSearchText(e.target.value); setDropdownPage(1) }}
                          className="apple-input search-input"
                          autoFocus
                        />
                        {dropdownLoading && <span style={{ marginLeft: '8px' }}>⏳</span>}
                      </div>
                      
                      <div className="dropdown-list">
                        {dropdownStocks.length === 0 && stockSearchText.trim() ? (
                          <div className="apple-empty">
                            <div className="empty-icon">🔍</div>
                            <div>未找到匹配股票</div>
                          </div>
                        ) : dropdownStocks.length === 0 ? (
                          <div className="apple-empty">
                            <div className="empty-icon">💡</div>
                            <div>输入关键词开始搜索</div>
                          </div>
                        ) : (
                          dropdownStocks.map(s => (
                            <div
                              key={s.id}
                              onClick={() => {
                                setAlertForm({...alertForm, stock_id: s.id})
                                setStockDropdownOpen(false)
                                setStockSearchText('')
                              }}
                              className={`apple-dropdown-item ${alertForm.stock_id === s.id ? 'active' : ''}`}
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
                      
                      {/* 分页控制 */}
                      {dropdownTotal > 20 && (
                        <div className="dropdown-pagination" style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          borderTop: '1px solid rgba(0,0,0,0.06)'
                        }}>
                          <button 
                            onClick={() => setDropdownPage(p => Math.max(1, p - 1))}
                            disabled={dropdownPage === 1 || dropdownLoading}
                            style={{ 
                              padding: '4px 12px', 
                              border: '1px solid rgba(0,0,0,0.1)',
                              borderRadius: '6px',
                              background: dropdownPage === 1 ? '#f5f5f5' : '#fff',
                              cursor: dropdownPage === 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            ← 上一页
                          </button>
                          <span style={{ fontSize: '13px', color: '#666' }}>
                            第 {dropdownPage} 页 / 共 {Math.ceil(dropdownTotal / 20)} 页
                          </span>
                          <button 
                            onClick={() => setDropdownPage(p => p + 1)}
                            disabled={dropdownPage >= Math.ceil(dropdownTotal / 20) || dropdownLoading}
                            style={{ 
                              padding: '4px 12px', 
                              border: '1px solid rgba(0,0,0,0.1)',
                              borderRadius: '6px',
                              background: dropdownPage >= Math.ceil(dropdownTotal / 20) ? '#f5f5f5' : '#fff',
                              cursor: dropdownPage >= Math.ceil(dropdownTotal / 20) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            下一页 →
                          </button>
                        </div>
                      )}
                      
                      {dropdownStocks.length > 0 && (
                        <div className="dropdown-stats">
                          共 <strong>{dropdownTotal}</strong> 只股票，当前显示 {dropdownStocks.length} 只
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
                          
              {/* 预警类型 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">🎯</span>
                  预警类型
                </label>
                <select
                  value={alertForm.alert_type}
                  onChange={(e) => setAlertForm({...alertForm, alert_type: e.target.value})}
                  className="apple-select"
                  style={{ width: '100%' }}
                >
                  {alertTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
                          
              {/* 触发条件 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">⚡</span>
                  触发条件
                </label>
                <select
                  value={alertForm.condition}
                  onChange={(e) => setAlertForm({...alertForm, condition: e.target.value})}
                  className="apple-select"
                  style={{ width: '100%' }}
                >
                  {conditionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              {/* 阈值输入 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">🎚️</span>
                  阈值
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={alertForm.threshold} 
                  onChange={(e) => setAlertForm({...alertForm, threshold: e.target.value})}
                  placeholder={alertForm.alert_type === 'price' ? '输入目标价格' : '输入百分比'}
                  className="apple-input"
                  required
                />
              </div>
              
              {/* 按钮组 */}
              <div className="apple-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>取消</button>
                <button type="submit" className="btn-primary">创建预警</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
