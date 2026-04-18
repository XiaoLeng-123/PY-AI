import { useState } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'
import StockChart from '../components/Charts/StockChart'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function TradingSignalsPage({ stocks, selectedStock }) {
  const [signals, setSignals] = useState(null)
  const [loading, setLoading] = useState(false)
  const [localSelected, setLocalSelected] = useState(selectedStock || '')
  
  const loadSignals = async () => {
    if (!localSelected) {
      toast.warning('请选择股票')
      return
    }
    
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/advanced/signals`, {
        params: { stock_id: localSelected }
      })
      setSignals(response.data)
    } catch (error) {
      toast.error(error.response?.data?.error || '加载失败')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="page-content">
      <div className="card">
        <h3>🎯 交易信号系统</h3>
        
        <div className="form-item" style={{marginBottom: '20px'}}>
          <label>选择股票</label>
          <select value={localSelected} onChange={(e) => setLocalSelected(e.target.value)}>
            <option value="">请选择</option>
            {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
          </select>
          <button onClick={loadSignals} className="btn-primary" style={{marginLeft: '10px'}} disabled={loading}>
            {loading ? '分析中...' : '生成信号'}
          </button>
        </div>
        
        {signals && (
          <div>
            <div className="stat-cards" style={{marginBottom: '20px'}}>
              <div className="stat-box">
                <div className="label">最新价</div>
                <div className="value primary">¥{signals.latest_price.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">MA5</div>
                <div className="value">¥{signals.indicators.ma5.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">MA10</div>
                <div className="value">¥{signals.indicators.ma10.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">MA20</div>
                <div className="value">¥{signals.indicators.ma20.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">支撑位</div>
                <div className="value success">¥{signals.indicators.support.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">阻力位</div>
                <div className="value danger">¥{signals.indicators.resistance.toFixed(2)}</div>
              </div>
            </div>
            
            <div style={{marginBottom: '20px'}}>
              <h4>交易信号</h4>
              {signals.signals.map((signal, i) => (
                <div key={i} style={{padding: '12px', marginBottom: '10px', background: signal.type === 'buy' ? '#f6ffed' : '#fff2f0', borderRadius: '4px', borderLeft: `4px solid ${signal.type === 'buy' ? '#52c41a' : '#f5222d'}`}}>
                  <strong>{signal.type === 'buy' ? '📈 买入信号' : '📉 卖出信号'}</strong> - {signal.message}
                  <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                    指标: {signal.indicator} | 强度: {signal.strength === 'strong' ? '强' : signal.strength === 'medium' ? '中' : '弱'}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{padding: '15px', background: '#e6f7ff', borderRadius: '8px'}}>
              <h4 style={{marginTop: 0}}>💡 操作建议</h4>
              <div className="stat-cards">
                <div className="stat-box">
                  <div className="label">止损价</div>
                  <div className="value danger">¥{signals.suggestions.stop_loss.toFixed(2)}</div>
                </div>
                <div className="stat-box">
                  <div className="label">止盈价</div>
                  <div className="value success">¥{signals.suggestions.take_profit.toFixed(2)}</div>
                </div>
                <div className="stat-box">
                  <div className="label">盈亏比</div>
                  <div className="value">{signals.suggestions.risk_reward_ratio}:1</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
