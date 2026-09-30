/**
 * scripts/obfuscate-main.cjs
 * 
 * Obfuscates core Electron services in the build output to protect licensing logic.
 * This runs after TypeScript compilation but before Electron-Builder packaging.
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const TARGET_FILES = [
  'services/licenseManager.js',
  'services/authService.js',
  'services/licenseEnforcement.js',
  'services/cryptoUtils.js'
];

const BUILD_DIR = path.join(__dirname, '..', 'build-electron');

async function obfuscate() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('ℹ️ Skipping obfuscation (Not in production mode)');
    return;
  }

  console.log('🛡️ Starting core services obfuscation...');

  for (const relativePath of TARGET_FILES) {
    const fullPath = path.join(BUILD_DIR, relativePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Warning: Skip obfuscating ${relativePath} (File not found)`);
      continue;
    }

    console.log(`🔒 Obfuscating: ${relativePath}`);
    
    const code = fs.readFileSync(fullPath, 'utf8');
    
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      numbersToExpressions: true,
      simplify: true,
      stringArray: true,
      stringArrayThreshold: 0.75,
      splitStrings: true,
      splitStringsChunkLength: 10,
      unicodeEscapeSequence: false
    });

    fs.writeFileSync(fullPath, obfuscationResult.getObfuscatedCode(), 'utf8');
  }

  console.log('✨ Core services obfuscation complete!');
}

obfuscate().catch(err => {
  console.error('❌ Obfuscation failed:', err);
  process.exit(1);
});
