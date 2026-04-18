import { useState, useEffect } from 'react'
import axios from 'axios'
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
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h3>🔔 预警系统</h3>
          <div>
            <button onClick={handleCheckAlerts} className="btn-secondary" style={{marginRight: '10px'}}>检查预警</button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">+ 新建预警</button>
          </div>
        </div>
        
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
                      {alert.alert_type === 'price' ? '价格' : 
                       alert.alert_type === 'change' ? '涨跌幅' : 
                       alert.alert_type === 'volume' ? '成交量' : '技术指标'}
                    </span>
                  </td>
                  <td>
                    {alert.condition === 'above' ? '高于' : 
                     alert.condition === 'below' ? '低于' : 
                     alert.condition === 'cross_up' ? '上穿' : '下穿'}
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
      
      {/* 创建预警弹窗 */}
      {showAddModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="card" style={{width: '500px', maxWidth: '90%'}}>
            <h3>创建预警</h3>
            <form onSubmit={handleAdd}>
              <div className="form-item">
                <label>选择股票</label>
                <select value={alertForm.stock_id} onChange={(e) => setAlertForm({...alertForm, stock_id: e.target.value})} required>
                  <option value="">请选择</option>
                  {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
              </div>
              <div className="form-item">
                <label>预警类型</label>
                <select value={alertForm.alert_type} onChange={(e) => setAlertForm({...alertForm, alert_type: e.target.value})}>
                  <option value="price">价格预警</option>
                  <option value="change">涨跌幅预警</option>
                </select>
              </div>
              <div className="form-item">
                <label>触发条件</label>
                <select value={alertForm.condition} onChange={(e) => setAlertForm({...alertForm, condition: e.target.value})}>
                  <option value="above">高于</option>
                  <option value="below">低于</option>
                </select>
              </div>
              <div className="form-item">
                <label>阈值</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={alertForm.threshold} 
                  onChange={(e) => setAlertForm({...alertForm, threshold: e.target.value})}
                  placeholder={alertForm.alert_type === 'price' ? '价格' : '百分比'}
                  required
                />
              </div>
              <div className="form-row" style={{justifyContent: 'flex-end'}}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>取消</button>
                <button type="submit" className="btn-primary">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
