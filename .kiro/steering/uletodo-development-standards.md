---
inclusion: always
---

# uletodo 开发标准

## 语言使用规范

### 交互语言
- 所有与用户的交互必须使用中文
- 文档、需求、设计说明使用中文
- 用户界面文本使用中文

### 代码语言
- 所有代码注释必须使用英文
- Git commit message 必须使用英文
- 变量名、函数名、类名使用英文
- 代码文档和 README 使用英文

## 技术栈要求

### 前端技术栈
- React 18 + TypeScript
- Vite 作为构建工具
- Tailwind CSS 用于样式
- Zustand 用于状态管理

### 后端技术栈
- Rust + Tauri 框架
- SQLite 数据库
- rusqlite 用于数据库操作

## 代码规范

### TypeScript/React 规范
- 使用函数组件和 Hooks
- 严格的 TypeScript 类型检查
- 组件使用 PascalCase 命名
- 文件名使用 camelCase
- 使用 ESLint 和 Prettier 格式化

### Rust 规范
- 遵循 Rust 官方代码风格
- 使用 rustfmt 格式化代码
- 使用 clippy 进行代码检查
- 错误处理使用 Result 类型

## 项目结构

### 前端结构
```
src/
├── components/     # React 组件
├── stores/        # Zustand 状态管理
├── services/      # API 服务层
├── types/         # TypeScript 类型定义
└── utils/         # 工具函数
```

### 后端结构
```
src-tauri/src/
├── commands/      # Tauri 命令处理
├── models/        # 数据模型
├── database/      # 数据库相关
├── services/      # 业务逻辑
└── utils/         # 工具模块
```

## 开发流程

### 迭代开发原则
- 每个功能模块独立开发
- 先实现核心功能，再添加高级功能
- 每个迭代都要保证应用可以正常构建和运行
- 完成每个步骤后需要进行功能测试

### 测试要求
- 前端使用 Vitest + React Testing Library
- 后端使用 Rust 内置测试框架
- 每个功能都要有对应的测试用例
- 集成测试覆盖主要用户流程

## Git 提交规范

### Commit Message 格式
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Type 类型
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建或工具相关

### 示例
```
feat(task): add task creation functionality

Implement task creation form with validation
- Add TaskForm component
- Add task creation API
- Add form validation logic

Closes #123
```

## 构建和部署

### 开发环境
- 使用 `npm run tauri dev` 启动开发服务器
- 热重载支持前端和后端代码修改
- 开启调试工具和详细日志

### 生产构建
- 使用 `npm run tauri build` 构建生产版本
- 生成适用于 Windows、macOS、Linux 的安装包
- 代码压缩和优化

## 错误处理标准

### 前端错误处理
- 使用 Error Boundaries 捕获组件错误
- 提供用户友好的错误提示
- 记录错误日志用于调试

### 后端错误处理
- 使用自定义错误类型
- 返回结构化的错误信息
- 记录详细的错误日志

## 性能要求

### 响应时间
- UI 交互响应时间 < 200ms
- 数据库查询时间 < 100ms
- 应用启动时间 < 3s

### 内存使用
- 空闲状态内存使用 < 100MB
- 大量数据时内存使用 < 500MB

## 安全要求

### 数据安全
- 所有用户输入都要进行验证和清理
- 使用参数化查询防止 SQL 注入
- 敏感数据加密存储

### 应用安全
- 最小权限原则
- 安全的 IPC 通信
- 定期更新依赖包