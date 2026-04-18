import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import * as echarts from 'echarts'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function BacktestPage({ stocks }) {
  const [selectedStock, setSelectedStock] = useState('')
  const [strategy, setStrategy] = useState('ma_cross')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [backtestResult, setBacktestResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showOptimize, setShowOptimize] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState(null)
  const chartInstance = useRef(null)

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
    
    if (chartInstance.current) {
      chartInstance.current.dispose()
    }
    
    const myChart = echarts.init(chartDom)
    chartInstance.current = myChart
    
    const dates = equityCurve.map(item => item.date)
    const equities = equityCurve.map(item => item.equity)
    const drawdowns = equityCurve.map(item => -item.drawdown)
    
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
        { left: '10%', right: '8%', height: '45%', top: '12%' },
        { left: '10%', right: '8%', top: '65%', height: '25%' }
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
    
    const handleResize = () => myChart.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }

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
      {/* 头部卡片 */}
      <div className="backtest-header-card">
        <div className="header-icon">📊</div>
        <div className="header-info">
          <h3>策略回测</h3>
          <p>基于历史数据验证交易策略的有效性与收益表现</p>
        </div>
      </div>

      {/* 参数设置区 - 药丸形状 */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="section-title">⚙️ 回测参数</h3>
        <div className="backtest-params-grid">
          <div className="param-item">
            <label className="control-label">选择股票</label>
            <select 
              value={selectedStock} 
              onChange={(e) => setSelectedStock(e.target.value)}
              className="apple-select"
            >
              <option value="">请选择股票</option>
              {stocks.map(s => (
                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
              ))}
            </select>
          </div>

          <div className="param-item">
            <label className="control-label">策略类型</label>
            <select 
              value={strategy} 
              onChange={(e) => setStrategy(e.target.value)}
              className="apple-select"
            >
              <option value="ma_cross">均线金叉/死叉</option>
              <option value="macd">MACD金叉/死叉</option>
              <option value="rsi">RSI超买超卖</option>
              <option value="boll">布林带突破</option>
            </select>
          </div>

          <div className="param-item">
            <label className="control-label">开始日期</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="apple-input date-input"
            />
          </div>

          <div className="param-item">
            <label className="control-label">结束日期</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="apple-input date-input"
            />
          </div>
        </div>

        <div className="backtest-actions">
          <button 
            onClick={runOptimize} 
            className="btn-secondary pill-btn"
            disabled={loading}
          >
            🔍 参数优化
          </button>
          <button 
            onClick={runBacktest} 
            className="btn-primary pill-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                回测中...
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                开始回测
              </>
            )}
          </button>
        </div>
      </div>

      {/* 回测结果 */}
      {backtestResult && (
        <div>
          {/* 资金曲线图 - 大圆角 */}
          <div className="chart-container" style={{ marginBottom: '24px' }}>
            <div id="equity-chart" style={{ width: '100%', height: '400px' }}></div>
          </div>

          {/* 核心指标网格 - 药丸形状 */}
          <div className="metrics-grid" style={{ marginBottom: '24px' }}>
            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">💰</span>
                <span className="metric-title">总收益率</span>
              </div>
              <div className={`metric-value ${backtestResult.total_return >= 0 ? 'positive' : 'negative'}`}>
                {backtestResult.total_return >= 0 ? '+' : ''}{backtestResult.total_return.toFixed(2)}%
              </div>
            </div>

            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">📈</span>
                <span className="metric-title">年化收益</span>
              </div>
              <div className={`metric-value ${backtestResult.annualized_return >= 0 ? 'positive' : 'negative'}`}>
                {backtestResult.annualized_return >= 0 ? '+' : ''}{backtestResult.annualized_return.toFixed(2)}%
              </div>
            </div>

            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">🎯</span>
                <span className="metric-title">胜率</span>
              </div>
              <div className="metric-value">
                {backtestResult.win_rate.toFixed(1)}%
              </div>
              <div className="metric-detail">
                盈利 {backtestResult.win_count} / 亏损 {backtestResult.loss_count}
              </div>
            </div>

            <div className="metric-card-pill danger">
              <div className="metric-header">
                <span className="metric-icon">⚠️</span>
                <span className="metric-title">最大回撤</span>
              </div>
              <div className="metric-value negative">
                {backtestResult.max_drawdown.toFixed(2)}%
              </div>
            </div>

            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">📊</span>
                <span className="metric-title">夏普比率</span>
              </div>
              <div className="metric-value">
                {backtestResult.sharpe_ratio.toFixed(2)}
              </div>
            </div>

            <div className="metric-card-pill">
              <div className="metric-header">
                <span className="metric-icon">🔄</span>
                <span className="metric-title">交易次数</span>
              </div>
              <div className="metric-value">
                {backtestResult.trade_count} 次
              </div>
            </div>
          </div>

          {/* 交易记录 - 大圆角 */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="section-title">📋 交易记录</h3>
            <div className="trades-table-container">
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
                        <span className={`trade-badge ${trade.type}`}>
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

          {/* 策略说明 - 大圆角容器 */}
          <div className="strategy-info-container">
            <h3 className="section-title">💡 策略说明</h3>
            <div className="strategy-description">
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

      {/* 参数优化结果弹窗 - 苹果风格 */}
      {showOptimize && optimizeResult && (
        <div className="apple-modal-overlay" onClick={() => setShowOptimize(false)}>
          <div className="apple-modal optimize-modal" onClick={(e) => e.stopPropagation()}>
            <div className="apple-modal-header">
              <div className="apple-modal-title">
                <div className="apple-modal-icon">🔍</div>
                <div>
                  <h3>参数优化结果</h3>
                  <p>对比不同参数组合的回测表现</p>
                </div>
              </div>
              <button className="apple-modal-close" onClick={() => setShowOptimize(false)}>✕</button>
            </div>

            {/* 最优参数 */}
            {optimizeResult.best_params && (
              <div className="best-params-card">
                <h4 className="best-params-title">🏆 最优参数组合</h4>
                <div className="best-params-grid">
                  <div className="param-stat">
                    <div className="param-label">参数</div>
                    <div className="param-value">{optimizeResult.best_params.params}</div>
                  </div>
                  <div className="param-stat">
                    <div className="param-label">总收益率</div>
                    <div className="param-value positive">
                      {optimizeResult.best_params.total_return >= 0 ? '+' : ''}{optimizeResult.best_params.total_return}%
                    </div>
                  </div>
                  <div className="param-stat">
                    <div className="param-label">胜率</div>
                    <div className="param-value">{optimizeResult.best_params.win_rate}%</div>
                  </div>
                  <div className="param-stat">
                    <div className="param-label">交易次数</div>
                    <div className="param-value">{optimizeResult.best_params.trade_count}次</div>
                  </div>
                </div>
              </div>
            )}

            {/* 所有参数对比表格 */}
            <div className="optimize-table-container">
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
                    <tr key={idx} className={idx === 0 ? 'best-row' : ''}>
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
        </div>
      )}
    </div>
  )
}
