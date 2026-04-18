// 苹果 macOS 风格主题系统
// 采用现代、简洁、科技感十足的配色方案

export const themes = [
  {
    id: 'apple-macos',
    name: 'macOS 默认',
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#F5F5F7',
    text: '#1D1D1F',
    sidebar: '#2C2C2E',
    card: '#FFFFFF',
    accent: '#34C759',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    id: 'apple-light',
    name: '纯净白',
    primary: '#007AFF',
    secondary: '#5AC8FA',
    background: '#FFFFFF',
    text: '#1D1D1F',
    sidebar: '#F5F5F7',
    card: '#FFFFFF',
    accent: '#34C759',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  },
  {
    id: 'apple-dark',
    name: '深空灰',
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    background: '#1C1C1E',
    text: '#FFFFFF',
    sidebar: '#2C2C2E',
    card: '#2C2C2E',
    accent: '#30D158',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    id: 'sunset-orange',
    name: '日落橙',
    primary: '#FF9500',
    secondary: '#FF6B35',
    background: '#FFF5EB',
    text: '#1D1D1F',
    sidebar: '#1C1C1E',
    card: '#FFFFFF',
    accent: '#FF3B30',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  },
  {
    id: 'midnight-blue',
    name: '午夜蓝',
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#F0F4FF',
    text: '#1D1D1F',
    sidebar: '#1C1C2E',
    card: '#FFFFFF',
    accent: '#5AC8FA',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    id: 'forest-green',
    name: '森林绿',
    primary: '#34C759',
    secondary: '#30D158',
    background: '#F0FFF4',
    text: '#1D1D1F',
    sidebar: '#1C2E1C',
    card: '#FFFFFF',
    accent: '#007AFF',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
  },
  {
    id: 'rose-pink',
    name: '玫瑰粉',
    primary: '#FF2D55',
    secondary: '#FF375F',
    background: '#FFF0F3',
    text: '#1D1D1F',
    sidebar: '#2E1C24',
    card: '#FFFFFF',
    accent: '#FF9500',
    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'
  },
  {
    id: 'purple-haze',
    name: '紫罗兰',
    primary: '#AF52DE',
    secondary: '#BF5AF2',
    background: '#F8F0FF',
    text: '#1D1D1F',
    sidebar: '#2E1C3E',
    card: '#FFFFFF',
    accent: '#007AFF',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
  },
  {
    id: 'ocean-teal',
    name: '海洋青',
    primary: '#5AC8FA',
    secondary: '#64D2FF',
    background: '#F0F9FF',
    text: '#1D1D1F',
    sidebar: '#1C2E3E',
    card: '#FFFFFF',
    accent: '#34C759',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  },
  {
    id: 'graphite',
    name: '石墨黑',
    primary: '#8E8E93',
    secondary: '#636366',
    background: '#F5F5F7',
    text: '#1D1D1F',
    sidebar: '#1C1C1E',
    card: '#FFFFFF',
    accent: '#007AFF',
    gradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)'
  },
  {
    id: 'gold-rush',
    name: '金色流光',
    primary: '#FFD60A',
    secondary: '#FFCC00',
    background: '#FFFDF0',
    text: '#1D1D1F',
    sidebar: '#2E2A1C',
    card: '#FFFFFF',
    accent: '#FF9500',
    gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)'
  },
  {
    id: 'coral-dream',
    name: '珊瑚梦',
    primary: '#FF6B6B',
    secondary: '#FF8E53',
    background: '#FFF5F3',
    text: '#1D1D1F',
    sidebar: '#2E1C24',
    card: '#FFFFFF',
    accent: '#007AFF',
    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)'
  }
]

// 默认主题
export const defaultTheme = themes[0]

// 获取主题
export const getTheme = (themeId) => {
  return themes.find(t => t.id === themeId) || defaultTheme
}

// 应用主题到CSS变量
export const applyTheme = (theme) => {
  const root = document.documentElement
  root.style.setProperty('--theme-primary', theme.primary)
  root.style.setProperty('--theme-secondary', theme.secondary)
  root.style.setProperty('--theme-background', theme.background)
  root.style.setProperty('--theme-text', theme.text)
  root.style.setProperty('--theme-sidebar', theme.sidebar)
  root.style.setProperty('--theme-card', theme.card)
  root.style.setProperty('--theme-accent', theme.accent)
  root.style.setProperty('--theme-gradient', theme.gradient)
  
  // 保存到localStorage
  localStorage.setItem('selectedTheme', theme.id)
}

// 获取当前主题
export const getCurrentTheme = () => {
  const themeId = localStorage.getItem('selectedTheme')
  return getTheme(themeId)
}
