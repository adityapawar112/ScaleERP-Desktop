# Build & Distribution Guide

Complete guide for building and distributing the ScaleERP application.

## Build System Overview

| Aspect | Details |
|--------|---------|
| **Frontend Build** | Vite 8.0.3 |
| **Electron Build** | TypeScript Compiler |
| **Distribution** | Electron Builder 26.0.12 |
| **Platforms** | Windows, macOS, Linux |

## Build Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Build Process                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Source Code                            │   │
│  │  - TypeScript (.ts, .tsx)                           │   │
│  │  - React Components                                 │   │
│  │  - Electron Main Process                            │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
│         ┌────────────────┼────────────────┐                │
│         ▼                ▼                ▼                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │    Vite      │ │  TypeScript  │ │    Assets    │       │
│  │   (React)    │ │  (Electron)  │ │  (Images)    │       │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘       │
│         │                │                │                 │
│         ▼                ▼                ▼                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │   build/     │ │build-electron│ │   public/    │       │
│  │  (Frontend)  │ │  (Backend)   │ │  (Static)    │       │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘       │
│         │                │                │                 │
│         └────────────────┼────────────────┘                │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Electron Builder                       │   │
│  │  - Package application                             │   │
│  │  - Create installers                               │   │
│  │  - Code signing (optional)                         │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Distribution                           │   │
│  │  - Windows: NSIS Installer                         │   │
│  │  - macOS: DMG                                      │   │
│  │  - Linux: AppImage                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Build Scripts

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start Vite dev server |
| `build` | `npm run build` | Build frontend with Vite |
| `build-electron` | `npm run build-electron` | Compile Electron TypeScript |
| `build-electron-complete` | `npm run build-electron-complete` | Compile + copy schema |
| `build-all` | `npm run build-all` | Build frontend + Electron |
| `build-electron-dist` | `npm run build-electron-dist` | Build all + create installer |
| `build-electron-win` | `npm run build-electron-win` | Build for Windows |
| `dist` | `npm run dist` | Create distributable |

### Build Sequence

```bash
# Full build sequence
npm run build-all

# This runs:
# 1. npm run build          # Build frontend
# 2. npm run build-electron-complete  # Build Electron + copy schema
```

## Frontend Build (Vite)

### Configuration (`vite.config.js`)

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',  // Relative paths for Electron
  build: {
    outDir: 'build',  // Output directory
    sourcemap: true,  // Generate source maps
    minify: 'terser', // Minification
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          bootstrap: ['bootstrap', 'react-bootstrap'],
          charts: ['chart.js', 'react-chartjs-2']
        }
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true
  }
});
```

### Build Output

```
build/
├── index.html              # Main HTML file
├── assets/
│   ├── index-[hash].js     # Main JavaScript bundle
│   ├── index-[hash].css    # Styles
│   └── vendor-[hash].js    # Vendor chunks
└── vite.svg                # Favicon
```

### Build Commands

```bash
# Development build (with source maps)
npm run build

# Preview build
npm run preview
```

## Electron Build (TypeScript)

### Configuration (`electron/tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "../build-electron",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "build-electron"]
}
```

### Build Output

```
build-electron/
├── main.js                 # Compiled main process
├── main.js.map             # Source map
├── preload.js              # Compiled preload script
├── preload.js.map          # Source map
├── database/
│   ├── manager.js          # Database manager
│   ├── operations.js       # CRUD operations
│   ├── schema.sql          # Database schema (copied)
│   ├── types.js            # Type definitions
│   └── backupOps.js        # Backup operations
├── ipc/
│   └── handlers.js         # IPC handlers
└── services/
    └── backupScheduler.js  # Backup scheduler
```

### Build Commands

```bash
# Compile TypeScript
npm run build-electron

# Compile + copy schema
npm run build-electron-complete

# Watch mode (for development)
npm run build-electron-watch
```

## Distribution (Electron Builder)

### Configuration (`package.json`)

```json
{
  "build": {
    "appId": "com.scaleerp.inventory",
    "productName": "ScaleERP",
    "directories": {
      "output": "dist",
      "buildResources": "electron/build"
    },
    "files": [
      "build/**/*",
      "build-electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "icon": "public/ScaleERPLogo.png",
      "target": "dir",
      "forceCodeSigning": false,
      "verifyUpdateCodeSignature": false
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "installerIcon": "public/ScaleERPLogo.png",
      "uninstallerIcon": "public/ScaleERPLogo.png",
      "installerHeaderIcon": "public/ScaleERPLogo.png",
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "ScaleERP"
    },
    "mac": {
      "icon": "public/ScaleERPLogo.png",
      "target": "dmg"
    },
    "linux": {
      "icon": "public/ScaleERPLogo.png",
      "target": "AppImage"
    }
  }
}
```

### Distribution Output

```
dist/
├── win-unpacked/           # Unpacked Windows app
│   ├── ScaleERP.exe       # Executable
│   ├── resources/          # App resources
│   └── ...                 # Other files
├── ScaleERP Setup 0.1.0.exe  # Windows installer
├── ScaleERP-0.1.0.dmg         # macOS installer
└── ScaleERP-0.1.0.AppImage    # Linux installer
```

### Build Commands

```bash
# Create distributable for current platform
npm run dist

