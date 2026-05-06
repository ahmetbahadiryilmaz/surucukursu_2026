/**
 * RequestLogger
 * ─────────────
 * Persistent journal of every main-frame MEBBIS HTTP fetch, with full
 * request + response detail split into three artifacts per transaction:
 *
 *   logs/
 *   ├── journal.jsonl                                  ← master append-only ledger (1 line / fetch)
 *   ├── requests/<id>_<account>_<page>.req.json        ← URL, method, headers, post body, timing
 *   └── responses/<id>_<account>_<page>.res.html       ← full HTML returned
 *
 * The two side files are linked from the journal entry via `requestFile`
 * and `responseFile`, so a tail of `journal.jsonl` is enough to navigate.
 *
 * Storage location:
 *   - Dev (unpacked):  desktop/logs/      (next to existing responses/)
 *   - Packaged build:  <userData>/logs/   (writable; e.g. %AppData%/mebbis-desktop/logs)
 *
 * Capture mechanism: `session.webRequest.onBeforeRequest` filters to
 * `resourceType === 'mainFrame'` so we only log navigations + ASP.NET
 * postbacks — not every CSS/JS asset.
 */

import { app, Session, WebContents } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface PendingRequest {
  url: string;
  method: string;
  postData: string | null;
  startedAt: number;
}

export class RequestLogger {
  private readonly logsDir: string;
  private readonly requestsDir: string;
  private readonly responsesDir: string;
  private readonly journalPath: string;
  /** webContentsId → most recent main-frame request, consumed by recordResponse. */
  private readonly pending = new Map<number, PendingRequest>();
  private readonly attachedSessions = new WeakSet<Session>();

  constructor() {
    const base = app.isPackaged
      ? path.join(app.getPath('userData'), 'logs')
      : path.join(__dirname, '..', '..', 'logs');
    this.logsDir = base;
    this.requestsDir = path.join(base, 'requests');
    this.responsesDir = path.join(base, 'responses');
    this.journalPath = path.join(base, 'journal.jsonl');
    for (const dir of [this.logsDir, this.requestsDir, this.responsesDir]) {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      } catch {
        // ignore — recordResponse will surface file errors per-write
      }
    }
  }

  /**
   * Hook the session's main-frame requests so subsequent `recordResponse()`
   * calls have access to the matching POST body. Idempotent per session.
   */
  attach(ses: Session) {
    if (this.attachedSessions.has(ses)) return;
    this.attachedSessions.add(ses);
    ses.webRequest.onBeforeRequest({ urls: ['*://*.meb.gov.tr/*'] }, (details, callback) => {
      if (details.resourceType === 'mainFrame') {
        const wcId = details.webContentsId ?? -1;
        let postData: string | null = null;
        if (details.method !== 'GET' && details.uploadData?.length) {
          try {
            postData = details.uploadData
              .map((p) => {
                if (p.bytes) return Buffer.from(p.bytes).toString('utf-8');
                if (p.file) return `[file:${p.file}]`;
                if ((p as any).blobUUID) return `[blob:${(p as any).blobUUID}]`;
                return '[unreadable]';
              })
              .join('');
          } catch {
            postData = '[postdata read error]';
          }
        }
        this.pending.set(wcId, {
          url: details.url,
          method: details.method,
          postData,
          startedAt: Date.now(),
        });
      }
      callback({});
    });
  }

  /**
   * Persist the response HTML for the most recent main-frame request on
   * the given webContents, paired with its captured request metadata, and
   * append a journal entry tying the two artifacts together.
   *
   * Best-effort: any write failure is swallowed so logging never breaks
   * the running automation.
   */
  async recordResponse(webContents: WebContents, accountLabel: string, url: string, html: string) {
    const wcId = webContents.id;
    const pending = this.pending.get(wcId);
    this.pending.delete(wcId);

    const now = new Date();
    const isoTs = now.toISOString();
    const fsTs = isoTs.replace(/[:.]/g, '-');
    const urlHash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 6);
    const safeLabel = this.sanitize(accountLabel).slice(0, 40) || 'unknown';
    const pageName = this.extractPageName(url);
    const baseName = `${fsTs}_${safeLabel}_${pageName}_${urlHash}`;

    const reqFileName = `${baseName}.req.json`;
    const resFileName = `${baseName}.res.html`;
    const reqPath = path.join(this.requestsDir, reqFileName);
    const resPath = path.join(this.responsesDir, resFileName);

    const reqInfo = {
      id: baseName,
      timestamp: isoTs,
      account: accountLabel,
      pageName,
      url,
      method: pending?.method ?? 'GET',
      // Trim pathological POST bodies. Full bodies > 256 KB get truncated
      // with a marker so the journal stays usable.
      postData: this.truncate(pending?.postData ?? null, 262_144),
      requestStartedAt: pending ? new Date(pending.startedAt).toISOString() : null,
      durationMs: pending ? Date.now() - pending.startedAt : null,
      responseSize: html.length,
    };

    try {
      fs.writeFileSync(reqPath, JSON.stringify(reqInfo, null, 2), 'utf-8');
      fs.writeFileSync(resPath, html, 'utf-8');
      const journalEntry = JSON.stringify({
        timestamp: isoTs,
        account: accountLabel,
        pageName,
        url,
        method: reqInfo.method,
        hasPostData: !!reqInfo.postData,
        postDataSize: pending?.postData ? Buffer.byteLength(pending.postData, 'utf-8') : 0,
        durationMs: reqInfo.durationMs,
        responseSize: html.length,
        requestFile: `requests/${reqFileName}`,
        responseFile: `responses/${resFileName}`,
      });
      fs.appendFileSync(this.journalPath, journalEntry + '\n', 'utf-8');
    } catch (err: any) {
      console.error(`[RequestLogger] write failed for ${baseName}: ${err?.message ?? err}`);
    }
  }

  private extractPageName(url: string): string {
    try {
      const u = new URL(url);
      const last = u.pathname.split('/').filter(Boolean).pop() || 'root';
      return this.sanitize(last.replace(/\.aspx$/i, ''));
    } catch {
      return 'unknown';
    }
  }

  private sanitize(s: string): string {
    return s.replace(/[^A-Za-z0-9_.-]/g, '_');
  }

  private truncate(s: string | null, maxBytes: number): string | null {
    if (!s) return s;
    const bytes = Buffer.byteLength(s, 'utf-8');
    if (bytes <= maxBytes) return s;
    const head = s.slice(0, maxBytes);
    return `${head}\n…[truncated ${bytes - maxBytes} bytes]`;
  }
}

let _instance: RequestLogger | null = null;
export function getRequestLogger(): RequestLogger {
  if (!_instance) _instance = new RequestLogger();
  return _instance;
}
