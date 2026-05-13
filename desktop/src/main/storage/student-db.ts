import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface ExamRow {
  donemi: string;
  sinavKodu: string;
  sinavTarihi: string;
  plaka: string;
  ustaOgretici: string;
  onayDurumu: string;
  sinavDurumu: string;
  sonuc: string;
}

export interface LessonRow {
  donemi: string;
  grupAdi: string;
  grupBaslama: string;
  subesi: string;
  plaka: string;
  dersYeri: string;
  dersTarihi: string;
  dersSaati: string;
  personel: string;
  egitimTuru: string;
}

export interface StudentRecord {
  // Always present (from list or detail)
  tc: string;
  adSoyad: string;
  // From list scrape (skt02006) — best-effort columns
  donemi?: string;
  grubu?: string;
  subesi?: string;
  durumu?: string;
  /** Full row text from skt02006 list, indexable for later interpretation if columns change. */
  listRowRaw?: string[];
  // From detail scrape (skt02009) — only set when hasDetail = true
  kurum?: string;
  mevcutBelge?: string;
  istenenSertifika?: string;
  kurumOnay?: string;
  ilceOnay?: string;
  uygulama?: string;
  teorikHak?: number;
  uygulamaHak?: number;
  eSinavHak?: number;
  kayitUcreti?: number;
  // Aday kişisel bilgileri (K Belgesi'nde manuel doldurulur, backend'e PATCH'lenir)
  babaAd?: string;
  dogumYeri?: string;
  dogumTarihi?: string;
  adres?: string;
  exams?: ExamRow[];
  lessons?: LessonRow[];
  // Aggregate plates derived from exams + lessons (kept for fast lookup / sidebar)
  plates: string[];
  // Flags
  hasDetail: boolean;
  lastListSeenAt?: number;
  lastDetailSeenAt?: number;
  lastSeenAt: number;
}

interface AccountBucket {
  students: Record<string, StudentRecord>;
  plates: string[];
}

interface DbShape {
  version: 2;
  accounts: Record<string, AccountBucket>;
}

const FILE_NAME = 'student-store.enc';
const PLAINTEXT_FALLBACK_NAME = 'student-store.json';

export interface ListIngestData {
  tc: string;
  adSoyad: string;
  donemi?: string;
  grubu?: string;
  subesi?: string;
  durumu?: string;
  listRowRaw?: string[];
}

export interface DetailIngestData {
  tc: string;
  adSoyad: string;
  kurum?: string;
  donemi?: string;
  grubu?: string;
  subesi?: string;
  mevcutBelge?: string;
  istenenSertifika?: string;
  kurumOnay?: string;
  ilceOnay?: string;
  uygulama?: string;
  durumu?: string;
  teorikHak?: number;
  uygulamaHak?: number;
  eSinavHak?: number;
  kayitUcreti?: number;
  babaAd?: string;
  dogumYeri?: string;
  dogumTarihi?: string;
  adres?: string;
  exams: ExamRow[];
  lessons: LessonRow[];
}

