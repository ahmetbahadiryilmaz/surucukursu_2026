# PHP vs TypeScript Implementation Comparison

This document tracks differences between the legacy PHP `mebbisbot` class and the Electron TypeScript `MebbisManager` class.

**PHP Source**: Legacy `mebbisbot` class (CodeIgniter, Dompdf, simple_html_dom)
**TS Source**: `desktop/src/main/mebbis-manager.ts` (Electron, Chromium printToPDF)

## Status Legend
- ✅ FIXED — Logic matches PHP
- ⚠️ DIFFERENT — Intentional or acceptable deviation
- ❌ NOT IMPLEMENTED — Missing from TS, may need fixing later

---

## Fixed Issues (Completed)

| # | Area | What Was Fixed |
|---|------|----------------|
| 1 | Student info row | Changed from `dataRows[0]` (first) to `dataRows[dataRows.length - 1]` (last) to match PHP `end($adaybilgiler)` |
| 20 | Session sorting | Added descending sort by date+time and `slice(0, 2)` to match PHP `usort` + `array_slice` |
| 21-23 | Sesim timing chart | Rewrote to generate 16 rows with 6-min intervals, 8-min for rows 8/16, +18min break at row 8 for single, session switch for dual |
| 24-26 | Anagrup scoring | Added `.adet` random 0/1 fill (>85→1, puan-=4), `.havadurumu` random weather, `.puan` calculated score |
| 28 | Anagrup egitimsuresi | Tekli: `"date time"`, İkili: `"date1 time1 <br> date2 time2"` matching PHP |

---

## Direksiyon Takip Comparison

| # | Area | PHP (Legacy) | TS (Electron) | Status |
|---|------|-------------|---------------|--------|
| 1 | **Student info row** | Takes **LAST** row of `#dgDonemBilgileri` | Takes **LAST** row | ✅ FIXED |
| 2 | **Header mapping** | Dynamic: slugifies header text → key map (`permalink()`) | Hardcoded column indices (0=TC, 1=Name, 7=Sertifika) | ⚠️ DIFFERENT — fragile if MEBBIS changes columns |
| 3 | **Lesson table selector** | `#pnlDersProgreami > table > tr > td > table > tr` | `#dgDersProgrami` directly | ⚠️ DIFFERENT — dgDersProgrami is likely inside pnlDersProgreami, should work |
| 4 | **Period filtering** | Gets `donemi` from student info row, filters lessons where `derspro[0] === donemi` | Gets last period from lesson table itself | ⚠️ DIFFERENT — similar result, different source |
| 5 | **Başarısız filter** | Excludes `dersprnew[9] !== "Başarısız Aday Eğitimi"` (exact col 9) | Excludes if joined row text `.includes('Başarısız Aday')` | ⚠️ DIFFERENT — TS is looser match but works |
| 6 | **Template count source** | Uses actual lesson count from scraped data | Uses dropdown selection count, falls back to actual | ⚠️ DIFFERENT — TS is arguably better UX (user can override) |
| 7 | **Sınıf (class) source** | Extracts from `istenen-sertifika.split(" ")[0]` | From dropdown, fallback to sertifika | ⚠️ DIFFERENT — TS has fallback, acceptable |
| 8 | **Simli template logic** | `hasSimulator && in_array($kacli, [12, 14, 16])` | Same logic | ✅ MATCH |
| 9 | **Simulator row removal** | Removes where `[5] == "Simulatör" or "Direksiyon Eğitim Alanı"` | Same filter via `.includes()` | ✅ MATCH |
| 10 | **Template folder** | `liste2/{count}n.html` | Remote: `direksiyon-takip/{count}n.html` | ✅ MATCH (same naming) |
| 11 | **Supported counts** | Whatever files exist on disk | Hardcoded: `[4, 6, 7, 10, 12, 14, 16, 20]` | ⚠️ DIFFERENT — must match server files |
| 12 | **Lesson truncation** | Fills template slots, excess ignored | `slice(-closestCount)` takes last N | ⚠️ DIFFERENT — PHP fills what fits, TS crops |
| 13 | **`.date` fill format** | `<span 9px>date</span><br><span 7px>time</span>` | Same format | ✅ MATCH |
| 14 | **`.plate` fill** | `str_replace("(Manuel)", "")` | Also removes "(Otomatik)" | ⚠️ DIFFERENT — TS removes extra, not harmful |
| 15 | **`.mTrainer` fill** | `col[8]` | `col[8]` | ✅ MATCH |
| 16 | **CSS padding stretch** | None | Adds dynamic padding + 26mm stamp reserve | ⚠️ DIFFERENT — TS improvement |
| 17 | **PDF engine** | Dompdf (PHP) | Chromium `printToPDF` | ⚠️ DIFFERENT — rendering may differ slightly |
| 18 | **Scraping delay** | `sleep(5)` before scrape | None (Electron `did-finish-load` event) | ⚠️ DIFFERENT — acceptable, event-driven |
| 19 | **Template existence check** | `file_exists()` | Throws on fetch failure | ⚠️ DIFFERENT — error handling differs |

