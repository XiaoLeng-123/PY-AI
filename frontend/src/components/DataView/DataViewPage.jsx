import React, { useState, useEffect } from 'react'
import { stockAPI } from '../../utils/api'
import StockChart from '../Charts/StockChart'
import RealtimePrice from '../Charts/RealtimePrice'

const DataViewPage = ({ stocks, toast }) => {
  const [selectedStock, setSelectedStock] = useState(null)
  const [priceData, setPriceData] = useState([])
  const [indicators, setIndicators] = useState({})
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState('30') // 默认30天

  useEffect(() => {
    if (stocks && stocks.length > 0 && !selectedStock) {
      setSelectedStock(stocks[0])
    }
  }, [stocks])

  useEffect(() => {
    if (selectedStock) {
      loadPriceData()
      loadIndicators()
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

  const handleExportCSV = () => {
    if (!priceData || priceData.length === 0) {
      toast.warning('没有数据可导出')
      return
    }

    let csv = '日期,开盘价,最高价,最低价,收盘价,成交量\n'
    priceData.forEach(item => {
      csv += `${item.date},${item.open},${item.high},${item.low},${item.close},${item.volume}\n`
    })

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${selectedStock.code}_${selectedStock.name}_data.csv`
    link.click()
    toast.success('导出成功')
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

          <div style={{ marginTop: '24px' }}>
            <button onClick={handleExportCSV} className="btn-primary">
              📥 导出CSV
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
    </div>
  )
}

export default DataViewPage
