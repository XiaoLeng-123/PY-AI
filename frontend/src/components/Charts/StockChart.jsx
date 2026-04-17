import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const StockChart = ({ stockData, indicators }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!stockData || !stockData.dates || stockData.dates.length === 0) {
      // 显示空状态
      if (chartRef.current) {
        chartRef.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;">暂无数据</div>';
      }
      return;
    }

    console.log('K线图数据:', stockData);
    console.log('技术指标:', indicators);

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // 准备K线数据
    const kData = [];
    for (let i = 0; i < stockData.dates.length; i++) {
      kData.push([
        stockData.dates[i],
        stockData.opens[i],
        stockData.closes[i],
        stockData.lows[i],
        stockData.highs[i]
      ]);
    }

    // 配置选项
    const option = {
      title: {
        text: `${stockData.stock_code} - ${stockData.stock_name}`,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params) {
          let result = params[0].axisValue + '<br/>';
          params.forEach(param => {
            if (param.seriesName && param.data) {
              result += param.seriesName + ': ' + param.data + '<br/>';
            }
          });
          return result;
        }
      },
      legend: {
        data: ['K线', 'MA5', 'MA10', 'MA20', 'MA60', 'MACD', 'RSI'],
        bottom: 10
      },
      grid: [
        { // 主图 - K线
          left: '10%',
          right: '10%',
          top: '10%',
          height: '50%'
        },
        { // 副图 - 成交量
          left: '10%',
          right: '10%',
          top: '65%',
          height: '10%'
        },
        { // 副图 - MACD
          left: '10%',
          right: '10%',
          top: '78%',
          height: '10%'
        },
        { // 副图 - RSI
          left: '10%',
          right: '10%',
          top: '91%',
          height: '8%'
        }
      ],
      xAxis: [
        { gridIndex: 0, type: 'category', data: stockData.dates },
        { gridIndex: 1, type: 'category', data: stockData.dates },
        { gridIndex: 2, type: 'category', data: stockData.dates },
        { gridIndex: 3, type: 'category', data: stockData.dates }
      ],
      yAxis: [
        { gridIndex: 0, scale: true },
        { gridIndex: 1, scale: true },
        { gridIndex: 2, scale: true },
        { gridIndex: 3, scale: true }
      ],
      series: [
        // K线
        {
          name: 'K线',
          type: 'candlestick',
          data: kData,
          gridIndex: 0,
          itemStyle: {
            color: '#ef5350', // 阳线红色
            color0: '#26a69a', // 阴线绿色
            borderColor: '#ef5350',
            borderColor0: '#26a69a'
          }
        },
        // 成交量
        {
          name: '成交量',
          type: 'bar',
          data: stockData.volumes || [],
          gridIndex: 1,
          itemStyle: {
            color: function(params) {
              const dataIndex = params.dataIndex;
              if (dataIndex > 0) {
                const prevClose = stockData.closes[dataIndex - 1];
                const currentClose = stockData.closes[dataIndex];
                return currentClose >= prevClose ? '#ef5350' : '#26a69a';
              }
              return '#ef5350';
            }
          }
        },
        // MA5
        {
          name: 'MA5',
          type: 'line',
          data: indicators.ma5 || [],
          smooth: true,
          lineStyle: { color: '#FF6B6B', width: 1 },
          gridIndex: 0
        },
        // MA10
        {
          name: 'MA10',
          type: 'line',
          data: indicators.ma10 || [],
          smooth: true,
          lineStyle: { color: '#4ECDC4', width: 1 },
          gridIndex: 0
        },
        // MA20
        {
          name: 'MA20',
          type: 'line',
          data: indicators.ma20 || [],
          smooth: true,
          lineStyle: { color: '#45B7D1', width: 1 },
          gridIndex: 0
        },
        // MA60
        {
          name: 'MA60',
          type: 'line',
          data: indicators.ma60 || [],
          smooth: true,
          lineStyle: { color: '#96CEB4', width: 1 },
          gridIndex: 0
        },
        // MACD线
        {
          name: 'MACD',
          type: 'bar',
          data: indicators.macd?.histogram || [],
          gridIndex: 2,
          itemStyle: {
            color: function(params) {
              return params.data >= 0 ? '#ef5350' : '#26a69a';
            }
          }
        },
        // MACD信号线
        {
          name: 'Signal',
          type: 'line',
          data: indicators.macd?.signal_line || [],
          smooth: true,
          lineStyle: { color: '#FFD93D', width: 1 },
          gridIndex: 2
        },
        // RSI线
        {
          name: 'RSI',
          type: 'line',
          data: indicators.rsi || [],
          smooth: true,
          lineStyle: { color: '#BA55D3', width: 2 },
          gridIndex: 3
        }
      ]
    };

    chartInstance.current.setOption(option);

    // 处理窗口大小变化
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, [stockData, indicators]);

  return <div ref={chartRef} style={{ width: '100%', height: '600px' }} />;
};

export default StockChart;
