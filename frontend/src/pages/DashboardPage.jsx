import { useState, useEffect } from 'react'
import axios from 'axios'
import { getCache, setCache } from '../utils/cache'

const API_BASE = 'http://127.0.0.1:5000/api'
const CACHE_ENABLED = true

export default function DashboardPage({ stocks, toast }) {
  const [dashboardStats, setDashboardStats] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    loadDashboardStats()
    // 每秒更新时间
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])
  
  const loadDashboardStats = async (forceRefresh = false) => {
    try {
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('dashboard')
        if (cached) {
          setDashboardStats(cached)
          return
        }
      }
      
      const response = await axios.get(`${API_BASE}/stats/dashboard`)
      setDashboardStats(response.data)
      
      if (CACHE_ENABLED) {
        setCache('dashboard', response.data, 2 * 60) // 缓存2分钟
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }
  
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardStats(true)
    setTimeout(() => setRefreshing(false), 500)
  }
  
  if (!dashboardStats) {
    return <div className="loading">加载中...</div>
  }
  
  return (
    <div className="page-content">
      {/* 页面标题区域 */}
      <div style={{
        marginBottom: '24px',
        animation: 'fadeInUp 0.5s ease',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#333',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '28px' }}>📊</span>
            数据概览
          </h2>
          <p style={{
            marginTop: '8px',
            color: '#999',
            fontSize: '14px',
            margin: 0
          }}>
            实时查看股票数据整体情况
          </p>
        </div>
        
        {/* 右上角控制区域 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px'
        }}>
          {/* 实时时间 */}
          <div style={{
            fontSize: '13px',
            color: '#999',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>🕐</span>
            {currentTime.toLocaleTimeString('zh-CN', { hour12: false })}
          </div>
          
          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '8px 16px',
              background: refreshing ? '#e8e8e8' : '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              color: refreshing ? '#999' : '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <span style={{
              display: 'inline-block',
              animation: refreshing ? 'spin 1s linear infinite' : 'none'
            }}>🔄</span>
            {refreshing ? '刷新中...' : '刷新数据'}
          </button>
        </div>
      </div>
      
      {/* 统计卡片网格 */}
      <div className="dashboard-stats-grid">
        {/* 股票总数卡片 */}
        <div className="modern-stat-card" style={{
          animationDelay: '0.1s',
          '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '--card-shadow': 'rgba(102, 126, 234, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            📈
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">股票总数</div>
            <div className="stat-card-value" style={{ color: '#667eea' }}>
              {dashboardStats.total_stocks}
            </div>
            <div className="stat-card-subtitle">已收录股票数量</div>
          </div>
        </div>
        
        {/* 数据记录数卡片 */}
        <div className="modern-stat-card" style={{
          animationDelay: '0.2s',
          '--card-gradient': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          '--card-shadow': 'rgba(240, 147, 251, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            📋
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">数据记录</div>
            <div className="stat-card-value" style={{ color: '#f5576c' }}>
              {dashboardStats.total_records}
            </div>
            <div className="stat-card-subtitle">历史数据总量</div>
          </div>
        </div>
        
        {/* 活跃股票卡片 */}
        <div className="modern-stat-card" style={{
          animationDelay: '0.3s',
          '--card-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          '--card-shadow': 'rgba(79, 172, 254, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            ⚡
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">活跃股票</div>
            <div className="stat-card-value" style={{ color: '#4facfe' }}>
              {dashboardStats.active_stocks}
            </div>
            <div className="stat-card-subtitle">近期有交易的股票</div>
          </div>
        </div>
        
        {/* 最新数据日期卡片 */}
        <div className="modern-stat-card" style={{
          animationDelay: '0.4s',
          '--card-gradient': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          '--card-shadow': 'rgba(67, 233, 123, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            📅
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">最新数据</div>
            <div className="stat-card-value date-value" style={{ color: '#43e97b' }}>
              {dashboardStats.latest_date || '-'}
            </div>
            <div className="stat-card-subtitle">数据更新日期</div>
          </div>
        </div>
      </div>
      
      {/* 第二行：持仓、自选、预警 */}
      <div className="dashboard-stats-grid" style={{ marginTop: '20px' }}>
        {/* 持仓股票卡片 */}
        <div className="modern-stat-card" style={{
          animationDelay: '0.5s',
          '--card-gradient': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          '--card-shadow': 'rgba(250, 112, 154, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            💼
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">我的持仓</div>
            <div className="stat-card-value" style={{ color: '#fa709a' }}>
              {dashboardStats.portfolio_count || 0}
            </div>
            <div className="stat-card-subtitle">持仓管理</div>
          </div>
        </div>
        
        {/* 自选股卡片 */}
        <div className="modern-stat-card" style={{
          animationDelay: '0.6s',
          '--card-gradient': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
          '--card-shadow': 'rgba(161, 140, 209, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }}>
            ⭐
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">自选股</div>
            <div className="stat-card-value" style={{ color: '#a18cd1' }}>
              {dashboardStats.watchlist_count || 0}
            </div>
            <div className="stat-card-subtitle">关注列表</div>
          </div>
        </div>
        
        {/* 预警规则卡片 */}
        <div className="modern-stat-card" style={{
          animationDelay: '0.7s',
          '--card-gradient': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
          '--card-shadow': 'rgba(255, 154, 158, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' }}>
            🔔
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">预警规则</div>
            <div className="stat-card-value" style={{ color: '#ff9a9e' }}>
              {dashboardStats.alert_count || 0}
            </div>
            <div className="stat-card-subtitle">价格预警</div>
          </div>
        </div>
        
        {/* 数据利用率卡片 */}
        <div className="modern-stat-card" style={{
          animationDelay: '0.8s',
          '--card-gradient': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
          '--card-shadow': 'rgba(252, 182, 159, 0.3)'
        }}>
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' }}>
            📊
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">数据覆盖率</div>
            <div className="stat-card-value" style={{ color: '#fcb69f' }}>
              {dashboardStats.active_stocks > 0 && dashboardStats.total_stocks > 0
                ? Math.round((dashboardStats.active_stocks / dashboardStats.total_stocks) * 100) + '%'
                : '-'}
            </div>
            <div className="stat-card-subtitle">活跃/总股票数</div>
          </div>
        </div>
      </div>
      
      {/* 快捷操作区 */}
      <div className="card" style={{
        marginTop: '24px',
        animation: 'fadeInUp 0.5s ease 0.9s',
        animationFillMode: 'backwards'
      }}>
        <h3 style={{ marginBottom: '16px' }}>⚡ 快捷操作</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px'
        }}>
          <div
            className="quick-action-btn"
            onClick={() => toast.info('跳转到批量获取')}
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📥</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>批量获取</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>导入全量股票</div>
          </div>
          
          <div
            className="quick-action-btn"
            onClick={() => toast.info('跳转到数据录入')}
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(240, 147, 251, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>✏️</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>数据录入</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>手动录入数据</div>
          </div>
          
          <div
            className="quick-action-btn"
            onClick={() => toast.info('跳转到数据查看')}
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(79, 172, 254, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📈</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>数据查看</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>K线图表分析</div>
          </div>
          
          <div
            className="quick-action-btn"
            onClick={() => toast.info('跳转到持仓管理')}
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(67, 233, 123, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💼</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>持仓管理</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>投资组合</div>
          </div>
        </div>
      </div>
    </div>
  )
}
