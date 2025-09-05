# Project Structure & Organization

## Root Directory Structure

```
uletodo/
├── .git/                    # Git version control
├── .kiro/                   # Kiro IDE configuration and steering rules
├── public/                  # Static assets for web interface (Vite assets)
├── src/                     # Frontend React/TypeScript source
├── src-tauri/              # Rust backend source
├── index.html              # Main HTML entry point
├── package.json            # Node.js dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
└── README.md               # Project overview
```

## Frontend Structure (`src/`)

### Current Structure
```
src/
├── App.tsx                 # Main application component
├── App.css                 # Application styles
├── main.tsx               # React application entry point
└── index.css              # Global styles
```

### Planned Structure (M1+)
```
src/
├── components/            # Reusable UI components
│   ├── common/           # Generic components (Button, Input, Modal)
│   ├── task/            # Task-related components
│   ├── project/         # Project management components
│   └── layout/          # Layout and navigation components
├── pages/               # Main application pages/views
│   ├── TaskList/       # Task list view
│   ├── Dashboard/      # Analytics dashboard
│   ├── Settings/       # Application settings
│   └── Projects/       # Project management
├── stores/              # State management (Zustand stores)
├── services/            # API services and Tauri command wrappers
├── types/               # TypeScript type definitions
├── utils/               # Utility functions and helpers
├── hooks/               # Custom React hooks
├── constants/           # Application constants
└── i18n/               # Internationalization files
```

## Backend Structure (`src-tauri/`)

### Current Structure
```
src-tauri/
├── src/
│   ├── main.rs            # Application entry point
│   └── lib.rs             # Main library with Tauri setup
├── capabilities/          # Tauri security capabilities
├── icons/                 # Application icons for different platforms
├── Cargo.toml            # Rust dependencies and metadata
├── tauri.conf.json       # Tauri application configuration
└── build.rs              # Build script
```

### Planned Structure (M1+)
```
src-tauri/src/
├── main.rs               # Application entry point
├── lib.rs                # Main library and Tauri setup
├── commands/             # Tauri command handlers
│   ├── mod.rs           # Commands module
│   ├── tasks.rs         # Task management commands
│   ├── projects.rs      # Project management commands
│   └── settings.rs      # Settings and preferences
├── database/             # Database layer
│   ├── mod.rs           # Database module
│   ├── models.rs        # Data models and schemas
│   ├── migrations.rs    # Database migrations
│   └── connection.rs    # Database connection management
├── services/             # Business logic services
│   ├── mod.rs           # Services module
│   ├── task_service.rs  # Task business logic
│   ├── project_service.rs # Project business logic
│   └── sync_service.rs  # Data synchronization logic
├── utils/                # Utility functions
└── error.rs              # Error handling and types
```

## Documentation Structure

项目文档主要存储在以下位置：
- **README.md** - 项目概述和快速开始指南
- **.kiro/steering/** - 开发指导文档
  - `product.md` - 产品概述
  - `tech.md` - 技术栈和构建系统
  - `structure.md` - 项目结构组织
  - `development.md` - 开发指南和最佳实践

未来计划添加的文档：
- **API 文档** - Tauri 命令和数据库 schema 文档
- **用户手册** - 应用使用说明

## Configuration Files

### Package Management
- `package.json` - Node.js dependencies, scripts, and metadata
- `package-lock.json` - Locked dependency versions
- `Cargo.toml` - Rust dependencies and crate configuration
- `Cargo.lock` - Locked Rust dependency versions

### Build Configuration
- `tsconfig.json` - TypeScript compiler configuration with path mapping
- `vite.config.ts` - Vite build tool configuration for Tauri integration
- `tauri.conf.json` - Tauri application configuration and capabilities

### Development Tools
- `.gitignore` - Git ignore patterns for both Node.js and Rust
- `.kiro/steering/` - Kiro IDE steering rules and project guidance

## Naming Conventions

### Files and Directories
- **React Components**: PascalCase (e.g., `TaskList.tsx`, `ProjectCard.tsx`)
- **Utilities and Services**: camelCase (e.g., `dateUtils.ts`, `taskService.ts`)
- **Types**: PascalCase with `.types.ts` suffix (e.g., `Task.types.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- **Rust Files**: snake_case (e.g., `task_service.rs`, `database_models.rs`)

### Import Organization
1. External libraries (React, Tauri, etc.)
2. Internal services and utilities
3. Type definitions
4. Relative imports (components, styles)

### Path Mapping Usage
- Use `@/` prefix for absolute imports from `src/`
- Prefer absolute imports over relative imports for better maintainability
- Example: `import { TaskService } from '@/services/taskService'`

## Data Storage Organization

### Database Files (Planned)
```
~/Library/Application Support/uletodo/  (macOS)
├── hot_data.db           # Active tasks and recent data
├── cold_data.db          # Archived historical data
├── settings.json         # User preferences and configuration
└── backups/              # Automatic backup snapshots
    ├── hot_data_backup_YYYYMMDD.db
    └── cold_data_backup_YYYYMMDD.db
```

## Development Workflow

### Branch Structure
- `main` - Stable production code
- `develop` - Integration branch for features
- `feat/feature-name` - Individual feature development
- `release/vx.x.x` - Release preparation branches

### Module Dependencies
- Frontend components should not directly import backend code
- Use Tauri commands as the interface between frontend and backend
- Services layer abstracts Tauri command calls
- Types are shared between frontend and backend through JSON serialization

### Code Organization Principles
- Single Responsibility: Each module has one clear purpose
- Dependency Injection: Services are injected rather than directly imported
- Error Boundaries: Proper error handling at component and service levels
- Logging: Structured logging for debugging and monitoring