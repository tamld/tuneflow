#!/usr/bin/env node
/**
 * TuneFlow Automated SAST Security Gate
 * Zero-dependency static code security analyzer.
 * Checks src/ and public/js/ for critical vulnerabilities.
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively find files in target directory matching extensions.
 * @param {string} dir
 * @param {string[]} extensions
 * @param {string[]} files
 * @returns {string[]}
 */
function findFiles(dir, extensions = ['.js', '.mjs', '.cjs'], files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(fullPath, extensions, files);
    } else if (extensions.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Scan repository for SAST security violations.
 * @param {string} [rootDir] - Optional root directory (defaults to repo root)
 * @returns {{ ok: boolean, scannedFiles: number, violations: Array<{ rule: string, file: string, line: number, message: string, snippet: string }> }}
 */
function runSastScan(rootDir = path.resolve(__dirname, '..')) {
  const violations = [];
  const srcDir = path.join(rootDir, 'src');
  const publicJsDir = path.join(rootDir, 'public', 'js');

  const filesToScan = [
    ...findFiles(srcDir),
    ...findFiles(publicJsDir)
  ];

  for (const filePath of filesToScan) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Rule SAST-01: Unsafe eval() or new Function() in src/ or public/js/
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

      if (/\beval\s*\(/.test(line)) {
        violations.push({
          rule: 'SAST-01',
          file: relPath,
          line: i + 1,
          message: 'Forbidden unsafe eval() invocation detected',
          snippet: line.trim()
        });
      }
      if (/\bnew\s+Function\s*\(/.test(line)) {
        violations.push({
          rule: 'SAST-01',
          file: relPath,
          line: i + 1,
          message: 'Forbidden new Function() dynamic code constructor detected',
          snippet: line.trim()
        });
      }
    }

    // Rule SAST-02: SQL template interpolation in src/db/
    if (relPath.startsWith('src/db/')) {
      // Check multiline prepare(`...${...}`)
      const prepareInterpolationRegex = /(?:db|\.db|this\.db)\.prepare\s*\(\s*`[^`]*?\$\{/g;
      let match;
      while ((match = prepareInterpolationRegex.exec(content)) !== null) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        const lineSnippet = lines[lineNum - 1] ? lines[lineNum - 1].trim() : match[0];
        violations.push({
          rule: 'SAST-02',
          file: relPath,
          line: lineNum,
          message: 'Unsafe SQL template string interpolation into db.prepare() detected',
          snippet: lineSnippet
        });
      }
    }

    // Rule SAST-03: Hardcoded private keys or secret tokens
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

      if (/BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/.test(line)) {
        violations.push({
          rule: 'SAST-03',
          file: relPath,
          line: i + 1,
          message: 'Hardcoded private key block detected',
          snippet: '[REDACTED PRIVATE KEY]'
        });
      }
      if (/(?:ghp_[a-zA-Z0-9]{20,}|sk-live-[a-zA-Z0-9_-]{16,})/.test(line)) {
        violations.push({
          rule: 'SAST-03',
          file: relPath,
          line: i + 1,
          message: 'Hardcoded credential or secret token detected',
          snippet: '[REDACTED SECRET TOKEN]'
        });
      }
    }

    // Rule SAST-04: Unsafe child_process.exec() or execSync() with template interpolation in src/routes/ or src/middleware/
    if (relPath.startsWith('src/routes/') || relPath.startsWith('src/middleware/')) {
      // Check for child_process.exec or exec / execSync with template interpolation
      const execInterpolationRegex = /(?:child_process\.)?(?:exec|execSync)\s*\(\s*`[^`]*?\$\{/g;
      let match;
      while ((match = execInterpolationRegex.exec(content)) !== null) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        const lineSnippet = lines[lineNum - 1] ? lines[lineNum - 1].trim() : match[0];
        violations.push({
          rule: 'SAST-04',
          file: relPath,
          line: lineNum,
          message: 'Unsafe command execution with template interpolation in routes/middleware',
          snippet: lineSnippet
        });
      }
    }
  }

  return {
    ok: violations.length === 0,
    scannedFiles: filesToScan.length,
    violations
  };
}

if (require.main === module) {
  const rootDir = path.resolve(__dirname, '..');
  console.log('🔒 Running TuneFlow SAST Static Security Gate...');
  const result = runSastScan(rootDir);

  console.log(JSON.stringify({
    ok: result.ok,
    scannedFiles: result.scannedFiles,
    violationsCount: result.violations.length,
    violations: result.violations
  }, null, 2));

  if (!result.ok) {
    console.error(`❌ SAST Gate FAILED: ${result.violations.length} violation(s) found.`);
    process.exit(1);
  }

  console.log(`✅ SAST Gate PASSED: 0 violations found across ${result.scannedFiles} source files.`);
  process.exit(0);
}

module.exports = { runSastScan };
