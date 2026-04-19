import React, { useState } from 'react'
import { screenerAPI } from '../../utils/api'
import Pagination from '../Pagination'

const ScreenerPage = ({ toast }) => {
  const [filters, setFilters] = useState({
    min_price: 0,
    max_price: 1000,
    min_change: -100,
    max_change: 100,
    min_volume: 0,
    trend: 'all'
  })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  // 分页
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const handleScreen = async () => {
    setLoading(true)
    try {
      const response = await screenerAPI.screen(filters)
      setResults(response.data)
      setPage(1) // 筛选后重置页码
    } catch (error) {
      toast.error('筛选失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content">
      {/* 头部卡片 */}
      <div className="screener-header-card">
        <div className="header-icon">🔍</div>
        <div className="header-info">
          <h3>智能选股器</h3>
          <p>基于多维度条件快速筛选符合要求的股票</p>
        </div>
      </div>

      {/* 筛选条件区 - 药丸形状 */}
      <div className="card" style={{marginBottom: '24px'}}>
        <h3 className="section-title">筛选条件</h3>
        <div className="screener-filters-grid">
          {/* 价格范围 */}
          <div className="filter-item">
            <label className="control-label">价格范围（元）</label>
            <div className="range-inputs">
              <input
                type="number"
                value={filters.min_price}
                onChange={(e) => setFilters({...filters, min_price: Number(e.target.value)})}
                placeholder="最低价"
                className="apple-input"
              />
              <span className="range-separator">-</span>
              <input
                type="number"
                value={filters.max_price}
                onChange={(e) => setFilters({...filters, max_price: Number(e.target.value)})}
                placeholder="最高价"
                className="apple-input"
              />
            </div>
          </div>

          {/* 涨跌幅范围 */}
          <div className="filter-item">
            <label className="control-label">涨跌幅范围（%）</label>
            <div className="range-inputs">
              <input
                type="number"
                value={filters.min_change}
                onChange={(e) => setFilters({...filters, min_change: Number(e.target.value)})}
                placeholder="最小涨幅"
                className="apple-input"
              />
              <span className="range-separator">-</span>
              <input
                type="number"
                value={filters.max_change}
                onChange={(e) => setFilters({...filters, max_change: Number(e.target.value)})}
                placeholder="最大涨幅"
                className="apple-input"
              />
            </div>
          </div>

          {/* 最小成交量 */}
          <div className="filter-item">
            <label className="control-label">最小成交量</label>
            <input
              type="number"
              value={filters.min_volume}
              onChange={(e) => setFilters({...filters, min_volume: Number(e.target.value)})}
              placeholder="例如：1000000"
              className="apple-input"
            />
          </div>

          {/* 趋势方向 */}
          <div className="filter-item">
            <label className="control-label">趋势方向</label>
            <select
              value={filters.trend}
              onChange={(e) => setFilters({...filters, trend: e.target.value})}
              className="apple-select"
            >
              <option value="all">全部</option>
              <option value="up">上涨</option>
              <option value="down">下跌</option>
            </select>
          </div>
        </div>

        <button 
          onClick={handleScreen}
          className="btn-primary pill-btn"
          disabled={loading}
          style={{marginTop: '20px'}}
        >
          {loading ? (
            <>
              <span className="btn-spinner"></span>
              筛选中...
            </>
          ) : (
            <>
              <span className="btn-icon">⚡</span>
              开始筛选
            </>
          )}
        </button>
      </div>

      {/* 筛选结果 - 大圆角表格 */}
      {results && (
        <div className="card">
          <div className="results-header">
            <h3 className="section-title">筛选结果（共{results.count}只）</h3>
            <span className="results-summary">
              条件：价格{results.filters.price_range}元，涨跌幅{results.filters.change_range}
            </span>
          </div>
          
          {results.results.length === 0 ? (
            <div className="empty-state">
              <div style={{fontSize: '48px', marginBottom: '16px'}}>🔍</div>
              <h3>没有找到符合条件的股票</h3>
              <p>请尝试调整筛选条件</p>
            </div>
          ) : (
            <div className="screener-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>代码</th>
                    <th>名称</th>
                    <th>当前价格</th>
                    <th>30日涨跌幅</th>
                    <th>平均成交量</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.slice((page - 1) * pageSize, page * pageSize).map((stock, idx) => (
                    <tr key={stock.stock_id}>
                      <td>
                        <span className="rank-badge">{(page - 1) * pageSize + idx + 1}</span>
                      </td>
                      <td><strong>{stock.stock_code}</strong></td>
                      <td>{stock.stock_name}</td>
                      <td>¥{stock.current_price.toFixed(2)}</td>
                      <td className={stock.change_30d >= 0 ? 'positive' : 'negative'}>
                        {stock.change_30d >= 0 ? '+' : ''}{stock.change_30d.toFixed(2)}%
                      </td>
                      <td>{stock.avg_volume.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            total={results.results.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          />
        </div>
      )}
    </div>
  )
}

export default ScreenerPage
