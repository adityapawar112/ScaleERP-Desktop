/**
 * verify-build-safety.cjs
 * 
 * This script performs a non-superficial security audit of the production build artifacts.
 * It verifies both the configuration (package.json) and the actual physical files
 * produced by the build process to ensure no sensitive data (keys/vendor code) leaks.
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN_PATTERNS = ['vendor', 'private_key', 'scripts'];
const FORBIDDEN_EXTENSIONS = ['.pem', '.key', '.cjs'];
const FORBIDDEN_STRINGS = [
  '-----BEGIN RSA PRIVATE KEY-----',
  '-----BEGIN PRIVATE KEY-----',
  '-----BEGIN EC PRIVATE KEY-----'
];

const BUILD_DIRS = ['build', 'build-electron'];

let violations = 0;

/**
 * Audit 1: Configuration Audit (package.json)
 */
function auditConfig(packageJson) {
  console.log('📋 Starting configuration audit (package.json)...');
  const buildFiles = packageJson.build?.files || [];
  
  const sensitiveCheck = [
    { pattern: 'vendor', forbidden: true },
    { pattern: '.pem', forbidden: true },
    { pattern: 'scripts', forbidden: true }
  ];

  sensitiveCheck.forEach(check => {
    const isIncluded = buildFiles.some(f => f.includes(check.pattern));
    if (isIncluded && check.forbidden) {
      console.error(`❌ CONFIG VIOLATION: "${check.pattern}" is manually included in build.files!`);
      violations++;
    } else {
      console.log(`✅ Config: "${check.pattern}" is safely excluded.`);
    }
  });
}

/**
 * Audit 2: Physical Artifact Audit (File System Scan)
 */
function walkAndAudit(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // 1. Check for forbidden directories
    if (entry.isDirectory()) {
      if (FORBIDDEN_PATTERNS.includes(entry.name)) {
        console.error(`❌ PHYSICAL VIOLATION: Forbidden directory found in build output: ${fullPath}`);
        violations++;
      }
      walkAndAudit(fullPath); // Recurse
    } 
    // 2. Check for forbidden files
    else {
      const ext = path.extname(entry.name);
      const isForbiddenFile = FORBIDDEN_PATTERNS.some(p => entry.name.includes(p)) || FORBIDDEN_EXTENSIONS.includes(ext);
      
      // Special exclusion: schema.sql is allowed
      const isAllowedSchema = entry.name === 'schema.sql' && dir.endsWith('database');

      if (isForbiddenFile && !isAllowedSchema) {
        console.error(`❌ PHYSICAL VIOLATION: Forbidden file found in build output: ${fullPath}`);
        violations++;
      }

      // 3. Content Audit (String Scanning)
      // Only scan text-based build artifacts
      if (['.js', '.sql', '.html', '.json'].includes(ext)) {
        auditFileContent(fullPath);
      }
    }
  }
}

/**
 * Audit 3: String Scan Audit (Hardcoded Secrets)
 */
function auditFileContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const secretPattern of FORBIDDEN_STRINGS) {
      if (content.includes(secretPattern)) {
        console.error(`❌ CONTENT VIOLATION: Hardcoded secret pattern found in: ${filePath}`);
        console.error(`   Pattern: "${secretPattern}"`);
        violations++;
      }
    }
  } catch (err) {
    // Handle binary files or read errors gracefully
  }
}

function verify() {
  console.log('🔍 Starting ROBUST production build safety audit...');

  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found!');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // 1. Check Config
  auditConfig(packageJson);

  // 2. Scan Physical Artifacts
  console.log('\n📂 Starting physical artifact scan...');
  BUILD_DIRS.forEach(dir => {
    const fullDir = path.join(__dirname, '..', dir);
    if (fs.existsSync(fullDir)) {
      console.log(`   Scanning: ${dir}/`);
      walkAndAudit(fullDir);
    } else {
      console.log(`   ⚠️ Skipping ${dir}/ (Not found)`);
    }
  });

  if (violations > 0) {
    console.error(`\n🛑 Audit failed with ${violations} security violations.`);
    process.exit(1);
  }

  console.log('\n✨ ROBUST production build safety audit passed!');
}

verify();
