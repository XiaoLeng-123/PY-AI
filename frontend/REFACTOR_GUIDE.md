# 前端代码重构指南

## 当前状态
- App.jsx: 约4200行（包含所有功能）
- 功能完整，但代码过于集中

## 推荐重构策略

### 方案1：渐进式重构（推荐）
**优点**：不影响现有功能，可以逐步进行
**步骤**：
1. 创建新组件文件（如已创建的PortfolioPage.jsx）
2. 在App.jsx中import新组件
3. 替换原有render函数调用
4. 测试无误后删除App.jsx中的旧代码
5. 重复以上步骤直到全部重构完成

### 方案2：按功能模块拆分
将App.jsx拆分为以下组件：

```
components/
├── Dashboard/           # 数据概览
│   └── DashboardPage.jsx
├── StockManage/        # 小马管理
│   ├── StockManagePage.jsx
│   └── StockForm.jsx
├── DataEntry/          # 数据录入
│   └── DataEntryPage.jsx
├── DataView/           # 数据查看
│   └── DataViewPage.jsx
├── Statistics/         # 统计分析
│   ├── StatisticsPage.jsx
│   ├── AnomalyDetection.jsx
│   ├── PatternRecognition.jsx
│   └── AlertManager.jsx
├── Portfolio/          # 持仓管理 ✅ 已创建
│   ├── PortfolioPage.jsx
│   └── PortfolioModal.jsx
├── Compare/            # 对比分析
│   └── ComparePage.jsx
├── Screener/           # 智能选股
│   └── ScreenerPage.jsx
├── FinancialForecast/  # 财务预报
│   └── ForecastPage.jsx
├── Longhubang/         # 龙虎榜
│   └── LonghubangPage.jsx
├── Auction/            # 集合竞价
│   └── AuctionPage.jsx
├── AIAnalysis/         # AI分析
│   └── AIAnalysisPage.jsx
└── Settings/           # 系统设置
    └── SettingsPage.jsx
```

### 方案3：使用自定义Hooks
将逻辑抽离到hooks目录：

```
hooks/
├── useStocks.js        ✅ 已创建
├── usePortfolio.js
├── useAlerts.js
├── usePriceData.js
├── useAIAnalysis.js
└── useImportExport.js
```

## 已创建的文件

### 工具类
- `utils/api.js` - API封装（100行）
- `utils/cache.js` - 缓存工具（已存在）
- `utils/export.js` - 导出工具（已存在）

### Hooks
- `hooks/useStocks.js` - 小马数据管理（68行）

### 组件
- `components/Portfolio/PortfolioPage.jsx` - 持仓管理页面（212行）

## 重构示例

### 原App.jsx中的代码（约150行）
```javascript
const renderPortfolio = () => (
  <div className="page-content">
    {/* ...大量JSX... */}
  </div>
)
```

### 重构后
```javascript
// App.jsx
import PortfolioPage from './components/Portfolio/PortfolioPage'

// 只需一行
{currentMenu === 'portfolio' && <PortfolioPage stocks={stocks} toast={toast} />}
```

## 重构优先级建议

1. **高优先级**（独立性强）：
   - Portfolio（持仓管理）✅ 已完成示例
   - Compare（对比分析）
   - Screener（智能选股）
   - Settings（系统设置）

2. **中优先级**（中等复杂度）：
   - Dashboard（数据概览）
   - Longhubang（龙虎榜）
   - Auction（集合竞价）

3. **低优先级**（依赖较多）：
   - Statistics（统计分析）
   - DataEntry（数据录入）
   - AIAnalysis（AI分析）

## 注意事项

1. **保持API路径一致**：使用utils/api.js统一管理
2. **Props传递**：确保必要的props（stocks, toast等）正确传递
3. **状态管理**：考虑使用Context或Redux管理全局状态
4. **测试**：每重构一个模块都要充分测试
5. **备份**：重构前务必备份原始App.jsx

## 快速开始

要开始重构某个模块：

1. 从App.jsx复制对应的render函数
2. 创建新的组件文件
3. 提取相关的state和handlers
4. 通过props接收外部依赖
5. 在App.jsx中import并使用新组件
6. 测试功能是否正常
7. 删除App.jsx中的旧代码

## 预期效果

重构完成后：
- App.jsx: ~300行（路由和布局）
- 每个组件: 100-300行
- 总文件数: ~20个
- 可维护性: ⭐⭐⭐⭐⭐
- 可读性: ⭐⭐⭐⭐⭐
