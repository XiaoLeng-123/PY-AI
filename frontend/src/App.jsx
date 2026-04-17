import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import { ToastProvider, toast } from './components/Toast'
import { PortfolioPage, ComparePage, ScreenerPage, SettingsPage, DataViewPage } from './components'
import { setCache, getCache, clearCache, getCacheRemainingTime } from './utils/cache'
import { exportPriceData, exportStatsData, exportStockList } from './utils/export'

const API_BASE = 'http://127.0.0.1:5000/api'
const CACHE_ENABLED = true // 是否启用缓存

// 菜单配置
const menuItems = [
  { key: 'dashboard', label: '数据概览', icon: '📊' },
  { key: 'stockManage', label: '小马管理', icon: '🐴' },
  { key: 'dataEntry', label: '数据录入', icon: '📝' },
  { key: 'dataView', label: '数据查看', icon: '📈' },
  { key: 'statistics', label: '统计分析', icon: '📉' },
  { key: 'portfolio', label: '持仓管理', icon: '💼' },
  { key: 'compare', label: '对比分析', icon: '⚖️' },
  { key: 'screener', label: '智能选股', icon: '🔍' },
  { key: 'financialForecast', label: '财务预报分析', icon: '💰' },
  { key: 'longhubang', label: '龙虎榜', icon: '🏆' },
  { key: 'auction', label: '集合竞价', icon: '⏰' },
  { key: 'aiAnalysis', label: 'AI分析', icon: '🤖' },
  { key: 'settings', label: '系统设置', icon: '⚙️' },
]

// 面包屑映射
const breadcrumbMap = {
  dashboard: ['首页', '数据概览'],
  stockManage: ['首页', '小马管理'],
  dataEntry: ['首页', '数据管理', '数据录入'],
  dataView: ['首页', '数据管理', '数据查看'],
  statistics: ['首页', '数据分析', '统计分析'],
  portfolio: ['首页', '投资组合', '持仓管理'],
  compare: ['首页', '数据分析', '对比分析'],
  screener: ['首页', '数据分析', '智能选股'],
  financialForecast: ['首页', '数据分析', '财务预报分析'],
  longhubang: ['首页', '市场数据', '龙虎榜'],
  auction: ['首页', '市场数据', '集合竞价'],
  aiAnalysis: ['首页', '数据分析', 'AI分析'],
  settings: ['首页', '系统设置', '配置管理'],
}

