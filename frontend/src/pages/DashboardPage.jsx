import { useState, useEffect } from 'react'
import axios from 'axios'
import { getCache, setCache } from '../utils/cache'

const API_BASE = 'http://127.0.0.1:5000/api'
const CACHE_ENABLED = true

// 所有可用的快捷菜单选项
const ALL_SHORTCUTS = [
  { id: 'fetch', icon: '📥', label: '批量获取', desc: '导入全量股票', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'entry', icon: '✏️', label: '数据录入', desc: '手动录入数据', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'view', icon: '📈', label: '数据查看', desc: 'K线图表分析', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'portfolio', icon: '💼', label: '持仓管理', desc: '投资组合', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 'watchlist', icon: '⭐', label: '自选股', desc: '关注列表', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { id: 'alert', icon: '🔔', label: '预警系统', desc: '价格监控', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { id: 'sector', icon: '📊', label: '板块分析', desc: '行业板块', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 'moneyflow', icon: '💰', label: '资金流向', desc: '主力追踪', gradient: 'linear-gradient(135deg, #fcb69f 0%, #ffecd2 100%)' },
  { id: 'signal', icon: '🎯', label: '交易信号', desc: '买卖提示', gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' },
  { id: 'backtest', icon: '🧪', label: '策略回测', desc: '历史验证', gradient: 'linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%)' },
  { id: 'compare', icon: '⚖️', label: '对比分析', desc: '多股对比', gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { id: 'screener', icon: '🔍', label: '智能选股', desc: '条件筛选', gradient: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' },
  { id: 'forecast', icon: '🔮', label: '财务预报', desc: '业绩预测', gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { id: 'longhubang', icon: '🏆', label: '龙虎榜', desc: '活跃股票', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { id: 'auction', icon: '⏰', label: '集合竞价', desc: '开盘分析', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
]

// 默认显示的快捷菜单
const DEFAULT_SHORTCUTS = ['fetch', 'entry', 'view', 'portfolio']

export default function DashboardPage({ stocks, toast }) {
  const [dashboardStats, setDashboardStats] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [shortcuts, setShortcuts] = useState(() => {
    // 从localStorage加载用户自定义的快捷菜单
    const saved = localStorage.getItem('dashboard_shortcuts')
    return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS
  })
  const [showShortcutManager, setShowShortcutManager] = useState(false)
  
  useEffect(() => {
    loadDashboardStats()
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])
  
  // 保存快捷菜单到localStorage
  useEffect(() => {
    localStorage.setItem('dashboard_shortcuts', JSON.stringify(shortcuts))
  }, [shortcuts])
  
  // 切换快捷菜单项
  const toggleShortcut = (id) => {
    setShortcuts(prev => {
      if (prev.includes(id)) {
        // 移除（至少保留1个）
        if (prev.length > 1) {
          return prev.filter(s => s !== id)
        }
        return prev
      } else {
        // 添加
        return [...prev, id]
      }
    })
  }
  
  // 上移快捷菜单
  const moveShortcut = (index, direction) => {
    setShortcuts(prev => {
      const newShortcuts = [...prev]
      const newIndex = index + direction
      if (newIndex >= 0 && newIndex < newShortcuts.length) {
        [newShortcuts[index], newShortcuts[newIndex]] = [newShortcuts[newIndex], newShortcuts[index]]
      }
      return newShortcuts
    })
  }
  
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
        setCache('dashboard', response.data, 2 * 60)
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
      {/* 页面头部 - 苹果风格 */}
      <div className="dashboard-header-card">
        <div className="header-left">
          <div className="header-icon">📊</div>
          <div className="header-info">
            <h3>数据概览</h3>
            <p>实时查看股票数据整体情况</p>
          </div>
        </div>
        
        <div className="header-right">
          <div className="live-time">
            <span>🕐</span>
            {currentTime.toLocaleTimeString('zh-CN', { hour12: false })}
          </div>
          <button 
            onClick={handleRefresh} 
            className={`btn-secondary pill-btn ${refreshing ? 'loading' : ''}`}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <span className="btn-spinner"></span>
                刷新中...
              </>
            ) : (
              <>
                <span className="btn-icon">🔄</span>
                刷新数据
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* 第一行统计卡片 - 苹果药丸形状 */}
      <div className="dashboard-stats-grid">
        <div className="stat-card-apple" style={{
          '--card-color': '#667eea',
          '--card-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div className="stat-icon-pill">📈</div>
          <div className="stat-content">
            <div className="stat-label">股票总数</div>
            <div className="stat-value">{dashboardStats.total_stocks}</div>
            <div className="stat-subtitle">已收录股票数量</div>
          </div>
        </div>
        
        <div className="stat-card-apple" style={{
          '--card-color': '#f5576c',
          '--card-gradient': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        }}>
          <div className="stat-icon-pill">📋</div>
          <div className="stat-content">
            <div className="stat-label">数据记录</div>
            <div className="stat-value">{dashboardStats.total_records}</div>
            <div className="stat-subtitle">历史数据总量</div>
          </div>
        </div>
        
        <div className="stat-card-apple" style={{
          '--card-color': '#4facfe',
          '--card-gradient': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        }}>
          <div className="stat-icon-pill">⚡</div>
          <div className="stat-content">
            <div className="stat-label">活跃股票</div>
            <div className="stat-value">{dashboardStats.active_stocks}</div>
            <div className="stat-subtitle">近期有交易的股票</div>
          </div>
        </div>
        
        <div className="stat-card-apple" style={{
          '--card-color': '#43e97b',
          '--card-gradient': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
        }}>
          <div className="stat-icon-pill">📅</div>
          <div className="stat-content">
            <div className="stat-label">最新数据</div>
            <div className="stat-value">{dashboardStats.latest_date || '-'}</div>
            <div className="stat-subtitle">数据更新日期</div>
          </div>
        </div>
      </div>
      
      {/* 第二行统计卡片 */}
      <div className="dashboard-stats-grid" style={{ marginTop: '20px' }}>
        <div className="stat-card-apple" style={{
          '--card-color': '#fa709a',
          '--card-gradient': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
        }}>
          <div className="stat-icon-pill">💼</div>
          <div className="stat-content">
            <div className="stat-label">我的持仓</div>
            <div className="stat-value">{dashboardStats.portfolio_count || 0}</div>
            <div className="stat-subtitle">持仓管理</div>
          </div>
        </div>
        
        <div className="stat-card-apple" style={{
          '--card-color': '#a18cd1',
          '--card-gradient': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
        }}>
          <div className="stat-icon-pill">⭐</div>
          <div className="stat-content">
            <div className="stat-label">自选股</div>
            <div className="stat-value">{dashboardStats.watchlist_count || 0}</div>
            <div className="stat-subtitle">关注列表</div>
          </div>
        </div>
        
        <div className="stat-card-apple" style={{
          '--card-color': '#ff9a9e',
          '--card-gradient': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
        }}>
          <div className="stat-icon-pill">🔔</div>
          <div className="stat-content">
            <div className="stat-label">预警规则</div>
            <div className="stat-value">{dashboardStats.alert_count || 0}</div>
            <div className="stat-subtitle">价格预警</div>
          </div>
        </div>
        
        <div className="stat-card-apple" style={{
          '--card-color': '#fcb69f',
          '--card-gradient': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
        }}>
          <div className="stat-icon-pill">📊</div>
          <div className="stat-content">
            <div className="stat-label">数据覆盖率</div>
            <div className="stat-value">
              {dashboardStats.active_stocks > 0 && dashboardStats.total_stocks > 0
                ? Math.round((dashboardStats.active_stocks / dashboardStats.total_stocks) * 100) + '%'
                : '-'}
            </div>
            <div className="stat-subtitle">活跃/总股票数</div>
          </div>
        </div>
      </div>
      
      {/* 快捷操作区 - 紧凑卡片 */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">⚡ 快捷操作</h3>
          <button 
            className="btn-secondary pill-btn btn-sm"
            onClick={() => setShowShortcutManager(!showShortcutManager)}
          >
            ⚙️ 自定义
          </button>
        </div>
        
        {/* 自定义快捷菜单管理器 */}
        {showShortcutManager && (
          <div className="shortcut-manager">
            <div className="manager-header">
              <h4>自定义快捷菜单</h4>
              <button 
                className="btn-close"
                onClick={() => setShowShortcutManager(false)}
              >
                ✕
              </button>
            </div>
            <p style={{fontSize: '13px', color: '#666', marginBottom: '16px'}}>点击选择要显示的快捷菜单（至少保留1个）</p>
            <div className="shortcut-list">
              {ALL_SHORTCUTS.map((shortcut) => {
                const isActive = shortcuts.includes(shortcut.id)
                return (
                  <div 
                    key={shortcut.id}
                    className={`shortcut-item ${isActive ? 'active' : ''}`}
                    onClick={() => toggleShortcut(shortcut.id)}
                  >
                    <span className="shortcut-check">{isActive ? '✓' : ''}</span>
                    <span className="shortcut-icon">{shortcut.icon}</span>
                    <span className="shortcut-label">{shortcut.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {/* 快捷菜单网格 - 更紧凑 */}
        <div className="quick-actions-grid compact">
          {shortcuts.map((id) => {
            const shortcut = ALL_SHORTCUTS.find(s => s.id === id)
            if (!shortcut) return null
            
            return (
              <button key={id} className="quick-action-pill compact" style={{
                '--action-gradient': shortcut.gradient
              }}>
                <div className="action-icon">{shortcut.icon}</div>
                <div className="action-label">{shortcut.label}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
