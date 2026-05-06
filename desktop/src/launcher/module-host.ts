/**
 * ModuleHost
 * ──────────
 * Evaluates a CommonJS bundle (produced by esbuild) entirely in memory —
 * no disk write, no temp file. Provides the bundle with a controlled
 * `require` that resolves:
 *   - Node built-ins / Electron        → host's real require()
 *   - "bootstrap:<name>"               → bootstrapModules registry
 *
 * Bootstrap routing exists for singletons whose state must be shared
 * across the bootstrap and the bundle (e.g. the RemoteCodeLoader
 * instance). The build-remote script rewrites bare imports of those
 * modules to their `bootstrap:*` form via an esbuild plugin.
 *
 * Security
 *   - Bundle code shares the host process — there is no JS sandbox.
 *     Treat a verified-and-decrypted bundle as trusted.
 *   - The HMAC + AES-GCM + sha256 chain in remote-code-loader is the
 *     trust boundary. By the time bytes reach this host, they're
 *     authenticated.
 */

import * as vm from 'vm';

export interface BootstrapModuleRegistry {
  /** key form: `bootstrap:<name>` → the actual exports object */
  [key: string]: unknown;
}

export interface LoadedModule {
  /** module.exports of the loaded bundle */
  exports: any;
}

const CJS_WRAPPER_HEAD = '(function (exports, require, module, __filename, __dirname) { ';
const CJS_WRAPPER_TAIL = '\n});';

/**
 * Evaluate a CJS bundle string in the current process and return its
 * module.exports. Throws on syntax error or runtime error during the
 * top-level evaluation — caller decides how to handle (typically the
 * bootstrap surfaces the splash with a Retry).
 */
export function loadBundle(
  code: string,
  filename: string,
  bootstrapModules: BootstrapModuleRegistry,
): LoadedModule {
  const script = new vm.Script(CJS_WRAPPER_HEAD + code + CJS_WRAPPER_TAIL, {
    filename,
    lineOffset: 0,
    columnOffset: 0,
  });

  const wrapper = script.runInThisContext();

  // Same-process require: built-ins and Electron come straight from the
  // host. `bootstrap:*` names are resolved against the registry. Anything
  // else throws — esbuild bundled all real third-party deps inline.
  const customRequire: NodeJS.Require = ((id: string) => {
    if (id.startsWith('bootstrap:')) {
      if (Object.prototype.hasOwnProperty.call(bootstrapModules, id)) {
        return bootstrapModules[id];
      }
      throw new Error(`module-host: unknown bootstrap module "${id}"`);
    }
    return require(id);
  }) as NodeJS.Require;
  // Pass through standard properties so bundled code calling
  // require.resolve / require.cache still works for built-ins.
  Object.defineProperty(customRequire, 'resolve', {
    value: ((id: string) => require.resolve(id)) as NodeJS.RequireResolve,
  });
  Object.defineProperty(customRequire, 'cache', { value: require.cache });
  Object.defineProperty(customRequire, 'main', { value: require.main });
  Object.defineProperty(customRequire, 'extensions', { value: (require as any).extensions });

  const moduleObj = { exports: {} as any };

  // __dirname / __filename are virtual — the bundle has no on-disk location.
  // Some libraries query these; giving them a stable virtual path avoids
  // surprising "/" or "" values that have caused problems in the wild.
  const virtualDir = '/__remote-bundle__';
  const virtualFile = `${virtualDir}/${filename}`;

  try {
    wrapper(moduleObj.exports, customRequire, moduleObj, virtualFile, virtualDir);
  } catch (err: any) {
    const wrapped = new Error(
      `module-host: bundle "${filename}" threw during top-level evaluation: ${
        err?.message ?? err
      }`,
    );
    (wrapped as any).cause = err;
    throw wrapped;
  }

  return moduleObj;
}
