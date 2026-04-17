/**
 * CSV 导出工具
 */

// 将数据导出为 CSV 文件
export const exportToCSV = (data, filename = 'export.csv', options = {}) => {
  try {
    if (!data || data.length === 0) {
      throw new Error('没有可导出的数据')
    }

    const {
      headers = null, // 自定义表头
      excludeFields = [], // 排除的字段
      dateFormat = 'YYYY-MM-DD', // 日期格式
      delimiter = ',' // 分隔符（默认逗号）
    } = options

    // 获取所有字段名（排除指定字段）
    const allFields = Object.keys(data[0]).filter(field => !excludeFields.includes(field))
    
    // 使用自定义表头或字段名
    const fields = headers || allFields

    // CSV 头部
    const csvHeaders = fields.map(field => {
      if (typeof field === 'object') {
        return `"${field.label}"`
      }
      return `"${field}"`
    }).join(delimiter)

    // CSV 数据行
    const csvRows = data.map(row => {
      return fields.map(field => {
        const fieldName = typeof field === 'object' ? field.key : field
        let value = row[fieldName]

        // 处理 undefined/null
        if (value === undefined || value === null) {
          value = ''
        }

        // 处理数字
        if (typeof value === 'number') {
          value = value.toString()
        }

        // 处理日期对象
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0]
        }

        // 处理布尔值
        if (typeof value === 'boolean') {
          value = value ? '是' : '否'
        }

        // 转义包含分隔符、引号或换行符的值
        if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`
        }

        return value
      }).join(delimiter)
    })

    // 组合 CSV 内容
    const csvContent = [csvHeaders, ...csvRows].join('\n')

    // 添加 UTF-8 BOM 以支持中文
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    // 创建下载链接
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return { success: true, rows: data.length }
  } catch (error) {
    console.error('导出 CSV 失败:', error)
    return { success: false, error: error.message }
  }
}

// 导出价格数据
export const exportPriceData = (prices, stockName = '') => {
  const filename = stockName 
    ? `价格数据_${stockName}_${new Date().toISOString().split('T')[0]}.csv`
    : `价格数据_${new Date().toISOString().split('T')[0]}.csv`

  const exportData = prices.map(p => ({
    '日期': p.date,
    '开盘价': p.open,
    '最高价': p.high,
    '最低价': p.low,
    '收盘价': p.close,
    '成交量': p.volume
  }))

  return exportToCSV(exportData, filename, {
    headers: ['日期', '开盘价', '最高价', '最低价', '收盘价', '成交量']
  })
}

// 导出统计数据
export const exportStatsData = (stats, stockName = '') => {
  const filename = stockName 
    ? `统计数据_${stockName}_${new Date().toISOString().split('T')[0]}.csv`
    : `统计数据_${new Date().toISOString().split('T')[0]}.csv`

  if (!stats) return { success: false, error: '没有统计数据' }

  const exportData = []

  // 价格统计
  if (stats.price_stats) {
    exportData.push({
      '指标': '最高价',
      '数值': stats.price_stats.highest
    })
    exportData.push({
      '指标': '最低价',
      '数值': stats.price_stats.lowest
    })
    exportData.push({
      '指标': '平均价',
      '数值': stats.price_stats.average
    })
    exportData.push({
      '指标': '最新价',
      '数值': stats.price_stats.latest
    })
  }

  // 收益率统计
  if (stats.return_stats) {
    exportData.push({
      '指标': '总收益率',
      '数值': stats.return_stats.total + '%'
    })
    exportData.push({
      '指标': '年化收益率',
      '数值': stats.return_stats.annualized + '%'
    })
  }

  return exportToCSV(exportData, filename, {
    headers: ['指标', '数值']
  })
}

// 导出小马列表
export const exportStockList = (stocks) => {
  const filename = `小马列表_${new Date().toISOString().split('T')[0]}.csv`

  const exportData = stocks.map(s => ({
    '代码': s.code,
    '名称': s.name,
    '市场': s.market,
    '添加时间': s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : ''
  }))

  return exportToCSV(exportData, filename, {
    headers: ['代码', '名称', '市场', '添加时间']
  })
}
