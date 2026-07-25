/**
 * generate-version.js
 *
 * Pre-build script that writes public/version.json with the current
 * version (from package.json) and an ISO-8601 build timestamp.
 *
 * Usage:
 *   node scripts/generate-version.js
 *
 * Wired into package.json as a prebuild step:
 *   "prebuild": "node scripts/generate-version.js"
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const target = path.join(root, 'public', 'version.json');

const payload = {
  version: pkg.version || '0.0.0',
  buildTime: new Date().toISOString(),
};

fs.writeFileSync(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`[generate-version] Wrote ${path.relative(root, target)} → v${payload.version} @ ${payload.buildTime}`);
