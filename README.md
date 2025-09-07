# uletodo

uletodo 是一个跨平台的待办事项管理应用，使用 React + Tauri + Rust 技术栈构建。

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **后端**: Rust + Tauri 框架
- **数据库**: SQLite + rusqlite
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **测试**: Vitest + React Testing Library (前端), Rust 内置测试 (后端)

## 开发环境

### 安装依赖

```bash
npm install
```

### 开发命令

```bash
# 启动开发服务器（热重载）
npm run tauri:dev

# 前端开发服务器
npm run dev

# 生产构建
npm run tauri:build

# 前端测试
npm run test

# 代码格式化
npm run format

# 代码检查
npm run lint
```

## 项目结构

```
uletodo/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── stores/            # Zustand 状态管理
│   ├── services/          # API 服务层
│   ├── types/             # TypeScript 类型定义
│   └── utils/             # 工具函数
├── src-tauri/             # 后端 Rust 源码
│   └── src/
│       ├── commands/      # Tauri 命令处理
│       ├── models/        # 数据模型
│       ├── database/      # 数据库相关
│       ├── services/      # 业务逻辑
│       └── utils/         # 工具模块
└── public/                # 静态资源
```
