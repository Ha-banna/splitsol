/**
 * Expo dev server blocks requests when Origin is chrome-extension:// (Phantom, etc.).
 * This patch allows Solana wallet extensions during local web development.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function findCorsMiddlewareFile() {
  const direct = path.join(
    root,
    'node_modules',
    'expo',
    'node_modules',
    '@expo',
    'cli',
    'build',
    'src',
    'start',
    'server',
    'middleware',
    'CorsMiddleware.js',
  );
  if (fs.existsSync(direct)) return direct;
  return null;
}

const MARKER = 'isChromeExtensionOrigin';
const REPLACEMENT = `const ${MARKER} = typeof req.headers.origin === 'string' && req.headers.origin.startsWith('chrome-extension://');
            const isAllowedHost = allowedHosts.includes(host) || isLocalhost || ${MARKER};`;

const file = findCorsMiddlewareFile();
if (!file) {
  console.warn('[patch-expo-cors] CorsMiddleware.js not found — skip');
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');
if (source.includes(MARKER)) {
  console.log('[patch-expo-cors] already patched');
  process.exit(0);
}

const needle =
  'const isAllowedHost = allowedHosts.includes(host) || isLocalhost;';
if (!source.includes(needle)) {
  console.warn('[patch-expo-cors] unexpected CorsMiddleware format — skip');
  process.exit(0);
}

source = source.replace(needle, REPLACEMENT);
fs.writeFileSync(file, source);
console.log('[patch-expo-cors] patched', path.relative(root, file));
