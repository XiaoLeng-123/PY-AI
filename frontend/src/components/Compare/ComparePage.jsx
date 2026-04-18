import React, { useState } from 'react'
import { compareAPI } from '../../utils/api'

const ComparePage = ({ stocks, toast }) => {
  const [selectedStocks, setSelectedStocks] = useState([])
  const [compareResult, setCompareResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleCompare = async () => {
    if (selectedStocks.length < 2) {
      toast.error('请至少选择2只股票')
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
        toast.warning('最多选择5只股票')
      }
    }
  }

  return (
    <div className="page-content">
      {/* 头部卡片 */}
      <div className="compare-header-card">
        <div className="header-icon">⚖️</div>
        <div className="header-info">
          <h3>多维度对比分析</h3>
          <p>同时对比多只股票的关键指标，辅助投资决策</p>
        </div>
      </div>

      {/* 选择股票区 - 药丸形状 */}
      <div className="card" style={{marginBottom: '24px'}}>
        <h3 className="section-title">选择要对比的股票（最多5只）</h3>
        <div className="compare-stock-selector">
          {stocks.map(stock => (
            <label 
              key={stock.id} 
              className={`compare-stock-item ${selectedStocks.includes(String(stock.id)) ? 'selected' : ''}`}
              onClick={() => toggleStock(stock.id)}
            >
              <input
                type="checkbox"
                checked={selectedStocks.includes(String(stock.id))}
                onChange={() => toggleStock(stock.id)}
                className="apple-checkbox"
              />
              <span className="stock-code">{stock.code}</span>
              <span className="stock-name">{stock.name}</span>
            </label>
          ))}
        </div>
        
        <div className="compare-actions">
          <div className="selected-count">
            已选择 <strong>{selectedStocks.length}</strong> / 5 只股票
          </div>
          <button 
            onClick={handleCompare}
            className="btn-primary pill-btn"
            disabled={loading || selectedStocks.length < 2}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                对比中...
              </>
            ) : (
              <>
                <span className="btn-icon">📊</span>
                开始对比
              </>
            )}
          </button>
        </div>
      </div>

      {/* 对比结果 - 大圆角表格 */}
      {compareResult && compareResult.stocks.length > 0 && (
        <div className="card">
          <h3 className="section-title">对比结果</h3>
          <div className="compare-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>指标</th>
                  {compareResult.stocks.map(stock => (
                    <th key={stock.stock_id}>
                      <div className="stock-header">
                        <span className="stock-code">{stock.stock_code}</span>
                        <span className="stock-name">{stock.stock_name}</span>
                      </div>
                    </th>
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
