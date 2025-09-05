# Technology Stack & Build System

## Core Technologies

### Frontend Stack
- **TypeScript**: Strict typing with ES2020 target
- **React 19**: Latest version with React 19 features
- **Vite**: Build tool and dev server (v7.1.3)
- **CSS**: Modern CSS with CSS Variables for theming

### Backend Stack
- **Rust**: Edition 2021, minimum version 1.77.2
- **Tauri 2.8**: Desktop application framework
- **SQLite**: Local database with tiered storage (hot/cold data)
- **serde**: JSON serialization/deserialization

### Development Tools
- **Node.js**: v24+ LTS recommended
- **npm**: Package management
- **Cargo**: Rust package manager
- **TypeScript Compiler**: Strict mode enabled

## Project Configuration

### TypeScript Configuration
- Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- Path mapping configured for clean imports:
  - `@/*` → `src/*`
  - `@/components/*` → `src/components/*`
  - `@/types/*` → `src/types/*`
  - `@/stores/*` → `src/stores/*`
  - `@/utils/*` → `src/utils/*`
  - `@/services/*` → `src/services/*`

### Vite Configuration
- Fixed port 5173 for Tauri integration
- Environment variables prefixed with `VITE_` or `TAURI_`
- Excludes `src-tauri` from file watching
- React plugin enabled

### Rust Configuration
- Library crate types: `["staticlib", "cdylib", "rlib"]`
- Tauri plugins: `tauri-plugin-log` for logging
- Build dependencies: `tauri-build` for compilation

## Common Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Tauri development (with hot reload)
npm run tauri dev

# Build Tauri application
npm run tauri build
```

### Testing
```bash
# Run tests (to be implemented)
npm test

# Rust tests
cargo test --manifest-path=src-tauri/Cargo.toml
```

### Code Quality
```bash
# TypeScript type checking
npx tsc --noEmit

# Rust formatting and linting
cargo fmt --manifest-path=src-tauri/Cargo.toml
cargo clippy --manifest-path=src-tauri/Cargo.toml
```

## Architecture Patterns

### Frontend Architecture
- Component-based React architecture
- State management with Zustand (planned)
- Tauri commands for backend communication
- Path-based imports for clean module organization

### Backend Architecture
- Tauri command handlers in Rust
- SQLite with tiered storage (hot/cold databases)
- Structured logging with configurable levels
- Cross-platform system integration

### Data Flow
1. React components dispatch actions
2. Tauri commands handle business logic in Rust
3. SQLite provides persistent storage
4. System notifications and file operations via Tauri APIs

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow React functional component patterns
- Implement proper error handling in both frontend and backend
- Use structured logging for debugging and troubleshooting

### Performance Considerations
- Target <200ms response time for all operations
- Support 10,000+ tasks efficiently
- Memory usage <200MB under normal operation
- Application startup time <3 seconds

### Cross-Platform Support
- Primary: macOS (10.15+)
- Secondary: Windows (10+)
- Future: Linux (Ubuntu, Fedora)
- Use Tauri's cross-platform APIs for system integration