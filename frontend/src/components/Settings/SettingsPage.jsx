import { useState, useEffect } from 'react'
import { toast } from '../Toast'
import { themes, getCurrentTheme, applyTheme } from '../../utils/themes'

export default function SettingsPage({ toast: parentToast }) {
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme())
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // all, red, orange, pink, brown

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
    
    // 按色系过滤
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
      <div className="card">
        <h2>🎨 主题设置</h2>
        <p style={{color: '#666', marginBottom: '20px'}}>选择您喜欢的暖色/狂热主题，共50套可选</p>

        {/* 搜索和过滤 */}
        <div style={{marginBottom: '20px'}}>
          <input
            type="text"
            placeholder="搜索主题名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 15px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '15px'
            }}
          />
          
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            <button
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
              style={{padding: '6px 16px'}}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('red')}
              className={filter === 'red' ? 'btn-primary' : 'btn-secondary'}
              style={{padding: '6px 16px', background: filter === 'red' ? '#f5222d' : undefined}}
            >
              🔴 红色系
            </button>
            <button
              onClick={() => setFilter('orange')}
              className={filter === 'orange' ? 'btn-primary' : 'btn-secondary'}
              style={{padding: '6px 16px', background: filter === 'orange' ? '#fa8c16' : undefined}}
            >
              🟠 橙色系
            </button>
            <button
              onClick={() => setFilter('pink')}
              className={filter === 'pink' ? 'btn-primary' : 'btn-secondary'}
              style={{padding: '6px 16px', background: filter === 'pink' ? '#eb2f96' : undefined}}
            >
              🩷 粉色系
            </button>
            <button
              onClick={() => setFilter('brown')}
              className={filter === 'brown' ? 'btn-primary' : 'btn-secondary'}
              style={{padding: '6px 16px', background: filter === 'brown' ? '#b87333' : undefined}}
            >
              🟤 棕色系
            </button>
          </div>
        </div>

        {/* 主题网格 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '15px',
          maxHeight: '70vh',
          overflowY: 'auto',
          padding: '10px'
        }}>
          {filteredThemes.map(theme => (
            <div
              key={theme.id}
              onClick={() => handleThemeChange(theme)}
              style={{
                border: currentTheme.id === theme.id ? '3px solid #1890ff' : '2px solid #e8e8e8',
                borderRadius: '12px',
                padding: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                background: theme.background,
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (currentTheme.id !== theme.id) {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* 当前主题标记 */}
              {currentTheme.id === theme.id && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: '#1890ff',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  ✓ 当前
                </div>
              )}

              {/* 颜色预览 */}
              <div style={{display: 'flex', gap: '6px', marginBottom: '10px'}}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: theme.primary
                }}></div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: theme.secondary
                }}></div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: theme.sidebar
                }}></div>
              </div>

              {/* 主题名称 */}
              <div style={{
                fontWeight: 'bold',
                marginBottom: '5px',
                color: theme.text
              }}>
                {theme.name}
              </div>

              {/* 主题ID */}
              <div style={{
                fontSize: '12px',
                color: '#999'
              }}>
                #{theme.id}
              </div>
            </div>
          ))}
        </div>

        {/* 统计信息 */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f5f5f5',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <span style={{color: '#666'}}>
            显示 {filteredThemes.length} / {themes.length} 个主题
          </span>
        </div>
      </div>
    </div>
  )
}
