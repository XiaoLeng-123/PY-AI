import axios from 'axios'

const API_BASE = 'http://127.0.0.1:5000/api'

// 请求拦截器 - 自动附加JWT Token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 自动刷新Token
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      const code = error.response?.data?.code
      if (code === 'token_expired') {
        originalRequest._retry = true
        try {
          const rt = localStorage.getItem('refresh_token')
          if (!rt) { localStorage.clear(); window.location.href = '/'; return Promise.reject(error) }
          const res = await axios.post(`${API_BASE}/auth/refresh`, {}, { headers: { Authorization: `Bearer ${rt}` } })
          const { access_token } = res.data
          localStorage.setItem('access_token', access_token)
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return axios(originalRequest)
        } catch { localStorage.clear(); window.location.href = '/'; return Promise.reject(error) }
      } else if (code === 'token_revoked' || code === 'token_invalid' || code === 'token_missing') {
        localStorage.clear(); window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

// 小马相关API
export const stockAPI = {
  getAll: () => axios.get(`${API_BASE}/stocks`),
  getById: (id) => axios.get(`${API_BASE}/stocks/${id}`),
  add: (data) => axios.post(`${API_BASE}/stocks`, data),
  getInfo: (id) => axios.get(`${API_BASE}/stocks/${id}/info`),
  batchFetch: (data) => axios.post(`${API_BASE}/stocks/batch_fetch`, data),
  updateAll: () => axios.post(`${API_BASE}/stocks/update_all`),
  
  // 价格数据
  getPrices: (stockId, params) => axios.get(`${API_BASE}/stocks/${stockId}/prices`, { params }),
  addPrice: (stockId, data) => axios.post(`${API_BASE}/stocks/${stockId}/prices`, data),
  
  // 统计数据
  getStats: (stockId, params) => axios.get(`${API_BASE}/stocks/${stockId}/stats`, { params }),
  
  // 异常检测
  getAnomalies: (stockId) => axios.get(`${API_BASE}/stocks/${stockId}/anomalies`),
  
  // K线形态
  getPatterns: (stockId) => axios.get(`${API_BASE}/stocks/${stockId}/patterns`),
  
  // 技术指标
  getIndicators: (stockId, params) => axios.get(`${API_BASE}/stocks/${stockId}/indicators`, { params }),
}

// 持仓管理API
export const portfolioAPI = {
  getAll: () => axios.get(`${API_BASE}/advanced/portfolio`),
  add: (data) => axios.post(`${API_BASE}/advanced/portfolio`, data),
  update: (id, data) => axios.put(`${API_BASE}/advanced/portfolio/${id}`, data),
  delete: (id) => axios.delete(`${API_BASE}/advanced/portfolio/${id}`),
}

// 预警系统API
export const alertAPI = {
  getAll: () => axios.get(`${API_BASE}/advanced/alerts`),
  add: (data) => axios.post(`${API_BASE}/advanced/alerts`, data),
  delete: (id) => axios.delete(`${API_BASE}/advanced/alerts/${id}`),
  check: (stockId) => axios.post(`${API_BASE}/advanced/alerts/check`, { stock_id: stockId }),
}

// 对比分析API
export const compareAPI = {
  compare: (stockIds) => axios.post(`${API_BASE}/compare`, { stock_ids: stockIds }),
}

// 智能选股API
export const screenerAPI = {
  screen: (filters) => axios.post(`${API_BASE}/advanced/screener`, filters),
}

// 数据导入导出API
export const importExportAPI = {
  importCSV: (formData) => axios.post(`${API_BASE}/import/csv`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  downloadTemplate: () => axios.get(`${API_BASE}/import/template`, { responseType: 'blob' }),
  exportStocks: () => axios.get(`${API_BASE}/export/stocks`, { responseType: 'blob' }),
  exportPrices: (stockId) => axios.get(`${API_BASE}/export/prices/${stockId}`, { responseType: 'blob' }),
}

// 系统设置API
export const settingsAPI = {
  get: () => axios.get(`${API_BASE}/settings`),
  update: (data) => axios.post(`${API_BASE}/settings`, data),
  getSystemInfo: () => axios.get(`${API_BASE}/system/info`),
}

// 财务预报API
export const forecastAPI = {
  get: (stockId) => axios.get(`${API_BASE}/forecast/${stockId}`),
}

// 龙虎榜API
export const longhubangAPI = {
  get: (date) => axios.get(`${API_BASE}/longhubang`, { params: { date } }),
}

// 集合竞价API
export const auctionAPI = {
  get: (date) => axios.get(`${API_BASE}/auction`, { params: { date } }),
  getTop50: (by, date) => axios.get(`${API_BASE}/auction/top50`, { params: { by, date } }),
}

// AI分析API
export const aiAPI = {
  analyze: (data) => axios.post(`${API_BASE}/ai/analyze`, data),
  search: (query) => axios.post(`${API_BASE}/ai/search`, { query }),
}

// 仪表盘统计API
export const dashboardAPI = {
  getStats: () => axios.get(`${API_BASE}/stats/dashboard`),
}
