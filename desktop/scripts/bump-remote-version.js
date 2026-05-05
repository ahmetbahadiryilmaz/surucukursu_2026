#!/usr/bin/env node
/**
 * Increment the trailing `.NNN` counter in remote-code/version.json.
 * Format: <semver>.<counter>  e.g.  1.2.6.005 → 1.2.6.006
 *
 * Leaves all other fields (e.g. whatsNew) untouched so editors can pre-fill
 * them before running this. Use:
 *   1. Edit whatsNew in remote-code/version.json
 *   2. npm run build:remote
 *   3. npm run bump:remote-version
 *   4. (deploy)
 */

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.resolve(__dirname, '..', 'remote-code', 'version.json');

if (!fs.existsSync(VERSION_FILE)) {
  console.error(`[bump-remote-version] Not found: ${VERSION_FILE}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
} catch (err) {
  console.error(`[bump-remote-version] Invalid JSON: ${err.message}`);
  process.exit(1);
}

const m = /^(\d+\.\d+\.\d+)\.(\d+)$/.exec(String(data.version || ''));
if (!m) {
  console.error(
    `[bump-remote-version] Unexpected version format: "${data.version}". ` +
      `Expected <semver>.<counter> like "1.2.6.005".`
  );
  process.exit(1);
}

const next = parseInt(m[2], 10) + 1;
const nextVersion = `${m[1]}.${String(next).padStart(3, '0')}`;
const previous = data.version;
data.version = nextVersion;

fs.writeFileSync(VERSION_FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`[bump-remote-version] ${previous} → ${nextVersion}`);