function App() {
  const [currentMenu, setCurrentMenu] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  
  // 数据状态
  const [stocks, setStocks] = useState([])
  const [selectedStock, setSelectedStock] = useState('')
  const [selectedStocks, setSelectedStocks] = useState([])
  const [stockForm, setStockForm] = useState({ code: '', name: '', market: '财神' })
  const [stockSearchLoading, setStockSearchLoading] = useState(false)
  const [stockSearchResult, setStockSearchResult] = useState('')
  const [stockPreview, setStockPreview] = useState(null)
  const [stockDetails, setStockDetails] = useState({})
  const [priceRange, setPriceRange] = useState(() => {
    const today = new Date()
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const formatDate = (date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    return {
      start_date: formatDate(firstDayLastMonth),
      end_date: formatDate(today)
    }
  })
  const [priceForm, setPriceForm] = useState({
    date: new Date().toISOString().split('T')[0], 
    open: '', high: '', low: '', close: '', volume: ''
  })
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const formatDate = (date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    return {
      start_date: formatDate(firstDay),
      end_date: formatDate(today)
    }
  })
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchResult, setBatchResult] = useState('')
  const [updateAllLoading, setUpdateAllLoading] = useState(false)
  const [updateAllResult, setUpdateAllResult] = useState('')
  const [batchData, setBatchData] = useState([])
  const [importFile, setImportFile] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState('')
  const [aiQueryDate, setAiQueryDate] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [priceList, setPriceList] = useState([])
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statsActiveTab, setStatsActiveTab] = useState('overview')
  const [dashboardStats, setDashboardStats] = useState(null)
  const [aiStockSearch, setAiStockSearch] = useState('')
  const [aiStockGroup, setAiStockGroup] = useState('all')
  const [forecastData, setForecastData] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [anomaliesData, setAnomaliesData] = useState(null)
  const [anomaliesLoading, setAnomaliesLoading] = useState(false)
  const [patternsData, setPatternsData] = useState(null)
  const [patternsLoading, setPatternsLoading] = useState(false)
  const [portfolioData, setPortfolioData] = useState(null)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [portfolioForm, setPortfolioForm] = useState({ stock_id: '', quantity: '', avg_cost: '', buy_date: new Date().toISOString().split('T')[0], notes: '' })
  const [compareStocks, setCompareStocks] = useState([])
  const [compareResult, setCompareResult] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [screenerFilters, setScreenerFilters] = useState({ min_price: 0, max_price: 1000, min_change: -100, max_change: 100, min_volume: 0, trend: 'all' })
  const [screenerResults, setScreenerResults] = useState(null)
  const [screenerLoading, setScreenerLoading] = useState(false)
  const [systemInfo, setSystemInfo] = useState(null)
  const [settings, setSettings] = useState({})
  const [alerts, setAlerts] = useState([])
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertForm, setAlertForm] = useState({ alert_type: 'price', condition: 'above', threshold: '' })
  
  // 龙虎榜和集合竞价状态
  const [longhubangData, setLonghubangData] = useState(null)
  const [longhubangLoading, setLonghubangLoading] = useState(false)
  const [longhubangDate, setLonghubangDate] = useState(new Date().toISOString().split('T')[0])
  
  const [auctionData, setAuctionData] = useState(null)
  const [auctionLoading, setAuctionLoading] = useState(false)
  const [auctionDate, setAuctionDate] = useState(new Date().toISOString().split('T')[0])
  const [auctionSortBy, setAuctionSortBy] = useState('amount')  // 'amount'或'change'
  const [auctionTab, setAuctionTab] = useState('top50')  // 'top50'或'full'

  useEffect(() => {
    loadStocks()
    loadDashboardStats()
    loadAlerts()
    loadPortfolio()
    loadSystemInfo()
    // 自动加载龙虎榜和集合竞价数据
    loadLonghubangData()
    loadAuctionData()
    
    // 自动更新提醒 - 每5分钟检查一次缓存状态
    const reminderInterval = setInterval(() => {
      if (CACHE_ENABLED) {
        const dashboardRemaining = getCacheRemainingTime('dashboard')
        if (dashboardRemaining > 0 && dashboardRemaining < 120) { // 剩余2分钟内
          toast.info('数据即将过期，建议刷新获取最新数据', { duration: 5000 })
        }
      }
    }, 5 * 60 * 1000) // 每5分钟检查一次
    
    return () => clearInterval(reminderInterval)
  }, [])

  useEffect(() => {
    if (selectedStock) {
      loadPriceData()
      loadStats()
      loadForecastData()
      loadAnomalies()
      loadPatterns()
      checkTriggeredAlerts() // 检查预警是否触发
    } else {
      // 清空所有数据，避免幻觉
      setStats(null)
      setPriceList([])
      setForecastData(null)
      setAnomaliesData(null)
      setPatternsData(null)
    }
  }, [selectedStock, priceRange.start_date, priceRange.end_date])

  const loadDashboardStats = async (forceRefresh = false) => {
    try {
      // 尝试从缓存加载
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('dashboard')
        if (cached) {
          setDashboardStats(cached)
          return
        }
      }
      
      const response = await axios.get(`${API_BASE}/stats/dashboard`)
      setDashboardStats(response.data)
      
      // 缓存数据
      if (CACHE_ENABLED) {
        setCache('dashboard', response.data)
      }
    } catch (error) {
      console.error('加载概览数据失败:', error)
    }
  }

  const loadStocks = async (forceRefresh = false) => {
    try {
      // 尝试从缓存加载
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('stocks')
        if (cached) {
          setStocks(cached)
          return
        }
      }
      
      const response = await axios.get(`${API_BASE}/stocks`)
      setStocks(response.data)
      
      // 缓存数据
      if (CACHE_ENABLED) {
        setCache('stocks', response.data)
      }
    } catch (error) {
      console.error('加载小马失败:', error)
    }
  }

  const loadPriceData = async (forceRefresh = false) => {
    try {
      setLoading(true)
      
      // 尝试从缓存加载
      const cacheKey = selectedStock
      if (!forceRefresh && CACHE_ENABLED && selectedStock) {
        const cached = getCache('prices', cacheKey)
        if (cached) {
          setPriceList(cached)
          setLoading(false)
          return
        }
      }
      
      let url = `${API_BASE}/stocks/${selectedStock}/prices`
      const params = []
      if (priceRange.start_date) params.push(`start_date=${priceRange.start_date}`)
      if (priceRange.end_date) params.push(`end_date=${priceRange.end_date}`)
      if (params.length > 0) url += `?${params.join('&')}`
      
      const response = await axios.get(url)
      setPriceList(response.data)
      
      // 缓存数据
      if (CACHE_ENABLED && selectedStock) {
        setCache('prices', response.data, null, cacheKey)
      }
    } catch (error) {
      console.error('加载价格数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (forceRefresh = false) => {
    // 防御性检查：如果没有选中小马，直接返回
    if (!selectedStock) {
      console.log('未选中小马，跳过加载统计数据')
      return
    }
    
    try {
      setStatsLoading(true)
      setStats(null) // 先清空旧数据
      
      // 尝试从缓存加载
      const cacheKey = selectedStock
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('stats', cacheKey)
        if (cached) {
          setStats(cached)
          setStatsLoading(false)
          return
        }
      }
      
      const response = await axios.get(`${API_BASE}/stats/${selectedStock}`)
      setStats(response.data)
      
      // 缓存数据
      if (CACHE_ENABLED) {
        setCache('stats', response.data, null, cacheKey)
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }

  const loadForecastData = async (forceRefresh = false) => {
    if (!selectedStock) return
    
    setForecastLoading(true)
    try {
      // 尝试从缓存加载
      const cacheKey = selectedStock
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('forecast', cacheKey)
        if (cached) {
          setForecastData(cached)
          setForecastLoading(false)
          return
        }
      }
      
      const response = await axios.get(`${API_BASE}/stocks/${selectedStock}/financial_forecast`)
      console.log('财务预报数据:', response.data)
      
      const data = response.data
      if (data.error) {
        console.error('API返回错误:', data.error)
        setForecastData({ error: data.error })
      } else if (!data.report_calendar || !data.forecasts || !data.core_metrics) {
        console.error('数据结构不完整:', data)
        setForecastData({ error: '数据格式不正确，请重试' })
      } else {
        // 设置安全默认值
        const safeData = {
          ...data,
          report_calendar: data.report_calendar || { latest_quarter: '-', expected_date: '-', annual_report: '-', days_to_next: 0 },
          forecasts: Array.isArray(data.forecasts) ? data.forecasts : [],
          core_metrics: data.core_metrics || { revenue: '-', revenue_yoy: '-', revenue_qoq: '-', net_profit: '-', profit_yoy: '-', profit_qoq: '-', gross_margin: '-', margin_change: '-', industry_avg_margin: '-', roe: '-', roe_change: '-' },
          growth_analysis: data.growth_analysis || { revenue_growth_3y: '0%', revenue_rating: '-', profit_growth_3y: '0%', profit_rating: '-', cash_flow_ratio: 0, cash_flow_rating: '-' },
          risks: Array.isArray(data.risks) ? data.risks : [],
          recommendation: data.recommendation || {
            rating: '-',
            label: '-',
            scores: { fundamentals: 0, growth: 0, valuation: 0, financial_health: 0 },
            investment_points: [],
            action_suggestion: { short_term: '-', mid_term: '-', long_term: '-' },
            price_target: { low: 0, high: 0, current: 0 }
          }
        }
        setForecastData(safeData)
        
        // 缓存数据
        if (CACHE_ENABLED) {
          setCache('forecast', safeData, null, cacheKey)
        }
      }
    } catch (error) {
      console.error('加载财务预报数据失败:', error)
      console.error('错误详情:', error.response?.data)
      setForecastData({ error: '加载失败，请稍后重试' })
    } finally {
      setForecastLoading(false)
    }
  }
  
  // 加载数据异常检测结果
  const loadAnomalies = async (forceRefresh = false) => {
    if (!selectedStock) return
    
    setAnomaliesLoading(true)
    try {
      const cacheKey = selectedStock
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('anomalies', cacheKey)
        if (cached) {
          setAnomaliesData(cached)
          setAnomaliesLoading(false)
          return
        }
      }
      
      const response = await axios.get(`${API_BASE}/stocks/${selectedStock}/anomalies`)
      setAnomaliesData(response.data)
      
      if (CACHE_ENABLED) {
        setCache('anomalies', response.data, 60 * 60 * 1000, cacheKey)
      }
    } catch (error) {
      console.error('加载异常检测数据失败:', error)
      setAnomaliesData({ error: '加载失败' })
    } finally {
      setAnomaliesLoading(false)
    }
  }
  
  // 加载K线形态识别结果
  const loadPatterns = async (forceRefresh = false) => {
    if (!selectedStock) return
    
    setPatternsLoading(true)
    try {
      const cacheKey = selectedStock
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('patterns', cacheKey)
        if (cached) {
          setPatternsData(cached)
          setPatternsLoading(false)
          return
        }
      }
      
      const response = await axios.get(`${API_BASE}/stocks/${selectedStock}/patterns`)
      setPatternsData(response.data)
      
      if (CACHE_ENABLED) {
        setCache('patterns', response.data, 60 * 60 * 1000, cacheKey)
      }
    } catch (error) {
      console.error('加载K线形态数据失败:', error)
      setPatternsData({ error: '加载失败' })
    } finally {
      setPatternsLoading(false)
    }
  }
  
  // 加载持仓数据
  const loadPortfolio = async () => {
    setPortfolioLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/portfolio`)
      setPortfolioData(response.data)
    } catch (error) {
      console.error('加载持仓数据失败:', error)
    } finally {
      setPortfolioLoading(false)
    }
  }
  
  // 添加持仓
  const handleAddPortfolio = async (e) => {
    e.preventDefault()
    if (!portfolioForm.stock_id || !portfolioForm.quantity || !portfolioForm.avg_cost) {
      toast.error('请填写完整信息')
      return
    }
    
    try {
      await axios.post(`${API_BASE}/portfolio`, {
        stock_id: Number(portfolioForm.stock_id),
        quantity: Number(portfolioForm.quantity),
        avg_cost: parseFloat(portfolioForm.avg_cost),
        buy_date: portfolioForm.buy_date,
        notes: portfolioForm.notes
      })
      toast.success('持仓添加成功')
      setShowPortfolioModal(false)
      setPortfolioForm({ stock_id: '', quantity: '', avg_cost: '', buy_date: new Date().toISOString().split('T')[0], notes: '' })
      loadPortfolio()
    } catch (error) {
      toast.error(error.response?.data?.error || '添加失败')
    }
  }
  
  // 删除持仓
  const handleDeletePortfolio = async (id) => {
    if (!confirm('确定删除此持仓？')) return
    
    try {
      await axios.delete(`${API_BASE}/portfolio/${id}`)
      toast.success('持仓已删除')
      loadPortfolio()
    } catch (error) {
      toast.error('删除失败')
    }
  }
  
  // 对比分析
  const handleCompare = async () => {
    if (compareStocks.length < 2) {
      toast.error('请至少选择2只小马')
      return
    }
    
    setCompareLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/compare`, {
        stock_ids: compareStocks.map(id => Number(id))
      })
      setCompareResult(response.data)
    } catch (error) {
      toast.error(error.response?.data?.error || '对比失败')
    } finally {
      setCompareLoading(false)
    }
  }
  
  // 智能选股
  const handleScreener = async () => {
    setScreenerLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/screener`, screenerFilters)
      setScreenerResults(response.data)
    } catch (error) {
      toast.error('筛选失败')
    } finally {
      setScreenerLoading(false)
    }
  }
  
  // 加载系统信息
  const loadSystemInfo = async () => {
    try {
      const [infoRes, settingsRes] = await Promise.all([
        axios.get(`${API_BASE}/system/info`),
        axios.get(`${API_BASE}/settings`)
      ])
      setSystemInfo(infoRes.data)
      setSettings(settingsRes.data)
    } catch (error) {
      console.error('加载系统信息失败:', error)
    }
  }
  
  // 保存设置
  const handleSaveSettings = async () => {
    try {
      await axios.post(`${API_BASE}/settings`, settings)
      toast.success('设置已保存')
    } catch (error) {
      toast.error('保存失败')
    }
  }
  
  // 导出所有小马
  const handleExportAllStocks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/export/stocks`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `stocks_export_${new Date().getTime()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('导出成功')
    } catch (error) {
      toast.error('导出失败')
    }
  }
  
  // 加载预警规则
  const loadAlerts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/alerts`)
      setAlerts(response.data)
    } catch (error) {
      console.error('加载预警规则失败:', error)
    }
  }
  
  // 下载导入模板
  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API_BASE}/import/template`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', '小马数据导入模板.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('模板下载成功')
    } catch (error) {
      toast.error('下载失败')
    }
  }
  
  // 处理文件上传
  const handleFileImport = async (e) => {
    e.preventDefault()
    if (!importFile) {
      toast.error('请选择文件')
      return
    }
    
    setImportLoading(true)
    setImportResult('')
    
    const formData = new FormData()
    formData.append('file', importFile)
    
    try {
      const response = await axios.post(`${API_BASE}/import/csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setImportResult(response.data.message)
      toast.success(`导入成功：${response.data.success_count}条`)
      setImportFile(null)
      
      // 清空文件选择
      e.target.reset()
      
      // 刷新小马列表和价格数据
      loadStocks(true)
      if (selectedStock) {
        loadPriceData(true)
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || '导入失败'
      setImportResult(errorMsg)
      toast.error(errorMsg)
    } finally {
      setImportLoading(false)
    }
  }
  
  // 添加预警
  const handleAddAlert = async (e) => {
    e.preventDefault()
    if (!selectedStock || !alertForm.threshold) {
      toast.error('请填写完整信息')
      return
    }
    
    try {
      await axios.post(`${API_BASE}/alerts`, {
        stock_id: Number(selectedStock),
        alert_type: alertForm.alert_type,
        condition: alertForm.condition,
        threshold: parseFloat(alertForm.threshold)
      })
      toast.success('预警规则添加成功')
      setShowAlertModal(false)
      setAlertForm({ alert_type: 'price', condition: 'above', threshold: '' })
      loadAlerts()
    } catch (error) {
      toast.error(error.response?.data?.error || '添加失败')
    }
  }
  
  // 删除预警
  const handleDeleteAlert = async (alertId) => {
    if (!confirm('确定删除此预警规则？')) return
    
    try {
      await axios.delete(`${API_BASE}/alerts/${alertId}`)
      toast.success('预警已删除')
      loadAlerts()
    } catch (error) {
      toast.error('删除失败')
    }
  }
  
  // 检查预警触发
  const checkTriggeredAlerts = async () => {
    if (!selectedStock) return
    
    try {
      const response = await axios.post(`${API_BASE}/alerts/check`, {
        stock_id: Number(selectedStock)
      })
      
      if (response.data.triggered && response.data.triggered.length > 0) {
        response.data.triggered.forEach(alert => {
          toast.warning(`🔔 ${alert.message}`, { duration: 8000 })
        })
      }
    } catch (error) {
      console.error('检查预警失败:', error)
    }
  }
  
  // 加载龙虎榜数据
  const loadLonghubangData = async (forceRefresh = false) => {
    setLonghubangLoading(true)
    try {
      // 尝试从缓存加载
      const cacheKey = longhubangDate
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('longhubang', cacheKey)
        if (cached) {
          setLonghubangData(cached)
          setLonghubangLoading(false)
          return
        }
      }
      
      const response = await axios.get(`${API_BASE}/longhubang`, {
        params: { date: longhubangDate }
      })
      console.log('龙虎榜响应数据:', response.data)
      setLonghubangData(response.data)
      
      // 缓存数据
      if (CACHE_ENABLED) {
        setCache('longhubang', response.data, null, cacheKey)
      }
    } catch (error) {
      console.error('加载龙虎榜数据失败:', error)
      const errorMsg = error.response?.data?.error || error.response?.data?.message || '加载失败'
      setLonghubangData({ error: errorMsg })
    } finally {
      setLonghubangLoading(false)
    }
  }
  
  // 加载集合竞价数据
  const loadAuctionData = async (forceRefresh = false) => {
    setAuctionLoading(true)
    try {
      // 尝试从缓存加载
      const cacheKey = `${auctionDate}_${auctionSortBy}`
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('auction', cacheKey)
        if (cached) {
          setAuctionData(cached)
          setAuctionLoading(false)
          return
        }
      }
      
      const response = await axios.get(`${API_BASE}/auction/top50`, {
        params: { 
          date: auctionDate,
          by: auctionSortBy
        }
      })
      setAuctionData(response.data)
      
      // 缓存数据
      if (CACHE_ENABLED) {
        setCache('auction', response.data, null, cacheKey)
      }
    } catch (error) {
      console.error('加载集合竞价数据失败:', error)
      setAuctionData({ error: '加载失败' })
    } finally {
      setAuctionLoading(false)
    }
  }

  const handleAddStock = async (e) => {
    e.preventDefault()
    if (!stockForm.code) {
      toast.error('请输入小马代码')
      return
    }
    
    // 如果名称为空，尝试AI查询
    let finalForm = {...stockForm}
    if (!stockForm.name) {
      try {
        setStockSearchLoading(true)
        setStockSearchResult('正在查询小马信息...')
        const response = await axios.post(`${API_BASE}/stocks/search`, {
          code: stockForm.code
        })
        const info = response.data
        if (info.name) {
          finalForm = {...stockForm, name: info.name, market: info.market || '财神'}
          setStockForm(finalForm)
          setStockSearchResult(`✓ 查询成功: ${info.name} (${info.market || '财神'})`)
          setStockPreview({
            code: stockForm.code,
            name: info.name,
            market: info.market || '财神',
            latest_price: info.latest_price,
            change_percent: info.change_percent,
            high: info.high,
            low: info.low,
            volume: info.volume
          })
          toast.success('查询成功')
        } else {
          setStockSearchResult('✗ 未找到该小马信息，请手动输入名称')
          toast.warning('未找到小马信息')
        }
      } catch (error) {
        setStockSearchResult('✗ 查询失败，请手动输入名称')
        toast.error('查询失败')
      } finally {
        setStockSearchLoading(false)
      }
    }
    
    if (!finalForm.name) {
      toast.error('请输入小马名称')
      return
    }
    
    try {
      await axios.post(`${API_BASE}/stocks`, finalForm)
      setStockForm({ code: '', name: '', market: '财神' })
      setStockSearchResult('')
      setStockPreview(null)
      loadStocks(true) // 强制刷新
      loadDashboardStats(true)
      clearCache('stocks') // 清除缓存
      toast.success('小马添加成功！')
    } catch (error) {
      toast.error(error.response?.data?.error || '添加失败')
    }
  }

  const handleBatchFetch = async () => {
    if (!selectedStock) {
      alert('请先选择小马')
      return
    }
    if (!dateRange.start_date || !dateRange.end_date) {
      alert('请选择时间区间')
      return
    }
    
    const stockCode = stocks.find(s => s.id === Number(selectedStock))?.code
    if (!stockCode) return
    
    setBatchLoading(true)
    setBatchResult('正在获取数据...')
    
    try {
      const response = await axios.post(`${API_BASE}/stocks/batch_fetch`, {
        stock_code: stockCode,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      })
      const data = response.data
      if (data.added_count > 0) {
        setBatchResult(`✓ 成功导入 ${data.added_count} 条数据`)
        setBatchData(data.data || [])
        loadPriceData()
        loadStats()
      } else {
        setBatchResult('⚠ 没有找到新数据或数据已存在')
        setBatchData([])
      }
    } catch (error) {
      setBatchResult('✗ 导入失败：' + (error.response?.data?.error || error.message))
    } finally {
      setBatchLoading(false)
    }
  }

  const handleUpdateAllStocks = async () => {
    if (!confirm('确定要更新所有小马的最新数据吗？\n\n系统将获取所有小马从今天起往前60天（约2个月）的最新交易数据，并校验数据准确性，自动修正不准确的数据。\n\n此操作可能需要几分钟。')) {
      return
    }
    
    setUpdateAllLoading(true)
    setUpdateAllResult('正在更新所有小马数据，请稍候...')
    
    try {
      const response = await axios.post(`${API_BASE}/stocks/update_all`)
      const data = response.data
      
      if (data.success) {
        setUpdateAllResult(
          `✓ 更新完成！\n\n` +
          `总小马数: ${data.total_stocks}\n` +
          `成功更新: ${data.success_count} 只\n` +
          `失败小马: ${data.failed_stocks.length > 0 ? data.failed_stocks.join(', ') : '无'}\n` +
          `新增数据: ${data.total_added} 条\n` +
          `修正数据: ${data.total_updated} 条`
        )
        // 刷新概览数据和当前选中小马的统计数据
        loadDashboardStats()
        if (selectedStock) {
          loadStats()
        }
      } else {
        setUpdateAllResult('✗ 更新失败: ' + (data.error || '未知错误'))
      }
    } catch (error) {
      setUpdateAllResult('✗ 更新失败: ' + (error.response?.data?.error || error.message))
    } finally {
      setUpdateAllLoading(false)
    }
  }

  const handleLoadStockDetails = async (stockId) => {
    if (stockDetails[stockId]) return // 已加载过
    
    try {
      const response = await axios.get(`${API_BASE}/stocks/${stockId}/info`)
      setStockDetails(prev => ({
        ...prev,
        [stockId]: response.data
      }))
    } catch (error) {
      console.error('加载小马详情失败:', error)
    }
  }

  const handleStockCodeChange = (e) => {
    const code = e.target.value
    setStockForm({...stockForm, code})
    setStockSearchResult('')
    // 如果代码长度为6位，自动查询
    if (code.length === 6 && /^\d+$/.test(code)) {
      handleAutoSearch(code)
    }
  }

  const handleAutoSearch = async (code) => {
    try {
      setStockSearchLoading(true)
      setStockSearchResult('正在查询...')
      setStockPreview(null)
      const response = await axios.post(`${API_BASE}/stocks/search`, {
        code
      })
      const info = response.data
      if (info.name) {
        setStockForm(prev => ({...prev, name: info.name, market: info.market || '财神'}))
        setStockSearchResult(`✓ ${info.name} (${info.market || '财神'})`)
        setStockPreview({
          code,
          name: info.name,
          market: info.market || '财神',
          latest_price: info.latest_price,
          change_percent: info.change_percent,
          high: info.high,
          low: info.low,
          volume: info.volume
        })
      } else {
        setStockSearchResult('✗ 未找到，请手动输入')
      }
    } catch (error) {
      setStockSearchResult('✗ 查询失败')
    } finally {
      setStockSearchLoading(false)
    }
  }

  const handleNameSearch = async (name) => {
    if (!name || name.length < 2) return
    
    try {
      setStockSearchLoading(true)
      setStockSearchResult('正在根据名称查询...')
      setStockPreview(null)
      const response = await axios.post(`${API_BASE}/stocks/search_by_name`, {
        name
      })
      const info = response.data
      if (info.code) {
        setStockForm(prev => ({...prev, code: info.code, name: info.name, market: info.market || '财神'}))
        setStockSearchResult(`✓ ${info.name} (${info.code}, ${info.market || '财神'})`)
        setStockPreview({
          code: info.code,
          name: info.name,
          market: info.market || '财神',
          latest_price: info.latest_price,
          change_percent: info.change_percent,
          high: info.high,
          low: info.low,
          volume: info.volume
        })
      } else {
        setStockSearchResult('✗ 未找到匹配的小马')
      }
    } catch (error) {
      setStockSearchResult('✗ 查询失败')
    } finally {
      setStockSearchLoading(false)
    }
  }

  const handleDeleteStock = async (id) => {
    if (!confirm('确定删除？')) return
    try {
      await axios.delete(`${API_BASE}/stocks/${id}`)
      loadStocks()
      if (selectedStock === String(id)) setSelectedStock('')
    } catch (error) {
      alert('删除失败')
    }
  }

  const handleAiQuery = async () => {
    if (!selectedStock || !aiQueryDate) {
      alert('请选择小马和日期')
      return
    }
    const stockCode = stocks.find(s => s.id === Number(selectedStock))?.code
    if (!stockCode) return

    setAiLoading(true)
    setAiResult('查询中...')

    try {
      const response = await axios.post(`${API_BASE}/ai/fetch_stock`, {
        stock_code: stockCode,
        date: aiQueryDate
      })
      const data = response.data
      setPriceForm({
        date: data.date || '',
        open: data.open || '',
        high: data.high || '',
        low: data.low || '',
        close: data.close || '',
        volume: data.volume || ''
      })
      setAiResult(data.open === null ? '⚠️ 未找到数据' : `✓ 查询成功 - ${data.stock_name || ''} ${data.date}`)
    } catch (error) {
      setAiResult('✗ 查询失败')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAddPrice = async (e) => {
    e.preventDefault()
    if (!selectedStock) {
      alert('请先选择小马')
      return
    }
    try {
      await axios.post(`${API_BASE}/stocks/${selectedStock}/prices`, {
        date: priceForm.date,
        open: parseFloat(priceForm.open),
        high: parseFloat(priceForm.high),
        low: parseFloat(priceForm.low),
        close: parseFloat(priceForm.close),
        volume: parseInt(priceForm.volume) || 0
      })
      setPriceForm({ date: '', open: '', high: '', low: '', close: '', volume: '' })
      loadPriceData()
      loadStats()
      alert('添加成功！')
    } catch (error) {
      alert(error.response?.data?.error || '添加失败')
    }
  }

  const handleAiAnalyze = async () => {
    if (!selectedStock || !aiQuestion.trim()) {
      alert('请选择小马并输入问题')
      return
    }
    setAiAnalyzing(true)
    setAiAnswer('AI分析中...')
    try {
      const response = await axios.post(`${API_BASE}/ai/analyze`, {
        stock_id: Number(selectedStock),
        question: aiQuestion
      })
      setAiAnswer(response.data.analysis)
    } catch (error) {
      setAiAnswer(error.response?.data?.error || '分析失败')
    } finally {
      setAiAnalyzing(false)
    }
  }

  // 渲染数据概览
  const renderDashboard = () => (
    <div className="dashboard">
      {/* 小马选择器 */}
      <div className="stock-selector-bar">
        <label>查看特定小马：</label>
        <select value={selectedStock} onChange={(e) => setSelectedStock(e.target.value)} className="stock-select">
          <option value="">全部小马（系统全局）</option>
          {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
        </select>
        {selectedStock && (
          <span className="selected-stock-info">
            已选择：{stocks.find(s => s.id === Number(selectedStock))?.name} ({stocks.find(s => s.id === Number(selectedStock))?.code})
          </span>
        )}
      </div>

      <div className="stat-cards">
        <div className="stat-card primary">
          <div className="stat-icon">🐴</div>
          <div className="stat-info">
            <div className="stat-label">小马总数</div>
            <div className="stat-value">{dashboardStats?.total_stocks || 0}</div>
            <div className="stat-hint">系统中共收录的小马数量</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-label">数据总量</div>
            <div className="stat-value">{dashboardStats?.total_records || 0}</div>
            <div className="stat-hint">所有小马价格记录总条数</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">🔥</div>
          <div className="stat-info">
            <div className="stat-label">活跃小马</div>
            <div className="stat-value">{dashboardStats?.active_stocks || 0}</div>
            <div className="stat-hint">近7天有数据更新的小马</div>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="stat-label">最新数据日期</div>
            <div className="stat-value date-value">{dashboardStats?.latest_date || '-'}</div>
            <div className="stat-hint">系统中最晚的数据日期</div>
          </div>
        </div>
      </div>

      {/* 选中马的详细数据 */}
      {selectedStock && stats && (
        <div className="stock-detail-section">
          <h3>📈 {stocks.find(s => s.id === Number(selectedStock))?.name}({stocks.find(s => s.id === Number(selectedStock))?.code}) 专业分析</h3>
          
          {/* 价格指标 */}
          <div className="detail-section-title">💰 价格指标</div>
          <div className="stat-cards">
            <div className="stat-box">
              <div className="label">最新收盘价</div>
              <div className="value primary">¥{stats.latest_price.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="label">历史最高价</div>
              <div className="value success">¥{stats.highest_price.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="label">历史最低价</div>
              <div className="value danger">¥{stats.lowest_price.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="label">均价</div>
              <div className="value">¥{stats.average_price.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="label">价格区间位置</div>
              <div className="value">{stats.price_position}%</div>
              <div className="hint-text">{stats.price_position > 70 ? '高位区' : stats.price_position > 30 ? '中位区' : '低位区'}</div>
            </div>
            <div className="stat-box">
              <div className="label">波动幅度</div>
              <div className="value">{stats.price_amplitude}%</div>
            </div>
          </div>

          {/* 收益率分析 */}
          <div className="detail-section-title">📊 收益率分析</div>
          <div className="stat-cards">
            <div className="stat-box">
              <div className="label">累计收益率</div>
              <div className={`value ${stats.total_return >= 0 ? 'success' : 'danger'}`}>
                {stats.total_return >= 0 ? '+' : ''}{stats.total_return}%
              </div>
            </div>
            <div className="stat-box">
              <div className="label">近5日收益</div>
              <div className={`value ${stats.return_5d >= 0 ? 'success' : 'danger'}`}>
                {stats.return_5d >= 0 ? '+' : ''}{stats.return_5d}%
              </div>
            </div>
            <div className="stat-box">
              <div className="label">近10日收益</div>
              <div className={`value ${stats.return_10d >= 0 ? 'success' : 'danger'}`}>
                {stats.return_10d >= 0 ? '+' : ''}{stats.return_10d}%
              </div>
            </div>
            <div className="stat-box">
              <div className="label">近20日收益</div>
              <div className={`value ${stats.return_20d >= 0 ? 'success' : 'danger'}`}>
                {stats.return_20d >= 0 ? '+' : ''}{stats.return_20d}%
              </div>
            </div>
            <div className="stat-box">
              <div className="label">上涨天数</div>
              <div className="value success">{stats.up_days}天</div>
            </div>
            <div className="stat-box">
              <div className="label">下跌天数</div>
              <div className="value danger">{stats.down_days}天</div>
            </div>
            <div className="stat-box">
              <div className="label">平盘天数</div>
              <div className="value">{stats.flat_days}天</div>
            </div>
            <div className="stat-box">
              <div className="label">胜率</div>
              <div className="value">{stats.win_rate}%</div>
            </div>
          </div>

          {/* 风险评估 */}
          <div className="detail-section-title">⚠️ 风险评估</div>
          <div className="stat-cards">
            <div className="stat-box">
              <div className="label">最大回撤</div>
              <div className="value danger">{stats.max_drawdown}%</div>
              <div className="hint-text">{stats.max_drawdown > 20 ? '高风险' : stats.max_drawdown > 10 ? '中等风险' : '低风险'}</div>
            </div>
            <div className="stat-box">
              <div className="label">年化波动率</div>
              <div className="value">{stats.annualized_volatility}%</div>
            </div>
            <div className="stat-box">
              <div className="label">夏普比率</div>
              <div className={`value ${stats.sharpe_ratio >= 1 ? 'success' : stats.sharpe_ratio >= 0 ? 'warning' : 'danger'}`}>
                {stats.sharpe_ratio}
              </div>
              <div className="hint-text">{stats.sharpe_ratio >= 1 ? '优秀' : stats.sharpe_ratio >= 0 ? '一般' : '较差'}</div>
            </div>
            <div className="stat-box">
              <div className="label">RSI (14日)</div>
              <div className={`value ${stats.rsi > 70 ? 'danger' : stats.rsi < 30 ? 'success' : ''}`}>
                {stats.rsi}
              </div>
              <div className="hint-text">{stats.rsi > 70 ? '超买' : stats.rsi < 30 ? '超卖' : '正常'}</div>
            </div>
          </div>

          {/* 均线系统 */}
          <div className="detail-section-title">📈 均线系统</div>
          <div className="stat-cards">
            <div className="stat-box">
              <div className="label">MA5 (5日均线)</div>
              <div className="value primary">¥{stats.ma5.toFixed(2)}</div>
              <div className="hint-text">{stats.latest_price > stats.ma5 ? '当前价格 > MA5' : '当前价格 < MA5'}</div>
            </div>
            <div className="stat-box">
              <div className="label">MA10 (10日均线)</div>
              <div className="value">¥{stats.ma10.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="label">MA20 (20日均线)</div>
              <div className="value">¥{stats.ma20.toFixed(2)}</div>
            </div>
            <div className="stat-box">
              <div className="label">均线趋势</div>
              <div className={`value ${stats.trend === '多头排列' ? 'success' : stats.trend === '空头排列' ? 'danger' : 'warning'}`}>
                {stats.trend}
              </div>
            </div>
          </div>

          {/* 支撑阻力 */}
          <div className="detail-section-title">🎯 支撑与阻力</div>
          <div className="stat-cards">
            <div className="stat-box">
              <div className="label">支撑位</div>
              <div className="value success">¥{stats.support.toFixed(2)}</div>
              <div className="hint-text">近期低点支撑</div>
            </div>
            <div className="stat-box">
              <div className="label">阻力位</div>
              <div className="value danger">¥{stats.resistance.toFixed(2)}</div>
              <div className="hint-text">近期高点阻力</div>
            </div>
            <div className="stat-box">
              <div className="label">量能比</div>
              <div className={`value ${stats.volume_ratio > 1.2 ? 'success' : stats.volume_ratio < 0.8 ? 'danger' : ''}`}>
                {stats.volume_ratio}x
              </div>
              <div className="hint-text">{stats.volume_ratio > 1.2 ? '放量' : stats.volume_ratio < 0.8 ? '缩量' : '正常'}</div>
            </div>
          </div>

          {/* 当日预判 */}
          <div className="detail-section-title">🔮 当日预判</div>
          <div className="stat-cards">
            <div className="stat-box">
              <div className="label">预测最高价</div>
              <div className="value danger">¥{stats.predicted_high.toFixed(2)}</div>
              <div className="hint-text">基于ATR模型估算</div>
            </div>
            <div className="stat-box">
              <div className="label">预测最低价</div>
              <div className="value success">¥{stats.predicted_low.toFixed(2)}</div>
              <div className="hint-text">基于ATR模型估算</div>
            </div>
            <div className="stat-box">
              <div className="label">ATR波幅</div>
              <div className="value">{stats.atr.toFixed(2)}</div>
              <div className="hint-text">平均真实波幅</div>
            </div>
          </div>

          {/* 安全线与止损 */}
          <div className="detail-section-title">🛡️ 安全线与止损</div>
          <div className="stat-cards">
            <div className="stat-box">
              <div className="label">最佳安全线</div>
              <div className="value success">¥{stats.safety_line.toFixed(2)}</div>
              <div className="hint-text">建议买入价，支撑位+2%</div>
            </div>
            <div className="stat-box">
              <div className="label">止损线</div>
              <div className="value danger">¥{stats.stop_loss.toFixed(2)}</div>
              <div className="hint-text">破位止损，支撑位-3%</div>
            </div>
            <div className="stat-box">
              <div className="label">盈亏比</div>
              <div className="value">
                {(((stats.resistance - stats.safety_line) / (stats.safety_line - stats.stop_loss)) || 0).toFixed(2)}:1
              </div>
              <div className="hint-text">预期收益/风险</div>
            </div>
          </div>

          {/* 买卖建议 */}
          <div className="detail-section-title">💡 操作建议</div>
          <div className="action-suggestion-card">
            <div className="action-header">
              <span className={`action-badge ${stats.action_color}`}>
                {stats.action}
              </span>
              <span className="action-score">综合评分: {stats.score}分</span>
            </div>
            <div className="action-reason">{stats.reason}</div>
            <div className="action-tips">
              <div className="tip-item">
                <span className="tip-icon">💰</span>
                <span>建议买入价: <strong>¥{stats.safety_line.toFixed(2)}</strong></span>
              </div>
              <div className="tip-item">
                <span className="tip-icon">🎯</span>
                <span>目标价位: <strong>¥{stats.resistance.toFixed(2)}</strong></span>
              </div>
              <div className="tip-item">
                <span className="tip-icon">🛑</span>
                <span>止损价位: <strong>¥{stats.stop_loss.toFixed(2)}</strong></span>
              </div>
            </div>
            <div className="action-disclaimer">
              ⚠️ 以上分析基于技术指标计算，仅供参考，不构成投资建议。股市有风险，投资需谨慎。
            </div>
          </div>
        </div>
      )}
      
      <div className="quick-actions">
        <h3>快捷操作</h3>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => setCurrentMenu('stockManage')}>
            <span className="icon">🐴</span>
            <span>管理小马</span>
          </button>
          <button className="action-btn" onClick={() => setCurrentMenu('dataEntry')}>
            <span className="icon">📝</span>
            <span>录入数据</span>
          </button>
          <button className="action-btn" onClick={() => setCurrentMenu('dataView')}>
            <span className="icon">📈</span>
            <span>查看数据</span>
          </button>
          <button className="action-btn" onClick={() => setCurrentMenu('aiAnalysis')}>
            <span className="icon">🤖</span>
            <span>AI分析</span>
          </button>
        </div>
      </div>
    </div>
  )

  // 渲染小马管理
  const renderStockManage = () => {
    const handleExportStocks = () => {
      if (stocks.length === 0) {
        toast.warning('没有可导出的小马数据')
        return
      }
      const result = exportStockList(stocks)
      if (result.success) {
        toast.success(`成功导出 ${result.rows} 条小马数据`)
      } else {
        toast.error('导出失败：' + result.error)
      }
    }
    
    return (
    <div className="page-content">
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <h3>添加小马</h3>
          <button onClick={handleExportStocks} className="btn-secondary" style={{
            padding: '6px 12px',
            fontSize: '13px',
            borderRadius: '4px',
            border: '1px solid #1890ff',
            background: '#fff',
            color: '#1890ff',
            cursor: 'pointer'
          }}>
            📥 导出列表
          </button>
        </div>
        <form onSubmit={handleAddStock} className="inline-form">
          <div className="form-item">
            <label>小马代码</label>
            <input
              type="text"
              value={stockForm.code}
              onChange={handleStockCodeChange}
              required
              placeholder="输入6位代码自动查询"
            />
          </div>
          <div className="form-item">
            <label>小马名称</label>
            <input
              type="text"
              value={stockForm.name}
              onChange={(e) => setStockForm({...stockForm, name: e.target.value})}
              onBlur={(e) => handleNameSearch(e.target.value)}
              placeholder="输入名称自动查询"
            />
          </div>
          <div className="form-item">
            <label>市场类型</label>
            <select
              value={stockForm.market}
              onChange={(e) => setStockForm({...stockForm, market: e.target.value})}
            >
              <option value="财神">财神</option>
              <option value="港股">港股</option>
              <option value="美股">美股</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={stockSearchLoading}>
            {stockSearchLoading ? '查询中...' : '添加'}
          </button>
        </form>
        {stockSearchResult && <div className="alert" style={{marginTop: '12px'}}>{stockSearchResult}</div>}
        
        {/* 小马信息预览 */}
        {stockPreview && (
          <div className="stock-preview-card">
            <div className="preview-header">
              <span className="preview-name">{stockPreview.name}</span>
              <span className="preview-code">{stockPreview.code}</span>
              <span className={`preview-tag ${stockPreview.market === '财神' ? 'tag-blue' : stockPreview.market === '港股' ? 'tag-orange' : 'tag-red'}`}>
                {stockPreview.market}
              </span>
            </div>
            <div className="preview-main">
              <div className="preview-price">
                <span className="price-value">¥{stockPreview.latest_price?.toFixed(2)}</span>
                <span className={`price-change ${stockPreview.change_percent?.startsWith('+') ? 'up' : 'down'}`}>
                  {stockPreview.change_percent}
                </span>
              </div>
              <div className="preview-details">
                <div className="detail-item">
                  <div className="detail-label">最高</div>
                  <div className="detail-value">{stockPreview.high?.toFixed(2)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">最低</div>
                  <div className="detail-value">{stockPreview.low?.toFixed(2)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">成交量</div>
                  <div className="detail-value">{stockPreview.volume || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>小马列表</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>代码</th>
              <th>名称</th>
              <th>市场</th>
              <th>所属板块</th>
              <th>最新消息</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map(stock => {
              const detail = stockDetails[stock.id]
              return (
                <tr key={stock.id}>
                  <td>{stock.id}</td>
                  <td>{stock.code}</td>
                  <td>{stock.name}</td>
                  <td><span className="tag">{stock.market}</span></td>
                  <td>
                    {detail?.sectors ? (
                      <div className="sector-tags">
                        {detail.sectors.map((sector, i) => (
                          <span key={i} className="sector-tag">{sector}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="loading-text" onClick={() => handleLoadStockDetails(stock.id)}>
                        点击加载
                      </span>
                    )}
                  </td>
                  <td className="news-cell">
                    {detail?.latest_news ? detail.latest_news : (
                      <span className="loading-text" onClick={() => handleLoadStockDetails(stock.id)}>
                        点击加载
                      </span>
                    )}
                  </td>
                  <td>
                    <button className="btn-danger btn-sm" onClick={() => handleDeleteStock(stock.id)}>
                      删除
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
  }

  // 渲染数据录入
  const renderDataEntry = () => (
    <div className="page-content">
      {/* 更新所有小马数据 */}
      <div className="card">
        <h3>🔄 更新所有小马数据</h3>
        <p className="text-muted">一键获取所有小马的最新60天交易数据，自动过滤已存在的日期，并校验数据准确性，修正不准确的数据</p>
        <div className="form-row">
          <button className="btn-primary" onClick={handleUpdateAllStocks} disabled={updateAllLoading} style={{padding: '12px 32px', fontSize: '15px'}}>
            {updateAllLoading ? '⏳ 更新中...' : '🚀 开始更新所有小马'}
          </button>
          <div className="hint-text" style={{marginLeft: '12px', alignSelf: 'center'}}>
            数据来源：腾讯财经API（前复权）
          </div>
        </div>
        {updateAllResult && (
          <div className="alert" style={{marginTop: '16px', whiteSpace: 'pre-line'}}>
            {updateAllResult}
          </div>
        )}
      </div>

      {/* 批量导入数据 */}
      <div className="card">
        <h3>📦 批量导入历史数据</h3>
        <div className="form-row">
          <div className="form-item">
            <label>选择小马</label>
            <select value={selectedStock} onChange={(e) => setSelectedStock(e.target.value)}>
              <option value="">请选择</option>
              {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>
          <div className="form-item">
            <label>开始日期</label>
            <input type="date" value={dateRange.start_date} onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})} />
          </div>
          <div className="form-item">
            <label>结束日期</label>
            <input type="date" value={dateRange.end_date} onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})} />
          </div>
          <button className="btn-success" onClick={handleBatchFetch} disabled={batchLoading}>
            {batchLoading ? '获取中...' : '🔍 批量导入'}
          </button>
        </div>
        {batchResult && <div className="alert" style={{marginTop: '12px'}}>{batchResult}</div>}
      </div>

      {/* Excel/CSV文件导入 */}
      <div className="card">
        <h3>📄 Excel/CSV文件导入</h3>
        <p className="text-muted">支持从Excel或CSV文件批量导入小马行情数据，自动识别小码代码</p>
        
        <div style={{display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center'}}>
          <button 
            onClick={handleDownloadTemplate}
            className="btn-secondary"
            style={{padding: '8px 16px'}}
          >
            📥 下载导入模板
          </button>
          <span style={{fontSize: '13px', color: '#999'}}>
            文件格式要求：包含 date, open, high, low, close, volume 列
          </span>
        </div>
        
        <form onSubmit={handleFileImport}>
          <div className="form-row">
            <div className="form-item" style={{flex: 1}}>
              <label>选择文件（CSV或Excel）</label>
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files[0])}
                style={{padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
              />
            </div>
            <button 
              type="submit"
              className="btn-primary"
              disabled={importLoading || !importFile}
              style={{alignSelf: 'flex-end', padding: '8px 24px'}}
            >
              {importLoading ? '⏳ 导入中...' : '🚀 开始导入'}
            </button>
          </div>
        </form>
        
        {importResult && (
          <div className="alert" style={{marginTop: '12px', whiteSpace: 'pre-line'}}>
            {importResult}
          </div>
        )}
      </div>
    </div>
  )

  // 渲染数据查看
  const renderDataView = () => {
    const stockName = stocks.find(s => s.id === Number(selectedStock))?.name || ''
    
    const handleExportPrices = () => {
      if (priceList.length === 0) {
        toast.warning('没有可导出的数据')
        return
      }
      const result = exportPriceData(priceList, stockName)
      if (result.success) {
        toast.success(`成功导出 ${result.rows} 条数据`)
      } else {
        toast.error('导出失败：' + result.error)
      }
    }
    
    if (!selectedStock) {
      return (
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <h3>历史数据</h3>
              <div className="filter-group">
                <select value={selectedStock} onChange={(e) => setSelectedStock(e.target.value)} className="select-inline">
                  <option value="">选择小马</option>
                  {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
                <input 
                  type="date" 
                  value={priceRange.start_date} 
                  onChange={(e) => setPriceRange({...priceRange, start_date: e.target.value})} 
                  className="select-inline"
                  placeholder="开始日期"
                />
                <input 
                  type="date" 
                  value={priceRange.end_date} 
                  onChange={(e) => setPriceRange({...priceRange, end_date: e.target.value})} 
                  className="select-inline"
                  placeholder="结束日期"
                />
              </div>
            </div>
            <div className="empty-state">请先选择小马查看历史数据</div>
          </div>
        </div>
      )
    }

    return (
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <h3>历史数据</h3>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              <button onClick={handleExportPrices} className="btn-secondary" style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '4px',
                border: '1px solid #1890ff',
                background: '#fff',
                color: '#1890ff',
                cursor: 'pointer'
              }}>
                📥 导出CSV
              </button>
              <button onClick={() => loadPriceData(true)} className="btn-secondary" style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '4px',
                border: '1px solid #1890ff',
                background: '#fff',
                color: '#1890ff',
                cursor: 'pointer'
              }}>
                🔄 刷新
              </button>
            </div>
            <div className="filter-group">
              <select value={selectedStock} onChange={(e) => setSelectedStock(e.target.value)} className="select-inline">
                <option value="">选择小马</option>
                {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
              <input 
                type="date" 
                value={priceRange.start_date} 
                onChange={(e) => setPriceRange({...priceRange, start_date: e.target.value})} 
                className="select-inline"
                placeholder="开始日期"
              />
              <input 
                type="date" 
                value={priceRange.end_date} 
                onChange={(e) => setPriceRange({...priceRange, end_date: e.target.value})} 
                className="select-inline"
                placeholder="结束日期"
              />
            </div>
          </div>
          {loading ? (
            <div className="empty-state">加载中...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>开盘</th>
                  <th>最高</th>
                  <th>最低</th>
                  <th>收盘</th>
                  <th>成交量</th>
                </tr>
              </thead>
              <tbody>
                {priceList.length === 0 ? (
                  <tr><td colSpan="6" className="empty">暂无数据</td></tr>
                ) : priceList.map((p, i) => {
                  const isUp = p.close >= p.open
                  return (
                    <tr key={i}>
                      <td>{p.date}</td>
                      <td className={isUp ? 'up' : 'down'}>{p.open.toFixed(2)}</td>
                      <td className={isUp ? 'up' : 'down'}>{p.high.toFixed(2)}</td>
                      <td className={isUp ? 'up' : 'down'}>{p.low.toFixed(2)}</td>
                      <td className={isUp ? 'up' : 'down'}><strong>{p.close.toFixed(2)}</strong></td>
                      <td>{p.volume.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  // 渲染统计分析
  const renderStatistics = () => {
    const stockName = stocks.find(s => s.id === Number(selectedStock))?.name || ''
    
    const handleExportStats = () => {
      if (!stats) {
        toast.warning('没有可导出的统计数据')
        return
      }
      const result = exportStatsData(stats, stockName)
      if (result.success) {
        toast.success(`成功导出统计数据`)
      } else {
        toast.error('导出失败：' + result.error)
      }
    }
    
    // 如果没有选择小马，显示空状态
    if (!selectedStock) {
      return (
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <h3>统计分析</h3>
              <select value={selectedStock} onChange={(e) => setSelectedStock(e.target.value)} className="select-inline">
                <option value="">选择小马</option>
                {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
            </div>
            <div className="empty-state">请先选择小马查看统计数据</div>
          </div>
        </div>
      )
    }

    // 如果正在加载或数据为空，显示加载状态
    if (statsLoading || !stats) {
      return (
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <h3>统计分析</h3>
              <select value={selectedStock} onChange={(e) => setSelectedStock(e.target.value)} className="select-inline">
                <option value="">选择小马</option>
                {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
            </div>
            <div className="empty-state" style={{padding: '80px 0'}}>
              <div style={{fontSize: '48px', marginBottom: '16px'}}>⏳</div>
              <p style={{fontSize: '16px', color: '#666'}}>
                {statsLoading ? '正在加载统计数据...' : '暂无数据，请先录入小马价格数据'}
              </p>
            </div>
          </div>
        </div>
      )
    }

    const returnColor = stats.total_return >= 0 ? 'success' : 'danger'
    const sharpeColor = stats.sharpe_ratio >= 1 ? 'success' : stats.sharpe_ratio >= 0 ? 'warning' : 'danger'

    return (
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <h3>统计分析 - {stats.stock_name}({stats.stock_code})</h3>
            <div className="analysis-type-badge" style={{
              background: '#f0f0f0',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '13px',
              color: '#666'
            }}>
              📊 技术面分析 · 短期交易信号
            </div>
            <div style={{
              background: '#e6f7ff',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#1890ff',
              display: 'inline-block',
              marginLeft: '8px'
            }}>
              📡 数据源：腾讯财经 + 新浪财经
            </div>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              <button onClick={handleExportStats} className="btn-secondary" style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '4px',
                border: '1px solid #1890ff',
                background: '#fff',
                color: '#1890ff',
                cursor: 'pointer'
              }}>
                📥 导出CSV
              </button>
              <button onClick={() => loadStats(true)} className="btn-secondary" style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '4px',
                border: '1px solid #1890ff',
                background: '#fff',
                color: '#1890ff',
                cursor: 'pointer'
              }}>
                🔄 刷新
              </button>
            </div>
            <select value={selectedStock} onChange={(e) => setSelectedStock(e.target.value)} className="select-inline">
              {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>

          {/* 标签切换 */}
          <div className="stats-tabs">
            <div className={`tab-item ${statsActiveTab === 'overview' ? 'active' : ''}`} onClick={() => setStatsActiveTab('overview')}>
              综合评级
            </div>
            <div className={`tab-item ${statsActiveTab === 'returns' ? 'active' : ''}`} onClick={() => setStatsActiveTab('returns')}>
              收益分析
            </div>
            <div className={`tab-item ${statsActiveTab === 'risk' ? 'active' : ''}`} onClick={() => setStatsActiveTab('risk')}>
              风险评估
            </div>
            <div className={`tab-item ${statsActiveTab === 'tech' ? 'active' : ''}`} onClick={() => setStatsActiveTab('tech')}>
              技术指标
            </div>
            <div className={`tab-item ${statsActiveTab === 'ma' ? 'active' : ''}`} onClick={() => setStatsActiveTab('ma')}>
              均线系统
            </div>
            <div className={`tab-item ${statsActiveTab === 'volume' ? 'active' : ''}`} onClick={() => setStatsActiveTab('volume')}>
              量价分析
            </div>
            <div className={`tab-item ${statsActiveTab === 'distribution' ? 'active' : ''}`} onClick={() => setStatsActiveTab('distribution')}>
              收益分布
            </div>
            <div className={`tab-item ${statsActiveTab === 'quality' ? 'active' : ''}`} onClick={() => setStatsActiveTab('quality')}>
              🔍 数据质量
            </div>
          </div>

          {/* 综合评级 */}
          {statsActiveTab === 'overview' && (
            <div className="stats-grid">
              <div className="rating-card">
                <div className="rating-header">
                  <span className={`rating-badge ${stats.rating_color}`}>{stats.rating}</span>
                  <span className="rating-score">{stats.grade_score}分 / 100分</span>
                </div>
                <div className="rating-bars">
                  <div className="rating-bar-item">
                    <span className="rating-bar-label">收益因子</span>
                    <div className="rating-bar-bg">
                      <div className="rating-bar-fill" style={{width: `${(stats.annualized_return > 20 ? 25 : stats.annualized_return > 10 ? 20 : stats.annualized_return > 0 ? 10 : 0) / 25 * 100}%`}}></div>
                    </div>
                    <span className="rating-bar-value">{stats.annualized_return}%</span>
                  </div>
                  <div className="rating-bar-item">
                    <span className="rating-bar-label">风险收益因子</span>
                    <div className="rating-bar-bg">
                      <div className="rating-bar-fill" style={{width: `${(stats.sharpe_ratio > 1.5 ? 25 : stats.sharpe_ratio > 1 ? 20 : stats.sharpe_ratio > 0.5 ? 10 : 0) / 25 * 100}%`}}></div>
                    </div>
                    <span className="rating-bar-value">{stats.sharpe_ratio}</span>
                  </div>
                  <div className="rating-bar-item">
                    <span className="rating-bar-label">趋势因子</span>
                    <div className="rating-bar-bg">
                      <div className="rating-bar-fill" style={{width: `${(stats.macd_signal === '金叉' && stats.trend === '多头排列' ? 25 : stats.macd_signal === '金叉' || stats.trend === '多头排列' ? 15 : 0) / 25 * 100}%`}}></div>
                    </div>
                    <span className="rating-bar-value">{stats.macd_signal} / {stats.trend}</span>
                  </div>
                  <div className="rating-bar-item">
                    <span className="rating-bar-label">超买超卖因子</span>
                    <div className="rating-bar-bg">
                      <div className="rating-bar-fill" style={{width: `${(stats.rsi > 30 && stats.rsi < 70 ? 25 : stats.rsi < 30 ? 20 : stats.rsi < 80 ? 10 : 0) / 25 * 100}%`}}></div>
                    </div>
                    <span className="rating-bar-value">RSI: {stats.rsi}</span>
                  </div>
                </div>
              </div>
              <div className="stat-box">
                <div className="label">年化收益率</div>
                <div className={`value ${stats.annualized_return >= 0 ? 'success' : 'danger'}`}>
                  {stats.annualized_return >= 0 ? '+' : ''}{stats.annualized_return}%
                </div>
                <div className="hint-text">年化计算 (252交易日)</div>
              </div>
              <div className="stat-box">
                <div className="label">累计收益率</div>
                <div className={`value ${stats.total_return >= 0 ? 'success' : 'danger'}`}>
                  {stats.total_return >= 0 ? '+' : ''}{stats.total_return}%
                </div>
              </div>
              <div className="stat-box">
                <div className="label">数据天数</div>
                <div className="value">{stats.data_points}</div>
              </div>
            </div>
          )}

          {/* 收益率分析 */}
          {statsActiveTab === 'returns' && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="label">年化收益率</div>
                <div className={`value ${stats.annualized_return >= 0 ? 'success' : 'danger'}`}>
                  {stats.annualized_return >= 0 ? '+' : ''}{stats.annualized_return}%
                </div>
                <div className="hint-text">年化计算 (252交易日)</div>
              </div>
              <div className="stat-box">
                <div className="label">累计收益率</div>
                <div className={`value ${returnColor}`}>{stats.total_return >= 0 ? '+' : ''}{stats.total_return}%</div>
              </div>
              <div className="stat-box">
                <div className="label">近20日收益</div>
                <div className={`value ${stats.return_20d >= 0 ? 'success' : 'danger'}`}>
                  {stats.return_20d >= 0 ? '+' : ''}{stats.return_20d}%
                </div>
              </div>
              <div className="stat-box">
                <div className="label">上涨天数</div>
                <div className="value success">{stats.up_days}天</div>
              </div>
              <div className="stat-box">
                <div className="label">下跌天数</div>
                <div className="value danger">{stats.down_days}天</div>
              </div>
              <div className="stat-box">
                <div className="label">胜率</div>
                <div className="value">{stats.win_rate}%</div>
              </div>
              <div className="stat-box">
                <div className="label">平均盈利</div>
                <div className="value success">{stats.avg_gain}%</div>
              </div>
              <div className="stat-box">
                <div className="label">平均亏损</div>
                <div className="value danger">{stats.avg_loss}%</div>
              </div>
              <div className="stat-box">
                <div className="label">盈亏比</div>
                <div className={`value ${stats.gain_loss_ratio > 1 ? 'success' : 'danger'}`}>
                  {stats.gain_loss_ratio}:1
                </div>
                <div className="hint-text">平均盈利/平均亏损</div>
              </div>
              <div className="stat-box">
                <div className="label">盈利因子</div>
                <div className={`value ${stats.profit_factor > 1 ? 'success' : 'danger'}`}>
                  {stats.profit_factor}
                </div>
                <div className="hint-text">总盈利/总亏损 ({'>'}1盈利)</div>
              </div>
              <div className="stat-box">
                <div className="label">最大连涨</div>
                <div className="value success">{stats.max_consecutive_up}天</div>
              </div>
              <div className="stat-box">
                <div className="label">最大连跌</div>
                <div className="value danger">{stats.max_consecutive_down}天</div>
              </div>
              <div className="stat-box full-width">
                <div className="label">最近10天日收益率</div>
                <div className="return-chart">
                  {(() => {
                    const maxAbs = Math.max(...stats.daily_returns.map(r => Math.abs(r.return)), 1)
                    return stats.daily_returns.map((item, i) => (
                      <div key={i} className={`return-bar ${item.return >= 0 ? 'up' : 'down'}`}>
                        <div className="bar" style={{height: `${(Math.abs(item.return) / maxAbs) * 60}px`}}></div>
                        <div className="bar-label">{item.return >= 0 ? '+' : ''}{item.return}%</div>
                        <div className="bar-date">{(() => {
                          const d = new Date(item.date)
                          const month = String(d.getMonth() + 1).padStart(2, '0')
                          const day = String(d.getDate()).padStart(2, '0')
                          return `${month}-${day}`
                        })()}</div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* 风险评估 */}
          {statsActiveTab === 'risk' && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="label">日波动率</div>
                <div className="value warning">{(stats.volatility * 100).toFixed(2)}%</div>
              </div>
              <div className="stat-box">
                <div className="label">年化波动率</div>
                <div className="value">{stats.annualized_volatility}%</div>
                <div className="hint-text">{stats.annualized_volatility > 30 ? '高波动' : stats.annualized_volatility > 15 ? '中波动' : '低波动'}</div>
              </div>
              <div className="stat-box">
                <div className="label">最大回撤</div>
                <div className="value danger">{stats.max_drawdown}%</div>
              </div>
              <div className="stat-box">
                <div className="label">VaR (95%)</div>
                <div className="value danger">{stats.var_95}%</div>
                <div className="hint-text">95%置信度最大日亏损</div>
              </div>
              <div className="stat-box">
                <div className="label">VaR (99%)</div>
                <div className="value danger">{stats.var_99}%</div>
                <div className="hint-text">99%置信度最大日亏损</div>
              </div>
              <div className="stat-box">
                <div className="label">CVaR (95%)</div>
                <div className="value danger">{stats.cvar_95}%</div>
                <div className="hint-text">极端情况下预期亏损</div>
              </div>
              <div className="stat-box">
                <div className="label">夏普比率</div>
                <div className={`value ${sharpeColor}`}>{stats.sharpe_ratio}</div>
                <div className="hint-text">{stats.sharpe_ratio >= 1 ? '优秀' : stats.sharpe_ratio >= 0.5 ? '一般' : '较差'}</div>
              </div>
              <div className="stat-box">
                <div className="label">卡玛比率</div>
                <div className={`value ${stats.calmar_ratio > 1 ? 'success' : stats.calmar_ratio > 0.5 ? 'warning' : 'danger'}`}>
                  {stats.calmar_ratio}
                </div>
                <div className="hint-text">年化收益/最大回撤 ({'>'}1优秀)</div>
              </div>
              <div className="stat-box">
                <div className="label">索提诺比率</div>
                <div className={`value ${stats.sortino_ratio > 1 ? 'success' : stats.sortino_ratio > 0.5 ? 'warning' : 'danger'}`}>
                  {stats.sortino_ratio}
                </div>
                <div className="hint-text">仅用下行风险 (优于夏普)</div>
              </div>
            </div>
          )}

          {/* 技术指标 */}
          {statsActiveTab === 'tech' && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="label">MACD - DIF</div>
                <div className={`value ${stats.macd_dif > 0 ? 'success' : 'danger'}`}>{stats.macd_dif.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">MACD - DEA</div>
                <div className={`value ${stats.macd_dea > 0 ? 'success' : 'danger'}`}>{stats.macd_dea.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">MACD 信号</div>
                <div className={`value ${stats.macd_signal === '金叉' ? 'success' : 'danger'}`}>{stats.macd_signal}</div>
                <div className="hint-text">{stats.macd_signal === '金叉' ? 'DIF上穿DEA，买入信号' : 'DIF下穿DEA，卖出信号'}</div>
              </div>
              <div className="stat-box">
                <div className="label">KDJ - K值</div>
                <div className={`value ${stats.kdj_k > 80 ? 'danger' : stats.kdj_k < 20 ? 'success' : ''}`}>{stats.kdj_k}</div>
              </div>
              <div className="stat-box">
                <div className="label">KDJ - D值</div>
                <div className={`value ${stats.kdj_d > 80 ? 'danger' : stats.kdj_d < 20 ? 'success' : ''}`}>{stats.kdj_d}</div>
              </div>
              <div className="stat-box">
                <div className="label">KDJ - J值</div>
                <div className={`value ${stats.kdj_j > 100 ? 'danger' : stats.kdj_j < 0 ? 'success' : ''}`}>{stats.kdj_j}</div>
                <div className="hint-text">{stats.kdj_j > 80 ? '超买' : stats.kdj_j < 20 ? '超卖' : '正常'}</div>
              </div>
              <div className="stat-box">
                <div className="label">布林带 - 上轨</div>
                <div className="value">¥{stats.bb_upper.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">布林带 - 中轨</div>
                <div className="value">¥{stats.bb_middle.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">布林带 - 下轨</div>
                <div className="value">¥{stats.bb_lower.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">布林带宽度</div>
                <div className="value">{stats.bb_width}%</div>
                <div className="hint-text">{stats.bb_width > 20 ? '宽幅震荡' : stats.bb_width > 10 ? '正常' : '窄幅震荡'}</div>
              </div>
              <div className="stat-box">
                <div className="label">价格位置</div>
                <div className={`value ${stats.price_vs_bb === '上轨外' ? 'danger' : stats.price_vs_bb === '下轨外' ? 'success' : ''}`}>
                  {stats.price_vs_bb}
                </div>
                <div className="hint-text">当前价格¥{stats.latest_price.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">RSI (14日)</div>
                <div className={`value ${stats.rsi > 70 ? 'danger' : stats.rsi < 30 ? 'success' : ''}`}>{stats.rsi}</div>
                <div className="hint-text">{stats.rsi > 70 ? '超买区' : stats.rsi < 30 ? '超卖区' : '正常区'}</div>
              </div>
            </div>
          )}

          {/* 均线系统 */}
          {statsActiveTab === 'ma' && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="label">MA5（5日均线）</div>
                <div className="value primary">¥{stats.ma5.toFixed(2)}</div>
                <div className="hint-text">{stats.latest_price > stats.ma5 ? '当前价格在均线上方' : '当前价格在均线下方'}</div>
              </div>
              <div className="stat-box">
                <div className="label">MA10（10日均线）</div>
                <div className="value">¥{stats.ma10.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">MA20（20日均线）</div>
                <div className="value">¥{stats.ma20.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="label">均线趋势</div>
                <div className={`value ${stats.ma5 > stats.ma10 && stats.ma10 > stats.ma20 ? 'success' : 'danger'}`}>
                  {stats.ma5 > stats.ma10 && stats.ma10 > stats.ma20 ? '多头排列' : '空头排列'}
                </div>
              </div>
            </div>
          )}

          {/* 成交量分析 */}
          {statsActiveTab === 'volume' && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="label">总成交量</div>
                <div className="value">{stats.total_volume.toLocaleString()}</div>
              </div>
              <div className="stat-box">
                <div className="label">平均成交量</div>
                <div className="value">{stats.average_volume.toLocaleString()}</div>
              </div>
              <div className="stat-box">
                <div className="label">近5日均量</div>
                <div className="value">{stats.recent_volume.toLocaleString()}</div>
              </div>
              <div className="stat-box">
                <div className="label">量能比</div>
                <div className={`value ${stats.volume_ratio > 1.2 ? 'success' : stats.volume_ratio < 0.8 ? 'danger' : ''}`}>
                  {stats.volume_ratio}x
                </div>
                <div className="hint-text">
                  {stats.volume_ratio > 1.2 ? '放量' : stats.volume_ratio < 0.8 ? '缩量' : '正常'}
                </div>
              </div>
            </div>
          )}

          {/* 收益分布 */}
          {statsActiveTab === 'distribution' && (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="label">偏度 (Skewness)</div>
                <div className={`value ${stats.skewness > 0.5 ? 'success' : stats.skewness < -0.5 ? 'danger' : ''}`}>
                  {stats.skewness.toFixed(3)}
                </div>
                <div className="hint-text">{stats.skewness > 0.5 ? '右偏分布，大涨概率高' : stats.skewness < -0.5 ? '左偏分布，大跌概率高' : '近似对称分布'}</div>
              </div>
              <div className="stat-box">
                <div className="label">峰度 (Kurtosis)</div>
                <div className={`value ${stats.kurtosis > 3 ? 'danger' : stats.kurtosis < -1 ? 'success' : ''}`}>
                  {stats.kurtosis.toFixed(3)}
                </div>
                <div className="hint-text">{stats.kurtosis > 3 ? '尖峰厚尾，极端行情多' : stats.kurtosis < -1 ? '低峰薄尾，极端行情少' : '近似正态分布'}</div>
              </div>
              <div className="stat-box">
                <div className="label">平均盈利</div>
                <div className="value success">{stats.avg_gain}%</div>
              </div>
              <div className="stat-box">
                <div className="label">平均亏损</div>
                <div className="value danger">{stats.avg_loss}%</div>
              </div>
              <div className="stat-box">
                <div className="label">盈亏比</div>
                <div className={`value ${stats.gain_loss_ratio > 1 ? 'success' : 'danger'}`}>  
                  {stats.gain_loss_ratio}:1
                </div>
              </div>
              <div className="stat-box">
                <div className="label">盈利因子</div>
                <div className={`value ${stats.profit_factor > 1 ? 'success' : 'danger'}`}>
                  {stats.profit_factor}
                </div>
                <div className="hint-text">总盈利/总亏损 ({'>'}1盈利)</div>
              </div>
              <div className="stat-box">
                <div className="label">最大连涨天数</div>
                <div className="value success">{stats.max_consecutive_up}天</div>
              </div>
              <div className="stat-box">
                <div className="label">最大连跌天数</div>
                <div className="value danger">{stats.max_consecutive_down}天</div>
              </div>
            </div>
          )}

          {/* 数据质量 */}
          {statsActiveTab === 'quality' && (
            <div>
              {/* 预警管理 */}
              <div style={{marginBottom: '24px', padding: '16px', background: '#f0f5ff', borderRadius: '8px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                  <h4 style={{margin: 0, fontSize: '15px', color: '#333'}}>🔔 智能预警</h4>
                  <button 
                    onClick={() => setShowAlertModal(true)}
                    className="btn-primary"
                    style={{padding: '6px 16px', fontSize: '13px'}}
                  >
                    + 添加预警
                  </button>
                </div>
                
                {/* 当前小马的预警列表 */}
                {alerts.filter(a => a.stock_id === Number(selectedStock)).length === 0 ? (
                  <p style={{color: '#999', fontSize: '13px', margin: 0}}>暂无预警规则，点击上方按钮添加</p>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {alerts.filter(a => a.stock_id === Number(selectedStock)).map(alert => (
                      <div key={alert.id} style={{
                        padding: '10px 12px',
                        background: '#fff',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid #e0e0e0'
                      }}>
                        <div>
                          <span style={{fontSize: '13px', fontWeight: 'bold', marginRight: '8px'}}>
                            {alert.alert_type === 'price' ? '💰 价格' : alert.alert_type === 'volume' ? '📊 成交量' : '📈 指标'}
                          </span>
                          <span style={{fontSize: '13px', color: '#666'}}>
                            {alert.condition === 'above' ? '高于' : alert.condition === 'below' ? '低于' : '等于'} ¥{alert.threshold}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDeleteAlert(alert.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ff4d4f',
                            cursor: 'pointer',
                            fontSize: '18px',
                            padding: '0 4px'
                          }}
                          title="删除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* K线形态识别 */}
              <div style={{marginBottom: '24px', padding: '16px', background: '#fff7e6', borderRadius: '8px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                  <h4 style={{margin: 0, fontSize: '15px', color: '#333'}}>📊 K线形态识别</h4>
                  {patternsData && (
                    <span style={{fontSize: '12px', color: '#999'}}>
                      共识别 {patternsData.summary.total_patterns} 个形态
                    </span>
                  )}
                </div>
                
                {patternsLoading ? (
                  <p style={{color: '#999', fontSize: '13px', margin: 0}}>正在分析K线形态...</p>
                ) : !patternsData || patternsData.error ? (
                  <p style={{color: '#999', fontSize: '13px', margin: 0}}>{patternsData?.error || '无法加载形态数据'}</p>
                ) : patternsData.patterns.length === 0 ? (
                  <p style={{color: '#999', fontSize: '13px', margin: 0}}>未识别到明显K线形态</p>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto'}}>
                    {patternsData.patterns.slice(0, 15).map((pattern, idx) => (
                      <div key={idx} style={{
                        padding: '10px 12px',
                        background: pattern.type === 'bullish' ? '#f6ffed' : 
                                   pattern.type === 'bearish' ? '#fff1f0' : '#f0f5ff',
                        borderLeft: `4px solid ${pattern.type === 'bullish' ? '#52c41a' : pattern.type === 'bearish' ? '#ff4d4f' : '#1890ff'}`,
                        borderRadius: '4px'
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                          <span style={{fontWeight: 'bold', color: '#333', fontSize: '14px'}}>
                            {pattern.pattern}
                          </span>
                          <span style={{fontSize: '12px', color: '#999'}}>
                            {pattern.date}
                          </span>
                        </div>
                        <div style={{fontSize: '13px', color: '#666', marginBottom: '4px'}}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            background: pattern.confidence === '高' ? '#ff4d4f' : '#faad14',
                            color: '#fff',
                            marginRight: '8px'
                          }}>
                            {pattern.signal}
                          </span>
                          置信度: {pattern.confidence}
                        </div>
                        <div style={{fontSize: '12px', color: '#999'}}>
                          {pattern.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {anomaliesLoading ? (
                <div className="empty-state" style={{padding: '40px 0'}}>
                  <div style={{fontSize: '32px', marginBottom: '12px'}}>⏳</div>
                  <p>正在分析数据质量...</p>
                </div>
              ) : !anomaliesData || anomaliesData.error ? (
                <div className="empty-state" style={{padding: '40px 0'}}>
                  <div style={{fontSize: '32px', marginBottom: '12px'}}>⚠️</div>
                  <p>{anomaliesData?.error || '无法加载数据质量信息'}</p>
                </div>
              ) : (
                <div>
                  {/* 异常统计摘要 */}
                  <div className="stats-grid" style={{marginBottom: '24px'}}>
                    <div className="stat-box">
                      <div className="label">总异常数</div>
                      <div className="value">{anomaliesData.summary.total_anomalies}</div>
                    </div>
                    <div className="stat-box">
                      <div className="label">🔴 严重</div>
                      <div className="value danger">{anomaliesData.summary.by_severity.danger}</div>
                    </div>
                    <div className="stat-box">
                      <div className="label">🟡 警告</div>
                      <div className="value warning">{anomaliesData.summary.by_severity.warning}</div>
                    </div>
                    <div className="stat-box">
                      <div className="label">ℹ️ 提示</div>
                      <div className="value">{anomaliesData.summary.by_severity.info}</div>
                    </div>
                  </div>

                  {/* 按类型统计 */}
                  {Object.keys(anomaliesData.summary.by_type).length > 0 && (
                    <div style={{marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px'}}>
                      <h4 style={{margin: '0 0 12px 0', fontSize: '15px', color: '#333'}}>📊 异常类型分布</h4>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                        {Object.entries(anomaliesData.summary.by_type).map(([type, count]) => (
                          <span key={type} style={{
                            padding: '4px 12px',
                            background: '#fff',
                            border: '1px solid #e0e0e0',
                            borderRadius: '16px',
                            fontSize: '13px',
                            color: '#666'
                          }}>
                            {type}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 异常列表 */}
                  {anomaliesData.anomalies.length === 0 ? (
                    <div className="empty-state" style={{padding: '40px 0'}}>
                      <div style={{fontSize: '48px', marginBottom: '16px'}}>✅</div>
                      <p style={{fontSize: '16px', color: '#52c41a', fontWeight: 'bold'}}>数据质量良好，未发现异常</p>
                      <p className="text-muted" style={{marginTop: '8px'}}>所有交易数据均在正常范围内</p>
                    </div>
                  ) : (
                    <div>
                      <h4 style={{margin: '0 0 12px 0', fontSize: '15px', color: '#333'}}>🔍 异常明细（最近{anomaliesData.anomalies.length}条）</h4>
                      <div style={{maxHeight: '600px', overflowY: 'auto'}}>
                        {anomaliesData.anomalies.map((anomaly, idx) => (
                          <div key={idx} style={{
                            padding: '12px 16px',
                            marginBottom: '8px',
                            background: anomaly.severity === 'danger' ? '#fff1f0' : 
                                       anomaly.severity === 'warning' ? '#fffbe6' : '#f0f5ff',
                            borderLeft: `4px solid ${anomaly.severity === 'danger' ? '#ff4d4f' : anomaly.severity === 'warning' ? '#faad14' : '#1890ff'}`,
                            borderRadius: '4px'
                          }}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                              <span style={{fontWeight: 'bold', color: '#333', fontSize: '14px'}}>
                                {anomaly.type}
                              </span>
                              <span style={{fontSize: '12px', color: '#999'}}>
                                {anomaly.date}
                              </span>
                            </div>
                            <div style={{fontSize: '13px', color: '#666'}}>
                              {anomaly.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 渲染龙虎榜页面
  const renderLonghubang = () => (
    <div className="page-content">
      <div className="card">
        <h2>🏆 龙虎榜数据</h2>
        <p className="text-muted">每日龙虎榜上榜小马及买卖席位数据</p>
        
        <div className="form-row" style={{marginBottom: '20px'}}>
          <label>选择日期：</label>
          <input 
            type="date" 
            value={longhubangDate}
            onChange={(e) => setLonghubangDate(e.target.value)}
            className="stock-select"
          />
          <button onClick={loadLonghubangData} className="btn" style={{marginLeft: '12px'}}>🔍 查询</button>
        </div>

        {longhubangLoading ? (
          <div className="empty-state" style={{padding: '60px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>⏳</div>
            <p>正在获取龙虎榜数据...</p>
          </div>
        ) : longhubangData?.error ? (
          <div className="empty-state" style={{padding: '60px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>⚠️</div>
            <p>{longhubangData.error}</p>
          </div>
        ) : longhubangData?.data && longhubangData.data.length > 0 ? (
          <div>
            <div style={{marginBottom: '16px', color: '#666'}}>
              共 {longhubangData.data.length} 条数据 | 日期：{longhubangData.date}
            </div>
            <table className="longhubang-table">
              <thead>
                <tr>
                  <th>小马代码</th>
                  <th>小马名称</th>
                  <th>涨跌幅</th>
                  <th>收盘价</th>
                  <th>龙虎榜净买入</th>
                  <th>买入金额</th>
                  <th>卖出金额</th>
                  <th>成交额</th>
                  <th>上榜原因</th>
                </tr>
              </thead>
              <tbody>
                {longhubangData.data.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.SECURITY_CODE}</td>
                    <td style={{fontWeight: 'bold'}}>{item.SECURITY_NAME_ABBR}</td>
                    <td style={{color: item.CHANGE_RATE >= 0 ? '#f5222d' : '#52c41a', fontWeight: 'bold'}}>
                      {item.CHANGE_RATE >= 0 ? '+' : ''}{item.CHANGE_RATE}%
                    </td>
                    <td>¥{item.CLOSE_PRICE}</td>
                    <td style={{color: item.BILLBOARD_NET_AMT >= 0 ? '#f5222d' : '#52c41a', fontWeight: 'bold'}}>
                      {(item.BILLBOARD_NET_AMT / 100000000).toFixed(2)}亿
                    </td>
                    <td>{(item.BILLBOARD_BUY_AMT / 100000000).toFixed(2)}亿</td>
                    <td>{(item.BILLBOARD_SELL_AMT / 100000000).toFixed(2)}亿</td>
                    <td>{(item.BILLBOARD_DEAL_AMT / 100000000).toFixed(2)}亿</td>
                    <td style={{fontSize: '12px', color: '#666'}}>{item.EXPLANATION}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{padding: '60px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>📊</div>
            <p>请选择日期查询龙虎榜数据</p>
          </div>
        )}
      </div>
    </div>
  )

  // 渲染集合竞价页面
  const renderAuction = () => (
    <div className="page-content">
      <div className="card">
        <h2>⏰ 集合竞价数据</h2>
        <p className="text-muted">9:15-9:25集合竞价数据，捕捉早盘交易机会</p>
        
        <div className="form-row" style={{marginBottom: '20px'}}>
          <label>选择日期：</label>
          <input 
            type="date" 
            value={auctionDate}
            onChange={(e) => setAuctionDate(e.target.value)}
            className="stock-select"
          />
          <label style={{marginLeft: '16px'}}>排序方式：</label>
          <select 
            value={auctionSortBy}
            onChange={(e) => setAuctionSortBy(e.target.value)}
            className="stock-select"
          >
            <option value="amount">按竞价金额</option>
            <option value="change">按竞价涨幅</option>
          </select>
          <button onClick={loadAuctionData} className="btn" style={{marginLeft: '12px'}}>🔍 查询</button>
        </div>

        {auctionLoading ? (
          <div className="empty-state" style={{padding: '60px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>⏳</div>
            <p>正在获取集合竞价数据...</p>
          </div>
        ) : auctionData?.error ? (
          <div className="empty-state" style={{padding: '60px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>⚠️</div>
            <p>{auctionData.error}</p>
          </div>
        ) : auctionData?.data && auctionData.data.length > 0 ? (
          <div>
            <div style={{marginBottom: '16px', color: '#666'}}>
              共 {auctionData.count} 条数据 | 日期：{auctionData.date} | 排序：{auctionData.type === 'amount' ? '竞价金额' : '竞价涨幅'}
            </div>
            <table className="auction-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>小马代码</th>
                  <th>小马名称</th>
                  <th>现价</th>
                  <th>涨跌幅</th>
                  <th>竞价金额(万元)</th>
                  <th>成交量</th>
                  <th>成交额</th>
                  <th>换手率</th>
                </tr>
              </thead>
              <tbody>
                {auctionData.data.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{fontWeight: 'bold', color: idx < 3 ? '#f5222d' : '#666'}}>{idx + 1}</td>
                    <td>{item.code}</td>
                    <td style={{fontWeight: 'bold'}}>{item.name}</td>
                    <td>¥{item.price}</td>
                    <td style={{color: item.change_pct >= 0 ? '#f5222d' : '#52c41a', fontWeight: 'bold'}}>
                      {item.change_pct >= 0 ? '+' : ''}{item.change_pct}%
                    </td>
                    <td style={{fontWeight: 'bold'}}>{item.auction_amount.toFixed(2)}</td>
                    <td>{item.volume.toLocaleString()}</td>
                    <td>{(item.amount / 100000000).toFixed(2)}亿</td>
                    <td>{item.turnover}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{padding: '60px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>📊</div>
            <p>请选择日期查询集合竞价数据</p>
          </div>
        )}
      </div>
    </div>
  )

  // 渲染AI分析
  const renderAiAnalysis = () => {
    const toggleStock = (stockId) => {
      setSelectedStocks(prev => 
        prev.includes(stockId) 
          ? prev.filter(id => id !== stockId)
          : [...prev, stockId]
      )
    }

    const selectAll = () => {
      const allIds = filteredStocks.map(s => String(s.id))
      setSelectedStocks(allIds)
    }

    const selectNone = () => {
      setSelectedStocks([])
    }

    const selectInverse = () => {
      const allIds = filteredStocks.map(s => String(s.id))
      setSelectedStocks(prev => 
        allIds.filter(id => !prev.includes(id))
      )
    }

    // 过滤小马
    const filteredStocks = stocks.filter(stock => {
      // 搜索过滤
      const matchSearch = !aiStockSearch || 
        stock.code.includes(aiStockSearch) || 
        stock.name.toLowerCase().includes(aiStockSearch.toLowerCase())
      
      // 分组过滤
      let matchGroup = true
      if (aiStockGroup === 'sh') {
        matchGroup = stock.code.startsWith('6')  // 沪市
      } else if (aiStockGroup === 'sz') {
        matchGroup = stock.code.startsWith('0')  // 深市主板
      } else if (aiStockGroup === 'cyb') {
        matchGroup = stock.code.startsWith('3')  // 创业板
      }
      
      return matchSearch && matchGroup
    })

    // 按市场分组
    const groupedStocks = {
      sh: filteredStocks.filter(s => s.code.startsWith('6')),
      sz: filteredStocks.filter(s => s.code.startsWith('0')),
      cyb: filteredStocks.filter(s => s.code.startsWith('3')),
    }

    const handleCompareAnalyze = async () => {
      if (selectedStocks.length < 2) {
        alert('请至少选择2个小马进行对比分析')
        return
      }
      if (!aiQuestion.trim()) {
        alert('请输入分析维度或问题')
        return
      }

      setAiAnalyzing(true)
      setAiAnswer('AI正在对比分析中...')

      try {
        const stockDataList = []
        for (const stockId of selectedStocks) {
          const stockInfo = stocks.find(s => s.id === Number(stockId))
          const pricesResponse = await axios.get(`${API_BASE}/stocks/${stockId}/prices`)
          const prices = pricesResponse.data.slice(0, 30)
          
          stockDataList.push({
            code: stockInfo.code,
            name: stockInfo.name,
            market: stockInfo.market,
            prices: prices
          })
        }

        const response = await axios.post(`${API_BASE}/ai/compare_analyze`, {
          stocks: stockDataList,
          question: aiQuestion
        })
        setAiAnswer(response.data.analysis)
      } catch (error) {
        setAiAnswer(error.response?.data?.error || '对比分析失败')
      } finally {
        setAiAnalyzing(false)
      }
    }

    return (
      <div className="page-content">
        <div className="card">
          <h3>AI智能对比分析</h3>
          
          {/* 搜索和筛选 */}
          <div className="ai-filter-bar">
            <input
              type="text"
              className="ai-search-input"
              value={aiStockSearch}
              onChange={(e) => setAiStockSearch(e.target.value)}
              placeholder="🔍 搜索小马代码或名称..."
            />
            <div className="ai-group-tabs">
              <div className={`tab-btn ${aiStockGroup === 'all' ? 'active' : ''}`} onClick={() => setAiStockGroup('all')}>
                全部 ({stocks.length})
              </div>
              <div className={`tab-btn ${aiStockGroup === 'sh' ? 'active' : ''}`} onClick={() => setAiStockGroup('sh')}>
                财神SH ({groupedStocks.sh.length})
              </div>
              <div className={`tab-btn ${aiStockGroup === 'sz' ? 'active' : ''}`} onClick={() => setAiStockGroup('sz')}>
                财神SZ ({groupedStocks.sz.length})
              </div>
              <div className={`tab-btn ${aiStockGroup === 'cyb' ? 'active' : ''}`} onClick={() => setAiStockGroup('cyb')}>
                财神CH ({groupedStocks.cyb.length})
              </div>
            </div>
          </div>

          {/* 已选小马标签 */}
          {selectedStocks.length > 0 && (
            <div className="selected-stocks-tags">
              <span className="tags-label">已选：</span>
              <div className="tags-container">
                {selectedStocks.map(id => {
                  const stock = stocks.find(s => String(s.id) === id)
                  return stock ? (
                    <span key={id} className="stock-tag">
                      {stock.name}({stock.code})
                      <span className="tag-remove" onClick={() => toggleStock(id)}>×</span>
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* 快捷操作 */}
          <div className="ai-actions">
            <span className="action-hint">已选择 <strong>{selectedStocks.length}</strong> 只小马</span>
            <div className="action-buttons">
              <button className="btn-link" onClick={selectAll}>全选</button>
              <button className="btn-link" onClick={selectNone}>全不选</button>
              <button className="btn-link" onClick={selectInverse}>反选</button>
              {selectedStocks.length > 0 && (
                <button className="btn-link btn-link-danger" onClick={() => setSelectedStocks([])}>清空</button>
              )}
            </div>
          </div>

          {/* 小马列表 */}
          <div className="stock-selector">
            <div className="stock-checkbox-grid">
              {filteredStocks.length === 0 ? (
                <div className="empty-state">没有找到匹配的小马</div>
              ) : aiStockGroup === 'all' ? (
                // 全部分组显示
                <>
                  {groupedStocks.sh.length > 0 && (
                    <>
                      <div className="group-header">财神SH ({groupedStocks.sh.length})</div>
                      {groupedStocks.sh.map(stock => (
                        <div 
                          key={stock.id}
                          className={`stock-checkbox-item ${selectedStocks.includes(String(stock.id)) ? 'selected' : ''}`}
                          onClick={() => toggleStock(String(stock.id))}
                        >
                          <input 
                            type="checkbox"
                            checked={selectedStocks.includes(String(stock.id))}
                            onChange={() => {}}
                          />
                          <div className="stock-info">
                            <div className="stock-code">{stock.code}</div>
                            <div className="stock-name">{stock.name}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {groupedStocks.sz.length > 0 && (
                    <>
                      <div className="group-header">财神SZ ({groupedStocks.sz.length})</div>
                      {groupedStocks.sz.map(stock => (
                        <div 
                          key={stock.id}
                          className={`stock-checkbox-item ${selectedStocks.includes(String(stock.id)) ? 'selected' : ''}`}
                          onClick={() => toggleStock(String(stock.id))}
                        >
                          <input 
                            type="checkbox"
                            checked={selectedStocks.includes(String(stock.id))}
                            onChange={() => {}}
                          />
                          <div className="stock-info">
                            <div className="stock-code">{stock.code}</div>
                            <div className="stock-name">{stock.name}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {groupedStocks.cyb.length > 0 && (
                    <>
                      <div className="group-header">财神CH ({groupedStocks.cyb.length})</div>
                      {groupedStocks.cyb.map(stock => (
                        <div 
                          key={stock.id}
                          className={`stock-checkbox-item ${selectedStocks.includes(String(stock.id)) ? 'selected' : ''}`}
                          onClick={() => toggleStock(String(stock.id))}
                        >
                          <input 
                            type="checkbox"
                            checked={selectedStocks.includes(String(stock.id))}
                            onChange={() => {}}
                          />
                          <div className="stock-info">
                            <div className="stock-code">{stock.code}</div>
                            <div className="stock-name">{stock.name}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                // 单个分组显示
                filteredStocks.map(stock => (
                  <div 
                    key={stock.id}
                    className={`stock-checkbox-item ${selectedStocks.includes(String(stock.id)) ? 'selected' : ''}`}
                    onClick={() => toggleStock(String(stock.id))}
                  >
                    <input 
                      type="checkbox"
                      checked={selectedStocks.includes(String(stock.id))}
                      onChange={() => {}}
                    />
                    <div className="stock-info">
                      <div className="stock-code">{stock.code}</div>
                      <div className="stock-name">{stock.name}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="form-item">
            <label>输入分析维度或问题</label>
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCompareAnalyze()}
              placeholder="例如：对比这几只小马的风险和收益，给出投资建议"
            />
          </div>

          <div className="btn-group">
            <button className="btn-primary" onClick={handleCompareAnalyze} disabled={aiAnalyzing}>
              {aiAnalyzing ? '分析中...' : '🤖 开始对比分析'}
            </button>
          </div>
        </div>

        {aiAnswer && (
          <div className="card ai-result-card">
            <h3>对比分析结果</h3>
            <div className="ai-content">
              {(() => {
                const lines = aiAnswer.split('\n')
                const elements = []
                let tableBuffer = []
                let inTable = false

                const renderTable = (buffer, key) => {
                  if (buffer.length < 2) return null
                  const headers = buffer[0].split('|').filter(c => c.trim())
                  const rows = buffer.slice(2).map(row => row.split('|').filter(c => c.trim()))
                  
                  return (
                    <table key={key} className="analysis-table">
                      <thead>
                        <tr>
                          {headers.map((h, i) => <th key={i}>{h.trim()}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j} dangerouslySetInnerHTML={{
                                __html: cell.trim()
                                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\*(.+?)\*/g, '<em>$1</em>')
                              }} />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }

                lines.forEach((line, idx) => {
                  const isTableRow = line.includes('|') && line.trim().startsWith('|')
                  
                  if (isTableRow) {
                    if (!inTable) {
                      inTable = true
                      tableBuffer = [line]
                    } else {
                      tableBuffer.push(line)
                    }
                    return
                  } else {
                    if (inTable) {
                      elements.push(renderTable(tableBuffer, `table-${idx}`))
                      tableBuffer = []
                      inTable = false
                    }
                  }

                  if (line.startsWith('### ')) {
                    elements.push(<h4 key={idx} className="section-title">{line.replace('### ', '')}</h4>)
                  } else if (line.startsWith('## ')) {
                    elements.push(<h3 key={idx} className="main-title">{line.replace('## ', '')}</h3>)
                  } else if (line.startsWith('# ')) {
                    elements.push(<h2 key={idx} className="main-title">{line.replace('# ', '')}</h2>)
                  } else if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                    elements.push(<li key={idx} className="list-item">{line.replace(/^[-•]\s*/, '')}</li>)
                  } else if (line.includes('**小结**') || line.includes('**总结**')) {
                    elements.push(<div key={idx} className="summary-box"><strong>{line.replace(/\*\*/g, '')}</strong></div>)
                  } else if (line.trim()) {
                    elements.push(<p key={idx} className="text-line" dangerouslySetInnerHTML={{
                      __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/`(.+?)`/g, '<code>$1</code>')
                    }} />)
                  } else {
                    elements.push(<br key={idx} />)
                  }
                })

                if (inTable && tableBuffer.length > 0) {
                  elements.push(renderTable(tableBuffer, 'table-final'))
                }

                return elements
              })()}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 渲染财务预报分析页面
  const renderFinancialForecast = () => (
    <div className="page-content">
      <div className="card">
        <h2>💰 财务预报分析</h2>
        <p className="text-muted">基于财报发布日期、业绩预报、专业财务指标的综合分析</p>
        <div className="analysis-type-badge" style={{
          background: '#f0f0f0',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '13px',
          color: '#666',
          display: 'inline-block',
          marginBottom: '12px'
        }}>
          📈 基本面分析 · 长期投资价值
        </div>
        
        <div className="form-row" style={{marginBottom: '20px'}}>
          <label>选择小马：</label>
          <select value={selectedStock} onChange={(e) => setSelectedStock(e.target.value)} className="stock-select">
            <option value="">请选择</option>
            {stocks.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
          </select>
        </div>

        {!selectedStock ? (
          <div className="empty-state" style={{padding: '60px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>📊</div>
            <p>请先选择一只小马进行分析</p>
          </div>
        ) : forecastLoading ? (
          <div className="empty-state" style={{padding: '60px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>⏳</div>
            <p>正在获取财务预报数据，请稍候...</p>
            <p className="text-muted" style={{marginTop: '8px'}}>AI正在联网搜索真实财报数据</p>
          </div>
        ) : forecastData?.error ? (
          <div className="empty-state" style={{padding: '60px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>⚠️</div>
            <p style={{color: '#d46b08'}}>{forecastData.error}</p>
            <p className="text-muted" style={{marginTop: '8px', marginBottom: '20px'}}>AI获取数据时遇到问题，请稍后重试</p>
            <button onClick={loadForecastData} className="btn" style={{background: '#1890ff', color: 'white', padding: '8px 24px', borderRadius: '6px', border: 'none', cursor: 'pointer'}}>
              🔄 重试
            </button>
          </div>
        ) : !forecastData || !forecastData.report_calendar || !forecastData.forecasts || !forecastData.core_metrics ? (
          <div className="empty-state" style={{padding: '60px 0'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>❌</div>
            <p>获取数据失败或数据格式不正确</p>
            <p className="text-muted" style={{marginTop: '8px'}}>请稍后重试</p>
          </div>
        ) : (
          <div className="forecast-analysis">
            {/* 财报日历 */}
            <div className="section-card">
              <h3>📅 财报发布日历</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">最新季报：</span>
                  <span className="info-value">{forecastData.report_calendar.latest_quarter}（预计{forecastData.report_calendar.expected_date}公布）</span>
                </div>
                <div className="info-item">
                  <span className="info-label">年报预告：</span>
                  <span className="info-value">{forecastData.report_calendar.annual_report}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">下次财报：</span>
                  <span className="info-value highlight">距离发布还有 {forecastData.report_calendar.days_to_next} 天</span>
                </div>
              </div>
            </div>

            {/* 多平台数据对比 */}
            {forecastData.data_sources && (
              <div className="section-card">
                <h3>🔍 数据源对比</h3>
                <div style={{
                  background: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <span style={{color: '#666'}}>数据来源：</span>
                    <span style={{fontWeight: 'bold'}}>{forecastData.data_sources.financial_data}（财务数据） + 多平台（实时行情）</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{color: '#666'}}>数据一致性：</span>
                    <span style={{
                      fontWeight: 'bold',
                      color: forecastData.data_sources.consistency === '高' ? '#52c41a' : 
                             forecastData.data_sources.consistency === '中' ? '#faad14' : '#f5222d'
                    }}>
                      {forecastData.data_sources.consistency === '高' ? '✅' : 
                       forecastData.data_sources.consistency === '中' ? '⚠️' : '❌'}
                      {forecastData.data_sources.consistency}
                    </span>
                  </div>
                </div>
                
                {/* 多平台数据对比表 */}
                {forecastData.data_sources.platform_details && (
                  <div className="data-comparison-table">
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                      <thead>
                        <tr style={{background: '#f5f5f5'}}>
                          <th style={{padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #e8e8e8', color: '#666'}}>平台</th>
                          <th style={{padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #e8e8e8'}}>现价</th>
                          <th style={{padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #e8e8e8'}}>开盘</th>
                          <th style={{padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #e8e8e8'}}>最高</th>
                          <th style={{padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #e8e8e8'}}>最低</th>
                          <th style={{padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #e8e8e8'}}>成交量</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastData.data_sources.platform_details.sina && (
                          <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                            <td style={{padding: '10px 8px', fontWeight: 'bold', color: '#1890ff'}}>
                              📈 新浪财经
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#1890ff'}}>
                              ¥{forecastData.data_sources.platform_details.sina.price.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              ¥{forecastData.data_sources.platform_details.sina.open.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              ¥{forecastData.data_sources.platform_details.sina.high.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              ¥{forecastData.data_sources.platform_details.sina.low.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              {forecastData.data_sources.platform_details.sina.volume.toLocaleString()} 手
                            </td>
                          </tr>
                        )}
                        {forecastData.data_sources.platform_details.tencent && (
                          <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                            <td style={{padding: '10px 8px', fontWeight: 'bold', color: '#13c2c2'}}>
                              📊 腾讯财经
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#13c2c2'}}>
                              ¥{forecastData.data_sources.platform_details.tencent.price.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              ¥{forecastData.data_sources.platform_details.tencent.open.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              ¥{forecastData.data_sources.platform_details.tencent.high.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              ¥{forecastData.data_sources.platform_details.tencent.low.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              {forecastData.data_sources.platform_details.tencent.volume.toLocaleString()} 手
                            </td>
                          </tr>
                        )}
                        {forecastData.data_sources.platform_details.eastmoney && (
                          <tr style={{borderBottom: '1px solid #f0f0f0'}}>
                            <td style={{padding: '10px 8px', fontWeight: 'bold', color: '#722ed1'}}>
                              💼 东方财富
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#722ed1'}}>
                              ¥{forecastData.data_sources.platform_details.eastmoney.price.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              ¥{forecastData.data_sources.platform_details.eastmoney.open.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              ¥{forecastData.data_sources.platform_details.eastmoney.high.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              ¥{forecastData.data_sources.platform_details.eastmoney.low.toFixed(2)}
                            </td>
                            <td style={{padding: '10px 8px', textAlign: 'right', color: '#666'}}>
                              {forecastData.data_sources.platform_details.eastmoney.volume.toLocaleString()} 手
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <p className="text-muted" style={{fontSize: '13px', margin: '12px 0 0 0'}}>
                  💡 本系统综合了东方财富、新浪财经、腾讯财经等多个平台的数据，确保分析结果的准确性和可靠性。
                </p>
              </div>
            )}

            {/* 业绩预告分析 */}
            <div className="section-card">
              <h3>📈 业绩预告情况</h3>
              <div className="forecast-table">
                <table>
                  <thead>
                    <tr>
                      <th>报告期</th>
                      <th>预告类型</th>
                      <th>净利润变动</th>
                      <th>每股收益</th>
                      <th>公布日期</th>
                      <th>实际vs预期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.forecasts.map((f, idx) => (
                      <tr key={idx}>
                        <td>{f.period}</td>
                        <td><span className={`badge ${f.type === '预增' ? 'badge-success' : 'badge-warning'}`}>{f.type}</span></td>
                        <td>{f.profit_change}</td>
                        <td>{f.eps}</td>
                        <td>{f.publish_date}</td>
                        <td>
                          <span className={f.vs_expectation.includes('超') ? 'beat' : f.vs_expectation.includes('符合') ? 'meet' : 'miss'}>
                            {f.vs_expectation}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 核心财务指标 */}
            <div className="section-card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h3 style={{margin: 0}}>💹 核心财务指标趋势</h3>
                <div style={{
                  background: '#e6f7ff',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#1890ff'
                }}>
                  📊 数据来源：东方财富
                </div>
              </div>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-icon">💵</span>
                    <span className="metric-title">营业收入</span>
                  </div>
                  <div className="metric-value">{forecastData.core_metrics.revenue}</div>
                  <div className="metric-change positive">↑ 同比增长 {forecastData.core_metrics.revenue_yoy}</div>
                  <div className="metric-detail">环比增长 {forecastData.core_metrics.revenue_qoq}</div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-icon">💰</span>
                    <span className="metric-title">净利润</span>
                  </div>
                  <div className="metric-value">{forecastData.core_metrics.net_profit}</div>
                  <div className="metric-change positive">↑ 同比增长 {forecastData.core_metrics.profit_yoy}</div>
                  <div className="metric-detail">环比增长 {forecastData.core_metrics.profit_qoq}</div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-icon">📊</span>
                    <span className="metric-title">毛利率</span>
                  </div>
                  <div className="metric-value">{forecastData.core_metrics.gross_margin}</div>
                  <div className="metric-change positive">↑ 提升 {forecastData.core_metrics.margin_change}</div>
                  <div className="metric-detail">行业平均 {forecastData.core_metrics.industry_avg_margin}</div>
                </div>
                
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-icon">🎯</span>
                    <span className="metric-title">净资产收益率ROE</span>
                  </div>
                  <div className="metric-value">{forecastData.core_metrics.roe}</div>
                  <div className="metric-change positive">↑ 提升 {forecastData.core_metrics.roe_change}</div>
                  <div className="metric-detail">优秀水平 &gt;15%</div>
                </div>
              </div>
            </div>

            {/* 成长性分析 */}
            <div className="section-card">
              <h3>🚀 成长性分析</h3>
              <div className="growth-analysis">
                <div className="growth-item">
                  <div className="growth-label">营收增速（近3年）</div>
                  <div className="growth-bar">
                    <div className="growth-fill" style={{width: `${parseFloat(forecastData.growth_analysis.revenue_growth_3y) * 4}%`}}></div>
                    <span className="growth-text">年均 {forecastData.growth_analysis.revenue_growth_3y}</span>
                  </div>
                  <div className={`growth-rating ${forecastData.growth_analysis.revenue_rating === '优秀' ? 'excellent' : 'good'}`}>
                    {forecastData.growth_analysis.revenue_rating}
                  </div>
                </div>
                
                <div className="growth-item">
                  <div className="growth-label">利润增速（近3年）</div>
                  <div className="growth-bar">
                    <div className="growth-fill" style={{width: `${parseFloat(forecastData.growth_analysis.profit_growth_3y) * 4}%`}}></div>
                    <span className="growth-text">年均 {forecastData.growth_analysis.profit_growth_3y}</span>
                  </div>
                  <div className={`growth-rating ${forecastData.growth_analysis.profit_rating === '优秀' ? 'excellent' : 'good'}`}>
                    {forecastData.growth_analysis.profit_rating}
                  </div>
                </div>
                
                <div className="growth-item">
                  <div className="growth-label">现金流质量</div>
                  <div className="growth-bar">
                    <div className="growth-fill" style={{width: `${Math.min(forecastData.growth_analysis.cash_flow_ratio * 50, 100)}%`}}></div>
                    <span className="growth-text">经营现金流/净利润 = {forecastData.growth_analysis.cash_flow_ratio}</span>
                  </div>
                  <div className={`growth-rating ${forecastData.growth_analysis.cash_flow_rating === '优秀' ? 'excellent' : forecastData.growth_analysis.cash_flow_rating === '良好' ? 'good' : 'average'}`}>
                    {forecastData.growth_analysis.cash_flow_rating}
                  </div>
                </div>
              </div>
            </div>

            {/* 风险提示 */}
            <div className="section-card warning-section">
              <h3>⚠️ 风险与关注点</h3>
              <ul className="risk-list">
                {forecastData.risks.map((risk, idx) => (
                  <li key={idx}>
                    <span className="risk-icon">{risk.level === '高' ? '🔴' : risk.level === '中' ? '🟡' : '🟢'}</span>
                    <div className="risk-content">
                      <strong>{risk.title}</strong>
                      <p>{risk.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 专业评级与建议 */}
            <div className="section-card recommendation">
              <h3>🎯 综合评级与投资建议</h3>
              <div className="rating-summary">
                <div className="rating-badge strong-buy">
                  <div className="rating-score">{forecastData.recommendation.rating}</div>
                  <div className="rating-label">{forecastData.recommendation.label}</div>
                </div>
                <div className="rating-details">
                  <div className="rating-item">
                    <span>基本面：</span>
                    <div className="stars">{'⭐'.repeat(forecastData.recommendation.scores.fundamentals)}</div>
                  </div>
                  <div className="rating-item">
                    <span>成长性：</span>
                    <div className="stars">{'⭐'.repeat(forecastData.recommendation.scores.growth)}</div>
                  </div>
                  <div className="rating-item">
                    <span>估值水平：</span>
                    <div className="stars">{'⭐'.repeat(forecastData.recommendation.scores.valuation)}</div>
                  </div>
                  <div className="rating-item">
                    <span>财务健康：</span>
                    <div className="stars">{'⭐'.repeat(forecastData.recommendation.scores.financial_health)}</div>
                  </div>
                </div>
              </div>
              
              <div className="recommendation-text">
                <h4>📌 投资要点：</h4>
                <ol>
                  {forecastData.recommendation.investment_points.map((point, idx) => (
                    <li key={idx}><strong>{point.split('：')[0]}：</strong>{point.split('：')[1]}</li>
                  ))}
                </ol>
                
                <h4>💡 操作建议：</h4>
                <div className="action-suggestion">
                  <p><strong>短期（1-3个月）：</strong>{forecastData.recommendation.action_suggestion.short_term}</p>
                  <p><strong>中期（3-6个月）：</strong>{forecastData.recommendation.action_suggestion.mid_term}</p>
                  <p><strong>长期（6-12个月）：</strong>{forecastData.recommendation.action_suggestion.long_term}</p>
                </div>
                
                <div className="price-target">
                  <span className="target-label">目标价位：</span>
                  {(() => {
                    const target = forecastData.recommendation.price_target
                    const priceLow = Math.min(target.low, target.high)
                    const priceHigh = Math.max(target.low, target.high)
                    const pctLow = ((priceLow / target.current - 1) * 100).toFixed(1)
                    const pctHigh = ((priceHigh / target.current - 1) * 100).toFixed(1)
                    return (
                      <>
                        <span className="target-price">¥{priceLow} - ¥{priceHigh}</span>
                        <span className="current-price">（现价 ¥{target.current}，潜在涨幅 {pctLow}% - {pctHigh}%）</span>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // 持仓管理页面
  const renderPortfolio = () => (
    <div className="page-content">
      <div className="page-header">
        <h2>💼 持仓管理</h2>
        <button 
          onClick={() => setShowPortfolioModal(true)}
          className="btn-primary"
        >
          + 添加持仓
        </button>
      </div>

      {portfolioLoading ? (
        <div className="empty-state">
          <div style={{fontSize: '32px', marginBottom: '12px'}}>⏳</div>
          <p>加载中...</p>
        </div>
      ) : !portfolioData || !portfolioData.positions ? (
        <div className="empty-state">
          <div style={{fontSize: '48px', marginBottom: '16px'}}>📭</div>
          <h3>暂无持仓</h3>
          <p>点击上方按钮添加您的第一笔模拟持仓</p>
        </div>
      ) : (
        <div>
          {/* 统计卡片 */}
          <div className="metrics-grid" style={{marginBottom: '24px'}}>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">💰</span>
                <span className="metric-title">总市值</span>
              </div>
              <div className="metric-value" style={{fontSize: '24px'}}>
                ¥{portfolioData.summary.total_market_value.toLocaleString()}
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">📊</span>
                <span className="metric-title">总成本</span>
              </div>
              <div className="metric-value" style={{fontSize: '24px'}}>
                ¥{portfolioData.summary.total_cost.toLocaleString()}
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">📈</span>
                <span className="metric-title">总收益</span>
              </div>
              <div className={`metric-value ${portfolioData.summary.total_profit >= 0 ? 'positive' : 'negative'}`} style={{fontSize: '24px'}}>
                {portfolioData.summary.total_profit >= 0 ? '+' : ''}¥{portfolioData.summary.total_profit.toLocaleString()}
              </div>
              <div className={`metric-change ${portfolioData.summary.total_profit_rate >= 0 ? 'positive' : 'negative'}`}>
                {portfolioData.summary.total_profit_rate >= 0 ? '↑' : '↓'} {Math.abs(portfolioData.summary.total_profit_rate).toFixed(2)}%
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">🎯</span>
                <span className="metric-title">持仓数量</span>
              </div>
              <div className="metric-value" style={{fontSize: '24px'}}>
                {portfolioData.summary.total_positions} 只
              </div>
              <div className="metric-detail">
                盈利 {portfolioData.summary.winning_count} / 亏损 {portfolioData.summary.losing_count}
              </div>
            </div>
          </div>

          {/* 持仓列表 */}
          <div className="section-card">
            <h3>持仓明细</h3>
            <div style={{overflowX: 'auto'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>小马代码</th>
                    <th>小马名称</th>
                    <th>持仓数量</th>
                    <th>成本价</th>
                    <th>现价</th>
                    <th>市值</th>
                    <th>盈亏</th>
                    <th>收益率</th>
                    <th>买入日期</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioData.positions.map(pos => (
                    <tr key={pos.id}>
                      <td><strong>{pos.stock_code}</strong></td>
                      <td>{pos.stock_name}</td>
                      <td>{pos.quantity.toLocaleString()}</td>
                      <td>¥{pos.avg_cost.toFixed(2)}</td>
                      <td>¥{pos.current_price.toFixed(2)}</td>
                      <td>¥{pos.market_value.toLocaleString()}</td>
                      <td className={pos.profit >= 0 ? 'positive' : 'negative'}>
                        {pos.profit >= 0 ? '+' : ''}¥{pos.profit.toLocaleString()}
                      </td>
                      <td className={pos.profit_rate >= 0 ? 'positive' : 'negative'}>
                        {pos.profit_rate >= 0 ? '↑' : '↓'} {Math.abs(pos.profit_rate).toFixed(2)}%
                      </td>
                      <td>{pos.buy_date}</td>
                      <td>
                        <button 
                          onClick={() => handleDeletePortfolio(pos.id)}
                          style={{
                            background: '#ff4d4f',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // 对比分析页面
  const renderCompare = () => (
    <div className="page-content">
      <div className="page-header">
        <h2>⚖️ 多维度对比分析</h2>
      </div>

      <div className="card" style={{marginBottom: '24px'}}>
        <h3>选择要对比的小马（最多5只）</h3>
        <div style={{display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap'}}>
          {stocks.map(stock => (
            <label key={stock.id} style={{
              padding: '8px 16px',
              border: compareStocks.includes(String(stock.id)) ? '2px solid #1890ff' : '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'pointer',
              background: compareStocks.includes(String(stock.id)) ? '#e6f7ff' : '#fff'
            }}>
              <input
                type="checkbox"
                checked={compareStocks.includes(String(stock.id))}
                onChange={(e) => {
                  if (e.target.checked) {
                    if (compareStocks.length < 5) {
                      setCompareStocks([...compareStocks, String(stock.id)])
                    } else {
                      toast.warning('最多选择5只小马')
                    }
                  } else {
                    setCompareStocks(compareStocks.filter(id => id !== String(stock.id)))
                  }
                }}
                style={{marginRight: '8px'}}
              />
              {stock.code} - {stock.name}
            </label>
          ))}
        </div>
        <button 
          onClick={handleCompare}
          className="btn-primary"
          disabled={compareLoading || compareStocks.length < 2}
        >
          {compareLoading ? '对比中...' : '开始对比'}
        </button>
      </div>

      {compareResult && compareResult.stocks.length > 0 && (
        <div className="section-card">
          <h3>对比结果</h3>
          <div style={{overflowX: 'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>指标</th>
                  {compareResult.stocks.map(stock => (
                    <th key={stock.stock_id}>{stock.stock_code}<br/>{stock.stock_name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>当前价格</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id}>￥{stock.current_price.toFixed(2)}</td>
                  ))}
                </tr>
                <tr>
                  <td><strong>30日涨跌幅</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id} className={stock.change_30d >= 0 ? 'positive' : 'negative'}>
                      {stock.change_30d >= 0 ? '+' : ''}{stock.change_30d.toFixed(2)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>平均成交量</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id}>{stock.avg_volume.toLocaleString()}</td>
                  ))}
                </tr>
                <tr>
                  <td><strong>波动率</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id}>{stock.volatility.toFixed(2)}%</td>
                  ))}
                </tr>
                <tr>
                  <td><strong>最高价</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id}>￥{stock.max_price.toFixed(2)}</td>
                  ))}
                </tr>
                <tr>
                  <td><strong>最低价</strong></td>
                  {compareResult.stocks.map(stock => (
                    <td key={stock.stock_id}>￥{stock.min_price.toFixed(2)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  // 智能选股页面
  const renderScreener = () => (
    <div className="page-content">
      <div className="page-header">
        <h2>🔍 智能选股器</h2>
      </div>

      <div className="card" style={{marginBottom: '24px'}}>
        <h3>筛选条件</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px'}}>
          <div>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>价格范围（元）</label>
            <div style={{display: 'flex', gap: '8px'}}>
              <input
                type="number"
                value={screenerFilters.min_price}
                onChange={(e) => setScreenerFilters({...screenerFilters, min_price: Number(e.target.value)})}
                placeholder="最低价"
                style={{flex: 1, padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
              />
              <span style={{alignSelf: 'center'}}>-</span>
              <input
                type="number"
                value={screenerFilters.max_price}
                onChange={(e) => setScreenerFilters({...screenerFilters, max_price: Number(e.target.value)})}
                placeholder="最高价"
                style={{flex: 1, padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
              />
            </div>
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>涨跌幅范围（%）</label>
            <div style={{display: 'flex', gap: '8px'}}>
              <input
                type="number"
                value={screenerFilters.min_change}
                onChange={(e) => setScreenerFilters({...screenerFilters, min_change: Number(e.target.value)})}
                placeholder="最小涨幅"
                style={{flex: 1, padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
              />
              <span style={{alignSelf: 'center'}}>-</span>
              <input
                type="number"
                value={screenerFilters.max_change}
                onChange={(e) => setScreenerFilters({...screenerFilters, max_change: Number(e.target.value)})}
                placeholder="最大涨幅"
                style={{flex: 1, padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
              />
            </div>
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>最小成交量</label>
            <input
              type="number"
              value={screenerFilters.min_volume}
              onChange={(e) => setScreenerFilters({...screenerFilters, min_volume: Number(e.target.value)})}
              placeholder="例如：1000000"
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px'}}>趋势方向</label>
            <select
              value={screenerFilters.trend}
              onChange={(e) => setScreenerFilters({...screenerFilters, trend: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
            >
              <option value="all">全部</option>
              <option value="up">上涨</option>
              <option value="down">下跌</option>
            </select>
          </div>
        </div>

        <button 
          onClick={handleScreener}
          className="btn-primary"
          disabled={screenerLoading}
        >
          {screenerLoading ? '筛选中...' : '开始筛选'}
        </button>
      </div>

      {screenerResults && (
        <div className="section-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3>筛选结果（共{screenerResults.count}只）</h3>
            <span style={{fontSize: '13px', color: '#999'}}>
              条件：价格{screenerResults.filters.price_range}元，涨跌幅{screenerResults.filters.change_range}
            </span>
          </div>
          
          {screenerResults.results.length === 0 ? (
            <div className="empty-state">
              <p>没有找到符合条件的小马</p>
            </div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>小马代码</th>
                    <th>小马名称</th>
                    <th>当前价格</th>
                    <th>30日涨跌幅</th>
                    <th>平均成交量</th>
                  </tr>
                </thead>
                <tbody>
                  {screenerResults.results.map((stock, idx) => (
                    <tr key={stock.stock_id}>
                      <td>{idx + 1}</td>
                      <td><strong>{stock.stock_code}</strong></td>
                      <td>{stock.stock_name}</td>
                      <td>￥{stock.current_price.toFixed(2)}</td>
                      <td className={stock.change_30d >= 0 ? 'positive' : 'negative'}>
                        {stock.change_30d >= 0 ? '+' : ''}{stock.change_30d.toFixed(2)}%
                      </td>
                      <td>{stock.avg_volume.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // 系统设置页面
  const renderSettings = () => (
    <div className="page-content">
      <div className="page-header">
        <h2>⚙️ 系统设置</h2>
      </div>

      {/* 系统信息 */}
      {systemInfo && (
        <div className="card" style={{marginBottom: '24px'}}>
          <h3>📊 系统信息</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px'}}>
            <div style={{padding: '16px', background: '#f0f5ff', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#666', marginBottom: '4px'}}>版本号</div>
              <div style={{fontSize: '18px', fontWeight: 'bold'}}>{systemInfo.version}</div>
            </div>
            <div style={{padding: '16px', background: '#f6ffed', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#666', marginBottom: '4px'}}>小马数量</div>
              <div style={{fontSize: '18px', fontWeight: 'bold'}}>{systemInfo.stock_count} 只</div>
            </div>
            <div style={{padding: '16px', background: '#fff7e6', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#666', marginBottom: '4px'}}>价格记录</div>
              <div style={{fontSize: '18px', fontWeight: 'bold'}}>{systemInfo.price_count.toLocaleString()} 条</div>
            </div>
            <div style={{padding: '16px', background: '#fff1f0', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#666', marginBottom: '4px'}}>持仓数量</div>
              <div style={{fontSize: '18px', fontWeight: 'bold'}}>{systemInfo.portfolio_count} 只</div>
            </div>
            <div style={{padding: '16px', background: '#f9f0ff', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#666', marginBottom: '4px'}}>数据库大小</div>
              <div style={{fontSize: '18px', fontWeight: 'bold'}}>{systemInfo.db_size_mb} MB</div>
            </div>
          </div>
        </div>
      )}

      {/* 数据导出 */}
      <div className="card" style={{marginBottom: '24px'}}>
        <h3>📥 数据导出</h3>
        <p style={{color: '#666', fontSize: '14px', marginBottom: '16px'}}>导出所有小马基本信息为Excel文件</p>
        <button onClick={handleExportAllStocks} className="btn-primary">
          导出所有小马数据
        </button>
      </div>

      {/* 系统配置 */}
      <div className="card">
        <h3>🔧 系统配置</h3>
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fafafa', borderRadius: '4px'}}>
            <div>
              <div style={{fontWeight: 'bold', marginBottom: '4px'}}>启用缓存</div>
              <div style={{fontSize: '13px', color: '#999'}}>提高数据加载速度</div>
            </div>
            <label style={{position: 'relative', display: 'inline-block', width: '50px', height: '24px'}}>
              <input
                type="checkbox"
                checked={settings.cache_enabled || false}
                onChange={(e) => setSettings({...settings, cache_enabled: e.target.checked})}
                style={{opacity: 0, width: 0, height: 0}}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: settings.cache_enabled ? '#1890ff' : '#ccc',
                transition: '.4s',
                borderRadius: '24px'
              }}></span>
            </label>
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fafafa', borderRadius: '4px'}}>
            <div>
              <div style={{fontWeight: 'bold', marginBottom: '4px'}}>自动刷新</div>
              <div style={{fontSize: '13px', color: '#999'}}>定期更新数据</div>
            </div>
            <label style={{position: 'relative', display: 'inline-block', width: '50px', height: '24px'}}>
              <input
                type="checkbox"
                checked={settings.auto_refresh || false}
                onChange={(e) => setSettings({...settings, auto_refresh: e.target.checked})}
                style={{opacity: 0, width: 0, height: 0}}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: settings.auto_refresh ? '#1890ff' : '#ccc',
                transition: '.4s',
                borderRadius: '24px'
              }}></span>
            </label>
          </div>
        </div>

        <div style={{marginTop: '24px', textAlign: 'right'}}>
          <button onClick={handleSaveSettings} className="btn-primary">
            保存设置
          </button>
        </div>
      </div>
    </div>
  )

  // 预警添加模态框
  const AlertModal = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={() => setShowAlertModal(false)}>
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '24px',
        width: '90%',
        maxWidth: '400px'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{margin: '0 0 20px 0', fontSize: '18px'}}>🔔 添加预警规则</h3>
        
        <form onSubmit={handleAddAlert}>
          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333'}}>预警类型</label>
            <select 
              value={alertForm.alert_type}
              onChange={(e) => setAlertForm({...alertForm, alert_type: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
            >
              <option value="price">💰 价格预警</option>
              <option value="volume">📊 成交量预警</option>
              <option value="indicator">📈 技术指标预警</option>
            </select>
          </div>
          
          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333'}}>触发条件</label>
            <select 
              value={alertForm.condition}
              onChange={(e) => setAlertForm({...alertForm, condition: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
            >
              <option value="above">高于</option>
              <option value="below">低于</option>
              <option value="equals">等于</option>
            </select>
          </div>
          
          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333'}}>阈值</label>
            <input 
              type="number"
              step="0.01"
              value={alertForm.threshold}
              onChange={(e) => setAlertForm({...alertForm, threshold: e.target.value})}
              placeholder="输入预警价格"
              required
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
            />
          </div>
          
          <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
            <button 
              type="button"
              onClick={() => setShowAlertModal(false)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d9d9d9',
                background: '#fff',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button 
              type="submit"
              className="btn-primary"
              style={{padding: '8px 16px'}}
            >
              确定
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  // 持仓添加模态框
  const PortfolioModal = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={() => setShowPortfolioModal(false)}>
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{margin: '0 0 20px 0', fontSize: '18px'}}>💼 添加持仓</h3>
        
        <form onSubmit={handleAddPortfolio}>
          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333'}}>选择小马</label>
            <select 
              value={portfolioForm.stock_id}
              onChange={(e) => setPortfolioForm({...portfolioForm, stock_id: e.target.value})}
              required
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
            >
              <option value="">请选择小马</option>
              {stocks.map(stock => (
                <option key={stock.id} value={stock.id}>{stock.code} - {stock.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333'}}>持仓数量（股）</label>
            <input 
              type="number"
              min="100"
              step="100"
              value={portfolioForm.quantity}
              onChange={(e) => setPortfolioForm({...portfolioForm, quantity: e.target.value})}
              placeholder="例如：1000"
              required
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
            />
          </div>
          
          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333'}}>成本价（元）</label>
            <input 
              type="number"
              step="0.01"
              value={portfolioForm.avg_cost}
              onChange={(e) => setPortfolioForm({...portfolioForm, avg_cost: e.target.value})}
              placeholder="例如：15.50"
              required
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
            />
          </div>
          
          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333'}}>买入日期</label>
            <input 
              type="date"
              value={portfolioForm.buy_date}
              onChange={(e) => setPortfolioForm({...portfolioForm, buy_date: e.target.value})}
              required
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px'}}
            />
          </div>
          
          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333'}}>备注（可选）</label>
            <textarea 
              value={portfolioForm.notes}
              onChange={(e) => setPortfolioForm({...portfolioForm, notes: e.target.value})}
              placeholder="记录您的投资理由..."
              rows="3"
              style={{width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px', resize: 'vertical'}}
            />
          </div>
          
          <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
            <button 
              type="button"
              onClick={() => setShowPortfolioModal(false)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d9d9d9',
                background: '#fff',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button 
              type="submit"
              className="btn-primary"
              style={{padding: '8px 16px'}}
            >
              确定
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <ToastProvider>
      <div className="layout">
      {/* 侧边栏 */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="logo">
          <div className="logo-badge">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg">
              <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" />
              <path d="M7 8C7 8 8 6 10 6C12 6 12 8 12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9" cy="9.5" r="0.8" fill="currentColor"/>
              <path d="M6 12C6 12 7 16 10 16C13 16 14 14 14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M14 10L16 8M14 12L17 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          {!collapsed && <span className="logo-text">小马分析系统</span>}
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
        <div className="sidebar-footer">
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="main">
        {/* 顶部栏 */}
        <header className="header">
          <div className="breadcrumb">
            {breadcrumbMap[currentMenu].map((item, idx) => (
              <span key={idx} className="breadcrumb-item">
                {item}
                {idx < breadcrumbMap[currentMenu].length - 1 && <span className="separator">/</span>}
              </span>
            ))}
          </div>
          <div className="user-info">
            <span className="username">管理员</span>
          </div>
        </header>

        {/* 内容区 */}
        <div className="content">
          {currentMenu === 'dashboard' && renderDashboard()}
          {currentMenu === 'stockManage' && renderStockManage()}
          {currentMenu === 'dataEntry' && renderDataEntry()}
          {currentMenu === 'dataView' && <DataViewPage stocks={stocks} toast={toast} />}
          {currentMenu === 'statistics' && renderStatistics()}
          {currentMenu === 'portfolio' && <PortfolioPage stocks={stocks} toast={toast} />}
          {currentMenu === 'compare' && <ComparePage stocks={stocks} toast={toast} />}
          {currentMenu === 'screener' && <ScreenerPage toast={toast} />}
          {currentMenu === 'financialForecast' && renderFinancialForecast()}
          {currentMenu === 'longhubang' && renderLonghubang()}
          {currentMenu === 'auction' && renderAuction()}
          {currentMenu === 'aiAnalysis' && renderAiAnalysis()}
          {currentMenu === 'settings' && <SettingsPage toast={toast} />}
        </div>
      </main>
    </div>
    {showAlertModal && <AlertModal />}
    {showPortfolioModal && <PortfolioModal />}
    </ToastProvider>
  )
}

export default App
