import { useState, useEffect } from 'react'
import './App.css'
import AppLayout from './layouts/AppLayout'
import { ToastProvider, toast } from './components/Toast'
import { PortfolioPage, ComparePage, ScreenerPage, SettingsPage, DataViewPage } from './components'
import {
  DashboardPage,
  StockManagePage,
  FetchAllStocksPage,
  DataEntryPage,
  StatisticsPage,
  FinancialForecastPage,
  LonghubangPage,
  AuctionPage,
  AiAnalysisPage,
  WatchlistPage,
  AlertPage,
  SectorAnalysisPage,
  MoneyFlowPage,
  TradingSignalsPage,
  BacktestPage
} from './pages'
import LoginPage from './pages/LoginPage'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { setCache, getCache } from './utils/cache'
import { getCurrentTheme, applyTheme } from './utils/themes'
import { stockAPI } from './utils/api'

const CACHE_ENABLED = true

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth()
  
  // 初始化主题
  useEffect(() => {
    const theme = getCurrentTheme()
    applyTheme(theme)
  }, [])
  
  // 认证加载中
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐴</div>
          <div>加载中...</div>
        </div>
      </div>
    )
  }
  
  // 未登录 → 显示登录页
  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <LoginPage />
      </ToastProvider>
    )
  }
  
  // 已登录 → 显示主界面
  return <MainApp />
}

function MainApp() {
  const [currentMenu, setCurrentMenu] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  
  // 全局状态
  const [stocks, setStocks] = useState([])
  const [selectedStock, setSelectedStock] = useState('')
  
  // 加载股票列表（用于下拉框等需要全部数据的场景）
  const loadStocks = async (forceRefresh = false) => {
    try {
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('stocks')
        if (cached) {
          setStocks(cached)
          return
        }
      }
      
      // 获取前100条用于下拉框等场景
      const response = await stockAPI.getAll({ page: 1, page_size: 100 })
      const stockList = response.data.items || []
      setStocks(stockList)
      
      if (CACHE_ENABLED) {
        setCache('stocks', stockList, 5 * 60)
      }
    } catch (error) {
      console.error('加载股票列表失败:', error)
      toast.error('加载股票列表失败', { duration: 3000 })
    }
  }
  
  useEffect(() => {
    loadStocks()
  }, [])
  
  // 根据当前菜单渲染对应页面 - 所有页面常驻挂载，通过 display 控制显示
  // 这样切换页面时不会重新挂载组件，数据保持不变，切换秒级响应
  const pageProps = {
    stocks,
    selectedStock,
    setSelectedStock,
    loadStocks,
    toast
  }
  
  const pages = [
    { key: 'dashboard', component: <DashboardPage key="dashboard" {...pageProps} /> },
    { key: 'stockManage', component: <StockManagePage key="stockManage" {...pageProps} /> },
    { key: 'fetchAllStocks', component: <FetchAllStocksPage key="fetchAllStocks" {...pageProps} /> },
    { key: 'dataEntry', component: <DataEntryPage key="dataEntry" {...pageProps} /> },
    { key: 'dataView', component: <DataViewPage key="dataView" {...pageProps} /> },
    { key: 'statistics', component: <StatisticsPage key="statistics" {...pageProps} /> },
    { key: 'watchlist', component: <WatchlistPage key="watchlist" {...pageProps} /> },
    { key: 'alerts', component: <AlertPage key="alerts" {...pageProps} /> },
    { key: 'sectorAnalysis', component: <SectorAnalysisPage key="sectorAnalysis" {...pageProps} /> },
    { key: 'moneyflow', component: <MoneyFlowPage key="moneyflow" {...pageProps} /> },
    { key: 'signals', component: <TradingSignalsPage key="signals" {...pageProps} /> },
    { key: 'backtest', component: <BacktestPage key="backtest" {...pageProps} /> },
    { key: 'portfolio', component: <PortfolioPage key="portfolio" {...pageProps} /> },
    { key: 'compare', component: <ComparePage key="compare" {...pageProps} /> },
    { key: 'screener', component: <ScreenerPage key="screener" {...pageProps} /> },
    { key: 'financialForecast', component: <FinancialForecastPage key="financialForecast" {...pageProps} /> },
    { key: 'longhubang', component: <LonghubangPage key="longhubang" {...pageProps} /> },
    { key: 'auction', component: <AuctionPage key="auction" {...pageProps} /> },
    { key: 'aiAnalysis', component: <AiAnalysisPage key="aiAnalysis" {...pageProps} /> },
    { key: 'settings', component: <SettingsPage key="settings" {...pageProps} /> },
  ]
  
  return (
    <ToastProvider>
      <AppLayout 
        currentMenu={currentMenu}
        setCurrentMenu={setCurrentMenu}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      >
        {/* 所有页面常驻挂载，只显示当前页面，切换无延迟 */}
        {pages.map(page => (
          <div
            key={page.key}
            style={{
              display: currentMenu === page.key ? 'block' : 'none',
              height: '100%',
            }}
          >
            {page.component}
          </div>
        ))}
      </AppLayout>
    </ToastProvider>
  )
}