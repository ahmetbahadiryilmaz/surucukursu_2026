/**
 * PM2 ecosystem configuration for the Surucukursu monorepo.
 *
 * Usage:
 *   pm2 start ecosystem.config.js               # start all services
 *   pm2 start ecosystem.config.js --only api-gateway
 *   pm2 logs                                    # tail all logs
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 *
 * Notes:
 * - Each app launches via Node + the Nest CLI inside its own service
 *   directory so that pnpm-managed node_modules and the shared package
 *   symlink resolve correctly. `nest start` compiles fresh on boot —
 *   restarts therefore pick up the latest code without needing a separate
 *   `pnpm build` step in every cycle.
 * - Ports are read from backend/.env via the shared env module
 *   (API_GATEWAY_PORT=9501, API_SERVER_PORT=9502, …).
 * - The desktop Electron app is intentionally excluded — it is a GUI
 *   client launched manually, not a long-running daemon.
 */

const path = require('path');

const repoRoot = __dirname;
const servicesRoot = path.join(repoRoot, 'backend', 'services');

/** Build a uniform pm2 app entry that runs `nest start` in a service dir. */
function service(name, dir) {
  const cwd = path.join(servicesRoot, dir);
  return {
    name,
    cwd,
    // Invoke the locally-installed Nest CLI directly so PM2 doesn't have to
    // spawn the pnpm shim — that fails on Windows with EINVAL because
    // `pnpm` is a .cmd/.ps1 wrapper, not a native executable.
    script: path.join(cwd, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js'),
    args: 'start',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    output: path.join(repoRoot, 'logs', `${name}.out.log`),
    error: path.join(repoRoot, 'logs', `${name}.err.log`),
    merge_logs: true,
    time: true,
  };
}

module.exports = {
  apps: [
    service('api-gateway', 'api-gateway'),
    service('api-server', 'api-server'),
    service('desktop-service', 'desktop-service'),
    service('file-server', 'file-server'),
    {
      name: 'frontend',
      cwd: path.join(repoRoot, 'frontend'),
      script: 'npx',
      args: 'serve -s dist -l 5173',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      output: path.join(repoRoot, 'logs', 'frontend.out.log'),
      error: path.join(repoRoot, 'logs', 'frontend.err.log'),
      merge_logs: true,
      time: true,
    },
  ],
};
