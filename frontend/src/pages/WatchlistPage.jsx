import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function WatchlistPage({ stocks, toast }) {
  const [watchlist, setWatchlist] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ stock_id: '', group_name: '默认分组', notes: '' })
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    loadWatchlist()
    loadGroups()
  }, [selectedGroup])
  
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
  
  return (
    <div className="page-content">
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h3>⭐ 自选股管理</h3>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">+ 添加自选股</button>
        </div>
        
        <div className="form-item" style={{marginBottom: '20px'}}>
          <label>分组筛选</label>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
            <option value="">全部分组</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
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
              {watchlist.map(item => (
                <tr key={item.id}>
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
              {watchlist.length === 0 && (
                <tr>
                  <td colSpan="7" style={{textAlign: 'center', color: '#999'}}>
                    暂无自选股,点击右上角添加
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {/* 添加自选股弹窗 */}
      {showAddModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="card" style={{width: '500px', maxWidth: '90%'}}>
            <h3>添加自选股</h3>
            <form onSubmit={handleAdd}>
              <div className="form-item">
                <label>选择股票</label>
                <select value={addForm.stock_id} onChange={(e) => setAddForm({...addForm, stock_id: e.target.value})} required>
                  <option value="">请选择</option>
                  {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
              </div>
              <div className="form-item">
                <label>分组名称</label>
                <input type="text" value={addForm.group_name} onChange={(e) => setAddForm({...addForm, group_name: e.target.value})} placeholder="默认分组" />
              </div>
              <div className="form-item">
                <label>备注</label>
                <textarea value={addForm.notes} onChange={(e) => setAddForm({...addForm, notes: e.target.value})} rows={3} />
              </div>
              <div className="form-row" style={{justifyContent: 'flex-end'}}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>取消</button>
                <button type="submit" className="btn-primary">添加</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
