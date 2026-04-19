import { useState } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'
import AppleDatePicker from '../components/AppleDatePicker'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function AiAnalysisPage({ selectedStock, stocks }) {
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiQueryDate, setAiQueryDate] = useState(new Date().toISOString().split('T')[0])
  
  const handleAiAnalyze = async () => {
    if (!selectedStock) {
      toast.warning('请先选择股票')
      return
    }
    
    setAiAnalyzing(true)
    try {
      const response = await axios.post(`${API_BASE}/ai/analyze`, {
        stock_id: selectedStock,
        question: aiQuestion || '请分析这只股票的走势',
        date: aiQueryDate
      })
      setAiAnswer(response.data.analysis)
    } catch (error) {
      toast.error(error.response?.data?.error || 'AI分析失败')
    } finally {
      setAiAnalyzing(false)
    }
  }
  
  const handleAiChat = async () => {
    if (!aiQuestion.trim()) {
      toast.warning('请输入问题')
      return
    }
    
    setAiAnalyzing(true)
    try {
      const response = await axios.post(`${API_BASE}/ai/chat`, {
        question: aiQuestion
      })
      setAiAnswer(response.data.answer)
    } catch (error) {
      toast.error('AI对话失败')
    } finally {
      setAiAnalyzing(false)
    }
  }
  
  const currentStock = stocks.find(s => s.id === Number(selectedStock))
  
  return (
    <div className="page-content">
      {/* 头部卡片 */}
      <div className="ai-header-card">
        <div className="header-icon">🤖</div>
        <div className="header-info">
          <h3>AI智能分析</h3>
          <p>基于人工智能的股票分析与智能问答</p>
        </div>
      </div>
        
      {selectedStock && (
        <div className="card" style={{marginBottom: '20px'}}>
          <div className="current-stock-badge">
            <span className="badge-icon">📊</span>
            <span>当前分析：</span>
            <strong>{currentStock?.name}</strong>
            <span className="stock-code">({currentStock?.code})</span>
          </div>
        </div>
      )}
        
      {/* 输入区域 - 药丸形状 */}
      <div className="card" style={{marginBottom: '20px'}}>
        <div className="ai-input-group">
          <label className="control-label">提问或分析要求</label>
          <textarea
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            placeholder="例如: 请分析这只股票的未来走势，或者输入任何你想问的问题..."
            rows={4}
            className="apple-input apple-textarea"
          />
        </div>
        
        <div className="ai-input-group">
          <AppleDatePicker
            value={aiQueryDate}
            onChange={setAiQueryDate}
            placeholder="选择分析日期"
            width="100%"
            label="分析日期（可选）"
          />
        </div>
        
        <div className="ai-actions">
          <button 
            onClick={handleAiAnalyze} 
            className="btn-primary pill-btn"
            disabled={aiAnalyzing}
          >
            {aiAnalyzing ? (
              <>
                <span className="btn-spinner"></span>
                分析中...
              </>
            ) : (
              <>
                <span className="btn-icon">📊</span>
                股票分析
              </>
            )}
          </button>
          <button 
            onClick={handleAiChat} 
            className="btn-secondary pill-btn"
            disabled={aiAnalyzing}
          >
            💬 通用对话
          </button>
        </div>
      </div>
        
      {aiAnswer && (
        <div className="ai-answer-container">
          <h4 className="answer-title">AI回复</h4>
          <div className="answer-content">
            {aiAnswer}
          </div>
        </div>
      )}
    </div>
  )
}
