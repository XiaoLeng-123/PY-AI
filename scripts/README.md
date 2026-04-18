# 工具和脚本目录

本目录包含系统维护、测试和监控相关的工具脚本。

## 目录结构

```
scripts/
├── tests/              # 测试脚本
│   ├── quick_test.py          # 快速功能测试
│   ├── test_system.py         # 全面系统测试
│   └── verify_api.py          # API端点验证
│
├── monitoring/         # 监控脚本
│   ├── monitor_and_fix.py     # 系统状态监控
│   └── auto_fix.py            # 自动修复工具
│
└── utils/              # 实用工具
    ├── start_backend.bat      # 启动后端服务
    ├── start_frontend.bat     # 启动前端服务
    └── ...
```

## 使用说明

### 测试脚本 (tests/)

**快速测试：**
```bash
cd C:\PY-AI\scripts\tests
python quick_test.py
```

**全面测试：**
```bash
cd C:\PY-AI\scripts\tests
python test_system.py
```

**API验证：**
```bash
cd C:\PY-AI\scripts\tests
python verify_api.py
```

### 监控脚本 (monitoring/)

**系统监控：**
```bash
cd C:\PY-AI\scripts\monitoring
python monitor_and_fix.py
```

**自动修复：**
```bash
cd C:\PY-AI\scripts\monitoring
python auto_fix.py
```

### 启动脚本 (utils/)

**一键启动：**
```
双击: C:\PY-AI\start.bat
```

**分步启动：**
```
1. 双击: C:\PY-AI\scripts\utils\start_backend.bat
2. 双击: C:\PY-AI\scripts\utils\start_frontend.bat
```

## 注意事项

- 所有Python脚本需要在项目根目录或scripts目录下运行
- 批处理文件可以直接双击运行
- 建议定期运行监控脚本检查系统状态
