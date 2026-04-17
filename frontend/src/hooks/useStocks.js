import { useState, useEffect } from 'react'
import { stockAPI, dashboardAPI } from '../utils/api'
import { getCache, setCache, CACHE_ENABLED } from '../utils/cache'

export const useStocks = () => {
  const [stocks, setStocks] = useState([])
  const [dashboardStats, setDashboardStats] = useState(null)
  const [loading, setLoading] = useState(false)

  // 加载小马列表
  const loadStocks = async (forceRefresh = false) => {
    try {
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('stocks')
        if (cached) {
          setStocks(cached)
          return
        }
      }
      
      const response = await stockAPI.getAll()
      setStocks(response.data)
      
      if (CACHE_ENABLED) {
        setCache('stocks', response.data)
      }
    } catch (error) {
      console.error('加载小马失败:', error)
    }
  }

  // 加载仪表盘统计
  const loadDashboardStats = async (forceRefresh = false) => {
    try {
      if (!forceRefresh && CACHE_ENABLED) {
        const cached = getCache('dashboard')
        if (cached) {
          setDashboardStats(cached)
          return
        }
      }
      
      const response = await dashboardAPI.getStats()
      setDashboardStats(response.data)
      
      if (CACHE_ENABLED) {
        setCache('dashboard', response.data)
      }
    } catch (error) {
      console.error('加载概览数据失败:', error)
    }
  }

  useEffect(() => {
    loadStocks()
    loadDashboardStats()
  }, [])

  return {
    stocks,
    dashboardStats,
    loading,
    loadStocks,
    loadDashboardStats,
    setStocks,
  }
}