---

## Simulatör Comparison

| # | Area | PHP (Legacy) | TS (Electron) | Status |
|---|------|-------------|---------------|--------|
| 20 | **Session sorting** | Sort desc by date+time, take top 2 | Same | ✅ FIXED |
| 21 | **Sesim timing chart** | 16 rows, 6-min intervals, +18min break | Same | ✅ FIXED |
| 22 | **Sesim dual session** | First 8 rows session 1, last 8 from session 2 | Same | ✅ FIXED |
| 23 | **Sesim single session** | All 16 rows from 1 session | Same | ✅ FIXED |
| 24 | **Anagrup `.adet` fill** | Random 0/1 (>85→1), puan starts 100, -4 per hit | Same | ✅ FIXED |
| 25 | **Anagrup `.havadurumu`** | Random: Sisli/Yağmurlu/Güneşli | Same | ✅ FIXED |
| 26 | **Anagrup `.puan`** | Dynamic calculated score (80-100) | Same | ✅ FIXED |
| 27 | **Company name** | Scraped from MEBBIS `span#SktPageHeader1_lblKurumKodu` | Uses `account.label` (user-set) | ❌ NOT MATCHING — should scrape from MEBBIS page |
| 28 | **Anagrup `egitimsuresi`** | Tekli/İkili format | Same | ✅ FIXED |
| 29 | **ek4 report** | Generates `ek4.pdf` per student (sinav sonuc raporu) | Not implemented | ❌ NOT IMPLEMENTED — separate feature |
| 30 | **TC in name (1337/1338)** | Appends TC to student name for specific accounts | Not implemented | ❌ NOT IMPLEMENTED — edge case for 2 accounts |

---

## Remaining Work (Should Fix Later)

### Priority: Should Fix
- **#27 Company name**: Scrape `span#SktPageHeader1_lblKurumKodu` from the loaded MEBBIS page (skt00001 or skt02009) and use that for `.sirketismi` in anagrup instead of `account.label`. Easy fix: inject JS to read the span when SKT module loads.

### Priority: Can Skip
- **#29 ek4 report**: Completely separate PDF document (sinav sonuc raporu / exam result report). Uses `ek4/ek4.html` template. Has randomized `.sep` visibility sections. Would be a new feature addition, not a fix.
- **#30 TC in name**: Only for `tbMebbisId == 1337 or 1338`. Extremely specific edge case. Can add later if needed.
- **#2 Dynamic header mapping**: PHP uses `permalink()` to slugify header text → key mapping. TS uses hardcoded indices. Risk: if MEBBIS changes column order, TS breaks. Low probability.

---

## Architecture Differences (Not Bugs)

