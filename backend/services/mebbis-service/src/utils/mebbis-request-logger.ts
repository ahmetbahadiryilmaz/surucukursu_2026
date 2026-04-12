import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve the mebbis-service root directory reliably,
 * whether running from source (ts-node / nest start --watch) or compiled dist/.
 */
function resolveServiceRoot(): string {
  // Walk up from __dirname looking for the mebbis-service package.json
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'package.json');
    if (
      fs.existsSync(candidate) &&
      fs.readFileSync(candidate, 'utf8').includes('@surucukursu/mebbis-service')
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: cwd (nest start --watch runs from the service root)
  return process.cwd();
}

const SERVICE_ROOT = resolveServiceRoot();

/**
 * MebbisRequestLogger
 *
 * Logs all outgoing HTTP requests/responses from mebbis-service to external MEBBIS APIs.
 *
 * Directory: logs/requests/
 *
 * Files produced:
 *   - requests.log                              → Append-only summary of every request (one line per request)
 *   - YYYY-MM-DD/request-details-{id}-{timestamp}.log   → Full metadata for a single request+response
 *   - YYYY-MM-DD/request-response-{id}-{timestamp}.html → Raw HTML body of the response
 *
 * The {id} is a short incrementing counter per process lifetime so files sort nicely.
 * The {timestamp} format is YYYY-MM-DD-HH-mm-ss to match the user spec (ymd-h-i-s).
 */

export interface MebbisRequestLog {
  /** Unique request id for this log entry */
  requestId: string;
  /** ISO timestamp */
  timestamp: string;
  /** HTTP method */
  method: string;
  /** Full request URL */
  url: string;
  /** Request headers (object) */
  requestHeaders: Record<string, any>;
  /** POST body / payload (string or object) */
  requestBody: any;
  /** Response HTTP status code */
  responseStatusCode: number | null;
  /** Response headers (object) */
  responseHeaders: Record<string, any>;
  /** If the response is a redirect, the Location header */
  redirectUrl: string | null;
  /** Duration in ms */
  durationMs: number;
  /** Error message if request failed */
  error: string | null;
  /** tbMebbisId (driving school identifier) */
  tbMebbisId: number | null;
  /** Path to the detail log file (relative to logs/requests/) */
  detailFile: string;
  /** Path to the response HTML file (relative to logs/requests/) */
  responseFile: string;
}

let requestCounter = 0;

export class MebbisRequestLogger {
  private static requestsDir: string;

  private static ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private static getRequestsDir(): string {
    if (!this.requestsDir) {
      this.requestsDir = path.join(SERVICE_ROOT, 'logs/requests');
      this.ensureDir(this.requestsDir);
    }
    return this.requestsDir;
  }

  private static getDateFolder(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const folder = path.join(this.getRequestsDir(), `${y}-${m}-${d}`);
    this.ensureDir(folder);
    return folder;
  }

