import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import * as echarts from 'echarts'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function BacktestPage({ stocks }) {
  const [selectedStock, setSelectedStock] = useState('')
  const [strategy, setStrategy] = useState('ma_cross') // 策略类型
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [backtestResult, setBacktestResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showOptimize, setShowOptimize] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState(null)
  const chartInstance = useRef(null) // 保存图表实例

  const runBacktest = async () => {
    if (!selectedStock) {
      toast.warning('请选择股票')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/advanced/backtest`, {
        stock_id: selectedStock,
        strategy: strategy,
        start_date: startDate,
        end_date: endDate
      })
      setBacktestResult(response.data)
      toast.success('回测完成')
      
      // 延迟渲染图表，确保DOM已更新
      setTimeout(() => renderEquityChart(response.data.equity_curve), 100)
    } catch (error) {
      toast.error(error.response?.data?.error || '回测失败')
    } finally {
      setLoading(false)
    }
  }

  const runOptimize = async () => {
    if (!selectedStock) {
      toast.warning('请选择股票')
      return
    }

    setLoading(true)
    setShowOptimize(true)
    try {
      const response = await axios.post(`${API_BASE}/advanced/backtest/optimize`, {
        stock_id: selectedStock,
        strategy: strategy,
        start_date: startDate,
        end_date: endDate
      })
      setOptimizeResult(response.data)
      toast.success('参数优化完成')
    } catch (error) {
      toast.error(error.response?.data?.error || '优化失败')
      setShowOptimize(false)
    } finally {
      setLoading(false)
    }
  }

  const renderEquityChart = (equityCurve) => {
    if (!equityCurve || equityCurve.length === 0) return
    
    const chartDom = document.getElementById('equity-chart')
    if (!chartDom) return
    
    // 销毁旧实例
    if (chartInstance.current) {
      chartInstance.current.dispose()
    }
    
    const myChart = echarts.init(chartDom)
    chartInstance.current = myChart // 保存实例
    
    const dates = equityCurve.map(item => item.date)
    const equities = equityCurve.map(item => item.equity)
    const drawdowns = equityCurve.map(item => -item.drawdown) // 负值显示在下方
    
    const option = {
      title: {
        text: '资金曲线 & 回撤',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['资金曲线', '回撤'],
        top: 30
      },
      grid: [
        { left: '10%', right: '8%', height: '50%', top: '15%' },
        { left: '10%', right: '8%', top: '70%', height: '20%' }
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          gridIndex: 0
        },
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          gridIndex: 1
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '资金',
          gridIndex: 0,
          axisLabel: { formatter: '¥{value}' }
        },
        {
          type: 'value',
          name: '回撤%',
          gridIndex: 1,
          axisLabel: { formatter: '{value}%' }
        }
      ],
      series: [
        {
          name: '资金曲线',
          type: 'line',
          data: equities,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#1890ff', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
            ])
          }
        },
        {
          name: '回撤',
          type: 'line',
          data: drawdowns,
          xAxisIndex: 1,
          yAxisIndex: 1,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#f5222d', width: 1.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245, 34, 45, 0.2)' },
              { offset: 1, color: 'rgba(245, 34, 45, 0.05)' }
            ])
          }
        }
      ]
    }
    
    myChart.setOption(option)
    
    // 添加resize监听
    const handleResize = () => myChart.resize()
    window.addEventListener('resize', handleResize)
    
    // 返回清理函数
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }

  // 组件卸载时清理图表
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>📊 策略回测</h2>
      </div>

      {/* 参数设置 */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3>⚙️ 回测参数</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>选择股票</label>
            <select 
              value={selectedStock} 
              onChange={(e) => setSelectedStock(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            >
              <option value="">请选择</option>
              {stocks.map(s => (
                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>策略类型</label>
            <select 
              value={strategy} 
              onChange={(e) => setStrategy(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            >
              <option value="ma_cross">均线金叉/死叉</option>
              <option value="macd">MACD金叉/死叉</option>
              <option value="rsi">RSI超买超卖</option>
              <option value="boll">布林带突破</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>开始日期</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>结束日期</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'right', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={runOptimize} 
            className="btn-secondary"
            disabled={loading}
            style={{ padding: '10px 24px' }}
          >
            🔍 参数优化
          </button>
          <button 
            onClick={runBacktest} 
            className="btn-primary"
            disabled={loading}
            style={{ padding: '10px 24px' }}
          >
            {loading ? '回测中...' : '🚀 开始回测'}
          </button>
        </div>
      </div>

      {/* 回测结果 */}
      {backtestResult && (
        <div>
          {/* 资金曲线图 */}
          <div className="section-card" style={{ marginBottom: '24px' }}>
            <div id="equity-chart" style={{ width: '100%', height: '400px' }}></div>
          </div>

          {/* 核心指标 */}
          <div className="metrics-grid" style={{ marginBottom: '24px' }}>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">💰</span>
                <span className="metric-title">总收益率</span>
              </div>
              <div className={`metric-value ${backtestResult.total_return >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '24px' }}>
                {backtestResult.total_return >= 0 ? '+' : ''}{backtestResult.total_return.toFixed(2)}%
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">📈</span>
                <span className="metric-title">年化收益</span>
              </div>
              <div className={`metric-value ${backtestResult.annualized_return >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '24px' }}>
                {backtestResult.annualized_return >= 0 ? '+' : ''}{backtestResult.annualized_return.toFixed(2)}%
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">🎯</span>
                <span className="metric-title">胜率</span>
              </div>
              <div className="metric-value" style={{ fontSize: '24px' }}>
                {backtestResult.win_rate.toFixed(1)}%
              </div>
              <div className="metric-detail">
                盈利 {backtestResult.win_count} / 亏损 {backtestResult.loss_count}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">⚠️</span>
                <span className="metric-title">最大回撤</span>
              </div>
              <div className="metric-value negative" style={{ fontSize: '24px' }}>
                {backtestResult.max_drawdown.toFixed(2)}%
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">📊</span>
                <span className="metric-title">夏普比率</span>
              </div>
              <div className="metric-value" style={{ fontSize: '24px' }}>
                {backtestResult.sharpe_ratio.toFixed(2)}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">🔄</span>
                <span className="metric-title">交易次数</span>
              </div>
              <div className="metric-value" style={{ fontSize: '24px' }}>
                {backtestResult.trade_count} 次
              </div>
            </div>
          </div>

          {/* 交易记录 */}
          <div className="section-card">
            <h3>📋 交易记录</h3>
            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>类型</th>
                    <th>价格</th>
                    <th>数量</th>
                    <th>金额</th>
                    <th>盈亏</th>
                  </tr>
                </thead>
                <tbody>
                  {backtestResult.trades.map((trade, idx) => (
                    <tr key={idx}>
                      <td>{trade.date}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          background: trade.type === 'buy' ? '#f6ffed' : '#fff1f0',
                          color: trade.type === 'buy' ? '#52c41a' : '#f5222d'
                        }}>
                          {trade.type === 'buy' ? '买入' : '卖出'}
                        </span>
                      </td>
                      <td>¥{trade.price.toFixed(2)}</td>
                      <td>{trade.quantity.toLocaleString()}</td>
                      <td>¥{trade.amount.toLocaleString()}</td>
                      <td className={trade.profit >= 0 ? 'positive' : 'negative'}>
                        {trade.profit !== null ? (trade.profit >= 0 ? '+' : '') + '¥' + trade.profit.toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 策略说明 */}
          <div className="section-card" style={{ marginTop: '24px' }}>
            <h3>💡 策略说明</h3>
            <div style={{ padding: '16px', background: '#f0f5ff', borderRadius: '8px', fontSize: '14px', lineHeight: '1.8', color: '#1890ff' }}>
              {strategy === 'ma_cross' && (
                <>
                  <strong>均线金叉/死叉策略：</strong><br/>
                  • 买入信号：短期均线（MA5）上穿长期均线（MA20）<br/>
                  • 卖出信号：短期均线（MA5）下穿长期均线（MA20）<br/>
                  • 适用场景：趋势行情，震荡市效果较差
                </>
              )}
              {strategy === 'macd' && (
                <>
                  <strong>MACD金叉/死叉策略：</strong><br/>
                  • 买入信号：MACD线上穿Signal线（金叉）<br/>
                  • 卖出信号：MACD线下穿Signal线（死叉）<br/>
                  • 适用场景：中线波段操作
                </>
              )}
              {strategy === 'rsi' && (
                <>
                  <strong>RSI超买超卖策略：</strong><br/>
                  • 买入信号：RSI &lt; 30（超卖区）<br/>
                  • 卖出信号：RSI &gt; 70（超买区）<br/>
                  • 适用场景：震荡行情，反转交易
                </>
              )}
              {strategy === 'boll' && (
                <>
                  <strong>布林带突破策略：</strong><br/>
                  • 买入信号：价格触及下轨后反弹<br/>
                  • 卖出信号：价格触及上轨后回落<br/>
                  • 适用场景：区间震荡行情
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 参数优化结果 */}
      {showOptimize && optimizeResult && (
        <div className="section-card" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>🔍 参数优化结果</h3>
            <button onClick={() => setShowOptimize(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
          </div>

          {/* 最优参数 */}
          {optimizeResult.best_params && (
            <div style={{ padding: '16px', background: '#f6ffed', borderRadius: '8px', marginBottom: '16px', border: '2px solid #52c41a' }}>
              <h4 style={{ color: '#52c41a', marginBottom: '12px' }}>🏆 最优参数组合</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>参数</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{optimizeResult.best_params.params}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>总收益率</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                    {optimizeResult.best_params.total_return >= 0 ? '+' : ''}{optimizeResult.best_params.total_return}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>胜率</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{optimizeResult.best_params.win_rate}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>交易次数</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{optimizeResult.best_params.trade_count}次</div>
                </div>
              </div>
            </div>
          )}

          {/* 所有参数对比 */}
          <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>参数组合</th>
                  <th>总收益率</th>
                  <th>胜率</th>
                  <th>交易次数</th>
                  <th>最终资金</th>
                </tr>
              </thead>
              <tbody>
                {optimizeResult.all_results.map((result, idx) => (
                  <tr key={idx} style={{ background: idx === 0 ? '#f6ffed' : 'transparent' }}>
                    <td>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </td>
                    <td><strong>{result.params}</strong></td>
                    <td className={result.total_return >= 0 ? 'positive' : 'negative'}>
                      {result.total_return >= 0 ? '+' : ''}{result.total_return}%
                    </td>
                    <td>{result.win_rate}%</td>
                    <td>{result.trade_count}</td>
                    <td>¥{result.final_capital.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
