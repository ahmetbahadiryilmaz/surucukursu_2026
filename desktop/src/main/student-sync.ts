import { apiClient, ListIngestRow, DetailIngestPayload, RemoteStudent, RemoteStudentDetail } from './api-client';
import { getStudentDb } from './student-db';

/**
 * Bridges the local encrypted StudentDb with the backend student-store API.
 *
 * Strategy: write-through with offline buffer.
 *  - Every ingest writes locally first (fast UX), then fires a background POST.
 *  - On POST failure, the change stays in the local DB; nothing flagged dirty
 *    yet — keeping it simple. (Future: add per-record dirty flag + retry queue.)
 *  - On app start, pull all students once and merge into local cache.
 */

type TokenGetter = () => string | null;

let _getToken: TokenGetter = () => null;
let _accountIdResolver: (() => string | null) = () => null;

export function configureStudentSync(getToken: TokenGetter, accountIdResolver: () => string | null) {
  _getToken = getToken;
  _accountIdResolver = accountIdResolver;
}

function tokenOrNull(): string | null {
  try { return _getToken(); } catch { return null; }
}

/** Call after every list scrape — local DB has already ingested the rows. */
export function pushList(mebbisAccountId: string, rows: ListIngestRow[]): void {
  const token = tokenOrNull();
  if (!token) {
    console.log('[StudentSync] No auth token, skipping list push');
    return;
  }
  if (!rows.length) return;
  apiClient.ingestStudentList(token, mebbisAccountId, rows)
    .then((r) => {
      console.log(`[StudentSync] List pushed (account=${mebbisAccountId}): created=${r.created}, updated=${r.updated}`);
    })
    .catch((e) => {
      console.error(`[StudentSync] List push failed (kept locally):`, e?.message || e);
    });
}

/** Call after every detail scrape — local DB has already ingested. */
export function pushDetail(mebbisAccountId: string, payload: DetailIngestPayload): void {
  const token = tokenOrNull();
  if (!token) {
    console.log('[StudentSync] No auth token, skipping detail push');
    return;
  }
  apiClient.ingestStudentDetail(token, mebbisAccountId, payload)
    .then((r) => {
      console.log(`[StudentSync] Detail pushed: tc=${payload.tc} ${r.studentIsNew ? '(NEW)' : '(UPDATE)'} mebbis_id=${r.mebbis_id}`);
    })
    .catch((e) => {
      console.error(`[StudentSync] Detail push failed (kept locally):`, e?.message || e);
    });
}

/**
 * One-shot pull: fetch all students from backend and merge into local DB.
 * Server wins on conflict, EXCEPT we never demote has_detail (local detail
 * scrapes that haven't synced yet still take precedence).
 *
 * Note: the local DB is currently keyed by desktop accountId, while the
 * backend is keyed by school. We treat the resolved accountId as the bucket
 * key for local cache. Multi-account merging is left to a future iteration.
 */
export async function pullAll(): Promise<void> {
  const token = tokenOrNull();
  if (!token) {
    console.log('[StudentSync] No auth token, skipping pull');
    return;
  }
  const accountId = _accountIdResolver() || '';
  if (!accountId) {
    console.log('[StudentSync] No account resolver, skipping pull');
    return;
  }

  console.log('[StudentSync] Pulling students from backend...');
  let students: RemoteStudent[] = [];
  try {
    students = await apiClient.listStudents(token);
  } catch (e: any) {
    console.error('[StudentSync] Pull (list) failed:', e?.message || e);
    return;
  }
  console.log(`[StudentSync] Backend returned ${students.length} students`);

  const db = getStudentDb();
  // Bulk merge of list-shape data
  const listRows: ListIngestRow[] = students.map((s) => ({
    tc: s.tc,
    adSoyad: s.ad_soyad,
    donem: s.donem || undefined,
    grup: s.grup || undefined,
    sube: s.sube || undefined,
    durum: s.durum || undefined,
  }));
  if (listRows.length) {
    db.ingestList(accountId, listRows);
  }

  // For each remote student that has detail, pull and merge it into local DB
  // (skip ones the local already has detail for — local stays authoritative
  // unless explicitly told otherwise)
  let detailsPulled = 0;
  for (const remote of students) {
    if (!remote.has_detail) continue;
    const local = db.serialize(accountId).students.find((s) => s.tc === remote.tc);
    if (local && local.hasDetail) continue; // local already has detail, skip
    try {
      const full: RemoteStudentDetail = await apiClient.getStudent(token, remote.tc);
      if (full?.mebbis?.has_detail) {
        const m = full.mebbis;
        db.ingestDetail(accountId, {
          tc: full.tc_number,
          adSoyad: full.name,
          kurum: m.kurum,
          donemi: m.donem,
          grubu: m.grup,
          subesi: m.sube,
          mevcutBelge: m.mevcut_belge,
          istenenSertifika: m.istenen_sertifika,
          kurumOnay: m.kurum_onay,
          ilceOnay: m.ilce_onay,
          uygulama: m.uygulama,
          durumu: m.durum,
          teorikHak: m.teorik_hak,
          uygulamaHak: m.uygulama_hak,
          eSinavHak: m.esinav_hak,
          kayitUcreti: m.kayit_ucreti,
          exams: (m.exams || []).map((e) => ({
            donemi: e.donem || '',
            sinavKodu: e.sinav_kodu || '',
            sinavTarihi: e.sinav_tarihi || '',
            plaka: e.plaka || '',
            ustaOgretici: e.usta_ogretici || '',
            onayDurumu: e.onay_durumu || '',
            sinavDurumu: e.sinav_durumu || '',
            sonuc: e.sonuc || '',
          })),
          lessons: (m.lessons || []).map((l) => ({
            donemi: l.donem || '',
            grupAdi: l.grup_adi || '',
            grupBaslama: l.grup_baslama || '',
            subesi: l.sube || '',
            plaka: l.plaka || '',
            dersYeri: l.ders_yeri || '',
            dersTarihi: l.ders_tarihi || '',
            dersSaati: l.ders_saati || '',
            personel: l.personel || '',
            egitimTuru: l.egitim_turu || '',
          })),
        });
        detailsPulled++;
      }
    } catch (e: any) {
      console.error(`[StudentSync] Pull detail tc=${remote.tc} failed:`, e?.message || e);
    }
  }
  console.log(`[StudentSync] Pull complete: ${listRows.length} list rows, ${detailsPulled} details merged`);
}
