import React from 'react'
import { useRealtimeStock } from '../../hooks/useRealtimeStock'

const RealtimePrice = ({ stockId, stockCode, stockName }) => {
  const { realtimePrice, isConnected } = useRealtimeStock(stockId)

  if (!isConnected) {
    return (
      <div style={{
        padding: '8px 16px',
        background: '#fff7e6',
        borderRadius: '4px',
        fontSize: '13px',
        color: '#fa8c16'
      }}>
        ⚡ 实时行情未连接
      </div>
    )
  }

  if (!realtimePrice) {
    return (
      <div style={{
        padding: '8px 16px',
        background: '#f0f5ff',
        borderRadius: '4px',
        fontSize: '13px',
        color: '#1890ff'
      }}>
        📡 等待实时数据...
      </div>
    )
  }

  const change = realtimePrice.change || 0
  const changeAmount = realtimePrice.change_amount || 0

  // 格式化数字
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return '-'
    return Number(num).toFixed(decimals)
  }

  const formatVolume = (vol) => {
    if (!vol) return '-'
    if (vol >= 10000) {
      return (vol / 10000).toFixed(2) + '万'
    }
    return vol.toLocaleString()
  }

  return (
    <div style={{
      padding: '16px',
      background: '#fff',
      borderRadius: '8px',
      border: '1px solid #e8e8e8',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      {/* 顶部：股票名称和代码 */}
      <div style={{ 
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
          {stockName} <span style={{ color: '#999', fontSize: '13px' }}>{stockCode}</span>
        </div>
        <div style={{
          padding: '2px 8px',
          background: '#52c41a',
          color: '#fff',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          🟢 实时更新中
        </div>
      </div>

      {/* 中间：价格和涨跌幅 */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '24px',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>最新价</div>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: change >= 0 ? '#ef5350' : '#26a69a'
          }}>
            ¥{formatNumber(realtimePrice.price)}
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: change >= 0 ? '#ef5350' : '#26a69a'
          }}>
            {change >= 0 ? '+' : ''}{formatNumber(change)}%
          </div>
          <div style={{ 
            fontSize: '14px',
            color: change >= 0 ? '#ef5350' : '#26a69a'
          }}>
            {change >= 0 ? '+' : ''}{formatNumber(changeAmount)}
          </div>
        </div>
      </div>
      
      {/* 底部：详细指标网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #f0f0f0'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>最高</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            ¥{formatNumber(realtimePrice.high)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>最低</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            ¥{formatNumber(realtimePrice.low)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>开盘</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            ¥{formatNumber(realtimePrice.open)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>昨收</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            ¥{formatNumber(realtimePrice.prev_close)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>成交量</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            {formatVolume(realtimePrice.volume)}手
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>成交额</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            {formatVolume(realtimePrice.amount)}万
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>换手率</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            {formatNumber(realtimePrice.turnover)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>量比</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            {formatNumber(realtimePrice.volume_ratio)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>市盈率</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            {formatNumber(realtimePrice.pe)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>振幅</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            {formatNumber(realtimePrice.amplitude)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>总市值</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            {formatNumber(realtimePrice.total_market_value, 1)}亿
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>流通市值</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            {formatNumber(realtimePrice.circulating_value, 1)}亿
          </div>
        </div>
      </div>
    </div>
  )
}

export default RealtimePrice
