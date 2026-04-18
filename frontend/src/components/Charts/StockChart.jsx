import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

const StockChart = ({ stockData, indicators }) => {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

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

    const upColor = '#ec0000'
    const downColor = '#00da3c'
    const upBorderColor = '#8A0000'
    const downBorderColor = '#008F28'

    // K线数据：[open, close, low, high]
    const values = stockData.dates.map((_, i) => [
      stockData.opens[i],
      stockData.closes[i],
      stockData.lows[i],
      stockData.highs[i]
    ])

    // 成交量数据
    const volumes = stockData.dates.map((_, i) => [
      i,
      stockData.volumes[i],
      stockData.closes[i] > stockData.opens[i] ? 1 : -1
    ])

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
      legend: {
        bottom: 10,
        left: 'center',
        data: ['日K', 'MA5', 'MA10', 'MA20', 'MA60']
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        textStyle: {
          color: '#000'
        },
        position: function (pos, params, el, elRect, size) {
          const obj = { top: 10 }
          obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30
          return obj
        }
      },
      axisPointer: {
        link: { xAxisIndex: 'all' },
        label: {
          backgroundColor: '#777'
        }
      },
      grid: [
        {
          left: '10%',
          right: '8%',
          height: '50%'
        },
        {
          left: '10%',
          right: '8%',
          top: '63%',
          height: '16%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: stockData.dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          splitNumber: 20,
          min: 'dataMin',
          max: 'dataMax'
        },
        {
          type: 'category',
          gridIndex: 1,
          data: stockData.dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          splitNumber: 20,
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: true
          }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 50,
          end: 100
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          top: '85%',
          start: 50,
          end: 100
        }
      ],
      visualMap: {
        show: false,
        seriesIndex: 5,
        pieces: [
          { value: 1, color: downColor },
          { value: -1, color: upColor }
        ]
      },
      series: [
        {
          name: '日K',
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upBorderColor,
            borderColor0: downBorderColor
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: indicators?.ma5 || [],
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA10',
          type: 'line',
          data: indicators?.ma10 || [],
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA20',
          type: 'line',
          data: indicators?.ma20 || [],
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA60',
          type: 'line',
          data: indicators?.ma60 || [],
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: '成交量',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes
        }
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
  }, [stockData, indicators])

  return <div ref={chartRef} style={{ width: '100%', height: '600px' }} />
}

export default StockChart
