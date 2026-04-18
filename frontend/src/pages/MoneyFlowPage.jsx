import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'
import RealtimePrice from '../components/Charts/RealtimePrice'
import AppleSelect from '../components/AppleSelect'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function MoneyFlowPage({ stocks }) {
  const [selectedStock, setSelectedStock] = useState('')
  const [moneyflow, setMoneyflow] = useState(null)
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(30)
  
  // 转换股票数据为选项格式
  const stockOptions = useMemo(() => {
    return stocks.map(s => ({
      value: s.id,
      label: `${s.code} - ${s.name}`,
      code: s.code,
      name: s.name
    }))
  }, [stocks])
  
  // 时间范围选项
  const dayOptions = [
    { value: 7, label: '近7天' },
    { value: 30, label: '近30天' },
    { value: 60, label: '近60天' },
    { value: 90, label: '近90天' }
  ]
  
  const loadData = async () => {
    if (!selectedStock) {
      toast.warning('请选择股票')
      return
    }
    
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/advanced/moneyflow`, {
        params: { stock_id: selectedStock, days }
      })
      setMoneyflow(response.data)
    } catch (error) {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="page-content">
      {/* 头部卡片 */}
      <div className="moneyflow-header-card">
        <div className="header-icon">💰</div>
        <div className="header-info">
          <h3>资金流向分析</h3>
          <p>实时追踪主力资金与散户资金的流入流出情况</p>
        </div>
      </div>
      
      {/* 查询控制区 - 药丸形状 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="moneyflow-controls">
          <AppleSelect
            options={stockOptions}
            value={selectedStock}
            onChange={setSelectedStock}
            label="选择股票"
            placeholder="搜索股票代码或名称..."
            filterFields={['code', 'name', 'label']}
            width="280px"
          />
          
          <AppleSelect
            options={dayOptions}
            value={days}
            onChange={(val) => setDays(Number(val))}
            label="时间范围"
            placeholder="选择时间范围"
            filterFields={['label']}
            width="180px"
          />
          
          <button 
            onClick={loadData} 
            className="btn-primary pill-btn"
            disabled={loading}
            style={{ alignSelf: 'flex-end' }}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                加载中...
              </>
            ) : (
              <>
                <span className="btn-icon">🔍</span>
                查询
              </>
            )}
          </button>
        </div>
      </div>
        
      {moneyflow && (
        <div>
          {/* 统计卡片网格 - 药丸形状 */}
          <div className="moneyflow-grid" style={{marginBottom: '20px'}}>
            <div className="moneyflow-stat-card">
              <div className="stat-label">主力总流向</div>
              <div className={`stat-value ${moneyflow.summary.total_main_flow >= 0 ? 'success' : 'danger'}`}>
                {moneyflow.summary.total_main_flow >= 0 ? '+' : ''}{moneyflow.summary.total_main_flow}
              </div>
              <div className="stat-trend">{moneyflow.summary.total_main_flow >= 0 ? '↑ 流入' : '↓ 流出'}</div>
            </div>
            
            <div className="moneyflow-stat-card">
              <div className="stat-label">散户总流向</div>
              <div className={`stat-value ${moneyflow.summary.total_retail_flow >= 0 ? 'success' : 'danger'}`}>
                {moneyflow.summary.total_retail_flow >= 0 ? '+' : ''}{moneyflow.summary.total_retail_flow}
              </div>
              <div className="stat-trend">{moneyflow.summary.total_retail_flow >= 0 ? '↑ 流入' : '↓ 流出'}</div>
            </div>
            
            <div className="moneyflow-stat-card highlight">
              <div className="stat-label">净流入</div>
              <div className={`stat-value ${moneyflow.summary.total_net_flow >= 0 ? 'success' : 'danger'}`}>
                {moneyflow.summary.total_net_flow >= 0 ? '+' : ''}{moneyflow.summary.total_net_flow}
              </div>
              <div className="stat-trend">{moneyflow.summary.total_net_flow >= 0 ? '↑ 净流入' : '↓ 净流出'}</div>
            </div>
            
            <div className="moneyflow-stat-card">
              <div className="stat-label">主力动向</div>
              <div className={`stat-value ${moneyflow.summary.main_flow_direction === '流入' ? 'success' : 'danger'}`}>
                {moneyflow.summary.main_flow_direction}
              </div>
              <div className="stat-trend">{moneyflow.summary.main_flow_direction === '流入' ? '💪 强势' : '⚠️ 弱势'}</div>
            </div>
          </div>
            
          {/* 图表容器 - 大圆角 */}
          <div className="chart-container">
            <RealtimePrice data={moneyflow.daily_data} />
          </div>
        </div>
      )}
    </div>
  )
}
