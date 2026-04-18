import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'
import AppleSelect from '../components/AppleSelect'

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
  
  // 转换股票数据为选项格式
  const stockOptions = useMemo(() => {
    return stocks.map(s => ({
      value: s.id,
      label: `${s.code} - ${s.name}`,
      code: s.code,
      name: s.name
    }))
  }, [stocks])
  
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
                <AppleSelect
                  options={stockOptions}
                  value={alertForm.stock_id}
                  onChange={(val) => setAlertForm({...alertForm, stock_id: val})}
                  placeholder="搜索股票代码或名称..."
                  filterFields={['code', 'name', 'label']}
                  width="100%"
                />
              </div>
                          
              {/* 预警类型 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">🎯</span>
                  预警类型
                </label>
                <AppleSelect
                  options={alertTypeOptions}
                  value={alertForm.alert_type}
                  onChange={(val) => setAlertForm({...alertForm, alert_type: val})}
                  placeholder="选择预警类型"
                  filterFields={['label']}
                  width="100%"
                />
              </div>
                          
              {/* 触发条件 */}
              <div className="apple-form-group">
                <label className="apple-label">
                  <span className="label-icon">⚡</span>
                  触发条件
                </label>
                <AppleSelect
                  options={conditionOptions}
                  value={alertForm.condition}
                  onChange={(val) => setAlertForm({...alertForm, condition: val})}
                  placeholder="选择触发条件"
                  filterFields={['label']}
                  width="100%"
                />
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
