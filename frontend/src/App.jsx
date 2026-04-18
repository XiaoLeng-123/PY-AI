import { useState, useEffect } from 'react'
import axios from 'axios'
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
import { setCache, getCache } from './utils/cache'
import { getCurrentTheme, applyTheme } from './utils/themes'

const API_BASE = 'http://127.0.0.1:5000/api'
const CACHE_ENABLED = true

export default function App() {
  const [currentMenu, setCurrentMenu] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  
  // 初始化主题
  useEffect(() => {
    const theme = getCurrentTheme()
    applyTheme(theme)
  }, [])
  
  // 全局状态
  const [stocks, setStocks] = useState([])
  const [selectedStock, setSelectedStock] = useState('')
  
  // 加载股票列表
  const loadStocks = async (forceRefresh = false) => {
    try {
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('stocks')
        if (cached) {
          setStocks(cached)
          return
        }
      }
      
      const response = await axios.get(`${API_BASE}/stocks`)
      setStocks(response.data)
      
      if (CACHE_ENABLED) {
        setCache('stocks', response.data, 5 * 60) // 缓存5分钟
      }
    } catch (error) {
      console.error('加载股票列表失败:', error)
      toast.error('加载股票列表失败', { duration: 3000 })
    }
  }
  
  useEffect(() => {
    loadStocks()
  }, [])
  
  // 根据当前菜单渲染对应页面
  const renderPage = () => {
    const pageProps = {
      stocks,
      selectedStock,
      setSelectedStock,
      loadStocks,
      toast
    }
    
    switch (currentMenu) {
      case 'dashboard':
        return <DashboardPage {...pageProps} />
      case 'stockManage':
        return <StockManagePage {...pageProps} />
      case 'fetchAllStocks':
        return <FetchAllStocksPage {...pageProps} />
      case 'dataEntry':
        return <DataEntryPage {...pageProps} />
      case 'dataView':
        return <DataViewPage {...pageProps} />
      case 'statistics':
        return <StatisticsPage {...pageProps} />
      case 'watchlist':
        return <WatchlistPage {...pageProps} />
      case 'alerts':
        return <AlertPage {...pageProps} />
      case 'sectorAnalysis':
        return <SectorAnalysisPage {...pageProps} />
      case 'moneyflow':
        return <MoneyFlowPage {...pageProps} />
      case 'signals':
        return <TradingSignalsPage {...pageProps} />
      case 'backtest':
        return <BacktestPage {...pageProps} />
      case 'portfolio':
        return <PortfolioPage {...pageProps} />
      case 'compare':
        return <ComparePage {...pageProps} />
      case 'screener':
        return <ScreenerPage {...pageProps} />
      case 'financialForecast':
        return <FinancialForecastPage {...pageProps} />
      case 'longhubang':
        return <LonghubangPage {...pageProps} />
      case 'auction':
        return <AuctionPage {...pageProps} />
      case 'aiAnalysis':
        return <AiAnalysisPage {...pageProps} />
      case 'settings':
        return <SettingsPage {...pageProps} />
      default:
        return <DashboardPage {...pageProps} />
    }
  }
  
  return (
    <ToastProvider>
      <AppLayout 
        currentMenu={currentMenu}
        setCurrentMenu={setCurrentMenu}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      >
        {renderPage()}
      </AppLayout>
    </ToastProvider>
  )
}