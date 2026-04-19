import React, { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { zhCN } from 'date-fns/locale'

const AppleDatePicker = ({ 
  value, 
  onChange, 
  placeholder = '选择日期',
  width = '200px',
  label = '',
  className = '',
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false)

  // 自定义输入框 - 保持与其他输入框一致
  const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
    <div 
      className="apple-input" 
      onClick={onClick} 
      ref={ref}
      style={{ 
        width,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <span className="date-input-value">
        {value || <span className="date-placeholder">{placeholder}</span>}
      </span>
      <span className="date-input-arrow" style={{ fontSize: '12px', opacity: 0.5 }}>📅</span>
    </div>
  ))

  return (
    <div className={`apple-datepicker-wrapper ${className}`}>
      {label && <label className="apple-datepicker-label">{label}</label>}
      <DatePicker
        selected={value ? new Date(value) : null}
        onChange={(date) => {
          const formattedDate = date ? date.toISOString().split('T')[0] : ''
          onChange(formattedDate)
        }}
        customInput={<CustomInput />}
        locale={zhCN}
        dateFormat="yyyy-MM-dd"
        showPopperArrow={false}
        onCalendarOpen={() => setIsOpen(true)}
        onCalendarClose={() => setIsOpen(false)}
        calendarClassName="apple-calendar"
        popperClassName="apple-datepicker-popper"
        {...props}
      />
    </div>
  )
}

export default AppleDatePicker
