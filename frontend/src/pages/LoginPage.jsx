import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../components/Toast'

export default function LoginPage() {
  const { login, register } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', email: '', nickname: '' })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isLogin) {
        await login(form.username, form.password)
        toast.success('登录成功，欢迎回来！')
      } else {
        if (form.password !== form.confirmPassword) { toast.error('两次输入的密码不一致'); setLoading(false); return }
        if (form.password.length < 6) { toast.error('密码长度至少6位'); setLoading(false); return }
        await register(form.username, form.password, form.email, form.nickname)
        toast.success('注册成功，欢迎使用小马分析！')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || (isLogin ? '登录失败' : '注册失败'))
    } finally { setLoading(false) }
  }

  const switchMode = () => { setIsLogin(!isLogin); setForm({ username: '', password: '', confirmPassword: '', email: '', nickname: '' }) }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
    color: '#fff', fontSize: '14px', outline: 'none', transition: 'border-color 0.3s', boxSizing: 'border-box'
  }

  const labelStyle = { display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '6px', fontWeight: '500' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)', top: -100, right: -100 }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(118,75,162,0.15) 0%, transparent 70%)', bottom: -80, left: -80 }} />
      <div style={{ width: 420, maxWidth: '90vw', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)', padding: 40, boxShadow: '0 25px 50px rgba(0,0,0,0.3)', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🐴</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 4px 0', letterSpacing: 2 }}>小马分析</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>专业股票分析系统</p>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {['登录', '注册'].map((label, i) => (
            <button key={label} onClick={() => setIsLogin(i === 0)} style={{
              flex: 1, padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, transition: 'all 0.3s',
              background: (i === 0 ? isLogin : !isLogin) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: (i === 0 ? isLogin : !isLogin) ? '#fff' : 'rgba(255,255,255,0.5)'
            }}>{label}</button>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}><label style={labelStyle}>用户名</label><input type="text" name="username" value={form.username} onChange={handleChange} placeholder="请输入用户名" required style={inputStyle} onFocus={e => e.target.style.borderColor='rgba(102,126,234,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'} /></div>
          {!isLogin && <div style={{ marginBottom: 16 }}><label style={labelStyle}>邮箱（选填）</label><input type="email" name="email" value={form.email} onChange={handleChange} placeholder="请输入邮箱" style={inputStyle} onFocus={e => e.target.style.borderColor='rgba(102,126,234,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'} /></div>}
          {!isLogin && <div style={{ marginBottom: 16 }}><label style={labelStyle}>昵称（选填）</label><input type="text" name="nickname" value={form.nickname} onChange={handleChange} placeholder="请输入昵称" style={inputStyle} onFocus={e => e.target.style.borderColor='rgba(102,126,234,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'} /></div>}
          <div style={{ marginBottom: 16 }}><label style={labelStyle}>密码</label><input type="password" name="password" value={form.password} onChange={handleChange} placeholder={isLogin ? '请输入密码' : '至少6位密码'} required style={inputStyle} onFocus={e => e.target.style.borderColor='rgba(102,126,234,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'} /></div>
          {!isLogin && <div style={{ marginBottom: 20 }}><label style={labelStyle}>确认密码</label><input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="请再次输入密码" required style={inputStyle} onFocus={e => e.target.style.borderColor='rgba(102,126,234,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'} /></div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.3s', letterSpacing: 2, marginTop: 8 }}>
            {loading ? (isLogin ? '登录中...' : '注册中...') : (isLogin ? '登 录' : '注 册')}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 24, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          {isLogin ? <>还没有账号？<span onClick={switchMode} style={{ color: '#667eea', cursor: 'pointer', fontWeight: 500 }}>立即注册</span></> : <>已有账号？<span onClick={switchMode} style={{ color: '#667eea', cursor: 'pointer', fontWeight: 500 }}>返回登录</span></>}
        </div>
      </div>
    </div>
  )
}