# Create Windows distributable
npm run build-electron-win

# Create all platform distributables
npm run build-electron-dist
```

## Platform-Specific Builds

### Windows

```bash
# Build for Windows
npm run build-electron-win

# Output:
# - dist/ScaleERP Setup 0.1.0.exe (Installer)
# - dist/win-unpacked/ (Unpacked app)
```

**Features:**
- NSIS installer
- Desktop shortcut
- Start menu entry
- Custom installation directory
- Uninstaller

### macOS

```bash
# Build for macOS (on macOS)
npm run dist

# Output:
# - dist/ScaleERP-0.1.0.dmg
```

**Features:**
- DMG installer
- Drag to Applications
- Code signing (if configured)

### Linux

```bash
# Build for Linux
npm run dist

# Output:
# - dist/ScaleERP-0.1.0.AppImage
```

**Features:**
- AppImage format
- Portable executable
- No installation required

## Code Signing

### Windows Code Signing

```json
{
  "win": {
    "forceCodeSigning": false,
    "verifyUpdateCodeSignature": false,
    "signingHashAlgorithms": ["sha256"],
    "certificateFile": "./certs/certificate.pfx",
    "certificatePassword": "${env.CERTIFICATE_PASSWORD}"
  }
}
```

### macOS Code Signing

```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name",
    "hardenedRuntime": true,
    "gatekeeperAssess": false
  }
}
```

## Build Optimization

### Bundle Size Optimization

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          bootstrap: ['bootstrap', 'react-bootstrap'],
          charts: ['chart.js', 'react-chartjs-2']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.log
        drop_debugger: true  // Remove debugger
      }
    }
  }
});
```

### Tree Shaking

Vite automatically tree-shakes unused code:

```javascript
// Only imported functions are included
import { Button } from 'react-bootstrap';
// Other components are not included
```

### Minification

```javascript
// vite.config.js
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        dead_code: true,
        unused: true
      },
      mangle: {
        toplevel: true
      }
    }
  }
});
```

## Build Artifacts

### Frontend Artifacts

```
build/
├── index.html              # Main HTML
├── assets/
│   ├── index-[hash].js     # Main bundle (~500KB)
│   ├── index-[hash].css    # Styles (~100KB)
│   ├── vendor-[hash].js    # React + Bootstrap (~300KB)
│   └── charts-[hash].js    # Chart.js (~200KB)
└── vite.svg                # Favicon
```

### Electron Artifacts

```
build-electron/
├── main.js                 # Main process (~50KB)
├── preload.js              # Preload script (~10KB)
├── database/
│   ├── manager.js          # Database manager (~30KB)
│   ├── operations.js       # CRUD operations (~100KB)
│   └── schema.sql          # Schema (~20KB)
├── ipc/
│   └── handlers.js         # IPC handlers (~50KB)
└── services/
    └── backupScheduler.js  # Backup scheduler (~20KB)
```

### Distribution Artifacts

```
dist/
├── ScaleERP Setup 0.1.0.exe    # ~150MB (Windows)
├── ScaleERP-0.1.0.dmg          # ~150MB (macOS)
└── ScaleERP-0.1.0.AppImage     # ~150MB (Linux)
```

## Build Performance

### Build Times (Approximate)

| Stage | Time |
|-------|------|
| Frontend build | 10-30 seconds |
| Electron build | 5-10 seconds |
| Packaging | 30-60 seconds |
| **Total** | **45-100 seconds** |

### Optimization Tips

1. **Use SSD** — Faster file I/O
2. **Increase RAM** — More memory for builds
3. **Exclude unnecessary files** — Reduce bundle size
4. **Use caching** — Vite cache for faster rebuilds

## CI/CD Integration

### GitHub Actions

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build-all
      
      - name: Create distributable
        run: npm run dist
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist-${{ matrix.os }}
          path: dist/
```

## Troubleshooting

### Common Build Issues

#### 1. Out of Memory

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build-all
```

#### 2. Permission Denied

```bash
# On macOS/Linux
chmod +x dist/*.AppImage
chmod +x dist/*.dmg
```

#### 3. Missing Dependencies

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 4. Build Fails

```bash
# Clean build directories
rm -rf build build-electron dist
npm run build-all
```

#### 5. Large Bundle Size

```bash
# Analyze bundle
npx vite-bundle-visualizer

# Check for large dependencies
npm ls --depth=0 | grep -E "^[a-z]"
```

### Debug Build Issues

```bash
# Verbose build
DEBUG=electron-builder npm run dist

# Check build logs
cat dist/builder-debug.yml
```

## Release Process

### Version Management

```bash
# Update version in package.json
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

### Release Steps

1. **Update version** — `npm version patch`
2. **Build** — `npm run build-all`
3. **Test** — Verify build works
4. **Distribute** — `npm run dist`
5. **Tag** — `git tag v0.1.1`
6. **Push** — `git push && git push --tags`

## Related Documentation

- [Development Setup](setup.md) — Development environment
- [Backend Overview](../Backend/backend.md) — Electron architecture
- [Frontend Overview](../Frontend/frontend.md) — React architecture
- [Database Overview](../Backend/Database/database.md) — Database setup