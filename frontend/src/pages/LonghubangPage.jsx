import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'
import Pagination from '../components/Pagination'
import AppleDatePicker from '../components/AppleDatePicker'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function LonghubangPage() {
  const [longhubangData, setLonghubangData] = useState(null)
  const [longhubangLoading, setLonghubangLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  // 分页
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  const loadData = async () => {
    setLonghubangLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/market/longhubang`, { params: { date } })
      setLonghubangData(response.data)
    } catch (error) {
      toast.error('加载龙虎榜数据失败')
    } finally {
      setLonghubangLoading(false)
    }
  }
  
  useEffect(() => {
    loadData()
  }, [])
  
  return (
    <div className="page-content">
      {/* 头部卡片 */}
      <div className="longhubang-header-card">
        <div className="header-icon">🏆</div>
        <div className="header-info">
          <h3>龙虎榜</h3>
          <p>查看每日活跃股票及主力资金动向</p>
        </div>
      </div>
        
      {/* 查询控制区 - 药丸形状 */}
      <div className="card" style={{marginBottom: '24px'}}>
        <div className="query-control-bar">
          <div className="control-item">
            <AppleDatePicker
              value={date}
              onChange={setDate}
              placeholder="选择日期"
              width="100%"
              label="选择日期"
            />
          </div>
          <button 
            onClick={loadData} 
            className="btn-primary pill-btn"
            disabled={longhubangLoading}
          >
            {longhubangLoading ? (
              <>
                <span className="btn-spinner"></span>
                加载中...
              </>
            ) : (
              <>
                <span className="btn-icon">🔍</span>
                查询
              </>
            )}
          </button>
        </div>
      </div>
        
      {/* 数据展示区 */}
      {longhubangLoading ? (
        <div className="loading-state">
          <div className="spinner">⏳</div>
          <div>正在加载龙虎榜数据...</div>
        </div>
      ) : longhubangData ? (
        <div className="apple-card">
          {longhubangData.success && longhubangData.data && longhubangData.data.length > 0 ? (
            <>
              <div className="card-header">
                <h3 className="card-title">📊 龙虎榜数据</h3>
                <div className="info-badge">
                  {longhubangData.date} · 共 {longhubangData.count} 条记录
                </div>
              </div>
              <div className="table-container">
                <table className="data-table apple-table">
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>股票代码</th>
                      <th>股票名称</th>
                      <th>解读</th>
                      <th>收盘价</th>
                      <th>涨跌幅</th>
                      <th>成交金额</th>
                      <th>净买额</th>
                      <th>买入额</th>
                      <th>卖出额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {longhubangData.data.slice((page - 1) * pageSize, page * pageSize).map((item, index) => (
                      <tr key={index}>
                        <td><span className="rank-badge">{(page - 1) * pageSize + index + 1}</span></td>
                        <td className="code-cell">{item.SECURITY_CODE}</td>
                        <td className="name-cell">{item.SECURITY_NAME_ABBR}</td>
                        <td>{item.INTERPRET}</td>
                        <td className="price-cell">¥{item.CLOSE_PRICE?.toFixed(2)}</td>
                        <td className={item.CHANGE_RATE >= 0 ? 'change-up' : 'change-down'}>
                          {item.CHANGE_RATE >= 0 ? '+' : ''}{item.CHANGE_RATE}%
                        </td>
                        <td>¥{(item.TURNOVER / 100000000).toFixed(2)}亿</td>
                        <td className={item.NET_BUY_AMT >= 0 ? 'change-up' : 'change-down'}>
                          ¥{(item.NET_BUY_AMT / 100000000).toFixed(2)}亿
                        </td>
                        <td>¥{(item.BUY_AMT / 100000000).toFixed(2)}亿</td>
                        <td>¥{(item.SELL_AMT / 100000000).toFixed(2)}亿</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                total={longhubangData.data.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
              />
            </>
          ) : (
            <div className="empty-state-large">
              <div className="empty-icon">📭</div>
              <h4>暂无龙虎榜数据</h4>
              <p>{longhubangData.message || '该日期没有龙虎榜记录，请尝试选择其他日期'}</p>
              <p className="empty-hint">龙虎榜通常在交易日16:00后更新</p>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state-large">
          <div className="empty-icon">📊</div>
          <h4>等待查询</h4>
          <p>请选择日期并点击查询按钮</p>
        </div>
      )}
    </div>
  )
}
