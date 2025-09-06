# 技术栈和构建系统

## 技术架构
- **前端**: React 18 + TypeScript + Vite
- **后端**: Rust + Tauri 框架
- **数据库**: SQLite + rusqlite
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **测试**: Vitest + React Testing Library (前端), Rust 内置测试 (后端)

## 开发工具
- **代码格式化**: Prettier (前端), rustfmt (后端)
- **代码检查**: ESLint (前端), clippy (后端)
- **构建工具**: Vite + Tauri CLI

## 常用命令

### 开发环境
```bash
# 启动开发服务器（热重载）
npm run tauri dev

# 前端开发服务器
npm run dev

# 后端开发（仅 Rust）
cargo run --manifest-path src-tauri/Cargo.toml
```

### 构建和测试
```bash
# 生产构建
npm run tauri build

# 前端测试
npm run test

# 后端测试
cargo test --manifest-path src-tauri/Cargo.toml

# 代码格式化
npm run format
cargo fmt --manifest-path src-tauri/Cargo.toml

# 代码检查
npm run lint
cargo clippy --manifest-path src-tauri/Cargo.toml
```

### 项目初始化
```bash
# 创建 Tauri 项目
npm create tauri-app@latest

# 安装依赖
npm install

# 安装 Tauri CLI
npm install --save-dev @tauri-apps/cli
```

## 性能要求
- UI 交互响应时间 < 200ms
- 数据库查询时间 < 100ms
- 应用启动时间 < 3s
- 空闲状态内存使用 < 100MB