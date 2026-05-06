#!/usr/bin/env node
/**
 * Build the remote-deployable bundle:
 *   - Bundles src/main/app-controller.ts (and its deps) into one CJS file
 *     at remote-code/main/app-bundle.js, with bootstrap-only modules
 *     (remote-code-loader) marked external so they're routed to the
 *     bootstrap process at runtime via module-host.
 *   - Copies src/renderer/* verbatim to remote-code/renderer/.
 *
 * Does NOT bump version.json — run `npm run bump:remote-version` separately
 * before deploy so build can be re-run during iteration without inflating
 * the version counter.
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..'); // desktop/
const SRC_MAIN = path.join(ROOT, 'src', 'main');
const SRC_RENDERER = path.join(ROOT, 'src', 'renderer');
const REMOTE_CODE = path.join(ROOT, 'remote-code');
const OUT_MAIN = path.join(REMOTE_CODE, 'main');
const OUT_RENDERER = path.join(REMOTE_CODE, 'renderer');

// All `../launcher/*` imports from the bundle resolve at runtime against the
// bootstrap process via the module-host's custom require(). The bundle code
// emits `require('bootstrap:<basename>')`; the launcher's loadBundle() call
// in main.ts populates that registry with real module instances. This keeps
// singletons (RemoteCodeLoader, config, crypto client) shared between
// bootstrap and bundle.
const bootstrapReroutePlugin = {
  name: 'bootstrap-reroute',
  setup(build) {
    build.onResolve({ filter: /^\.\.\/launcher\// }, (args) => {
      const basename = path.basename(args.path, path.extname(args.path));
      return { path: 'bootstrap:' + basename, external: true };
    });
  },
};

async function bundleMain() {
  fs.mkdirSync(OUT_MAIN, { recursive: true });
  const entry = path.join(SRC_MAIN, 'app-controller.ts');
  if (!fs.existsSync(entry)) {
    throw new Error(
      `Entry point not found: ${entry}\n` +
        `Create desktop/src/main/app-controller.ts (the remoted controller) first.`
    );
  }
  const result = await esbuild.build({
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
  return result;
}

function copyRenderer() {
  fs.mkdirSync(OUT_RENDERER, { recursive: true });
  // Wipe stale files so server-side delete propagates (server scans the dir).
  for (const f of fs.readdirSync(OUT_RENDERER)) {
    fs.unlinkSync(path.join(OUT_RENDERER, f));
  }
  let count = 0;
  for (const f of fs.readdirSync(SRC_RENDERER)) {
    const src = path.join(SRC_RENDERER, f);
    const dst = path.join(OUT_RENDERER, f);
    const stat = fs.statSync(src);
    if (!stat.isFile()) continue;
    if (!/\.(html|js|css)$/i.test(f)) continue; // server only serves these
    fs.copyFileSync(src, dst);
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
  console.log('[build-remote] Bundling main process...');
  await bundleMain();
  console.log('[build-remote] Copying renderer files...');
  const rendererCount = copyRenderer();
  console.log(`[build-remote] Copied ${rendererCount} renderer file(s).`);
  console.log('[build-remote] Output:');
  summarize('main', OUT_MAIN);
  summarize('renderer', OUT_RENDERER);
  console.log('[build-remote] Done. (Run `npm run bump:remote-version` before deploy.)');
})().catch((err) => {
  console.error('[build-remote] Failed:', err.message || err);
  process.exit(1);
});
