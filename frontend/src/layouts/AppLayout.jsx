import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'

// 构建菜单key到标签的映射
const menuLabelMap = {}
const allMenuGroups = [
  {
    group: 'overview',
    label: '总览',
    items: [
      { key: 'dashboard', label: '数据概览', icon: '📊', access: 'public' },
    ]
  },
  {
    group: 'data',
    label: '数据管理',
    items: [
      { key: 'stockManage', label: '小马管理', icon: '🐴', access: 'admin' },
      { key: 'fetchAllStocks', label: '批量获取股票', icon: '📥', access: 'admin' },
      { key: 'dataEntry', label: '数据录入', icon: '📝', access: 'admin' },
      { key: 'dataView', label: '数据查看', icon: '📈', access: 'public' },
      { key: 'statistics', label: '统计分析', icon: '📉', access: 'public' },
    ]
  },
  {
    group: 'invest',
    label: '我的投资',
    items: [
      { key: 'watchlist', label: '自选股', icon: '⭐', access: 'private' },
      { key: 'alerts', label: '预警系统', icon: '🔔', access: 'private' },
      { key: 'portfolio', label: '持仓管理', icon: '💼', access: 'private' },
    ]
  },
  {
    group: 'analysis',
    label: '分析工具',
    items: [
      { key: 'sectorAnalysis', label: '板块分析', icon: '📊', access: 'public' },
      { key: 'moneyflow', label: '资金流向', icon: '💰', access: 'public' },
      { key: 'signals', label: '交易信号', icon: '🎯', access: 'public' },
      { key: 'backtest', label: '策略回测', icon: '📊', access: 'public' },
      { key: 'compare', label: '对比分析', icon: '⚖️', access: 'public' },
      { key: 'screener', label: '智能选股', icon: '🔍', access: 'public' },
      { key: 'financialForecast', label: '财务预报', icon: '💰', access: 'public' },
    ]
  },
  {
    group: 'market',
    label: '市场数据',
    items: [
      { key: 'longhubang', label: '龙虎榜', icon: '🏆', access: 'public' },
      { key: 'auction', label: '集合竞价', icon: '⏰', access: 'public' },
    ]
  },
  {
    group: 'ai',
    label: 'AI 助手',
    items: [
      { key: 'aiAnalysis', label: 'AI分析', icon: '🤖', access: 'public' },
    ]
  },
  {
    group: 'system',
    label: '系统管理',
    items: [
      { key: 'settings', label: '系统设置', icon: '⚙️', access: 'admin' },
    ]
  },
]

// 初始化菜单标签映射
allMenuGroups.forEach(g => {
  g.items.forEach(item => {
    menuLabelMap[item.key] = item.label
  })
})

// 构建分组key到菜单key的映射，用于自动展开当前选中菜单所在分组
const groupKeyMap = {}
allMenuGroups.forEach(g => {
  g.items.forEach(item => {
    groupKeyMap[item.key] = g.group
  })
})

