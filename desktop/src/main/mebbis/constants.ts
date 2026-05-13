/**
 * Shared constants and types for the mebbis/ submodules.
 */

import { BrowserWindow } from 'electron';
import { Account } from '../storage/account-store';

export interface RunningAccount {
  account: Account;
  window: BrowserWindow;
}

/**
 * In-page helpers injected into every dgDersProgrami scrape so we can pick
 * the right Dönem (period) regardless of MEBBIS row order. Parses
 * "YYYY - <Turkish month>" (or "YYYY - <month number>") into a comparable
 * key, exposes:
 *   _periodKey(label)      → numeric key (year*12 + monthIndex), -Infinity if unparseable
 *   _filterByNewest(rows)  → rows belonging to the chronologically newest period
 *   _filterByPeriod(rows, targetLabel)
 *                          → rows whose period matches targetLabel; falls back to newest
 *
 * Background: MEBBIS lists periods newest-first sometimes and oldest-first
 * sometimes, so we cannot trust array position. See the Mehmet Çelik
 * regression where "lessons[length-1]" picked the older Nisan period.
 */
export const PERIOD_HELPERS_JS = `
  const TR_MONTHS = {
    'Ocak':0,'Şubat':1,'Mart':2,'Nisan':3,'Mayıs':4,'Haziran':5,
    'Temmuz':6,'Ağustos':7,'Eylül':8,'Ekim':9,'Kasım':10,'Aralık':11
  };
  function _periodKey(p) {
    const s = String(p == null ? '' : p).trim();
    const m = s.match(/(\\d{4})\\s*-\\s*(.+)/);
    if (!m) return -Infinity;
    const year = parseInt(m[1], 10);
    const tail = m[2].trim();
    let month;
    if (/^\\d+$/.test(tail)) {
      month = parseInt(tail, 10) - 1;
    } else {
      month = TR_MONTHS[tail];
    }
    if (month == null || isNaN(month)) return -Infinity;
    return year * 12 + month;
  }
  function _pickNewestPeriod(rows) {
    let best = -Infinity, picked = null;
    for (const r of rows) {
      const k = _periodKey(r[0]);
      if (k > best) { best = k; picked = r[0]; }
    }
    return picked;
  }
  function _filterByNewest(rows) {
    if (!rows.length) return rows;
    const newest = _pickNewestPeriod(rows);
    return newest ? rows.filter(r => r[0] === newest) : rows;
  }
  function _filterByPeriod(rows, targetLabel) {
    if (!targetLabel) return _filterByNewest(rows);
    const targetKey = _periodKey(targetLabel);
    const matches = targetKey > -Infinity
      ? rows.filter(r => _periodKey(r[0]) === targetKey)
      : rows.filter(r => r[0] === targetLabel);
    return matches.length ? matches : _filterByNewest(rows);
  }
`;
