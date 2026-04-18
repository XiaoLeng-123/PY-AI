import React, { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'

const StockChart = ({ stockData, indicators, period = 'day', onPeriodChange }) => {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  
  // 技术指标显示状态
  const [showMACD, setShowMACD] = useState(false)
  const [showKDJ, setShowKDJ] = useState(false)
  const [showBOLL, setShowBOLL] = useState(false)
  const [showEMA, setShowEMA] = useState(false)
  const [showRSI, setShowRSI] = useState(false)
  const [showVOLMA, setShowVOLMA] = useState(true) // 默认显示成交量均线

  useEffect(() => {
    if (!stockData || !stockData.dates || stockData.dates.length === 0) {
      if (chartRef.current) {
        chartRef.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;">暂无数据</div>'
      }
      return
    }

    // 销毁旧实例
    if (chartInstance.current) {
      try { chartInstance.current.dispose() } catch (e) {}
      chartInstance.current = null
    }

    if (!chartRef.current) return

    chartInstance.current = echarts.init(chartRef.current)

    const upColor = '#ef5350'
    const downColor = '#26a69a'

    const getLastValid = (arr) => {
      if (!arr) return '-'
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] != null) return arr[i].toFixed(2)
      }
      return '-'
    }

    const ma5Val = getLastValid(indicators?.ma5)
    const ma10Val = getLastValid(indicators?.ma10)
    const ma20Val = getLastValid(indicators?.ma20)
    const ma60Val = getLastValid(indicators?.ma60)

    const maText = indicators ? `{ma5|MA5: ${ma5Val}}  {ma10|MA10: ${ma10Val}}  {ma20|MA20: ${ma20Val}}  {ma60|MA60: ${ma60Val}}` : ''
    
    // 周期标签
    const periodLabel = period === 'day' ? '日K' : period === 'week' ? '周K' : '月K'

    // K线数据：[open, close, low, high]
    const values = stockData.dates.map((_, i) => [
      stockData.opens[i],
      stockData.closes[i],
      stockData.lows[i],
      stockData.highs[i]
    ])

    const volumes = stockData.volumes

    // 根据选择的指标动态调整网格布局
    let gridHeight = '55%'
    let gridTop2 = '68%'
    let gridHeight2 = '20%'
    
    const hasSubChart = showMACD || showKDJ || showRSI
    if (hasSubChart) {
      gridHeight = '45%'
      gridTop2 = '60%'
      gridHeight2 = '30%'
    }

    console.log('📊 StockChart 数据对齐检查:', {
      datesLen: stockData.dates.length,
      closesLen: stockData.closes.length,
      ma5Len: indicators?.ma5?.length,
      ma10Len: indicators?.ma10?.length,
      closesFirst5: stockData.closes.slice(0, 5),
      closesLast5: stockData.closes.slice(-5),
      ma5First5: indicators?.ma5?.slice(0, 5),
      ma5Last5: indicators?.ma5?.slice(-5),
      datesFirst3: stockData.dates.slice(0, 3),
      datesLast3: stockData.dates.slice(-3)
    })

    const option = {
      animation: false,
      backgroundColor: '#fff',
      title: {
        text: maText,
        left: 10,
        top: 8,
        textStyle: {
          fontSize: 11,
          fontFamily: 'Arial, sans-serif',
          rich: {
            ma5: { color: '#ff9900', fontSize: 11, fontWeight: 'bold' },
            ma10: { color: '#6666ff', fontSize: 11, fontWeight: 'bold' },
            ma20: { color: '#cc33ff', fontSize: 11, fontWeight: 'bold' },
            ma60: { color: '#33cc33', fontSize: 11, fontWeight: 'bold' }
          }
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: { backgroundColor: '#6a7985' },
          crossStyle: { color: '#999' }
        },
        backgroundColor: 'rgba(50,50,50,0.9)',
        borderColor: 'transparent',
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: function (params) {
          if (!params || !params.length) return ''
          const kSeries = params.find(p => p.seriesName === '日K')
          if (!kSeries || !kSeries.value) return ''

          const val = kSeries.value
          const date = kSeries.axisValue
          const open = val[0], close = val[1], low = val[2], high = val[3]
          const change = close - open
          const changePct = ((change / open) * 100).toFixed(2)
          const color = change >= 0 ? '#ef5350' : '#26a69a'

          let html = '<div style="line-height:1.6">'
          html += '<div style="font-weight:bold;margin-bottom:5px;border-bottom:1px solid #555;padding-bottom:4px">' + date + '</div>'
          html += '<div style="display:flex;justify-content:space-between;min-width:130px"><span style="color:#aaa">开盘：</span><span style="color:' + (open >= close ? '#26a69a' : '#ef5350') + '">' + open.toFixed(2) + '</span></div>'
          html += '<div style="display:flex;justify-content:space-between;min-width:130px"><span style="color:#aaa">收盘：</span><span style="color:' + color + '">' + close.toFixed(2) + '</span></div>'
          html += '<div style="display:flex;justify-content:space-between;min-width:130px"><span style="color:#aaa">最低：</span><span style="color:' + color + '">' + low.toFixed(2) + '</span></div>'
          html += '<div style="display:flex;justify-content:space-between;min-width:130px"><span style="color:#aaa">最高：</span><span style="color:' + color + '">' + high.toFixed(2) + '</span></div>'
          html += '<div style="margin-top:4px;padding-top:4px;border-top:1px solid #555">'
          html += '<div style="display:flex;justify-content:space-between;min-width:130px"><span style="color:#aaa">涨跌额：</span><span style="color:' + color + '">' + change.toFixed(2) + '</span></div>'
          html += '<div style="display:flex;justify-content:space-between;min-width:130px"><span style="color:#aaa">涨跌幅：</span><span style="color:' + color + '">' + changePct + '%</span></div>'
          html += '</div>'

          params.forEach(item => {
            if (item.seriesName && item.seriesName.startsWith('MA') && item.value != null) {
              html += '<div style="display:flex;justify-content:space-between;min-width:130px;margin-top:2px"><span style="color:' + item.color + '">' + item.seriesName + '：</span><span>' + item.value.toFixed(2) + '</span></div>'
            }
            if (item.seriesName && item.seriesName.startsWith('EMA') && item.value != null) {
              html += '<div style="display:flex;justify-content:space-between;min-width:130px;margin-top:2px"><span style="color:' + item.color + '">' + item.seriesName + '：</span><span>' + item.value.toFixed(2) + '</span></div>'
            }
            if (item.seriesName && item.seriesName.startsWith('BOLL') && item.value != null) {
              html += '<div style="display:flex;justify-content:space-between;min-width:130px;margin-top:2px"><span style="color:' + item.color + '">' + item.seriesName + '：</span><span>' + item.value.toFixed(2) + '</span></div>'
            }
            if ((item.seriesName === 'K' || item.seriesName === 'D' || item.seriesName === 'J') && item.value != null) {
              html += '<div style="display:flex;justify-content:space-between;min-width:130px;margin-top:2px"><span style="color:' + item.color + '">' + item.seriesName + '：</span><span>' + item.value.toFixed(2) + '</span></div>'
            }
            if ((item.seriesName === 'MACD' || item.seriesName === 'Signal') && item.value != null) {
              html += '<div style="display:flex;justify-content:space-between;min-width:130px;margin-top:2px"><span style="color:' + item.color + '">' + item.seriesName + '：</span><span>' + item.value.toFixed(2) + '</span></div>'
            }
            if (item.seriesName === 'RSI' && item.value != null) {
              html += '<div style="display:flex;justify-content:space-between;min-width:130px;margin-top:2px"><span style="color:' + item.color + '">RSI：</span><span>' + item.value.toFixed(2) + '</span></div>'
            }
            if ((item.seriesName === 'VOL-MA5' || item.seriesName === 'VOL-MA10') && item.value != null) {
              html += '<div style="display:flex;justify-content:space-between;min-width:130px;margin-top:2px"><span style="color:' + item.color + '">' + item.seriesName + '：</span><span>' + Math.round(item.value).toLocaleString() + '</span></div>'
            }
          })

          const volSeries = params.find(p => p.seriesName === '成交量')
          if (volSeries && volSeries.value != null) {
            html += '<div style="margin-top:4px;padding-top:4px;border-top:1px solid #555;display:flex;justify-content:space-between;min-width:130px"><span style="color:#aaa">成交量：</span><span>' + volSeries.value.toLocaleString() + '</span></div>'
          }

          html += '</div>'
          return html
        }
      },
      axisPointer: {
        link: { xAxisIndex: 'all' }
      },
      grid: [
        { left: '3%', right: '50px', top: '30px', height: gridHeight },
        { left: '3%', right: '50px', top: gridTop2, height: gridHeight2 }
      ],
      xAxis: [
        {
          type: 'category',
          data: stockData.dates,
          boundaryGap: true,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { color: '#888', fontSize: 11, formatter: (v) => v.slice(5) },
          axisPointer: { type: 'shadow' }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: stockData.dates,
          boundaryGap: true,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          axisPointer: { type: 'shadow' }
        }
      ],
      yAxis: [
        {
          position: 'right',
          scale: true,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: true, lineStyle: { color: '#f0f0f0', type: 'dashed', width: 1 } },
          axisLabel: { color: '#888', fontSize: 11, formatter: (v) => v.toFixed(2) }
        },
        {
          gridIndex: 1,
          position: 'right',
          scale: true,
          splitNumber: 2,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false }
        }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], start: 50, end: 100, minValueSpan: 10 },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          top: '93%',
          height: 12,
          start: 50,
          end: 100,
          borderColor: 'transparent',
          backgroundColor: '#f5f5f5',
          fillerColor: 'rgba(239, 83, 80, 0.1)',
          handleStyle: { color: '#ccc' },
          textStyle: { color: '#999' }
        }
      ],
      series: [
        {
          name: '日K',
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upColor,
            borderColor0: downColor,
            borderWidth: 1
          },
          barMaxWidth: 14
        },
        {
          name: 'MA5',
          type: 'line',
          data: indicators?.ma5 || [],
          smooth: false,
          showSymbol: false,
          lineStyle: { width: 1, color: '#ff9900' },
          z: 2
        },
        {
          name: 'MA10',
          type: 'line',
          data: indicators?.ma10 || [],
          smooth: false,
          showSymbol: false,
          lineStyle: { width: 1, color: '#6666ff' },
          z: 2
        },
        {
          name: 'MA20',
          type: 'line',
          data: indicators?.ma20 || [],
          smooth: false,
          showSymbol: false,
          lineStyle: { width: 1, color: '#cc33ff' },
          z: 2
        },
        {
          name: 'MA60',
          type: 'line',
          data: indicators?.ma60 || [],
          smooth: false,
          showSymbol: false,
          lineStyle: { width: 1, color: '#33cc33' },
          z: 2
        },
        // BOLL布林带（如果启用）
        ...(showBOLL && indicators?.boll ? [
          {
            name: 'BOLL上轨',
            type: 'line',
            data: indicators.boll.upper || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1, color: '#faad14', type: 'dashed' },
            z: 2
          },
          {
            name: 'BOLL中轨',
            type: 'line',
            data: indicators.boll.middle || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1.5, color: '#fa8c16' },
            z: 2
          },
          {
            name: 'BOLL下轨',
            type: 'line',
            data: indicators.boll.lower || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1, color: '#faad14', type: 'dashed' },
            z: 2
          }
        ] : []),
        // EMA指数移动平均（如果启用）
        ...(showEMA && indicators?.ema12 ? [
          {
            name: 'EMA12',
            type: 'line',
            data: indicators.ema12 || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1, color: '#722ed1' },
            z: 2
          },
          {
            name: 'EMA26',
            type: 'line',
            data: indicators.ema26 || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1, color: '#b37feb' },
            z: 2
          }
        ] : []),
        {
          name: '成交量',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: stockData.volumes,
          itemStyle: {
            color: (params) => {
              const idx = params.dataIndex
              if (idx >= 0 && idx < stockData.closes.length) {
                return stockData.closes[idx] > stockData.opens[idx] ? upColor : downColor
              }
              return upColor
            }
          },
          barMaxWidth: 14
        },
        // 成交量均线（默认显示）
        ...(showVOLMA && indicators?.vol_ma5 ? [
          {
            name: 'VOL-MA5',
            type: 'line',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: indicators.vol_ma5 || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1, color: '#ff9900' },
            z: 3
          },
          {
            name: 'VOL-MA10',
            type: 'line',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: indicators.vol_ma10 || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1, color: '#6666ff' },
            z: 3
          }
        ] : []),
        // MACD指标（如果启用）
        ...(showMACD && indicators?.macd ? [
          {
            name: 'MACD',
            type: 'line',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: indicators.macd.macd_line || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1, color: '#1890ff' },
            z: 2
          },
          {
            name: 'Signal',
            type: 'line',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: indicators.macd.signal_line || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1, color: '#faad14' },
            z: 2
          },
          {
            name: 'Histogram',
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: (indicators.macd.histogram || []).map(v => v === null ? 0 : v),
            itemStyle: {
              color: (params) => {
                const val = indicators.macd.histogram[params.dataIndex]
                return val >= 0 ? '#ef5350' : '#26a69a'
              }
            },
            barMaxWidth: 10
          }
        ] : []),
        // KDJ指标（如果启用）
        ...(showKDJ && indicators?.kdj ? [
          {
            name: 'K',
            type: 'line',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: indicators.kdj.k || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1, color: '#52c41a' },
            z: 2
          },
          {
            name: 'D',
            type: 'line',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: indicators.kdj.d || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1, color: '#1890ff' },
            z: 2
          },
          {
            name: 'J',
            type: 'line',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: indicators.kdj.j || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1, color: '#f5222d', type: 'dashed' },
            z: 2
          }
        ] : []),
        // RSI指标（如果启用）
        ...(showRSI && indicators?.rsi ? [
          {
            name: 'RSI',
            type: 'line',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: indicators.rsi || [],
            smooth: false,
            showSymbol: false,
            lineStyle: { width: 1.5, color: '#eb2f96' },
            z: 2
          }
        ] : [])
      ]
    }

    chartInstance.current.setOption(option)

    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize()
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartInstance.current) {
        try { chartInstance.current.dispose() } catch (e) {}
        chartInstance.current = null
      }
    }
  }, [stockData, indicators, showMACD, showKDJ, showBOLL, showEMA, showRSI, showVOLMA, period])

  return (
    <div>
      {/* 周期切换 + 技术指标切换按钮 */}
      <div style={{ 
        marginBottom: '12px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* K线周期切换 */}
        <div style={{ display: 'flex', gap: '4px', marginRight: '12px' }}>
          <button
            onClick={() => onPeriodChange && onPeriodChange('day')}
            style={{
              padding: '6px 12px',
              border: period === 'day' ? '1px solid #1890ff' : '1px solid #d9d9d9',
              background: period === 'day' ? '#e6f7ff' : '#fff',
              color: period === 'day' ? '#1890ff' : '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: period === 'day' ? 'bold' : 'normal'
            }}
          >
            日K
          </button>
          <button
            onClick={() => onPeriodChange && onPeriodChange('week')}
            style={{
              padding: '6px 12px',
              border: period === 'week' ? '1px solid #1890ff' : '1px solid #d9d9d9',
              background: period === 'week' ? '#e6f7ff' : '#fff',
              color: period === 'week' ? '#1890ff' : '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: period === 'week' ? 'bold' : 'normal'
            }}
          >
            周K
          </button>
          <button
            onClick={() => onPeriodChange && onPeriodChange('month')}
            style={{
              padding: '6px 12px',
              border: period === 'month' ? '1px solid #1890ff' : '1px solid #d9d9d9',
              background: period === 'month' ? '#e6f7ff' : '#fff',
              color: period === 'month' ? '#1890ff' : '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: period === 'month' ? 'bold' : 'normal'
            }}
          >
            月K
          </button>
        </div>
        
        {/* 分隔线 */}
        <div style={{ width: '1px', height: '24px', background: '#d9d9d9', margin: '0 4px' }} />
        
        {/* 技术指标切换 */}
        <button
          onClick={() => setShowMACD(!showMACD)}
          style={{
            padding: '6px 12px',
            border: showMACD ? '1px solid #1890ff' : '1px solid #d9d9d9',
            background: showMACD ? '#e6f7ff' : '#fff',
            color: showMACD ? '#1890ff' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: showMACD ? 'bold' : 'normal'
          }}
        >
          📊 MACD
        </button>
        <button
          onClick={() => setShowKDJ(!showKDJ)}
          style={{
            padding: '6px 12px',
            border: showKDJ ? '1px solid #52c41a' : '1px solid #d9d9d9',
            background: showKDJ ? '#f6ffed' : '#fff',
            color: showKDJ ? '#52c41a' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: showKDJ ? 'bold' : 'normal'
          }}
        >
          📈 KDJ
        </button>
        <button
          onClick={() => setShowBOLL(!showBOLL)}
          style={{
            padding: '6px 12px',
            border: showBOLL ? '1px solid #faad14' : '1px solid #d9d9d9',
            background: showBOLL ? '#fffbe6' : '#fff',
            color: showBOLL ? '#faad14' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: showBOLL ? 'bold' : 'normal'
          }}
        >
          🎯 BOLL
        </button>
        <button
          onClick={() => setShowEMA(!showEMA)}
          style={{
            padding: '6px 12px',
            border: showEMA ? '1px solid #722ed1' : '1px solid #d9d9d9',
            background: showEMA ? '#f9f0ff' : '#fff',
            color: showEMA ? '#722ed1' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: showEMA ? 'bold' : 'normal'
          }}
        >
          📉 EMA
        </button>
        <button
          onClick={() => setShowRSI(!showRSI)}
          style={{
            padding: '6px 12px',
            border: showRSI ? '1px solid #eb2f96' : '1px solid #d9d9d9',
            background: showRSI ? '#fff0f6' : '#fff',
            color: showRSI ? '#eb2f96' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: showRSI ? 'bold' : 'normal'
          }}
        >
          💪 RSI
        </button>
        <button
          onClick={() => setShowVOLMA(!showVOLMA)}
          style={{
            padding: '6px 12px',
            border: showVOLMA ? '1px solid #13c2c2' : '1px solid #d9d9d9',
            background: showVOLMA ? '#e6fffb' : '#fff',
            color: showVOLMA ? '#13c2c2' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: showVOLMA ? 'bold' : 'normal'
          }}
        >
          📊 VOL-MA
        </button>
      </div>
      
      <div ref={chartRef} style={{ width: '100%', height: '600px' }} />
    </div>
  )
}

export default StockChart