  private static formatTimestamp(date: Date): string {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${mo}-${d}-${h}-${mi}-${s}`;
  }

  private static nextId(): string {
    requestCounter++;
    return String(requestCounter).padStart(5, '0');
  }

  /**
   * Log a complete request/response cycle.
   * Call this AFTER the response (or error) is received.
   */
  static log(entry: {
    method: string;
    url: string;
    requestHeaders: Record<string, any>;
    requestBody: any;
    responseStatusCode: number | null;
    responseHeaders: Record<string, any>;
    responseBody: string | null;
    redirectUrl: string | null;
    durationMs: number;
    error: string | null;
    tbMebbisId: number | null;
  }): void {
    try {
      const now = new Date();
      const ts = this.formatTimestamp(now);
      const id = this.nextId();
      const dateFolder = this.getDateFolder();
      const dateFolderName = path.basename(dateFolder);

      const detailFileName = `request-details-${id}-${ts}.log`;
      const responseFileName = `request-response-${id}-${ts}.html`;

      const detailFilePath = path.join(dateFolder, detailFileName);
      const responseFilePath = path.join(dateFolder, responseFileName);

      const detailFileRelative = `${dateFolderName}/${detailFileName}`;
      const responseFileRelative = `${dateFolderName}/${responseFileName}`;

      // ── 1. Append to requests.log (summary line) ──
      const summaryLine = [
        `[${now.toISOString()}]`,
        `ID:${id}`,
        `${entry.method.toUpperCase()}`,
        `${entry.url}`,
        `STATUS:${entry.responseStatusCode ?? 'ERR'}`,
        `${entry.durationMs}ms`,
        entry.redirectUrl ? `REDIRECT:${entry.redirectUrl}` : '',
        entry.error ? `ERROR:${entry.error}` : '',
        `DETAIL:${detailFileRelative}`,
        `HTML:${responseFileRelative}`,
        entry.tbMebbisId ? `SCHOOL:${entry.tbMebbisId}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const requestsLogPath = path.join(this.getRequestsDir(), 'requests.log');
      fs.appendFileSync(requestsLogPath, summaryLine + '\n', 'utf8');

      // ── 2. Write detail log file ──
      const logData: MebbisRequestLog = {
        requestId: id,
        timestamp: now.toISOString(),
        method: entry.method.toUpperCase(),
        url: entry.url,
        requestHeaders: this.sanitizeHeaders(entry.requestHeaders),
        requestBody: entry.requestBody,
        responseStatusCode: entry.responseStatusCode,
        responseHeaders: this.sanitizeHeaders(entry.responseHeaders),
        redirectUrl: entry.redirectUrl,
        durationMs: entry.durationMs,
        error: entry.error,
        tbMebbisId: entry.tbMebbisId,
        detailFile: detailFileRelative,
        responseFile: responseFileRelative,
      };

      const detailContent = [
        '═══════════════════════════════════════════════════════════',
        `  MEBBIS REQUEST LOG — ID: ${id}`,
        '═══════════════════════════════════════════════════════════',
        '',
        '── REQUEST ────────────────────────────────────────────────',
        `Timestamp   : ${now.toISOString()}`,
        `Method      : ${entry.method.toUpperCase()}`,
        `URL         : ${entry.url}`,
        `School ID   : ${entry.tbMebbisId ?? 'N/A'}`,
        '',
        '── REQUEST HEADERS ────────────────────────────────────────',
        JSON.stringify(this.sanitizeHeaders(entry.requestHeaders), null, 2),
        '',
        '── REQUEST BODY / PAYLOAD ─────────────────────────────────',
        typeof entry.requestBody === 'string'
          ? entry.requestBody
          : JSON.stringify(entry.requestBody, null, 2),
        '',
        '── RESPONSE ───────────────────────────────────────────────',
        `Status Code : ${entry.responseStatusCode ?? 'N/A'}`,
        `Duration    : ${entry.durationMs}ms`,
        `Redirect URL: ${entry.redirectUrl ?? 'N/A'}`,
        `Error       : ${entry.error ?? 'None'}`,
        '',
        '── RESPONSE HEADERS ───────────────────────────────────────',
        JSON.stringify(this.sanitizeHeaders(entry.responseHeaders), null, 2),
        '',
        '── RESPONSE HTML FILE ─────────────────────────────────────',
        `File: ${responseFileRelative}`,
        '',
        '── STRUCTURED JSON ────────────────────────────────────────',
        JSON.stringify(logData, null, 2),
        '',
      ].join('\n');

      fs.writeFileSync(detailFilePath, detailContent, 'utf8');

      // ── 3. Write response HTML file ──
      const htmlContent = entry.responseBody ?? '<!-- No response body -->';
      fs.writeFileSync(responseFilePath, htmlContent, 'utf8');

      // Also log to console for visibility
      console.log(
        `[MebbisRequestLogger] ${entry.method.toUpperCase()} ${entry.url} → ${entry.responseStatusCode ?? 'ERR'} (${entry.durationMs}ms) | ${detailFileRelative}`,
      );
    } catch (err) {
      console.error('[MebbisRequestLogger] Failed to write log:', err);
    }
  }

  /**
   * Clean up sensitive header values for logging.
   */
  private static sanitizeHeaders(
    headers: Record<string, any> | null | undefined,
  ): Record<string, any> {
    if (!headers) return {};
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(headers)) {
      result[key] = value;
    }
    return result;
  }
}
