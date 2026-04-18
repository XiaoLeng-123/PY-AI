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
      {/* 头部卡片 */}
      <div className="signals-header-card">
        <div className="header-icon">🎯</div>
        <div className="header-info">
          <h3>交易信号系统</h3>
          <p>基于技术指标分析生成智能买卖信号与操作建议</p>
        </div>
      </div>
      
      {/* 查询控制区 - 药丸形状 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="signals-controls">
          <div className="control-item">
            <label className="control-label">选择股票</label>
            <select 
              value={localSelected} 
              onChange={(e) => setLocalSelected(e.target.value)}
              className="apple-select"
            >
              <option value="">请选择股票</option>
              {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>
          
          <button 
            onClick={loadSignals} 
            className="btn-primary pill-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                分析中...
              </>
            ) : (
              <>
                <span className="btn-icon">⚡</span>
                生成信号
              </>
            )}
          </button>
        </div>
      </div>
        
      {signals && (
        <div>
          {/* 指标统计卡片网格 - 药丸形状 */}
          <div className="signals-grid" style={{marginBottom: '20px'}}>
            <div className="signal-stat-card">
              <div className="stat-label">最新价</div>
              <div className="stat-value primary">¥{signals.latest_price.toFixed(2)}</div>
            </div>
            
            <div className="signal-stat-card">
              <div className="stat-label">MA5</div>
              <div className="stat-value">¥{signals.indicators.ma5.toFixed(2)}</div>
            </div>
            
            <div className="signal-stat-card">
              <div className="stat-label">MA10</div>
              <div className="stat-value">¥{signals.indicators.ma10.toFixed(2)}</div>
            </div>
            
            <div className="signal-stat-card">
              <div className="stat-label">MA20</div>
              <div className="stat-value">¥{signals.indicators.ma20.toFixed(2)}</div>
            </div>
            
            <div className="signal-stat-card success">
              <div className="stat-label">支撑位</div>
              <div className="stat-value">¥{signals.indicators.support.toFixed(2)}</div>
            </div>
            
            <div className="signal-stat-card danger">
              <div className="stat-label">阻力位</div>
              <div className="stat-value">¥{signals.indicators.resistance.toFixed(2)}</div>
            </div>
          </div>
            
          {/* 交易信号列表 - 药丸形状 */}
          <div className="card" style={{marginBottom: '20px'}}>
            <h4 className="section-title">交易信号</h4>
            <div className="signals-list">
              {signals.signals.map((signal, i) => (
                <div 
                  key={i} 
                  className={`signal-item ${signal.type}`}
                >
                  <div className="signal-header">
                    <div className="signal-type-badge">
                      {signal.type === 'buy' ? '📈 买入' : '📉 卖出'}
                    </div>
                    <div className="signal-message">{signal.message}</div>
                  </div>
                  <div className="signal-meta">
                    <span className="meta-tag">指标: {signal.indicator}</span>
                    <span className={`strength-badge ${signal.strength}`}>
                      强度: {signal.strength === 'strong' ? '强' : signal.strength === 'medium' ? '中' : '弱'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
            
          {/* 操作建议 - 大圆角容器 */}
          <div className="suggestions-container">
            <h4 className="section-title">💡 操作建议</h4>
            <div className="suggestions-grid">
              <div className="suggestion-card stop-loss">
                <div className="suggestion-label">止损价</div>
                <div className="suggestion-value">¥{signals.suggestions.stop_loss.toFixed(2)}</div>
                <div className="suggestion-desc">风险控制线</div>
              </div>
              
              <div className="suggestion-card take-profit">
                <div className="suggestion-label">止盈价</div>
                <div className="suggestion-value">¥{signals.suggestions.take_profit.toFixed(2)}</div>
                <div className="suggestion-desc">目标收益点</div>
              </div>
              
              <div className="suggestion-card ratio">
                <div className="suggestion-label">盈亏比</div>
                <div className="suggestion-value">{signals.suggestions.risk_reward_ratio}:1</div>
                <div className="suggestion-desc">风险收益比</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
