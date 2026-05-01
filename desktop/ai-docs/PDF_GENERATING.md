# PDF Generation System (CodeIgniter - Direksiyon Takip)

## Overview
The system generates "Direksiyon Eğitimi Çalışma Takip Formu" (Driving Training Tracking Form) PDFs for driving school students. Users select a license class transition (e.g., B→C, A1→A2), the system fetches student lesson data from MEBBIS, picks the correct HTML template based on lesson count + simulator presence, populates it with student data, and converts it to a full-page A4 PDF using DOMPDF.

---

## Complete Flow

```
User selects "sinif" (class transition) in UI
    ↓
POST to Mebbis_service::liste2() controller
    ↓
Fetches student data from MEBBIS by TC number
    ↓
Mebbisbot::liste2uret() or liste2uretToPdf()
    ↓
Template selection based on lesson count + simulator
    ↓
HTML populated with student data via simple_html_dom
    ↓
DOMPDF converts HTML → A4 portrait PDF
    ↓
Single: streamed to browser | Batch: saved to disk & zipped
```

---

## Step 1: User Selection (View)

**File:** `application/views/mebbis_list2.php`

The user sees a form with:
- **TC input**: Student's Turkish ID number
- **Sınıf dropdown**: License class transition options

### Selection Value Format
Each option has the format: `{from_class},{to_class}|{lesson_count}`

Examples:
| Option Value | Meaning | Lesson Count |
|---|---|---|
| `0,B\|16` | New B license | 16 |
| `0,A\|14` | New A license | 14 |
| `C,D1\|4` | C → D1 upgrade | 4 |
| `A1,A2\|6` | A1 → A2 upgrade | 6 |
| `B,A2\|12` | B → A2 transition | 12 |
| `B(2016 Sonrası),C\|20` | B(post-2016) → C | 20 |
| `D,C\|10` | D → C transition | 10 |
| `B(2016 Öncesi),D\|7` | B(pre-2016) → D | 7 |

### Lesson Count Categories
- **4 lessons**: Quick upgrades (e.g., C→D1)
- **6 lessons**: Similar class transitions (e.g., A1→A2, B→BE, C→CE)
- **7 lessons**: Specific transitions (e.g., B→D1, C→D)
- **10 lessons**: D→C transition
- **12 lessons**: Cross-type transitions (e.g., B→A, C→A2)
- **14 lessons**: New A or A→B transitions
- **16 lessons**: New B license
- **20 lessons**: B(2016 post)→C (heavy vehicle, CE/TIR class)

---

## Step 2: Controller (Mebbis_service.php)

### Single PDF: `liste2()` (line ~220)
1. Validates user session & demo limits (`direktakiplistesayi > 7`)
2. Calls `mebbisbot->setTbMebbisId()` with the MEBBIS account ID
3. Logs in to MEBBIS via `mebbisService->isLoggedIn()`
4. Fetches student page from MEBBIS: `mebbisbot->getir2($tc)`
5. Parses student info from `#dgDonemBilgileri` table (name, TC, period, etc.)
6. Parses lesson schedule from `#pnlDersProgreami` table
7. Filters lessons to current period, excludes "Başarısız Aday Eğitimi"
8. Sets `baslikarray["gecissinif"] = $sinif` from the POST selection
9. Calls `mebbisbot->liste2uret()` → streams PDF directly to browser

### Batch PDF: `liste2coklu()` (line ~287)
1. Sets cron status to `1` with template `2` (direktakip type)
2. Cron job calls `mebbisbot->recordstopdfpercentdirektakp()`
3. Processes students in batches of `$perminute` (10 records per run)
4. Each student: `liste2getbilgi(tc)` → `liste2uretToPdf()` → save to disk
5. After all done, zips the folder and cleans up

### Cron Dispatch (Cron.php line ~231)
```php
if ($tb_mebbis->template == 2) {
    $this->mebbisbot->recordstopdfpercentdirektakp($percent);
}
```

---

## Step 3: Template Selection Logic

**File:** `application/libraries/Mebbisbot.php`

### Two entry points (nearly identical logic):

