import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = 'http://127.0.0.1:5000'

export const useRealtimeStock = (stockId) => {
  const socketRef = useRef(null)
  const [realtimePrice, setRealtimePrice] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 3

  useEffect(() => {
    if (!stockId) return

    // 创建WebSocket连接
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 5000
    })

    // 连接成功
    socketRef.current.on('connect', () => {
      console.log('WebSocket已连接')
      setIsConnected(true)
      reconnectAttempts.current = 0
      
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
    socketRef.current.on('disconnect', (reason) => {
      console.log('WebSocket已断开:', reason)
      setIsConnected(false)
    })

    // 错误处理 - 静默处理，不输出到控制台
    socketRef.current.on('connect_error', (error) => {
      reconnectAttempts.current++
      if (reconnectAttempts.current <= maxReconnectAttempts) {
        console.log(`WebSocket连接尝试 ${reconnectAttempts.current}/${maxReconnectAttempts}`)
      }
    })

    // 清理函数
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [stockId])

  return { realtimePrice, isConnected }
}
