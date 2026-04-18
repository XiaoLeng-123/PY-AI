import React, { useState, useEffect } from 'react'
import { stockAPI } from '../../utils/api'
import StockChart from '../Charts/StockChart'
import RealtimePrice from '../Charts/RealtimePrice'
import axios from 'axios'
import { exportPriceData } from '../../utils/export'

const DataViewPage = ({ stocks, toast }) => {
  const [selectedStock, setSelectedStock] = useState(null)
  const [priceData, setPriceData] = useState([])
  const [indicators, setIndicators] = useState({})
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState('30') // 默认30天
  const [moneyflow, setMoneyflow] = useState(null) // 资金流向数据

  useEffect(() => {
    if (stocks && stocks.length > 0 && !selectedStock) {
      setSelectedStock(stocks[0])
    }
  }, [stocks])

  useEffect(() => {
    if (selectedStock) {
      loadPriceData()
      loadIndicators()
      loadMoneyflow()
    }
  }, [selectedStock, dateRange])

  const loadPriceData = async () => {
    setLoading(true)
    try {
      const response = await stockAPI.getPrices(selectedStock.id, { days: dateRange })
      // API直接返回数组
      const prices = Array.isArray(response.data) ? response.data : []
      console.log('💰 价格数据加载成功:', prices.length, '条')
      console.log('📅 日期范围:', prices.length > 0 ? `${prices[0].date} ~ ${prices[prices.length-1].date}` : '无数据')
      setPriceData(prices)
    } catch (error) {
      console.error('加载价格数据失败:', error)
      toast.error('加载数据失败')
      setPriceData([])
    } finally {
      setLoading(false)
    }
  }

  const loadIndicators = async () => {
    try {
      const response = await stockAPI.getIndicators(selectedStock.id, { days: dateRange })
      console.log('📈 技术指标加载成功:', {
        ma5Len: response.data?.ma5?.length,
        ma60Len: response.data?.ma60?.length,
        macdLen: response.data?.macd?.histogram?.length,
        rsiLen: response.data?.rsi?.length
      })
      setIndicators(response.data)
    } catch (error) {
      console.error('加载技术指标失败:', error)
    }
  }

  const loadMoneyflow = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:5000/api/advanced/moneyflow`, {
        params: { stock_id: selectedStock.id, days: dateRange }
      })
      setMoneyflow(response.data)
    } catch (error) {
      console.error('加载资金流向失败:', error)
    }
  }

  const handleExportCSV = () => {
    if (!priceData || priceData.length === 0) {
      toast.warning('没有数据可导出')
      return
    }

    const result = exportPriceData(priceData, selectedStock.name)
    if (result.success) {
      toast.success(`成功导出 ${result.rows} 条数据`)
    } else {
      toast.error(`导出失败: ${result.error}`)
    }
  }

  // 准备图表数据（按时间正序：旧 -> 新）
  const sortedAsc = [...priceData].sort((a, b) => new Date(a.date) - new Date(b.date))
  const chartData = {
    stock_code: selectedStock?.code,
    stock_name: selectedStock?.name,
    dates: sortedAsc.map(p => p.date),
    opens: sortedAsc.map(p => p.open),
    highs: sortedAsc.map(p => p.high),
    lows: sortedAsc.map(p => p.low),
    closes: sortedAsc.map(p => p.close),
    volumes: sortedAsc.map(p => p.volume)
  }

  // 历史明细按时间倒序（最新在前：新 -> 旧）
  const sortedDesc = [...priceData].sort((a, b) => new Date(b.date) - new Date(a.date))

  console.log('准备图表数据:', chartData)

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>📈 数据查看</h2>
      </div>

      {/* 选择器和控制区 */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>选择小马</label>
              <select
                value={selectedStock?.id || ''}
                onChange={(e) => {
                  const stock = stocks.find(s => s.id === Number(e.target.value))
                  setSelectedStock(stock)
                }}
                style={{ padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', minWidth: '200px' }}
              >
                {stocks.map(stock => (
                  <option key={stock.id} value={stock.id}>{stock.code} - {stock.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>时间范围</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              >
                <option value="7">最近7天</option>
                <option value="30">最近30天</option>
                <option value="90">最近90天</option>
                <option value="180">最近180天</option>
                <option value="365">最近1年</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleExportCSV} className="btn-primary">
              📥 导出数据
            </button>
          </div>
        </div>
      </div>

      {/* 实时行情显示 */}
      {selectedStock && (
        <div style={{ marginBottom: '24px' }}>
          <RealtimePrice 
            stockId={selectedStock.id}
            stockCode={selectedStock.code}
            stockName={selectedStock.name}
          />
        </div>
      )}

      {/* 资金流向卡片 */}
      {moneyflow && moneyflow.summary && (
        <div className="section-card" style={{ marginBottom: '24px' }}>
          <h3>💰 资金流向分析（近{dateRange}天）</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginTop: '16px'
          }}>
            <div style={{
              padding: '16px',
              background: moneyflow.summary.total_main_flow >= 0 ? '#f6ffed' : '#fff1f0',
              borderRadius: '8px',
              border: `1px solid ${moneyflow.summary.total_main_flow >= 0 ? '#b7eb8f' : '#ffccc7'}`,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>主力净流入</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                color: moneyflow.summary.total_main_flow >= 0 ? '#52c41a' : '#f5222d'
              }}>
                {moneyflow.summary.total_main_flow >= 0 ? '+' : ''}{(moneyflow.summary.total_main_flow / 10000).toFixed(2)}万
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: moneyflow.summary.total_retail_flow >= 0 ? '#f6ffed' : '#fff1f0',
              borderRadius: '8px',
              border: `1px solid ${moneyflow.summary.total_retail_flow >= 0 ? '#b7eb8f' : '#ffccc7'}`,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>散户净流入</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                color: moneyflow.summary.total_retail_flow >= 0 ? '#52c41a' : '#f5222d'
              }}>
                {moneyflow.summary.total_retail_flow >= 0 ? '+' : ''}{(moneyflow.summary.total_retail_flow / 10000).toFixed(2)}万
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: moneyflow.summary.total_net_flow >= 0 ? '#f6ffed' : '#fff1f0',
              borderRadius: '8px',
              border: `1px solid ${moneyflow.summary.total_net_flow >= 0 ? '#b7eb8f' : '#ffccc7'}`,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>总净流入</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                color: moneyflow.summary.total_net_flow >= 0 ? '#52c41a' : '#f5222d'
              }}>
                {moneyflow.summary.total_net_flow >= 0 ? '+' : ''}{(moneyflow.summary.total_net_flow / 10000).toFixed(2)}万
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: '#f0f5ff',
              borderRadius: '8px',
              border: '1px solid #adc6ff',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>主力动向</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                color: moneyflow.summary.main_flow_direction === '流入' ? '#52c41a' : '#f5222d'
              }}>
                {moneyflow.summary.main_flow_direction === '流入' ? '🟢 流入' : '🔴 流出'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* K线图 */}
      {selectedStock && (
        <div className="section-card" style={{ marginBottom: '24px' }}>
          <h3>K线图与技术指标</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              <p>加载中...</p>
            </div>
          ) : priceData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
              <p>暂无数据</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>请确保已为该小马录入价格数据</p>
            </div>
          ) : (
            <StockChart stockData={chartData} indicators={indicators} />
          )}
        </div>
      )}

      {/* 数据表格 */}
      {priceData.length > 0 && (
        <div className="section-card">
          <h3>历史数据明细</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>开盘价</th>
                  <th>最高价</th>
                  <th>最低价</th>
                  <th>收盘价</th>
                  <th>成交量</th>
                  <th>涨跌幅</th>
                </tr>
              </thead>
              <tbody>
                {sortedDesc.map((item, index) => {
                  // 前一个交易日收盘价（用于计算涨跌幅）
                  const prevItem = sortedDesc[index + 1]
                  const prevClose = prevItem ? prevItem.close : item.open
                  const change = ((item.close - prevClose) / prevClose * 100).toFixed(2)
                  
                  return (
                    <tr key={item.date}>
                      <td>{item.date}</td>
                      <td>¥{item.open.toFixed(2)}</td>
                      <td>¥{item.high.toFixed(2)}</td>
                      <td>¥{item.low.toFixed(2)}</td>
                      <td><strong>¥{item.close.toFixed(2)}</strong></td>
                      <td>{item.volume.toLocaleString()}</td>
                      <td className={change >= 0 ? 'positive' : 'negative'}>
                        {change >= 0 ? '+' : ''}{change}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 筹码分布估算 */}
      {priceData.length > 0 && (
        <div className="section-card" style={{ marginTop: '24px' }}>
          <h3>🎯 筹码分布估算</h3>
          <div style={{ marginTop: '16px' }}>
            {(() => {
              // 计算筹码分布（基于最近N天的价格区间）
              const recentPrices = sortedAsc.slice(-Math.min(60, sortedAsc.length))
              const prices = recentPrices.map(p => p.close)
              const volumes = recentPrices.map(p => p.volume)
              
              if (prices.length === 0) return null
              
              const minPrice = Math.min(...prices)
              const maxPrice = Math.max(...prices)
              const priceRange = maxPrice - minPrice
              const binCount = 10
              const binSize = priceRange / binCount
              
              // 初始化价位桶
              const bins = Array(binCount).fill(0)
              const binLabels = []
              
              for (let i = 0; i < binCount; i++) {
                const lower = minPrice + i * binSize
                const upper = lower + binSize
                binLabels.push(`${lower.toFixed(2)}-${upper.toFixed(2)}`)
              }
              
              // 分配成交量到价位桶
              recentPrices.forEach((p, idx) => {
                const binIndex = Math.min(
                  Math.floor((p.close - minPrice) / binSize),
                  binCount - 1
                )
                bins[binIndex] += p.volume
              })
              
              const maxVolume = Math.max(...bins)
              const currentPrice = prices[prices.length - 1]
              
              return (
                <div>
                  <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666' }}>
                    当前价：<strong style={{ color: '#1890ff' }}>¥{currentPrice.toFixed(2)}</strong> | 
                    统计周期：近{recentPrices.length}天 | 
                    价格区间：¥{minPrice.toFixed(2)} - ¥{maxPrice.toFixed(2)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {bins.map((vol, idx) => {
                      const percentage = (vol / maxVolume * 100).toFixed(1)
                      const [lower, upper] = binLabels[idx].split('-')
                      const isCurrentLevel = parseFloat(lower) <= currentPrice && currentPrice <= parseFloat(upper)
                      
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '120px', fontSize: '12px', color: '#666', textAlign: 'right' }}>
                            ¥{binLabels[idx]}
                          </div>
                          <div style={{
                            flex: 1,
                            height: '24px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${percentage}%`,
                              height: '100%',
                              background: isCurrentLevel 
                                ? 'linear-gradient(90deg, #1890ff, #40a9ff)' 
                                : 'linear-gradient(90deg, #faad14, #ffc53d)',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease'
                            }} />
                            <div style={{
                              position: 'absolute',
                              left: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '11px',
                              color: '#fff',
                              fontWeight: 'bold',
                              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                            }}>
                              {(vol / 10000).toFixed(1)}万手 ({percentage}%)
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ marginTop: '12px', padding: '12px', background: '#f0f5ff', borderRadius: '6px', fontSize: '12px', color: '#1890ff' }}>
                    💡 <strong>筹码集中度分析：</strong>
                    {(() => {
                      const sortedBins = [...bins].sort((a, b) => b - a)
                      const top3Concentration = (sortedBins.slice(0, 3).reduce((a, b) => a + b, 0) / bins.reduce((a, b) => a + b, 0) * 100).toFixed(1)
                      return top3Concentration > 60 
                        ? `前3个价位集中了${top3Concentration}%的筹码，筹码高度集中，主力控盘度较高`
                        : top3Concentration > 40
                        ? `前3个价位集中了${top3Concentration}%的筹码，筹码较为集中`
                        : `筹码分布较分散，市场分歧较大`
                    })()}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default DataViewPage