export class StudentDb {
  private encPath: string;
  private plainPath: string;
  private data: DbShape = { version: 2, accounts: {} };
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
          this.data = this.migrate(parsed);
          console.log(`[StudentDb] Loaded encrypted DB from ${this.encPath} — accounts=${Object.keys(this.data.accounts).length}`);
          return;
        }
      }
      if (fs.existsSync(this.plainPath)) {
        const json = fs.readFileSync(this.plainPath, 'utf-8');
        const parsed = JSON.parse(json) as DbShape;
        if (parsed && parsed.accounts) {
          this.data = this.migrate(parsed);
          console.log(`[StudentDb] Loaded plaintext fallback from ${this.plainPath} — accounts=${Object.keys(this.data.accounts).length}`);
          return;
        }
      }
      console.log(`[StudentDb] No existing DB found, starting fresh`);
    } catch (e) {
      console.error(`[StudentDb] Load failed, starting fresh:`, e);
      this.data = { version: 2, accounts: {} };
    }
  }

  /** Forward-compat migration. v1 records had only {tc, adSoyad, plates, lastSeenAt}. */
  private migrate(parsed: any): DbShape {
    const out: DbShape = { version: 2, accounts: {} };
    for (const [accId, bucket] of Object.entries(parsed.accounts || {}) as [string, any][]) {
      const students: Record<string, StudentRecord> = {};
      for (const [tc, raw] of Object.entries(bucket.students || {}) as [string, any][]) {
        students[tc] = {
          tc: raw.tc || tc,
          adSoyad: raw.adSoyad || '',
          plates: Array.isArray(raw.plates) ? raw.plates : [],
          hasDetail: !!raw.hasDetail,
          lastSeenAt: raw.lastSeenAt || Date.now(),
          lastListSeenAt: raw.lastListSeenAt,
          lastDetailSeenAt: raw.lastDetailSeenAt,
          donemi: raw.donemi, grubu: raw.grubu, subesi: raw.subesi, durumu: raw.durumu,
          listRowRaw: raw.listRowRaw,
          kurum: raw.kurum, mevcutBelge: raw.mevcutBelge, istenenSertifika: raw.istenenSertifika,
          kurumOnay: raw.kurumOnay, ilceOnay: raw.ilceOnay, uygulama: raw.uygulama,
          teorikHak: raw.teorikHak, uygulamaHak: raw.uygulamaHak,
          eSinavHak: raw.eSinavHak, kayitUcreti: raw.kayitUcreti,
          exams: raw.exams, lessons: raw.lessons,
        };
      }
      out.accounts[accId] = {
        students,
        plates: Array.isArray(bucket.plates) ? bucket.plates : [],
      };
    }
    return out;
  }

  private getBucket(accountId: string): AccountBucket {
    let b = this.data.accounts[accountId];
    if (!b) {
      b = { students: {}, plates: [] };
      this.data.accounts[accountId] = b;
    }
    return b;
  }

  /** Bulk-ingest from skt02006 list. Never downgrades hasDetail. */
  ingestList(accountId: string, rows: ListIngestData[]): { created: number; updated: number } {
    const bucket = this.getBucket(accountId);
    const now = Date.now();
    let created = 0;
    let updated = 0;
    for (const row of rows) {
      if (!row.tc || !/^\d{11}$/.test(row.tc)) continue;
      const existing = bucket.students[row.tc];
      if (existing) {
        existing.adSoyad = row.adSoyad || existing.adSoyad;
        if (row.donemi) existing.donemi = row.donemi;
        if (row.grubu) existing.grubu = row.grubu;
        if (row.subesi) existing.subesi = row.subesi;
        if (row.durumu) existing.durumu = row.durumu;
        if (row.listRowRaw) existing.listRowRaw = row.listRowRaw;
        existing.lastListSeenAt = now;
        existing.lastSeenAt = now;
        updated++;
      } else {
        bucket.students[row.tc] = {
          tc: row.tc,
          adSoyad: row.adSoyad,
          donemi: row.donemi,
          grubu: row.grubu,
          subesi: row.subesi,
          durumu: row.durumu,
          listRowRaw: row.listRowRaw,
          plates: [],
          hasDetail: false,
          lastListSeenAt: now,
          lastSeenAt: now,
        };
        created++;
      }
    }
    if (created || updated) this.markDirty();
    return { created, updated };
  }

  /** Ingest full detail from skt02009. Marks hasDetail=true, merges plates from exams+lessons. */
  ingestDetail(accountId: string, data: DetailIngestData): {
    studentIsNew: boolean;
    newPlatesForStudent: string[];
    newPlatesForAccount: string[];
  } {
    const bucket = this.getBucket(accountId);
    const now = Date.now();
    if (!data.tc || !/^\d{11}$/.test(data.tc)) {
      return { studentIsNew: false, newPlatesForStudent: [], newPlatesForAccount: [] };
    }

    const newPlatesFromDetail = Array.from(new Set([
      ...data.exams.map((e) => e.plaka),
      ...data.lessons.map((l) => l.plaka),
    ].filter(Boolean)));

    let studentIsNew = false;
    let newPlatesForStudent: string[] = [];
    const existing = bucket.students[data.tc];
    if (existing) {
      const before = new Set(existing.plates);
      const merged = Array.from(new Set([...existing.plates, ...newPlatesFromDetail]));
      newPlatesForStudent = merged.filter((p) => !before.has(p));
      existing.adSoyad = data.adSoyad || existing.adSoyad;
      existing.kurum = data.kurum;
      if (data.donemi) existing.donemi = data.donemi;
      if (data.grubu) existing.grubu = data.grubu;
      if (data.subesi) existing.subesi = data.subesi;
      existing.mevcutBelge = data.mevcutBelge;
      existing.istenenSertifika = data.istenenSertifika;
      existing.kurumOnay = data.kurumOnay;
      existing.ilceOnay = data.ilceOnay;
      existing.uygulama = data.uygulama;
      if (data.durumu) existing.durumu = data.durumu;
      existing.teorikHak = data.teorikHak;
      existing.uygulamaHak = data.uygulamaHak;
      existing.eSinavHak = data.eSinavHak;
      existing.kayitUcreti = data.kayitUcreti;
      if (data.babaAd !== undefined) existing.babaAd = data.babaAd;
      if (data.dogumYeri !== undefined) existing.dogumYeri = data.dogumYeri;
      if (data.dogumTarihi !== undefined) existing.dogumTarihi = data.dogumTarihi;
      if (data.adres !== undefined) existing.adres = data.adres;
      existing.exams = data.exams;
      existing.lessons = data.lessons;
      existing.plates = merged;
      existing.hasDetail = true;
      existing.lastDetailSeenAt = now;
      existing.lastSeenAt = now;
    } else {
      studentIsNew = true;
      newPlatesForStudent = [...newPlatesFromDetail];
      bucket.students[data.tc] = {
        tc: data.tc,
        adSoyad: data.adSoyad,
        kurum: data.kurum,
        donemi: data.donemi,
        grubu: data.grubu,
        subesi: data.subesi,
        mevcutBelge: data.mevcutBelge,
        istenenSertifika: data.istenenSertifika,
        kurumOnay: data.kurumOnay,
        ilceOnay: data.ilceOnay,
        uygulama: data.uygulama,
        durumu: data.durumu,
        teorikHak: data.teorikHak,
        uygulamaHak: data.uygulamaHak,
        eSinavHak: data.eSinavHak,
        kayitUcreti: data.kayitUcreti,
        babaAd: data.babaAd,
        dogumYeri: data.dogumYeri,
        dogumTarihi: data.dogumTarihi,
        adres: data.adres,
        exams: data.exams,
        lessons: data.lessons,
        plates: [...newPlatesFromDetail],
        hasDetail: true,
        lastDetailSeenAt: now,
        lastSeenAt: now,
      };
    }

    const plateSet = new Set(bucket.plates);
    const newPlatesForAccount: string[] = [];
    for (const p of newPlatesFromDetail) {
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

  /** Patch aday kişisel bilgileri locally (mirrors backend PATCH /students/:tc/personal). */
  updatePersonal(
    accountId: string,
    tc: string,
    fields: { babaAd?: string; dogumYeri?: string; dogumTarihi?: string; adres?: string },
  ): boolean {
    const bucket = this.getBucket(accountId);
    const s = bucket.students[tc];
    if (!s) return false;
    if (fields.babaAd !== undefined) s.babaAd = fields.babaAd;
    if (fields.dogumYeri !== undefined) s.dogumYeri = fields.dogumYeri;
    if (fields.dogumTarihi !== undefined) s.dogumTarihi = fields.dogumTarihi;
    if (fields.adres !== undefined) s.adres = fields.adres;
    s.lastSeenAt = Date.now();
    this.markDirty();
    return true;
  }

  getStudent(accountId: string, tc: string): StudentRecord | null {
    return this.getBucket(accountId).students[tc] || null;
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

  countDetailed(accountId: string): number {
    return Object.values(this.getBucket(accountId).students).filter((s) => s.hasDetail).length;
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