#### `liste2uret()` (line 104) — Single/direct download
- Parses `gecissinif` value: `"0,B|16"` → extracts class `"B"` and count `16`
  ```php
  $sinif = explode("|", $adaybilgi["gecissinif"]);
  $kacli = $sinif["1"];  // lesson count from dropdown
  $sinif = explode(",", $sinif[0]);
  $sinif = $sinif[1];    // target class letter
  ```
- Streams PDF directly: `$dompdf->stream()`

#### `liste2uretToPdf()` (line 367) — Batch/save to file
- Extracts class from MEBBIS data: `$adaybilgi["istenen-sertifika"]`
  ```php
  $sinif = explode(" ", $adaybilgi["istenen-sertifika"]); // "B SINIFI SERTİFİKA (Manuel)"
  $sinif = $sinif[0]; // "B"
  ```
- Uses `count($tablobilgi)` for lesson count (from actual MEBBIS data)
- Saves PDF to disk: `savepdf()`

### Simulator Check
```php
$simulatorlu = false;
foreach ($tablobilgi as $v) {
    if ($v[5] == "Simulatör" || $v[5] == "Direksiyon Eğitim Alanı") {
        $simulatorlu = true;
    }
}
```

### Template File Selection
```php
if ($simulatorlu && in_array($kacli, [12, 14, 16])) {
    $dosya = $kacli . "nsimli";   // e.g., "12nsimli"
} else {
    $dosya = $kacli . "n";         // e.g., "12n"
    // Remove simulator rows from data
    // (simulator lessons exist but template doesn't have slots for them)
}
```

**Important:** When there's no simulator-specific template, simulator lesson rows are **removed** from the data array and `array_values()` is called to re-index.

### Available Templates

**Path:** `storage/simulatortemplates/liste2/` (loaded at runtime)  
**Source templates:** `templates/direksiyon-takip/`

| Template File | Lessons | Simulator | Default Class in HTML |
|---|---|---|---|
| `4n.html` | 4 | No | CE TIR |
| `6n.html` | 6 | No | — |
| `7n.html` | 7 | No | — |
| `10n.html` | 10 | No | — |
| `12n.html` | 12 | No | D |
| `12nsimli.html` | 12 | Yes | A2 |
| `14n.html` | 14 | No | — |
| `14nsimli.html` | 14 | Yes | — |
| `16n.html` | 16 | No | — |
| `16nsimli.html` | 16 | Yes | — |
| `20n.html` | 20 | No | C |

---

## Step 4: HTML Population (simple_html_dom)

The system uses the `simple_html_dom` PHP library to parse and manipulate HTML templates. Each template has CSS class-based placeholders:

### Populated Fields
| CSS Class | Data Source | Description |
|---|---|---|
| `.name` | `$adaybilgi["ad-soyad"]` | Student full name |
| `.tc` | `$adaybilgi["tc-kimlik-no"]` | Turkish ID number |
| `.vClass` | Extracted class letter (B, C, D, etc.) | License class |
| `.date` | `$tablobilgi[$ix][6]` + `[7]` | Lesson date + time (two font sizes) |
| `.plate` | `$tablobilgi[$ix][4]` | Vehicle license plate (strips "(Manuel)") |
| `.mTrainer` | `$tablobilgi[$ix][8]` | Instructor name |

### Date Formatting
Dates are rendered with two different font sizes in a single cell:
```php
$date->innertext = "<span style='font-size:9px'>" . $tablobilgi[$ix][6] . "</span>"
                 . "<br>"
                 . "<span style='font-size:7px'>" . $tablobilgi[$ix][7] . "</span>";
```

### Iteration Pattern
Each `.date`, `.plate`, and `.mTrainer` element in the HTML corresponds to one lesson row. The code iterates through all matching elements and fills them with data at the same index.

---

## Step 5: PDF Conversion (DOMPDF)

**File:** `application/libraries/Mebbisbot.php` → `savepdf()` (line ~1400)

### How Full-Height A4 Works

```php
$dompdf = new Dompdf();
$dompdf->loadHtml($htmlf);
$dompdf->setPaper('A4', 'portrait');  // 210mm × 297mm
$dompdf->render();
```

**The HTML fills the full A4 page because:**

1. **CSS Global Styling**: 
   - `font-size: 9px` and `line-height: 0.9` — extremely compact text
   - `font-family: DejaVu Sans` — required by DOMPDF for UTF-8/Turkish character support
   
