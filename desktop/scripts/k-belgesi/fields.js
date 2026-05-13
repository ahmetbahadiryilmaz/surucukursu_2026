// Field positions for the K-Belgesi form template, in millimetres relative
// to the A4 portrait page (210 × 297 mm). Edit these and re-run main.js to
// regenerate the template + previews.
//
// `left` should be set so the value sits in the empty space AFTER the
// printed label's colon — not overlapping the label text.
module.exports = [
  // ---- Box 1: BELGENİN GEÇERLİ OLDUĞU (top-left) ----
  // Each `left` includes ~1 char breathing space after the printed colon.
  { key: 'aracCinsi',         left:  45, top:  24, width: 48 },
  { key: 'gurzergah',         left:  50, top:  28, width: 45 },
  { key: 'gunSaat',           left:  49, top:  33, width: 45 },
  // Dates sit on the printed ".../...../....." dots after the colon.
  { key: 'duzenlenmeTarihi',  left:  53.5, top:  37, width: 37 },
  { key: 'gecerlikBitisi',    left:  63, top:  41, width: 28 },
  // Müdür name sits on the dots after "Özel" — right shift past "Özel" word.
  { key: 'mudurAd',           left:  53, top:  53, width: 45 },

  // ---- Box 2: T.C. MİLLÎ EĞİTİM BAKANLIĞI (top-right) ----
  // iliIlcesi fills the blank dotted line ABOVE "İli / İlçesi Özel".
  { key: 'iliIlcesi',         left: 126.3, top:  23, width: 70 },
  // kursAdi sits on the dots between "Özel" and "Motorlu".
  // Starts from the first dot; smaller font to match the dotted line scale.
  { key: 'kursAdi',           left: 142, top:  28, width: 25, fontSize: '7pt' },
  // belgeNo / belgeTarihi: smaller font, both on the same row pitch.
  { key: 'belgeNo',           left: 128, top:  42, width: 65, fontSize: '8pt' },
  { key: 'belgeTarihi',       left: 132, top:  47, width: 65, fontSize: '8pt' },
  { key: 'kursAdresi',        left: 132, top:  63, width: 70 },

  // ---- Box 3: SÜRÜCÜ ADAYININ (middle-left) ----
  // Rows 1-3 (TC/Ad/Soyad): nudge down so the value lands ON the label row,
  // not above it. Rows 4-7 (Baba ad / Doğum yeri / Doğum tarihi / Adresi):
  // nudge up so the value lands on the label row, not below.
  // Each `left` includes ~2 mm breathing space after the colon.
  { key: 'adayTc',            left:  50, top:  78, width: 40 },
  { key: 'adayAd',            left:  34, top:  83, width: 53 },
  { key: 'adaySoyad',         left:  39, top:  88, width: 48 },
  { key: 'adayBabaAd',        left:  42, top:  92, width: 48 },
  { key: 'adayDogumYeri',     left:  46, top:  96, width: 44 },
  { key: 'adayDogumTarihi',   left:  48, top: 100, width: 42 },
  { key: 'adayAdresi',        left:  39, top: 104, width: 61 },

  // ---- Box 4: USTA ÖĞRETİCİSİ (middle-right) — 5 mm row pitch ----
  // Each `left` is ~1 char (~2 mm) after the printed colon.
  { key: 'ustaTc',            left: 137, top:  78, width: 51 },
  { key: 'ustaAd',            left: 123, top:  82, width: 61 },
  { key: 'ustaSoyad',         left: 128, top:  86, width: 60 },
  { key: 'ustaAdresi',        left: 127, top:  91, width: 71 },
  // Sub-section "Sürücü belgesi …".
  { key: 'ustaBelgeSinifi',   left: 144, top:  99, width: 42 },
  { key: 'ustaBelgeNo',       left: 137, top: 103, width: 50 },
  { key: 'ustaBelgeYeri',     left: 157, top: 108, width: 43 },
];
