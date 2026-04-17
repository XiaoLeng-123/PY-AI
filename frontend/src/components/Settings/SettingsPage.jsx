import React, { useState, useEffect } from 'react'
import { settingsAPI, importExportAPI } from '../../utils/api'

const SettingsPage = ({ toast }) => {
  const [systemInfo, setSystemInfo] = useState(null)
  const [settings, setSettings] = useState({})

  useEffect(() => {
    loadSystemInfo()
  }, [])

  const loadSystemInfo = async () => {
    try {
      const [infoRes, settingsRes] = await Promise.all([
        settingsAPI.getSystemInfo(),
        settingsAPI.get()
      ])
      setSystemInfo(infoRes.data)
      setSettings(settingsRes.data)
    } catch (error) {
      console.error('加载系统信息失败:', error)
    }
  }

  const handleSaveSettings = async () => {
    try {
      await settingsAPI.update(settings)
      toast.success('设置已保存')
    } catch (error) {
      toast.error('保存失败')
    }
  }

  const handleExportAllStocks = async () => {
    try {
      const response = await importExportAPI.exportStocks()
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `stocks_export_${new Date().getTime()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('导出成功')
    } catch (error) {
      toast.error('导出失败')
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>⚙️ 系统设置</h2>
      </div>

      {/* 系统信息 */}
      {systemInfo && (
        <div className="card" style={{marginBottom: '24px'}}>
          <h3>📊 系统信息</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px'}}>
            <div style={{padding: '16px', background: '#f0f5ff', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#666', marginBottom: '4px'}}>版本号</div>
              <div style={{fontSize: '18px', fontWeight: 'bold'}}>{systemInfo.version}</div>
            </div>
            <div style={{padding: '16px', background: '#f6ffed', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#666', marginBottom: '4px'}}>小马数量</div>
              <div style={{fontSize: '18px', fontWeight: 'bold'}}>{systemInfo.stock_count} 只</div>
            </div>
            <div style={{padding: '16px', background: '#fff7e6', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#666', marginBottom: '4px'}}>价格记录</div>
              <div style={{fontSize: '18px', fontWeight: 'bold'}}>{systemInfo.price_count.toLocaleString()} 条</div>
            </div>
            <div style={{padding: '16px', background: '#fff1f0', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#666', marginBottom: '4px'}}>持仓数量</div>
              <div style={{fontSize: '18px', fontWeight: 'bold'}}>{systemInfo.portfolio_count} 只</div>
            </div>
            <div style={{padding: '16px', background: '#f9f0ff', borderRadius: '8px'}}>
              <div style={{fontSize: '13px', color: '#666', marginBottom: '4px'}}>数据库大小</div>
              <div style={{fontSize: '18px', fontWeight: 'bold'}}>{systemInfo.db_size_mb} MB</div>
            </div>
          </div>
        </div>
      )}

      {/* 数据导出 */}
      <div className="card" style={{marginBottom: '24px'}}>
        <h3>📥 数据导出</h3>
        <p style={{color: '#666', fontSize: '14px', marginBottom: '16px'}}>导出所有小马基本信息为Excel文件</p>
        <button onClick={handleExportAllStocks} className="btn-primary">
          导出所有小马数据
        </button>
      </div>

      {/* 系统配置 */}
      <div className="card">
        <h3>🔧 系统配置</h3>
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fafafa', borderRadius: '4px'}}>
            <div>
              <div style={{fontWeight: 'bold', marginBottom: '4px'}}>启用缓存</div>
              <div style={{fontSize: '13px', color: '#999'}}>提高数据加载速度</div>
            </div>
            <label style={{position: 'relative', display: 'inline-block', width: '50px', height: '24px'}}>
              <input
                type="checkbox"
                checked={settings.cache_enabled || false}
                onChange={(e) => setSettings({...settings, cache_enabled: e.target.checked})}
                style={{opacity: 0, width: 0, height: 0}}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: settings.cache_enabled ? '#1890ff' : '#ccc',
                transition: '.4s',
                borderRadius: '24px'
              }}></span>
            </label>
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fafafa', borderRadius: '4px'}}>
            <div>
              <div style={{fontWeight: 'bold', marginBottom: '4px'}}>自动刷新</div>
              <div style={{fontSize: '13px', color: '#999'}}>定期更新数据</div>
            </div>
            <label style={{position: 'relative', display: 'inline-block', width: '50px', height: '24px'}}>
              <input
                type="checkbox"
                checked={settings.auto_refresh || false}
                onChange={(e) => setSettings({...settings, auto_refresh: e.target.checked})}
                style={{opacity: 0, width: 0, height: 0}}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: settings.auto_refresh ? '#1890ff' : '#ccc',
                transition: '.4s',
                borderRadius: '24px'
              }}></span>
            </label>
          </div>
        </div>

        <div style={{marginTop: '24px', textAlign: 'right'}}>
          <button onClick={handleSaveSettings} className="btn-primary">
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
