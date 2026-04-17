import React, { useState } from 'react'
import { compareAPI } from '../../utils/api'

const ComparePage = ({ stocks, toast }) => {
  const [selectedStocks, setSelectedStocks] = useState([])
  const [compareResult, setCompareResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleCompare = async () => {
    if (selectedStocks.length < 2) {
      toast.error('请至少选择2只小马')
      return
    }
    
    setLoading(true)
    try {
      const response = await compareAPI.compare(selectedStocks.map(id => Number(id)))
      setCompareResult(response.data)
    } catch (error) {
      toast.error(error.response?.data?.error || '对比失败')
    } finally {
      setLoading(false)
    }
  }

  const toggleStock = (stockId) => {
    const id = String(stockId)
    if (selectedStocks.includes(id)) {
      setSelectedStocks(selectedStocks.filter(sid => sid !== id))
    } else {
      if (selectedStocks.length < 5) {
        setSelectedStocks([...selectedStocks, id])
      } else {
        toast.warning('最多选择5只小马')
      }
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>⚖️ 多维度对比分析</h2>
      </div>

      <div className="card" style={{marginBottom: '24px'}}>
        <h3>选择要对比的小马（最多5只）</h3>
        <div style={{display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap'}}>
          {stocks.map(stock => (
            <label key={stock.id} style={{
              padding: '8px 16px',
              border: selectedStocks.includes(String(stock.id)) ? '2px solid #1890ff' : '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'pointer',
              background: selectedStocks.includes(String(stock.id)) ? '#e6f7ff' : '#fff'
            }}>
              <input
                type="checkbox"
                checked={selectedStocks.includes(String(stock.id))}
                onChange={() => toggleStock(stock.id)}
                style={{marginRight: '8px'}}
              />
              {stock.code} - {stock.name}
            </label>
          ))}
        </div>
        <button 
          onClick={handleCompare}
          className="btn-primary"
          disabled={loading || selectedStocks.length < 2}
        >
          {loading ? '对比中...' : '开始对比'}
        </button>
      </div>

      {compareResult && compareResult.stocks.length > 0 && (
        <div className="section-card">
          <h3>对比结果</h3>
          <div style={{overflowX: 'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>指标</th>
                  {compareResult.stocks.map(stock => (
                    <th key={stock.stock_id}>{stock.stock_code}<br/>{stock.stock_name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>当前价格</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id}>¥{stock.current_price.toFixed(2)}</td>
                  ))}
                </tr>
                <tr>
                  <td><strong>30日涨跌幅</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id} className={stock.change_30d >= 0 ? 'positive' : 'negative'}>
                      {stock.change_30d >= 0 ? '+' : ''}{stock.change_30d.toFixed(2)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>平均成交量</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id}>{stock.avg_volume.toLocaleString()}</td>
                  ))}
                </tr>
                <tr>
                  <td><strong>波动率</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id}>{stock.volatility.toFixed(2)}%</td>
                  ))}
                </tr>
                <tr>
                  <td><strong>最高价</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id}>¥{stock.max_price.toFixed(2)}</td>
                  ))}
                </tr>
                <tr>
                  <td><strong>最低价</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id}>¥{stock.min_price.toFixed(2)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ComparePage
