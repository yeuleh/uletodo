# 项目结构和组织规范

## 项目根目录结构
```
uletodo/
├── src/                    # 前端源码
├── src-tauri/             # 后端 Rust 源码
├── public/                # 静态资源
├── .kiro/                 # Kiro 配置和规范
├── package.json           # 前端依赖配置
├── vite.config.ts         # Vite 构建配置
├── tailwind.config.js     # Tailwind CSS 配置
└── README.md              # 项目文档
```

## 前端目录结构 (src/)
```
src/
├── components/            # React 组件
│   ├── ui/               # 通用 UI 组件 (Button, Input, Modal)
│   ├── task/             # 任务相关组件 (TaskList, TaskItem, TaskForm)
│   ├── project/          # 项目相关组件
│   └── layout/           # 布局组件 (Sidebar, Header)
├── stores/               # Zustand 状态管理
│   ├── taskStore.ts      # 任务状态
│   ├── projectStore.ts   # 项目状态
│   └── uiStore.ts        # UI 状态
├── services/             # API 服务层
│   ├── taskService.ts    # 任务相关 API 调用
│   └── projectService.ts # 项目相关 API 调用
├── types/                # TypeScript 类型定义
│   ├── task.ts           # 任务类型
│   ├── project.ts        # 项目类型
│   └── common.ts         # 通用类型
├── utils/                # 工具函数
│   ├── dateUtils.ts      # 日期处理
│   └── validation.ts     # 数据验证
├── App.tsx               # 主应用组件
└── main.tsx              # 应用入口
```

## 后端目录结构 (src-tauri/src/)
```
src-tauri/src/
├── commands/             # Tauri 命令处理
│   ├── task_commands.rs  # 任务相关命令
│   └── project_commands.rs # 项目相关命令
├── models/               # 数据模型
│   ├── task.rs           # 任务模型
│   ├── project.rs        # 项目模型
│   └── task_log.rs       # 任务日志模型
├── database/             # 数据库相关
│   ├── mod.rs            # 数据库模块入口
│   ├── connection.rs     # 数据库连接管理
│   ├── migrations.rs     # 数据库迁移
│   └── schema.sql        # 数据库表结构
├── services/             # 业务逻辑
│   ├── task_service.rs   # 任务业务逻辑
│   └── project_service.rs # 项目业务逻辑
├── utils/                # 工具模块
│   └── error.rs          # 错误处理
├── main.rs               # 应用入口
└── lib.rs                # 库入口
```

## 命名规范

### 前端命名
- **组件**: PascalCase (TaskList, ProjectForm)
- **文件**: camelCase (taskStore.ts, projectService.ts)
- **函数/变量**: camelCase (createTask, taskList)
- **常量**: UPPER_SNAKE_CASE (MAX_TASK_TITLE_LENGTH)

### 后端命名
- **模块/文件**: snake_case (task_service.rs, project_commands.rs)
- **结构体**: PascalCase (Task, Project, TaskLog)
- **函数/变量**: snake_case (create_task, task_list)
- **常量**: UPPER_SNAKE_CASE (MAX_TASK_TITLE_LENGTH)

## 数据库表结构
```sql
-- 项目表
projects (id, title, description, parent_project_id, created_at, updated_at)

-- 任务表  
tasks (id, title, description, due_date, completed, project_id, parent_task_id, created_at, updated_at)

-- 任务日志表
task_logs (id, task_id, action_type, old_value, new_value, created_at)
```

## 开发流程
1. 每个功能模块独立开发
2. 先实现数据模型和数据库操作
3. 再实现后端 API 命令
4. 最后实现前端 UI 组件
5. 每个步骤完成后进行功能测试