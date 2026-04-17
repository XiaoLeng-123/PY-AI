/**
 * 数据缓存工具 - localStorage 管理
 */

const CACHE_CONFIG = {
  stocks: { key: 'xiaoma_stocks_cache', ttl: 5 * 60 * 1000 }, // 5分钟
  dashboard: { key: 'xiaoma_dashboard_cache', ttl: 10 * 60 * 1000 }, // 10分钟
  prices: { key: 'xiaoma_prices_cache_', ttl: 30 * 60 * 1000 }, // 30分钟（按股票区分）
  stats: { key: 'xiaoma_stats_cache_', ttl: 30 * 60 * 1000 }, // 30分钟
  forecast: { key: 'xiaoma_forecast_cache_', ttl: 60 * 60 * 1000 }, // 1小时
  longhubang: { key: 'xiaoma_longhubang_cache_', ttl: 24 * 60 * 60 * 1000 }, // 24小时
  auction: { key: 'xiaoma_auction_cache_', ttl: 24 * 60 * 60 * 1000 } // 24小时
}

// 设置缓存
export const setCache = (type, data, customTtl = null, suffix = '') => {
  try {
    const config = CACHE_CONFIG[type]
    if (!config) return
    
    const cacheKey = config.key + suffix
    const ttl = customTtl || config.ttl
    
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl
    }
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
  } catch (error) {
    console.warn('缓存设置失败:', error)
  }
}

// 获取缓存
export const getCache = (type, suffix = '') => {
  try {
    const config = CACHE_CONFIG[type]
    if (!config) return null
    
    const cacheKey = config.key + suffix
    
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null
    
    const { data, timestamp, ttl } = JSON.parse(cached)
    
    // 检查是否过期
    if (Date.now() - timestamp > ttl) {
      localStorage.removeItem(cacheKey)
      return null
    }
    
    return data
  } catch (error) {
    console.warn('缓存读取失败:', error)
    return null
  }
}

// 清除缓存
export const clearCache = (type = null, suffix = '') => {
  try {
    if (type) {
      const config = CACHE_CONFIG[type]
      if (config) {
        const cacheKey = config.key + suffix
        localStorage.removeItem(cacheKey)
      }
    } else {
      // 清除所有相关缓存
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('xiaoma_')) {
          localStorage.removeItem(key)
        }
      })
    }
  } catch (error) {
    console.warn('缓存清除失败:', error)
  }
}

// 检查缓存是否即将过期（返回剩余时间，单位：秒）
export const getCacheRemainingTime = (type, suffix = '') => {
  try {
    const config = CACHE_CONFIG[type]
    if (!config) return 0
    
    const cacheKey = config.key + suffix
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return 0
    
    const { timestamp, ttl } = JSON.parse(cached)
    const remaining = ttl - (Date.now() - timestamp)
    
    return Math.max(0, Math.floor(remaining / 1000))
  } catch (error) {
    return 0
  }
}

// 获取缓存信息（用于显示缓存状态）
export const getCacheInfo = (type, suffix = '') => {
  try {
    const config = CACHE_CONFIG[type]
    if (!config) return null
    
    const cacheKey = config.key + suffix
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return { exists: false }
    
    const { timestamp, ttl } = JSON.parse(cached)
    const remaining = ttl - (Date.now() - timestamp)
    
    return {
      exists: true,
      age: Math.floor((Date.now() - timestamp) / 1000), // 缓存已存在时间（秒）
      remaining: Math.max(0, Math.floor(remaining / 1000)), // 剩余时间（秒）
      ttl: Math.floor(ttl / 1000) // 总缓存时间（秒）
    }
  } catch (error) {
    return { exists: false }
  }
}
