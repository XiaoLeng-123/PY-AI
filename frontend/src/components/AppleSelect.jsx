import { useState, useMemo, useRef, useEffect } from 'react'

/**
 * 苹果风格搜索选择器组件
 * 支持模糊查询、药丸形状设计、毛玻璃效果
 * 
 * @param {Array} options - 选项列表 [{value, label, ...}]
 * @param {string} value - 当前选中的值
 * @param {function} onChange - 值改变回调
 * @param {string} placeholder - 占位符文本
 * @param {string} label - 标签文本
 * @param {boolean} disabled - 是否禁用
 * @param {string} width - 宽度（默认100%）
 * @param {function} renderOption - 自定义选项渲染函数
 */
export default function AppleSelect({
  options = [],
  value = '',
  onChange,
  placeholder = '请选择...',
  label,
  disabled = false,
  width = '100%',
  renderOption,
  filterFields = ['label'] // 用于模糊搜索的字段
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  // 获取选中项的显示文本
  const selectedOption = options.find(opt => opt.value === value)
  const displayText = selectedOption ? (selectedOption.label || selectedOption.name || selectedOption.code) : ''

  // 过滤选项（支持模糊查询）
  const filteredOptions = useMemo(() => {
    if (!searchText) return options
    
    const lowerSearch = searchText.toLowerCase()
    return options.filter(option => {
      return filterFields.some(field => {
        const fieldValue = option[field]
        return fieldValue && String(fieldValue).toLowerCase().includes(lowerSearch)
      })
    })
  }, [options, searchText, filterFields])

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchText('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 打开时自动聚焦
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100)
    }
  }, [isOpen])

  const handleSelect = (option) => {
    onChange(option.value)
    setIsOpen(false)
    setSearchText('')
  }

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        setSearchText('')
      }
    }
  }

  return (
    <div className="apple-select-wrapper" style={{ width }} ref={wrapperRef}>
      {/* 标签 */}
      {label && (
        <label className="apple-select-label">{label}</label>
      )}

      {/* 选择器主体 */}
      <div 
        className={`apple-select-box ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleToggle}
      >
        {/* 左侧图标 */}
        <span className="apple-select-icon">🔍</span>
        
        {/* 显示文本或搜索输入 */}
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            className="apple-select-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={placeholder}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`apple-select-display ${!displayText ? 'placeholder' : ''}`}>
            {displayText || placeholder}
          </span>
        )}
        
        {/* 右侧箭头 */}
        <span className={`apple-select-arrow ${isOpen ? 'rotated' : ''}`}>▼</span>
      </div>

      {/* 下拉选项列表 */}
      {isOpen && (
        <div className="apple-select-dropdown">
          {filteredOptions.length === 0 ? (
            <div className="apple-select-empty">
              <span className="empty-icon">🔍</span>
              <span className="empty-text">未找到匹配项</span>
            </div>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = option.value === value
              return (
                <div
                  key={option.value}
                  className={`apple-select-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  {renderOption ? renderOption(option) : (
                    <>
                      <span className="option-label">{option.label || option.name || option.code}</span>
                      {option.subLabel && (
                        <span className="option-sublabel">{option.subLabel}</span>
                      )}
                      {isSelected && (
                        <span className="option-check">✓</span>
                      )}
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
