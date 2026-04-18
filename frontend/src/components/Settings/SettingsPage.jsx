import { useState, useEffect } from 'react'
import { toast } from '../Toast'
import { themes, getCurrentTheme, applyTheme } from '../../utils/themes'

export default function SettingsPage({ toast: parentToast }) {
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme())
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    applyTheme(currentTheme)
  }, [currentTheme])

  const handleThemeChange = (theme) => {
    setCurrentTheme(theme)
    applyTheme(theme)
    parentToast.success(`已切换到主题: ${theme.name}`)
  }

  const filteredThemes = themes.filter(theme => {
    const matchSearch = theme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       theme.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filter === 'all') return matchSearch
    
    const redThemes = ['red', 'crimson', 'scarlet', 'ruby', 'blood', 'fire', 'flame', 'hot', 'cherry', 'neon', 'candy']
    const orangeThemes = ['orange', 'amber', 'sunset', 'coral', 'tropical', 'peach', 'persimmon', 'apricot']
    const pinkThemes = ['rose', 'pink', 'cherry', 'flamingo', 'poppy']
    const brownThemes = ['copper', 'bronze', 'rust', 'sienna', 'terracotta', 'chocolate', 'cinnamon', 'burnt']
    
    if (filter === 'red') return matchSearch && redThemes.some(t => theme.id.includes(t))
    if (filter === 'orange') return matchSearch && orangeThemes.some(t => theme.id.includes(t))
    if (filter === 'pink') return matchSearch && pinkThemes.some(t => theme.id.includes(t))
    if (filter === 'brown') return matchSearch && brownThemes.some(t => theme.id.includes(t))
    
    return matchSearch
  })

  return (
    <div className="page-content">
      {/* 头部卡片 - 苹果风格 */}
      <div className="dashboard-header-card">
        <div className="header-icon" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>🎨</div>
        <div className="header-info">
          <h3>系统设置</h3>
          <p>自定义您的应用主题与个性化设置</p>
        </div>
      </div>

      {/* 搜索和过滤区 - 苹果风格 */}
      <div className="apple-card" style={{marginBottom: '24px', animation: 'fadeInUp 0.5s ease 0.1s', animationFillMode: 'backwards'}}>
        <div className="settings-search-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索主题名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="apple-input search-input"
            />
          </div>
          
          <div className="filter-pills">
            {[
              {id: 'all', label: '全部', icon: ''},
              {id: 'red', label: '红色系', icon: '🔴'},
              {id: 'orange', label: '橙色系', icon: '🟠'},
              {id: 'pink', label: '粉色系', icon: '🩷'},
              {id: 'brown', label: '棕色系', icon: '🟤'}
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`filter-pill pill-btn-sm ${filter === item.id ? 'active' : ''}`}
                style={filter === item.id ? {
                  background: item.id === 'red' ? 'var(--apple-red)' :
                             item.id === 'orange' ? 'var(--apple-orange)' :
                             item.id === 'pink' ? '#eb2f96' :
                             item.id === 'brown' ? '#b87333' : 'var(--apple-blue)'
                } : undefined}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主题网格 - 苹果风格卡片 */}
      <div className="themes-grid" style={{animation: 'fadeInUp 0.5s ease 0.2s', animationFillMode: 'backwards'}}>
        {filteredThemes.map((theme, index) => (
          <div
            key={theme.id}
            onClick={() => handleThemeChange(theme)}
            className={`theme-card apple-card ${currentTheme.id === theme.id ? 'active' : ''}`}
            style={{
              background: theme.background,
              animation: `fadeInUp 0.5s ease ${0.1 + index * 0.05}s`,
              animationFillMode: 'backwards'
            }}
          >
            {/* 当前主题标记 */}
            {currentTheme.id === theme.id && (
              <div className="theme-badge">✓ 当前</div>
            )}

            {/* 颜色预览 */}
            <div className="color-preview">
              <div className="color-swatch" style={{background: theme.primary}}></div>
              <div className="color-swatch" style={{background: theme.secondary}}></div>
              <div className="color-swatch" style={{background: theme.sidebar}}></div>
            </div>

            {/* 主题名称 */}
            <div className="theme-name" style={{color: theme.text}}>
              {theme.name}
            </div>

            {/* 主题ID */}
            <div className="theme-id">#{theme.id}</div>
          </div>
        ))}
      </div>

      {/* 统计信息 - 苹果风格 */}
      <div className="apple-card info-banner" style={{
        marginTop: '24px',
        textAlign: 'center',
        padding: '12px 24px',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
        border: '1px solid rgba(102, 126, 234, 0.2)',
        animation: 'fadeInUp 0.5s ease 0.3s',
        animationFillMode: 'backwards'
      }}>
        共 <strong>{themes.length}</strong> 个主题，当前显示 <strong>{filteredThemes.length}</strong> 个
      </div>
    </div>
  )
}