2. **Table Width**: Fixed at `700px` which maps to nearly full A4 width at DOMPDF's default 96 DPI
   - A4 at 96 DPI = ~794px width, with `20px` padding → table takes most of the width

3. **No Page Margins**: No explicit margin styles on body, so DOMPDF uses minimal defaults

4. **Dense Content Structure**: 
   - All lesson rows packed into a single `<table>` 
   - `rowspan` used to group lessons under category headers
   - Category headers: "ARAÇ KULLANMAYA HAZIRLIK", "ARACI KULLANMA", "DEĞİŞİK HAVA VE YOL DURUMU"

5. **Template-per-count Design**: Each lesson count (4, 6, 7, 10, 12, 14, 16, 20) has its own template with the exact number of rows pre-built. The table naturally fills or nearly fills the A4 page because the curriculum content for each count is already laid out.

### Two Output Modes

**Direct stream (single):**
```php
$dompdf->stream($filename, array("Attachment" => true));
// Browser downloads the PDF immediately
```

**Save to file (batch):**
```php
$this->curl->createPath($path);  // mkdir -p equivalent
file_put_contents($path . $pdfname, $dompdf->output());
// Saved to: storage/mebbisbot/tbMebbis{id}/pdf/direktakpliste/{period}/{name}.pdf
```

### Skip Existing
```php
if (file_exists($this->path . $pdfname) && $checkexists) {
    return pdfCreateStatuses::$exists;  // Don't regenerate
}
```

---

## PDF Storage Path

```
storage/mebbisbot/tbMebbis{mebbisId}/pdf/direktakpliste/{period-slug}/{tc-name-slug}.pdf
```

Example: `storage/mebbisbot/tbMebbis42/pdf/2024---aralik/12345678900-ali-yilmaz.pdf`

After batch generation, all PDFs are zipped into: `tbMebbis{id}-{datetime}.zip`

---

## Key Files

| File | Purpose |
|---|---|
| `application/libraries/Mebbisbot.php` | Core PDF generation library |
| `application/controllers/Mebbis_service.php` | Controller for single/batch PDF requests |
| `application/controllers/Cron.php` | Batch processing cron job |
| `application/views/mebbis_list2.php` | UI form for single PDF (class selection) |
| `application/views/mebbis_list2coklu.php` | UI form for batch PDF |
| `application/libraries/pdfCreateStatuses.php` | Return status constants |
| `application/libraries/CronStatuses.php` | Cron status tracking |
| `templates/direksiyon-takip/*.html` | 11 HTML templates (source copies) |
| `storage/simulatortemplates/liste2/*.html` | Runtime templates (deployed copies) |
| `vendor/dompdf/` | DOMPDF library (via Composer) |

---

## Trick Points & Edge Cases

1. **Template path**: Templates are loaded from `storage/simulatortemplates/liste2/`, NOT from `templates/direksiyon-takip/`. The `templates/` folder is the source/reference.

2. **Two different class extraction methods**: 
   - `liste2uret()` → from user's dropdown selection (`gecissinif` POST value)
   - `liste2uretToPdf()` → from MEBBIS API data (`istenen-sertifika` field)

3. **Simulator lesson removal**: When using a non-simulator template, simulator rows are removed from data AND array is re-indexed with `array_values()`. Without re-indexing, iteration would skip indices.

4. **Default class in HTML**: Each template has a hardcoded default class (e.g., "D", "A2", "CE TIR") in the `.vClass` cell. This gets **overwritten** by the code, so the default doesn't matter.

5. **Demo limit**: Non-premium users (`yetki2 != "prime"`) are limited to 7 PDF downloads (`direktakiplistesayi > 7`).

6. **Batch sleep**: `liste2getbilgi()` has a `sleep(5)` between each student fetch to avoid MEBBIS rate limiting.

7. **Cron template types**: Template `1`/`0` = simulator reports, Template `2` = direktakip (driving tracking form).

8. **DejaVu Sans font**: DOMPDF requires this font for Turkish characters (ğ, ş, ı, ö, ü, ç). Using other fonts would break Turkish text rendering.

9. **`simple_html_dom` reuse**: The `$liste2html` object is a class property. For batch processing, `load_file()` is called each iteration to reload the template fresh. Otherwise, previous student data would persist.
