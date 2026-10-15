const fs = require('fs');
const path = require('path');

const CONTRACT_PATH = path.join(__dirname, 'openapi.json');
const CONTRACT = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
const ROUTES = CONTRACT['x-routes'] || [];

const ROUTER_SOURCES = [
  { file: 'src/routes/api.js', prefix: '/api' },
  { file: 'src/routes/auth_routes.js', prefix: '/api/auth' },
  { file: 'src/routes/admin_routes.js', prefix: '/api/admin' },
  { file: 'src/routes/user_routes.js', prefix: '/api/user' }
];

/**
 * Extract all declared router.<method>('/path') registrations from Express route files.
 * @param {string} repoRoot
 * @returns {Array<{method: string, path: string, source: string}>}
 */
function extractDeclaredRoutesFromExpress(repoRoot) {
  const declared = [];
  const routeRegex = /\brouter\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g;

  for (const { file, prefix } of ROUTER_SOURCES) {
    const absPath = path.join(repoRoot, file);
    if (!fs.existsSync(absPath)) continue;
    const content = fs.readFileSync(absPath, 'utf8');
    let match;
    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const subPath = match[2] === '/' ? '' : match[2];
      const fullPath = `${prefix}${subPath}`;
      declared.push({ method, path: fullPath, source: file });
    }
  }
  return declared;
}

/**
 * Convert an Express route path (e.g. /api/admin/users/:id) into a RegExp that matches
 * concrete client paths (e.g. /api/admin/users/${id} or /api/admin/users/123).
 * @param {string} routePath
 * @returns {RegExp}
 */
function routeToRegex(routePath) {
  const escaped = routePath
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:[a-zA-Z0-9_]+/g, '[^/?#]+');
  return new RegExp(`^${escaped}$`);
}

/**
 * Verify bidirectional parity between Express route files and packages/contract/openapi.json.
 * @param {string} repoRoot
 * @returns {{ok: boolean, missingFromContract: string[], missingFromExpress: string[]}}
 */
function verifyRouteParity(repoRoot) {
  const declared = extractDeclaredRoutesFromExpress(repoRoot);
  const declaredSet = new Set(declared.map(r => `${r.method} ${r.path}`));
  const contractSet = new Set(ROUTES.map(r => `${r.method} ${r.path}`));

  const missingFromContract = [...declaredSet].filter(k => !contractSet.has(k));
  const missingFromExpress = [...contractSet].filter(k => !declaredSet.has(k));

  return {
    ok: missingFromContract.length === 0 && missingFromExpress.length === 0,
    declaredCount: declared.length,
    contractCount: ROUTES.length,
    missingFromContract,
    missingFromExpress
  };
}

/**
 * Extract all /api/<segment> endpoint paths invoked across client surfaces and verify
 * every single call matches a contracted route in packages/contract/openapi.json.
 * @param {string} repoRoot
 * @returns {{ok: boolean, checkedCalls: Array<{file: string, endpoint: string}>, uncontractedCalls: Array<{file: string, endpoint: string}>}}
 */
function verifyClientSurfaceCalls(repoRoot) {
  const clientFiles = [
    ...fs.readdirSync(path.join(repoRoot, 'public/js')).filter(f => f.endsWith('.js')).map(f => `public/js/${f}`),
    ...fs.readdirSync(path.join(repoRoot, 'extension')).filter(f => f.endsWith('.js')).map(f => `extension/${f}`),
    ...fs.readdirSync(path.join(repoRoot, 'src/desktop')).filter(f => f.endsWith('.js')).map(f => `src/desktop/${f}`),
    ...fs.readdirSync(path.join(repoRoot, 'src-tauri/src')).filter(f => f.endsWith('.rs')).map(f => `src-tauri/src/${f}`),
    'android/app/src/main/java/com/tamld/tuneflow/MainActivity.java'
  ];

  const routeMatchers = ROUTES.map(r => ({
    route: r,
    regex: routeToRegex(r.path)
  }));

  const checkedCalls = [];
  const uncontractedCalls = [];
  const apiCallRegex = /['"`](?:[^'"`]*?)(\/api\/[a-zA-Z0-9_\-/:.${}()]+)(?:\?[^'"`]*)?['"`]/g;

  for (const relFile of clientFiles) {
    const absFile = path.join(repoRoot, relFile);
    if (!fs.existsSync(absFile)) continue;
    const content = fs.readFileSync(absFile, 'utf8');
    let match;
    while ((match = apiCallRegex.exec(content)) !== null) {
      const rawEndpoint = match[1].replace(/\$\{[^}]+\}/g, ':param');
      // Skip bare prefix checks like '/api/' in interceptors
      if (rawEndpoint === '/api/' || rawEndpoint === '/api') continue;
      checkedCalls.push({ file: relFile, endpoint: rawEndpoint });
      const matched = routeMatchers.some(m => m.regex.test(rawEndpoint));
      if (!matched) {
        uncontractedCalls.push({ file: relFile, endpoint: rawEndpoint });
      }
    }
  }

  return {
    ok: uncontractedCalls.length === 0,
    checkedCalls,
    uncontractedCalls
  };
}

module.exports = {
  CONTRACT,
  ROUTES,
  extractDeclaredRoutesFromExpress,
  verifyRouteParity,
  verifyClientSurfaceCalls
};
