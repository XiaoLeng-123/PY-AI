import React, { useState, useEffect, useCallback } from 'react'
import { compareAPI, stockAPI } from '../../utils/api'

const ComparePage = ({ stocks, toast }) => {
  const [selectedStocks, setSelectedStocks] = useState([])
  const [compareResult, setCompareResult] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // 股票搜索和分页
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [dropdownStocks, setDropdownStocks] = useState([])
  const [totalStocks, setTotalStocks] = useState(0)
  const [stocksLoading, setStocksLoading] = useState(false)
  
  // 从后端加载股票列表
  const loadStocks = useCallback(async () => {
    setStocksLoading(true)
    try {
      const response = await stockAPI.getAll({
        page: currentPage,
        page_size: pageSize,
        search: searchText
      })
      const data = response.data || {}
      setDropdownStocks(data.items || [])
      setTotalStocks(data.total || 0)
    } catch (error) {
      console.error('加载股票列表失败:', error)
      setDropdownStocks([])
      setTotalStocks(0)
    } finally {
      setStocksLoading(false)
    }
  }, [currentPage, pageSize, searchText])
  
  useEffect(() => {
    loadStocks()
  }, [loadStocks])

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
        
        {/* 搜索框 */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔍</span>
            <input
              type="text"
              placeholder="搜索股票代码或名称..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1) }}
              className="apple-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <div style={{ fontSize: '14px', color: '#666', whiteSpace: 'nowrap' }}>
            共 <strong>{totalStocks}</strong> 只股票
          </div>
        </div>
        
        {/* 股票列表 */}
        <div className="compare-stock-selector">
          {stocksLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
              <div>加载中...</div>
            </div>
          ) : dropdownStocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>💡</div>
              <div>{searchText ? '未找到匹配的股票' : '输入关键词开始搜索'}</div>
            </div>
          ) : (
            dropdownStocks.map(stock => (
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
                <span className="stock-market-tag">{stock.market}</span>
              </label>
            ))
          )}
        </div>
        
        {/* 分页控制 */}
        {totalStocks > pageSize && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginTop: '20px',
            padding: '16px',
            borderTop: '1px solid rgba(0,0,0,0.06)'
          }}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || stocksLoading}
              className="pill-btn"
              style={{ 
                padding: '8px 16px',
                background: currentPage === 1 ? '#f5f5f5' : '#fff',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← 上一页
            </button>
            <span style={{ fontSize: '14px', color: '#666' }}>
              第 {currentPage} 页 / 共 {Math.ceil(totalStocks / pageSize)} 页
            </span>
            <button 
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= Math.ceil(totalStocks / pageSize) || stocksLoading}
              className="pill-btn"
              style={{ 
                padding: '8px 16px',
                background: currentPage >= Math.ceil(totalStocks / pageSize) ? '#f5f5f5' : '#fff',
                cursor: currentPage >= Math.ceil(totalStocks / pageSize) ? 'not-allowed' : 'pointer'
              }}
            >
              下一页 →
            </button>
          </div>
        )}
        
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
