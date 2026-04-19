import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

// 所有菜单项
const allMenuItems = [
  { key: 'dashboard', label: '数据概览', icon: '📊', access: 'public' },
  { key: 'stockManage', label: '小马管理', icon: '🐴', access: 'admin' },
  { key: 'fetchAllStocks', label: '批量获取股票', icon: '📥', access: 'admin' },
  { key: 'dataEntry', label: '数据录入', icon: '📝', access: 'admin' },
  { key: 'dataView', label: '数据查看', icon: '📈', access: 'public' },
  { key: 'statistics', label: '统计分析', icon: '📉', access: 'public' },
  { key: 'watchlist', label: '自选股', icon: '⭐', access: 'private' },
  { key: 'alerts', label: '预警系统', icon: '🔔', access: 'private' },
  { key: 'sectorAnalysis', label: '板块分析', icon: '📊', access: 'public' },
  { key: 'moneyflow', label: '资金流向', icon: '💰', access: 'public' },
  { key: 'signals', label: '交易信号', icon: '🎯', access: 'public' },
  { key: 'backtest', label: '策略回测', icon: '📊', access: 'public' },
  { key: 'portfolio', label: '持仓管理', icon: '💼', access: 'private' },
  { key: 'compare', label: '对比分析', icon: '⚖️', access: 'public' },
  { key: 'screener', label: '智能选股', icon: '🔍', access: 'public' },
  { key: 'financialForecast', label: '财务预报', icon: '💰', access: 'public' },
  { key: 'longhubang', label: '龙虎榜', icon: '🏆', access: 'public' },
  { key: 'auction', label: '集合竞价', icon: '⏰', access: 'public' },
  { key: 'aiAnalysis', label: 'AI分析', icon: '🤖', access: 'public' },
  { key: 'settings', label: '系统设置', icon: '⚙️', access: 'admin' },
]

const breadcrumbMap = {
  dashboard: ['首页', '数据概览'],
  stockManage: ['首页', '小马管理'],
  fetchAllStocks: ['首页', '数据管理', '批量获取股票'],
  dataEntry: ['首页', '数据管理', '数据录入'],
  dataView: ['首页', '数据管理', '数据查看'],
  statistics: ['首页', '数据分析', '统计分析'],
  backtest: ['首页', '数据分析', '策略回测'],
  portfolio: ['首页', '投资组合', '持仓管理'],
  compare: ['首页', '数据分析', '对比分析'],
  screener: ['首页', '数据分析', '智能选股'],
  financialForecast: ['首页', '数据分析', '财务预报分析'],
  longhubang: ['首页', '市场数据', '龙虎榜'],
  auction: ['首页', '市场数据', '集合竞价'],
  aiAnalysis: ['首页', '数据分析', 'AI分析'],
  settings: ['首页', '系统设置', '配置管理'],
}

export default function AppLayout({ currentMenu, setCurrentMenu, collapsed, setCollapsed, children }) {
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  // 根据角色过滤菜单：admin=全部, user=非admin菜单
  const menuItems = allMenuItems.filter(item => {
    if (item.access === 'admin') return user?.role === 'admin'
    return true  // public 和 private 对所有登录用户可见
  })
  
  const handleLogout = async () => {
    setShowUserMenu(false)
    await logout()
  }
  return (
    <div className="layout">
      {/* 侧边栏 - 苹果风格 */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="logo">
          <span className="logo-icon">🐴</span>
          {!collapsed && <span className="logo-text">小马分析</span>}
        </div>
        
        <nav className="menu">
          {menuItems.map(item => (
            <div
              key={item.key}
              className={`menu-item ${currentMenu === item.key ? 'active' : ''}`}
              onClick={() => setCurrentMenu(item.key)}
            >
              <span className="menu-icon">{item.icon}</span>
              {!collapsed && <span className="menu-label">{item.label}</span>}
            </div>
          ))}
        </nav>
        
        {/* 底部收缩按钮 + 用户信息 */}
        <div className="sidebar-footer">
          {!collapsed && user && (
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-color)', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                  {user.nickname?.charAt(0) || user.username?.charAt(0)}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.nickname || user.username}</div>
                  <div style={{ color: user.role === 'admin' ? '#f59e0b' : 'var(--text-tertiary)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.role === 'admin' ? '管理员' : '在线'}</div>
                </div>
                <button onClick={handleLogout} title="退出登录" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 16, padding: 4, borderRadius: 6, transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='#ff4d4f'} onMouseOut={e => e.target.style.color='var(--text-tertiary)'}>⏻</button>
              </div>
            </div>
          )}
          {collapsed && user && (
            <div style={{ padding: '8px 0', borderTop: '1px solid var(--border-color)', marginBottom: 8, textAlign: 'center' }}>
              <button onClick={handleLogout} title="退出登录" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18, padding: 4 }}>⏻</button>
            </div>
          )}
          <button 
            className="collapse-btn pill-btn-sm"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? '展开菜单' : '折叠菜单'}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="main">
        {/* 面包屑导航 - 苹果风格 */}
        <div className="header apple-header">
          <div className="breadcrumb">
            {breadcrumbMap[currentMenu]?.map((item, index) => (
              <span key={index} className="breadcrumb-item-wrapper">
                {index > 0 && <span className="separator">›</span>}
                <span className={`breadcrumb-item ${index === breadcrumbMap[currentMenu].length - 1 ? 'current' : ''}`}>
                  {item}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* 页面内容 */}
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  )
}
