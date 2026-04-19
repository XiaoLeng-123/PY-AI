import { useMemo } from 'react'

/**
 * 通用分页组件 - 苹果风格
 * @param {number} total - 总条数
 * @param {number} page - 当前页码 (从1开始)
 * @param {number} pageSize - 每页条数
 * @param {function} onPageChange - 页码变更回调 (newPage)
 * @param {function} onPageSizeChange - 每页条数变更回调 (newPageSize) 可选
 * @param {number[]} pageSizeOptions - 每页条数选项 默认 [20, 50, 100]
 */
export default function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange, pageSizeOptions = [20, 50, 100] }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  // 计算要显示的页码按钮
  const pageButtons = useMemo(() => {
    const buttons = []
    const maxVisible = 7 // 最多显示7个页码按钮

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) buttons.push(i)
    } else {
      // 始终显示第1页和最后一页
      // 当前页附近显示2个
      const rangeStart = Math.max(2, safePage - 1)
      const rangeEnd = Math.min(totalPages - 1, safePage + 1)

      buttons.push(1)
      if (rangeStart > 2) buttons.push('...')
      for (let i = rangeStart; i <= rangeEnd; i++) buttons.push(i)
      if (rangeEnd < totalPages - 1) buttons.push('...')
      buttons.push(totalPages)
    }
    return buttons
  }, [totalPages, safePage])

  if (total <= 0) return null

  const startItem = (safePage - 1) * pageSize + 1
  const endItem = Math.min(safePage * pageSize, total)

  return (
    <div className="apple-pagination">
      {/* 左侧：显示信息 */}
      <div className="pagination-info">
        共 <strong>{total}</strong> 条，显示 {startItem}-{endItem}
      </div>

      {/* 中间：页码按钮 */}
      <div className="pagination-buttons">
        <button
          className="pagination-btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          title="上一页"
        >
          ‹
        </button>

        {pageButtons.map((btn, idx) =>
          btn === '...' ? (
            <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
          ) : (
            <button
              key={btn}
              className={`pagination-btn ${btn === safePage ? 'active' : ''}`}
              onClick={() => onPageChange(btn)}
            >
              {btn}
            </button>
          )
        )}

        <button
          className="pagination-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          title="下一页"
        >
          ›
        </button>
      </div>

      {/* 右侧：每页条数选择 */}
      {onPageSizeChange && (
        <div className="pagination-size">
          <span>每页</span>
          <select
            className="pagination-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map(opt => (
              <option key={opt} value={opt}>{opt}条</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