export default function AppLayout({ currentMenu, setCurrentMenu, collapsed, setCollapsed, children }) {
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  // 面包屑历史记录：记录用户访问过的页面路径
  const [breadcrumbHistory, setBreadcrumbHistory] = useState([{ key: 'dashboard', label: '首页' }])
  // 记录各分组的展开/折叠状态，默认全部展开，并使用localStorage持久化
  const [expandedGroups, setExpandedGroups] = useState(() => {
    try {
      // 尝试从localStorage加载之前保存的状态
      const saved = localStorage.getItem('menu_expanded_groups')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('加载菜单状态失败:', e)
    }
    // 如果没有保存的状态，则初始化所有分组为展开
    const init = {}
    allMenuGroups.forEach(g => { 
      init[g.group] = true 
    })
    return init
  })
  
  // 当expandedGroups变化时，保存到localStorage
  useEffect(() => {
    try {
      localStorage.setItem('menu_expanded_groups', JSON.stringify(expandedGroups))
    } catch (e) {
      console.error('保存菜单状态失败:', e)
    }
  }, [expandedGroups])

  // 当 currentMenu 变化时，追加到面包屑历史（如果不在最后一位）
  useEffect(() => {
    if (!currentMenu) return
    const label = menuLabelMap[currentMenu] || '未知页面'
    setBreadcrumbHistory(prev => {
      // 如果最后一个就是当前页面，不重复添加
      if (prev.length > 0 && prev[prev.length - 1].key === currentMenu) {
        return prev
      }
      // 如果历史中已经存在这个页面，截断到该位置并重新添加
      const existingIndex = prev.findIndex(item => item.key === currentMenu)
      if (existingIndex !== -1) {
        return [...prev.slice(0, existingIndex + 1)]
      }
      // 否则追加到历史
      return [...prev, { key: currentMenu, label }]
    })
  }, [currentMenu])

  // 根据角色过滤菜单组：admin=全部, user=非admin菜单
  // 使用 useMemo 避免每次渲染都重新计算
  const menuGroups = useMemo(() => {
    return allMenuGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.access === 'admin') return user?.role === 'admin'
        return true
      })
    })).filter(group => group.items.length > 0)  // 隐藏空分组
  }, [user?.role])

  // 切换分组展开/折叠 - 手风琴模式：同时只能展开一个
  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const isCurrentlyExpanded = prev[groupKey] !== false
      if (isCurrentlyExpanded) {
        // 当前已展开，则折叠
        return { ...prev, [groupKey]: false }
      } else {
        // 当前已折叠，则展开当前并折叠其他所有
        const newState = {}
        allMenuGroups.forEach(g => { newState[g.group] = false })
        newState[groupKey] = true
        return newState
      }
    })
  }

  // 点击子菜单时，只展开其所在分组，不强制折叠其他分组
  const handleMenuClick = (key) => {
    const groupKey = groupKeyMap[key]
    
    if (groupKey) {
      setExpandedGroups(prev => ({
        ...prev,
        [groupKey]: true  // 只确保当前分组展开，不影响其他分组
      }))
    }
    setCurrentMenu(key)
  }

  // 面包屑点击导航 - 跳转到历史记录中的某个页面
  const handleBreadcrumbClick = (key, index) => {
    // 截断历史到点击的位置
    setBreadcrumbHistory(prev => prev.slice(0, index + 1))
    setCurrentMenu(key)
  }
  
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
          {menuGroups.map(group => {
            // 确保每个分组都有明确的展开状态，默认为true
            const isExpanded = expandedGroups[group.group] === undefined ? true : expandedGroups[group.group]
            const hasActiveChild = group.items.some(item => item.key === currentMenu)
            
            return (
              <div key={group.group} className={`menu-group ${hasActiveChild ? 'has-active-child' : ''}`}>
                {/* 分组标题 - 可点击展开/折叠 */}
                {!collapsed ? (
                  <div
                    className={`menu-group-header ${isExpanded ? 'expanded' : ''} ${hasActiveChild ? 'has-active' : ''}`}
                    onClick={() => toggleGroup(group.group)}
                    role="button"
                    aria-expanded={isExpanded}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && toggleGroup(group.group)}
                  >
                    <div className="menu-group-header-content">
                      <span className="menu-group-arrow">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                        </svg>
                      </span>
                      <span className="menu-group-label">{group.label}</span>
                    </div>
                    <span className="menu-group-count">{group.items.length}</span>
                  </div>
                ) : (
                  <div className="menu-group-divider" />
                )}
                {/* 子菜单列表 - 带展开/折叠动画 */}
                <div 
                  className={`menu-group-items ${isExpanded ? 'expanded' : 'collapsed'}`}
                  style={{
                    // 强制使用内联样式确保正确显示
                    gridTemplateRows: isExpanded ? '1fr' : '0fr'
                  }}
                >
                  <div className="menu-group-items-inner">
                    {group.items.map(item => (
                      <div
                        key={item.key}
                        className={`menu-item ${currentMenu === item.key ? 'active' : ''}`}
                        onClick={() => handleMenuClick(item.key)}
                        title={collapsed ? item.label : undefined}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleMenuClick(item.key)}
                      >
                        <span className="menu-icon">{item.icon}</span>
                        {!collapsed && <span className="menu-label">{item.label}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
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
        {/* 面包屑导航 - 历史记录模式 */}
        <div className="header apple-header">
          <div className="breadcrumb">
            {breadcrumbHistory.map((item, index) => {
              const isLast = index === breadcrumbHistory.length - 1
              return (
                <span key={`${item.key}-${index}`} className="breadcrumb-item-wrapper">
                  {index > 0 && <span className="separator">›</span>}
                  <span 
                    className={`breadcrumb-item ${isLast ? 'current' : 'clickable'}`}
                    onClick={() => !isLast && handleBreadcrumbClick(item.key, index)}
                    style={!isLast ? { cursor: 'pointer' } : {}}
                  >
                    {item.label}
                  </span>
                </span>
              )
            })}
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
