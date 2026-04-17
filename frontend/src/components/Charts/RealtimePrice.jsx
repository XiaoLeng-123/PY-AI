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
  const changePercent = realtimePrice.change_percent || 0

  return (
    <div style={{
      padding: '12px 16px',
      background: '#f6ffed',
      borderRadius: '8px',
      border: '1px solid #b7eb8f'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            实时价格 {stockCode}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
            ¥{realtimePrice.price?.toFixed(2)}
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div className={change >= 0 ? 'positive' : 'negative'} style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}
          </div>
          <div className={changePercent >= 0 ? 'positive' : 'negative'} style={{ fontSize: '14px' }}>
            {changePercent >= 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(2)}%
          </div>
        </div>
      </div>
      
      <div style={{ 
        marginTop: '8px', 
        paddingTop: '8px', 
        borderTop: '1px solid #d9f7be',
        fontSize: '12px',
        color: '#666',
        display: 'flex',
        gap: '16px'
      }}>
        <span>最高: ¥{realtimePrice.high?.toFixed(2)}</span>
        <span>最低: ¥{realtimePrice.low?.toFixed(2)}</span>
        <span>成交量: {(realtimePrice.volume || 0).toLocaleString()}</span>
      </div>
      
      <div style={{
        marginTop: '4px',
        fontSize: '11px',
        color: '#52c41a'
      }}>
        🟢 实时更新中
      </div>
    </div>
  )
}

export default RealtimePrice
