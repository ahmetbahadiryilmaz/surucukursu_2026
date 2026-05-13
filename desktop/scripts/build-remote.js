#!/usr/bin/env node
/**
 * Build the remote-deployable bundle.
 *
 * Source layout (all under src/ui/ or src/main/):
 *   src/ui/mebbis-left-menu/   → remote-code/scripts/left-menu.js      (browser IIFE)
 *   src/ui/mebbis-auto-fill/   → remote-code/scripts/auto-fill-login.js (browser IIFE)
 *   src/ui/mebbis-status/      → remote-code/scripts/hide-status.js     (browser IIFE)
 *                                remote-code/scripts/show-status.js     (browser IIFE)
 *   src/main/app-controller.ts → remote-code/main/app-bundle.js         (Node CJS)
 *   src/ui/driving-schools/    → remote-code/renderer/                  (verbatim copy)
 *
 * Does NOT bump version.json — run `npm run bump:remote-version` separately.
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT        = path.resolve(__dirname, '..');
const SRC_UI      = path.join(ROOT, 'src', 'ui');
const SRC_MAIN    = path.join(ROOT, 'src', 'main');
const REMOTE_CODE = path.join(ROOT, 'remote-code');
const OUT_MAIN    = path.join(REMOTE_CODE, 'main');
const OUT_SCRIPTS = path.join(REMOTE_CODE, 'scripts');
const OUT_RENDERER = path.join(REMOTE_CODE, 'renderer');

// All `../launcher/*` imports resolve at runtime via the module-host's custom
// require(). Emits `require('bootstrap:<basename>')` so singletons are shared.
const bootstrapReroutePlugin = {
  name: 'bootstrap-reroute',
  setup(build) {
    build.onResolve({ filter: /^\.\.\/launcher\// }, (args) => {
      const basename = path.basename(args.path, path.extname(args.path));
      return { path: 'bootstrap:' + basename, external: true };
    });
  },
};

/** Shared options for all browser-injected IIFE scripts. */
function browserIife(entryPoint, outfile) {
  return esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'browser',
    target: 'chrome89',
    format: 'iife',
    outfile,
    sourcemap: false,
    minify: false,
    legalComments: 'none',
    logLevel: 'warning',
  });
}

async function bundleBrowserScripts() {
  fs.mkdirSync(OUT_SCRIPTS, { recursive: true });
  await Promise.all([
    browserIife(
      path.join(SRC_UI, 'mebbis-left-menu', 'index.js'),
      path.join(OUT_SCRIPTS, 'left-menu.js'),
    ),
    browserIife(
      path.join(SRC_UI, 'mebbis-auto-fill', 'index.js'),
      path.join(OUT_SCRIPTS, 'auto-fill-login.js'),
    ),
    browserIife(
      path.join(SRC_UI, 'mebbis-status', 'hide.js'),
      path.join(OUT_SCRIPTS, 'hide-status.js'),
    ),
    browserIife(
      path.join(SRC_UI, 'mebbis-status', 'show.js'),
      path.join(OUT_SCRIPTS, 'show-status.js'),
    ),
  ]);
}

async function bundleMain() {
  fs.mkdirSync(OUT_MAIN, { recursive: true });
  const entry = path.join(SRC_MAIN, 'app-controller.ts');
  if (!fs.existsSync(entry)) {
    throw new Error(`Entry point not found: ${entry}`);
  }
  return esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    external: ['electron', 'electron-updater'],
    outfile: path.join(OUT_MAIN, 'app-bundle.js'),
    sourcemap: false,
    minify: false,
    legalComments: 'none',
    treeShaking: true,
    logLevel: 'warning',
    plugins: [bootstrapReroutePlugin],
    metafile: true,
  });
}

async function buildRenderer() {
  const srcDir = path.join(SRC_UI, 'driving-schools');
  fs.mkdirSync(OUT_RENDERER, { recursive: true });
  // Wipe stale files so server-side delete propagates.
  for (const f of fs.readdirSync(OUT_RENDERER)) fs.unlinkSync(path.join(OUT_RENDERER, f));

  // Bundle app.js (ES modules → IIFE).
  await browserIife(path.join(srcDir, 'app.js'), path.join(OUT_RENDERER, 'app.js'));

  // Copy static assets verbatim.
  let count = 1; // app.js already handled
  for (const f of fs.readdirSync(srcDir)) {
    if (f === 'app.js') continue; // bundled above
    const src = path.join(srcDir, f);
    if (!fs.statSync(src).isFile()) continue;
    if (!/\.(html|css)$/i.test(f)) continue;
    fs.copyFileSync(src, path.join(OUT_RENDERER, f));
    count++;
  }
  return count;
}

function summarize(label, dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).sort();
  if (!files.length) return;
  console.log(`  ${label}/`);
  for (const f of files) {
    const p = path.join(dir, f);
    if (!fs.statSync(p).isFile()) continue;
    const buf = fs.readFileSync(p);
    const sha = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
    const sizeKB = (buf.length / 1024).toFixed(1);
    console.log(`    ${f.padEnd(28)} ${sizeKB.padStart(8)} KB  sha256:${sha}`);
  }
}

(async () => {
  console.log('[build-remote] Bundling browser scripts...');
  await bundleBrowserScripts();
  console.log('[build-remote] Bundling main process...');
  await bundleMain();
  console.log('[build-remote] Building renderer...');
  const rendererCount = await buildRenderer();
  console.log(`[build-remote] Built/copied ${rendererCount} renderer file(s).`);
  console.log('[build-remote] Output:');
  summarize('scripts', OUT_SCRIPTS);
  summarize('main', OUT_MAIN);
  summarize('renderer', OUT_RENDERER);
  console.log('[build-remote] Done. (Run `npm run bump:remote-version` before deploy.)');
})().catch((err) => {
  console.error('[build-remote] Failed:', err.message || err);
  process.exit(1);
});
