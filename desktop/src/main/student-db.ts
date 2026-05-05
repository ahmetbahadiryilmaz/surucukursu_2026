import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface StudentRecord {
  tc: string;
  adSoyad: string;
  plates: string[];
  lastSeenAt: number;
}

interface AccountBucket {
  students: Record<string, StudentRecord>;
  plates: string[];
}

interface DbShape {
  version: 1;
  accounts: Record<string, AccountBucket>;
}

const FILE_NAME = 'student-store.enc';
const PLAINTEXT_FALLBACK_NAME = 'student-store.json';

export class StudentDb {
  private encPath: string;
  private plainPath: string;
  private data: DbShape = { version: 1, accounts: {} };
  private dirty = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.encPath = path.join(app.getPath('userData'), FILE_NAME);
    this.plainPath = path.join(app.getPath('userData'), PLAINTEXT_FALLBACK_NAME);
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.encPath) && safeStorage.isEncryptionAvailable()) {
        const buf = fs.readFileSync(this.encPath);
        const json = safeStorage.decryptString(buf);
        const parsed = JSON.parse(json) as DbShape;
        if (parsed && parsed.accounts) {
          this.data = parsed;
          console.log(`[StudentDb] Loaded encrypted DB from ${this.encPath} — accounts=${Object.keys(parsed.accounts).length}`);
          return;
        }
      }
      if (fs.existsSync(this.plainPath)) {
        const json = fs.readFileSync(this.plainPath, 'utf-8');
        const parsed = JSON.parse(json) as DbShape;
        if (parsed && parsed.accounts) {
          this.data = parsed;
          console.log(`[StudentDb] Loaded plaintext fallback from ${this.plainPath} — accounts=${Object.keys(parsed.accounts).length}`);
          return;
        }
      }
      console.log(`[StudentDb] No existing DB found, starting fresh`);
    } catch (e) {
      console.error(`[StudentDb] Load failed, starting fresh:`, e);
      this.data = { version: 1, accounts: {} };
    }
  }

  private getBucket(accountId: string): AccountBucket {
    let b = this.data.accounts[accountId];
    if (!b) {
      b = { students: {}, plates: [] };
      this.data.accounts[accountId] = b;
    }
    return b;
  }

  ingest(accountId: string, data: { tc: string; adSoyad: string; plates: string[] }): {
    studentIsNew: boolean;
    newPlatesForStudent: string[];
    newPlatesForAccount: string[];
  } {
    const bucket = this.getBucket(accountId);
    let studentIsNew = false;
    let newPlatesForStudent: string[] = [];

    if (data.tc) {
      const existing = bucket.students[data.tc];
      if (existing) {
        const before = new Set(existing.plates);
        const merged = Array.from(new Set([...existing.plates, ...data.plates]));
        newPlatesForStudent = merged.filter((p) => !before.has(p));
        existing.adSoyad = data.adSoyad || existing.adSoyad;
        existing.plates = merged;
        existing.lastSeenAt = Date.now();
      } else {
        studentIsNew = true;
        bucket.students[data.tc] = {
          tc: data.tc,
          adSoyad: data.adSoyad,
          plates: [...data.plates],
          lastSeenAt: Date.now(),
        };
      }
    }

    const plateSet = new Set(bucket.plates);
    const newPlatesForAccount: string[] = [];
    for (const p of data.plates) {
      if (!plateSet.has(p)) {
        plateSet.add(p);
        newPlatesForAccount.push(p);
      }
    }
    bucket.plates = Array.from(plateSet);

    this.markDirty();
    return { studentIsNew, newPlatesForStudent, newPlatesForAccount };
  }

  serialize(accountId: string): { students: StudentRecord[]; plates: string[] } {
    const bucket = this.getBucket(accountId);
    const students = Object.values(bucket.students).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    const plates = [...bucket.plates].sort();
    return { students, plates };
  }

  clearAccount(accountId: string) {
    if (this.data.accounts[accountId]) {
      delete this.data.accounts[accountId];
      this.markDirty();
      console.log(`[StudentDb] Cleared account ${accountId}`);
    }
  }

  countStudents(accountId: string): number {
    return Object.keys(this.getBucket(accountId).students).length;
  }

  countPlates(accountId: string): number {
    return this.getBucket(accountId).plates.length;
  }

  private markDirty() {
    this.dirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, 500);
  }

  flush() {
    if (!this.dirty) return;
    try {
      const json = JSON.stringify(this.data);
      if (safeStorage.isEncryptionAvailable()) {
        const buf = safeStorage.encryptString(json);
        fs.writeFileSync(this.encPath, buf);
        // If we just wrote encrypted, remove any stale plaintext fallback
        try { if (fs.existsSync(this.plainPath)) fs.unlinkSync(this.plainPath); } catch { /* ignore */ }
        console.log(`[StudentDb] Flushed encrypted DB (${buf.length} bytes)`);
      } else {
        fs.writeFileSync(this.plainPath, json, 'utf-8');
        console.log(`[StudentDb] Flushed plaintext fallback (safeStorage unavailable)`);
      }
      this.dirty = false;
    } catch (e) {
      console.error(`[StudentDb] Flush failed:`, e);
    }
  }
}

let _instance: StudentDb | null = null;
export function getStudentDb(): StudentDb {
  if (!_instance) _instance = new StudentDb();
  return _instance;
}
