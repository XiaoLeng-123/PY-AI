import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = 'http://127.0.0.1:5000'

export const useRealtimeStock = (stockId) => {
  const socketRef = useRef(null)
  const [realtimePrice, setRealtimePrice] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!stockId) return

    // 创建WebSocket连接
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    })

    // 连接成功
    socketRef.current.on('connect', () => {
      console.log('WebSocket已连接')
      setIsConnected(true)
      
      // 订阅指定小马
      socketRef.current.emit('subscribe_stock', { stock_id: stockId })
    })

    // 接收实时价格更新
    socketRef.current.on('price_update', (data) => {
      if (data.stock_id === stockId) {
        setRealtimePrice(data.data)
      }
    })

    // 连接状态
    socketRef.current.on('status', (msg) => {
      console.log('服务器消息:', msg)
    })

    // 断开连接
    socketRef.current.on('disconnect', () => {
      console.log('WebSocket已断开')
      setIsConnected(false)
    })

    // 错误处理
    socketRef.current.on('connect_error', (error) => {
      console.error('WebSocket连接错误:', error)
    })

    // 清理函数
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [stockId])

  return { realtimePrice, isConnected }
}
