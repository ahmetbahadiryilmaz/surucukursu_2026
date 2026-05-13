/**
 * Module functions extracted from manager.ts. Each takes the MebbisManager
 * instance as first argument (`m`) so callers go through m.x for shared state.
 */

import { BrowserWindow, dialog, session, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Account } from '../storage/account-store';
import { getStudentDb } from '../storage/student-db';
import { getPersonnelDb, PersonnelDetailData } from '../storage/personnel-db';
import { fetchEncryptedTemplate } from '../templates/template-fetcher';
import { getRequestLogger } from '../utils/request-logger';
import { pushList, pushDetail } from '../sync/student-sync';
import { pushPersonnelList, pushPersonnelDetail } from '../sync/personnel-sync';
import { fetchKurumInfo } from '../sync/kurum-info-sync';
import { fetchCars, updateCarRoute } from '../sync/car-sync';
import { getCodeLoader } from '../../launcher/remote-code-loader';
import type { MebbisManager } from './manager';

export function serializeStore(m: MebbisManager, account: Account) {
    const students = getStudentDb().serialize(account.id);
    const personnel = getPersonnelDb().serialize(account.id);
    const kurumInfo = m.kurumInfoCache.get(account.id) || null;
    const cars = m.carsCache.get(account.id) || null;
    return { ...students, personnel: personnel.personnel, kurumInfo, cars };
}

export function pushStoreToSidebar(m: MebbisManager, win: BrowserWindow, account: Account): void {
    if (win.isDestroyed()) return;
    const payload = m.serializeStore(account);
    console.log(`[Sidebar][${account.label}] Pushing store: ${payload.students.length} students, ${payload.plates.length} plates, ${payload.personnel.length} personnel, kurumInfo=${payload.kurumInfo ? 'yes' : 'no'}`);
    const json = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');
    win.webContents.executeJavaScript(`
      (function() {
        try {
          window.__mebbisStore = ${json};
          if (typeof window.__mebbisRenderStore === 'function') {
            window.__mebbisRenderStore();
            console.log('[MEBBIS_SIDEBAR] Store re-rendered: ' + window.__mebbisStore.students.length + ' students, ' + window.__mebbisStore.plates.length + ' plates, ' + (window.__mebbisStore.personnel || []).length + ' personnel');
          } else {
            console.log('[MEBBIS_SIDEBAR] Store stashed but no renderer yet');
          }
        } catch (e) {
          console.log('[MEBBIS_SIDEBAR] Push failed: ' + e);
        }
      })();
    `).catch((e) => console.error(`[Sidebar][${account.label}] Push failed:`, e));

    // Lazy fire-and-forget kurum info fetch on the first push for this account.
    if (!m.kurumInfoCache.has(account.id) && !m.kurumInfoFetching.has(account.id)) {
      m.kurumInfoFetching.add(account.id);
      fetchKurumInfo()
        .then((info) => {
          m.kurumInfoFetching.delete(account.id);
          if (!info) return;
          m.kurumInfoCache.set(account.id, info);
          if (!win.isDestroyed()) m.pushStoreToSidebar(win, account);
        })
        .catch(() => { m.kurumInfoFetching.delete(account.id); });
    }

    // Lazy fire-and-forget cars fetch on the first push for this account.
    if (!m.carsCache.has(account.id) && !m.carsFetching.has(account.id)) {
      m.carsFetching.add(account.id);
      fetchCars()
        .then((cars) => {
          m.carsFetching.delete(account.id);
          if (!cars) return;
          m.carsCache.set(account.id, cars);
          if (!win.isDestroyed()) m.pushStoreToSidebar(win, account);
        })
        .catch(() => { m.carsFetching.delete(account.id); });
    }
}