| Area | PHP | TS | Notes |
|------|-----|-----|-------|
| **Data source page** | `skt02009.aspx` | `skt02009.aspx` | Same |
| **Navigation** | Direct HTTP GET/POST via cURL | BrowserWindow in-page menu clicks | By design — Electron uses authenticated browser session |
| **Cookie management** | Netscape cookie files on disk | Electron `persist:` partition with auto-persist | By design |
| **PDF engine** | Dompdf (PHP) | Chromium printToPDF | Different rendering — template CSS must account for this |
| **Batch vs Single** | Processes all students in batch (CSV loop) | Both single and batch modes available | Single: modal input. Batch: skt02006 form → student list → loop skt02009 per student |
| **Template loading** | Local files on server disk | Remote fetch from `online.mtsk.app` | By design — allows hot-updating templates |

---

## Template Files

### Batch Direksiyon Takip (Çoklu)
Implemented in TS to match PHP `getirdirektakpliste()` + `recordstopdfpercentdirektakp()` flow.

**Flow:**
1. User clicks "Çoklu Direksiyon Takip" in left menu
2. Navigates to `skt02006.aspx` (student list page)
3. Scrapes dropdown options from actual form: `cmbEgitimDonemi`, `cmbOgrenciDurumu`, `cmbDurumu`, `cmbGrubu`, `cmbSubesi`
4. Shows modal with options + "Tüm Dönemler" option
5. User selects options, picks output folder
6. Form filled & submitted via browser (no Node.js HTTP)
7. Scrapes `table.frmList` for student TCs (column index 2, matching PHP `$record[2]`)
8. If "Tüm Dönemler": loops each period, re-submits form, collects unique TCs
9. For each student: navigates to `skt02009.aspx`, fills TC, submits, scrapes, generates PDF
10. Auto-detects sınıf per student from `istenen-sertifika` (no user override needed)
11. Saves PDFs to selected folder as `direksiyon_{tc}_{name}.pdf`

**State machine phases:**
- `batch-skt-module` → SKT module loaded, navigate to skt02006
- `batch-skt02006-options` → skt02006 loaded, scrape & show modal
- `batch-skt02006-results` → form submitted, scrape student list (loops for tüm dönemler)
- `batch-skt02009-navigate` → skt02009 loaded for current student, fill TC & submit
- `batch-skt02009-results` → results loaded, scrape & generate PDF, advance to next

**Key methods:** `handleBatchDireksiyon()`, `clickMenuItemForSkt02006()`, `handleSkt02006Options()`, `handleBatchStart()`, `submitSkt02006Form()`, `handleSkt02006Results()`, `handleBatchStudentNavigate()`, `handleBatchStudentResults()`, `batchProcessNextStudent()`, `showBatchProgress()`

**PHP equivalents:**
| PHP Method | TS Method |
|-----------|-----------|
| `getirdirektakpliste()` | `handleSkt02006Results()` + `submitSkt02006Form()` |
| `recordstopdfpercentdirektakp()` → loop | `batchProcessNextStudent()` loop |
| `liste2getbilgi($tc)` | `handleBatchStudentNavigate()` + `handleBatchStudentResults()` |
| `liste2uretToPdf()` | `generatePdfFromTemplate()` (reused from single download) |

---

### Direksiyon Takip
- Server: `https://online.mtsk.app/templates/direksiyon-takip/`
- Files: `{4,6,7,10,12,14,16,20}n.html`, `{12,14,16}nsimli.html`
- CSS selectors used: `.name`, `.tc`, `.vClass`, `.date`, `.plate`, `.mTrainer`

### Simulator - Sesim
- Server: `https://online.mtsk.app/templates/simulator/sesim/sesim.html`
- CSS selectors: `.kursiyer`, `.egitmen`, `.egitimsuresi`, `.cizelgetr` (tbody)

### Simulator - Anagrup
- Server: `https://online.mtsk.app/templates/simulator/anagrup/anagrup.html`
- CSS selectors: `.kursiyer`, `.egitmen`, `.baslik`, `.tarih`, `.donem`, `.egitimsuresi`, `.sirketismi`, `.adet`, `.puan`, `.havadurumu`

### ek4 (Not Implemented in TS)
- PHP path: `storage/simulatortemplates/ek4/ek4.html`
- CSS selectors: `.kursiyer`, `.plakano`, `.egitmen`, `.companyName`, `.tarih`, `.sep1`-`.sep13`
