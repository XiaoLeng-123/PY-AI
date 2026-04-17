import React, { useState } from 'react'
import { screenerAPI } from '../../utils/api'

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

  const handleScreen = async () => {
    setLoading(true)
    try {
      const response = await screenerAPI.screen(filters)
      setResults(response.data)
    } catch (error) {
      toast.error('筛选失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>🔍 智能选股器</h2>
      </div>

      <div className="card" style={{marginBottom: '24px'}}>
        <h3>筛选条件</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px'}}>
          <div>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>价格范围（元）</label>
            <div style={{display: 'flex', gap: '8px'}}>
              <input
                type="number"
                value={filters.min_price}
                onChange={(e) => setFilters({...filters, min_price: Number(e.target.value)})}
                placeholder="最低价"
                style={{flex: 1, padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
              />
              <span style={{alignSelf: 'center'}}>-</span>
              <input
                type="number"
                value={filters.max_price}
                onChange={(e) => setFilters({...filters, max_price: Number(e.target.value)})}
                placeholder="最高价"
                style={{flex: 1, padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
              />
            </div>
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>涨跌幅范围（%）</label>
            <div style={{display: 'flex', gap: '8px'}}>
              <input
                type="number"
                value={filters.min_change}
                onChange={(e) => setFilters({...filters, min_change: Number(e.target.value)})}
                placeholder="最小涨幅"
                style={{flex: 1, padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
              />
              <span style={{alignSelf: 'center'}}>-</span>
              <input
                type="number"
                value={filters.max_change}
                onChange={(e) => setFilters({...filters, max_change: Number(e.target.value)})}
                placeholder="最大涨幅"
                style={{flex: 1, padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
              />
            </div>
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>最小成交量</label>
            <input
              type="number"
              value={filters.min_volume}
              onChange={(e) => setFilters({...filters, min_volume: Number(e.target.value)})}
              placeholder="例如：1000000"
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>趋势方向</label>
            <select
              value={filters.trend}
              onChange={(e) => setFilters({...filters, trend: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
            >
              <option value="all">全部</option>
              <option value="up">上涨</option>
              <option value="down">下跌</option>
            </select>
          </div>
        </div>

        <button 
          onClick={handleScreen}
          className="btn-primary"
          disabled={loading}
        >
          {loading ? '筛选中...' : '开始筛选'}
        </button>
      </div>

      {results && (
        <div className="section-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3>筛选结果（共{results.count}只）</h3>
            <span style={{fontSize: '13px', color: '#999'}}>
              条件：价格{results.filters.price_range}元，涨跌幅{results.filters.change_range}
            </span>
          </div>
          
          {results.results.length === 0 ? (
            <div className="empty-state">
              <p>没有找到符合条件的小马</p>
            </div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>小马代码</th>
                    <th>小马名称</th>
                    <th>当前价格</th>
                    <th>30日涨跌幅</th>
                    <th>平均成交量</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((stock, idx) => (
                    <tr key={stock.stock_id}>
                      <td>{idx + 1}</td>
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
        </div>
      )}
    </div>
  )
}

export default ScreenerPage
