import { useState } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

const API_BASE = 'http://127.0.0.1:5000/api'

export default function AiAnalysisPage({ selectedStock, stocks }) {
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiQueryDate, setAiQueryDate] = useState('')
  
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
  
  return (
    <div className="page-content">
      <div className="card">
        <h3>🤖 AI智能分析</h3>
        
        {selectedStock && (
          <div className="form-item" style={{marginBottom: '15px'}}>
            <label>当前分析股票</label>
            <div style={{padding: '8px 12px', background: '#f0f5ff', borderRadius: '4px'}}>
              {stocks.find(s => s.id === Number(selectedStock))?.name} ({stocks.find(s => s.id === Number(selectedStock))?.code})
            </div>
          </div>
        )}
        
        <div className="form-item">
          <label>提问或分析要求</label>
          <textarea
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            placeholder="例如: 请分析这只股票的未来走势，或者输入任何你想问的问题..."
            rows={4}
            style={{width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d9d9d9'}}
          />
        </div>
        
        <div className="form-item">
          <label>分析日期(可选)</label>
          <input
            type="date"
            value={aiQueryDate}
            onChange={(e) => setAiQueryDate(e.target.value)}
          />
        </div>
        
        <div className="form-row">
          <button onClick={handleAiAnalyze} className="btn-primary" disabled={aiAnalyzing}>
            {aiAnalyzing ? '分析中...' : '📊 股票分析'}
          </button>
          <button onClick={handleAiChat} className="btn-secondary" disabled={aiAnalyzing}>
            💬 通用对话
          </button>
        </div>
        
        {aiAnswer && (
          <div style={{marginTop: '20px', padding: '15px', background: '#f6ffed', borderRadius: '8px', whiteSpace: 'pre-wrap'}}>
            <h4 style={{marginTop: 0}}>AI回复:</h4>
            {aiAnswer}
          </div>
        )}
      </div>
    </div>
  )
}
