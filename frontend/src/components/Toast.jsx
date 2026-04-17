/**
 * Toast 通知组件
 */

import { useState, useEffect } from 'react'
import '../styles/Toast.css'

// Toast 状态管理
const toasts = []
let toastId = 0
let listeners = []

const notify = (listeners) => {
  listeners.forEach(listener => listener([...toasts]))
}

export const ToastProvider = ({ children }) => {
  const [toastList, setToastList] = useState([])

  useEffect(() => {
    listeners.push(setToastList)
    return () => {
      listeners = listeners.filter(l => l !== setToastList)
    }
  }, [])

  return (
    <>
      {children}
      <div className="toast-container">
        {toastList.map(toast => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </>
  )
}

const Toast = ({ toast }) => {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // 进入动画
    requestAnimationFrame(() => setVisible(true))

    // 自动关闭
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => {
        const index = toasts.findIndex(t => t.id === toast.id)
        if (index > -1) {
          toasts.splice(index, 1)
          notify(listeners)
        }
      }, 300)
    }, toast.duration || 3000)

    return () => clearTimeout(timer)
  }, [toast])

  const handleClose = () => {
    setExiting(true)
    setTimeout(() => {
      const index = toasts.findIndex(t => t.id === toast.id)
      if (index > -1) {
        toasts.splice(index, 1)
        notify(listeners)
      }
    }, 300)
  }

  const typeClass = `toast-${toast.type || 'info'}`

  return (
    <div className={`toast ${typeClass} ${visible ? 'toast-enter' : ''} ${exiting ? 'toast-exit' : ''}`}>
      <div className="toast-icon">
        {toast.type === 'success' && '✓'}
        {toast.type === 'error' && '✕'}
        {toast.type === 'warning' && '⚠'}
        {toast.type === 'info' && 'ℹ'}
      </div>
      <div className="toast-content">
        <div className="toast-message">{toast.message}</div>
        {toast.description && <div className="toast-description">{toast.description}</div>}
      </div>
      <button className="toast-close" onClick={handleClose}>×</button>
    </div>
  )
}

// 便捷方法
export const toast = {
  success: (message, options = {}) => {
    const id = ++toastId
    toasts.push({ id, type: 'success', message, ...options })
    notify(listeners)
    return id
  },

  error: (message, options = {}) => {
    const id = ++toastId
    toasts.push({ id, type: 'error', message, ...options })
    notify(listeners)
    return id
  },

  warning: (message, options = {}) => {
    const id = ++toastId
    toasts.push({ id, type: 'warning', message, ...options })
    notify(listeners)
    return id
  },

  info: (message, options = {}) => {
    const id = ++toastId
    toasts.push({ id, type: 'info', message, ...options })
    notify(listeners)
    return id
  }
}
