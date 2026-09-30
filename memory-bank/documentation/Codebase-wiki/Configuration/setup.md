# Development Setup Guide

Complete guide for setting up the ScaleERP development environment.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or later | JavaScript runtime |
| npm | 9.x or later | Package manager |
| Git | 2.x or later | Version control |
| VS Code | Latest | Recommended IDE |

### Optional Software

| Software | Purpose |
|----------|---------|
| SQLite Browser | Database inspection |
| Postman | API testing (if needed) |

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/adityapawar112/ScaleERP-Desktop.git
cd Inventory-management
```

### 2. Install Dependencies

```bash
npm install
```

This installs all dependencies including:
- React and React DOM
- Electron
- TypeScript
- Vite
- Bootstrap
- SQLite3
- i18next
- And more...

### 3. Verify Installation

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check installed packages
npm list --depth=0
```

## Project Structure

```
├── electron/                 # Electron main process
│   ├── main.ts              # Application entry point
│   ├── preload.ts           # Context bridge
│   ├── database/            # Database layer
│   ├── ipc/                 # IPC handlers
│   └── services/            # Background services
├── src/                     # React frontend
│   ├── App.tsx              # Main component
│   ├── components/          # Shared components
│   ├── pages/               # Page components
│   ├── context/             # State management
│   ├── i18n/                # Internationalization
│   ├── types/               # TypeScript types
│   └── utils/               # Utilities
├── public/                  # Static assets
├── scripts/                 # Build scripts
└── package.json             # Project configuration
```

## Development Scripts

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start Vite dev server |
| `build` | `npm run build` | Build frontend |
| `electron` | `npm run electron` | Run Electron app |
| `electron-dev` | `npm run electron-dev` | Development mode (Vite + Electron) |
| `build-electron` | `npm run build-electron` | Compile Electron TypeScript |
| `build-all` | `npm run build-all` | Build everything |
| `dist` | `npm run dist` | Create distributable |

### Development Mode

The recommended way to develop:

```bash
npm run electron-dev
```

This command:
1. Starts Vite dev server on `http://localhost:3000`
2. Compiles Electron TypeScript with watch mode
3. Launches Electron with hot reload

### Production Build

To create a distributable:

```bash
npm run dist
```

This creates platform-specific installers in the `dist/` folder.

## Environment Configuration

### Development Environment

In development mode:
- Vite dev server runs on port 3000
- DevTools automatically open
- Hot module replacement enabled
- Source maps available
- Database created in `./data/` folder

### Production Environment

In production mode:
- Loads built files from `build/`
- DevTools disabled
- Optimized bundle
- Database in user data directory

## Database Setup

### Automatic Setup

The database is automatically created and initialized on first run:

1. Application starts
2. `DatabaseManager.initialize()` is called
3. Database file created in appropriate location
4. Schema applied from `schema.sql`
5. Default data seeded

### Database Locations

| Environment | Location |
|-------------|----------|
| Development | `./data/scaleerp.db` |
| Windows | `%APPDATA%/scaleerp/scaleerp.db` |
| macOS | `~/Library/Application Support/scaleerp/scaleerp.db` |
| Linux | `~/.config/scaleerp/scaleerp.db` |

### Manual Database Inspection

Use SQLite Browser or command line:

```bash
# Open database
sqlite3 ./data/scaleerp.db

# List tables
.tables

# View schema
.schema

# Query data
SELECT * FROM products;
```

## IDE Setup

### VS Code Extensions

Recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    "*.tsx": "typescriptreact",
    "*.ts": "typescript"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Node Module Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 2. Electron Build Issues

```bash
# Rebuild Electron
npm run build-electron
```

#### 3. Database Issues

```bash
# Delete database and restart
rm -rf ./data/
npm run electron-dev
```

#### 4. Port Already in Use

If port 3000 is in use:

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

#### 5. TypeScript Errors

```bash
# Check TypeScript configuration
npx tsc --noEmit

# Rebuild TypeScript
npm run build-electron
```

### Debug Mode

Enable debug logging:

```typescript
// In electron/main.ts
console.log('Debug mode enabled');
```

View logs in:
- Terminal (development)
- DevTools Console (renderer process)
- Log files (production)

## Testing

### Running Tests

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

```
├── __tests__/              # Test files
├── src/
│   ├── components/
│   │   └── __tests__/      # Component tests
│   └── utils/
│       └── __tests__/      # Utility tests
```

## Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

### Formatting

```bash
# Format code
npm run format
```

### Pre-commit Hooks

Husky is configured for pre-commit hooks:
- Lint check
- Type check
- Format check

## Performance Tips

### Development

1. **Use SSD** — Faster file operations
2. **Close unused apps** — Free up memory
3. **Use TypeScript strict mode** — Catch errors early
4. **Enable source maps** — Better debugging

### Build Optimization

1. **Code splitting** — Reduce bundle size
2. **Tree shaking** — Remove unused code
3. **Minification** — Smaller production builds
4. **Compression** — Faster downloads

## Security Considerations

### Development

- Never commit `.env` files
- Don't store credentials in code
- Use environment variables for secrets
- Keep dependencies updated

### Production

- Enable code signing
- Use HTTPS for updates
- Validate all inputs
- Sanitize user data

## Next Steps

After setup:

1. **Read Architecture** — Understand the codebase
2. **Run the app** — See it in action
3. **Make a change** — Try modifying something
4. **Run tests** — Ensure everything works
5. **Build for production** — Create distributable

## Related Documentation

- [Build & Distribution](build.md) — Production builds
- [Backend Overview](../Backend/backend.md) — Electron architecture
- [Frontend Overview](../Frontend/frontend.md) — React architecture
- [Database Overview](../Backend/Database/database.md) — Database setup