import { useState } from 'react'

const menuItems = [
  { key: 'dashboard', label: '数据概览', icon: '📊' },
  { key: 'stockManage', label: '小马管理', icon: '🐴' },
  { key: 'fetchAllStocks', label: '批量获取股票', icon: '📥' },
  { key: 'dataEntry', label: '数据录入', icon: '📝' },
  { key: 'dataView', label: '数据查看', icon: '📈' },
  { key: 'statistics', label: '统计分析', icon: '📉' },
  { key: 'watchlist', label: '自选股', icon: '⭐' },
  { key: 'alerts', label: '预警系统', icon: '🔔' },
  { key: 'sectorAnalysis', label: '板块分析', icon: '📊' },
  { key: 'moneyflow', label: '资金流向', icon: '💰' },
  { key: 'signals', label: '交易信号', icon: '🎯' },
  { key: 'backtest', label: '策略回测', icon: '📊' },
  { key: 'portfolio', label: '持仓管理', icon: '💼' },
  { key: 'compare', label: '对比分析', icon: '⚖️' },
  { key: 'screener', label: '智能选股', icon: '🔍' },
  { key: 'financialForecast', label: '财务预报', icon: '💰' },
  { key: 'longhubang', label: '龙虎榜', icon: '🏆' },
  { key: 'auction', label: '集合竞价', icon: '⏰' },
  { key: 'aiAnalysis', label: 'AI分析', icon: '🤖' },
  { key: 'settings', label: '系统设置', icon: '⚙️' },
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
  return (
    <div className="layout">
      {/* 侧边栏 */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="logo">
          {!collapsed && <span className="logo-text">🐴 小马分析</span>}
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
        
        {/* 底部收缩按钮 */}
        <div className="sidebar-footer">
          <button 
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="main">
        {/* 面包屑导航 */}
        <div className="header">
          <div className="breadcrumb">
            {breadcrumbMap[currentMenu]?.map((item, index) => (
              <span key={index}>
                {index > 0 && <span className="separator">/</span>}
                <span className={index === breadcrumbMap[currentMenu].length - 1 ? 'breadcrumb-item' : ''}>
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
