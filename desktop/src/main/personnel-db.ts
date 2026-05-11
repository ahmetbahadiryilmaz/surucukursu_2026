/**
 * Local encrypted JSON store for MEBBIS personnel (öğretici/personel) records.
 *
 * Two sources merge into the same record (keyed by TC):
 *
 *   1. SKT module — skt04002 `<select id="ddlPersonel">`:
 *        <option value="52897079232">İzin No:6635604  AHMET ERKAN(Aktif)</option>
 *      → tc, izinNo, adSoyad, durum (Aktif/Pasif)
 *      Passive scrape: limited to teachers who can deliver SKT lessons.
 *
 *   2. OOK module — ook15003 personnel list table (frmList):
 *        Aç | Kayıt No | TC | Adı | Soyadı | Çalışma İzni Baş.Tar. | …Bit.Tar. |
 *        Kurum Onay Durumu | İl/İlçe Onay Durumu
 *      → tc, kayitNo, ad, soyad, calismaIzniBas, calismaIzniBit,
 *        kurumOnay, ilOnay
 *      Triggered by the "Güncelle" button — covers ALL personnel.
 *
 * Mirror of student-db.ts. Will be migrated to a remote MySQL store later;
 * for now everything is bucketed per desktop accountId (mebbis account).
 */

import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface PersonnelRecord {
  tc: string;
  // Combined name. From skt04002 we get this directly; from OOK we
  // derive it as `${ad} ${soyad}` so consumers can render either source.
  adSoyad: string;
  // SKT module (skt04002)
  izinNo?: string;
  durum?: string;
  // OOK module (ook15003)
  kayitNo?: string;
  ad?: string;
  soyad?: string;
  calismaIzniBas?: string;
  calismaIzniBit?: string;
  kurumOnay?: string;
  ilOnay?: string;
  lastSeenAt: number;
}

interface AccountBucket {
  personnel: Record<string, PersonnelRecord>;
}

interface DbShape {
  version: 1;
  accounts: Record<string, AccountBucket>;
}

const FILE_NAME = 'personnel-store.enc';
const PLAINTEXT_FALLBACK_NAME = 'personnel-store.json';

export interface PersonnelIngestData {
  tc: string;
  adSoyad?: string;
  // SKT (skt04002)
  izinNo?: string;
  durum?: string;
  // OOK (ook15003)
  kayitNo?: string;
  ad?: string;
  soyad?: string;
  calismaIzniBas?: string;
  calismaIzniBit?: string;
  kurumOnay?: string;
  ilOnay?: string;
}

export class PersonnelDb {
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
          console.log(`[PersonnelDb] Loaded encrypted DB — accounts=${Object.keys(this.data.accounts).length}`);
          return;
        }
      }
      if (fs.existsSync(this.plainPath)) {
        const json = fs.readFileSync(this.plainPath, 'utf-8');
        const parsed = JSON.parse(json) as DbShape;
        if (parsed && parsed.accounts) {
          this.data = parsed;
          console.log(`[PersonnelDb] Loaded plaintext fallback — accounts=${Object.keys(this.data.accounts).length}`);
          return;
        }
      }
      console.log('[PersonnelDb] No existing DB, starting fresh');
    } catch (e) {
      console.error('[PersonnelDb] Load failed, starting fresh:', e);
      this.data = { version: 1, accounts: {} };
    }
  }

  private getBucket(accountId: string): AccountBucket {
    let b = this.data.accounts[accountId];
    if (!b) {
      b = { personnel: {} };
      this.data.accounts[accountId] = b;
    }
    return b;
  }

  /**
   * Replace-or-merge ingest from one scrape. Personnel removed from MEBBIS are
   * NOT deleted locally — we keep them as soft history (durum likely "Pasif").
   * Caller can pass a complete list and `removeMissing=true` to harden behavior
   * once we trust the scrape is complete.
   */
  ingestList(accountId: string, rows: PersonnelIngestData[]): { created: number; updated: number } {
    const bucket = this.getBucket(accountId);
    const now = Date.now();
    let created = 0;
    let updated = 0;
    for (const row of rows) {
      if (!row.tc || !/^\d{11}$/.test(row.tc)) continue;
      // Derive a combined name when only ad+soyad are provided (OOK shape).
      const combinedName =
        row.adSoyad ||
        ([row.ad, row.soyad].filter(Boolean).join(' ').trim() || undefined);
      const existing = bucket.personnel[row.tc];
      if (existing) {
        if (combinedName) existing.adSoyad = combinedName;
        if (row.izinNo) existing.izinNo = row.izinNo;
        if (row.durum) existing.durum = row.durum;
        if (row.kayitNo) existing.kayitNo = row.kayitNo;
        if (row.ad) existing.ad = row.ad;
        if (row.soyad) existing.soyad = row.soyad;
        if (row.calismaIzniBas) existing.calismaIzniBas = row.calismaIzniBas;
        if (row.calismaIzniBit) existing.calismaIzniBit = row.calismaIzniBit;
        if (row.kurumOnay) existing.kurumOnay = row.kurumOnay;
        if (row.ilOnay) existing.ilOnay = row.ilOnay;
        existing.lastSeenAt = now;
        updated++;
      } else {
        bucket.personnel[row.tc] = {
          tc: row.tc,
          adSoyad: combinedName || '',
          izinNo: row.izinNo,
          durum: row.durum,
          kayitNo: row.kayitNo,
          ad: row.ad,
          soyad: row.soyad,
          calismaIzniBas: row.calismaIzniBas,
          calismaIzniBit: row.calismaIzniBit,
          kurumOnay: row.kurumOnay,
          ilOnay: row.ilOnay,
          lastSeenAt: now,
        };
        created++;
      }
    }
    if (created || updated) this.markDirty();
    return { created, updated };
  }

  serialize(accountId: string): { personnel: PersonnelRecord[] } {
    const bucket = this.getBucket(accountId);
    const personnel = Object.values(bucket.personnel).sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, 'tr'));
    return { personnel };
  }

  countPersonnel(accountId: string): number {
    return Object.keys(this.getBucket(accountId).personnel).length;
  }

  clearAccount(accountId: string) {
    if (this.data.accounts[accountId]) {
      delete this.data.accounts[accountId];
      this.markDirty();
    }
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
        console.log(`[PersonnelDb] Flushed encrypted DB (${buf.length} bytes)`);
      } else {
        fs.writeFileSync(this.plainPath, json, 'utf-8');
        console.log('[PersonnelDb] Flushed plaintext fallback (safeStorage unavailable)');
      }
      this.dirty = false;
    } catch (e) {
      console.error('[PersonnelDb] Flush failed:', e);
    }
  }
}

let _instance: PersonnelDb | null = null;
export function getPersonnelDb(): PersonnelDb {
  if (!_instance) _instance = new PersonnelDb();
  return _instance;
}
