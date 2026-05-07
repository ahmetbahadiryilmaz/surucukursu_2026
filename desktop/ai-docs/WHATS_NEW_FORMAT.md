# What's New Format Guide

## Overview
The `whatsNew` field in `desktop/remote-code/version.json` displays user-facing release notes when the app updates. This document defines the format and guidelines for creating these messages.

## Required Schema

```json
{
  "version": "1.2.7.006",
  "whatsNew": "<latest release notes>",
  "history": [
    { "version": "1.2.7.005", "whatsNew": "<previous>" },
    { "version": "1.2.7.004", "whatsNew": "<two-back>" },
    { "version": "1.2.7.003", "whatsNew": "<three-back>" }
  ]
}
```

The bundle's "Yenilikler" dialog shows the **latest 4 entries** (current + history[0..2]). Always keep `history` populated with the most recent 3 prior versions whenever you bump `version`/`whatsNew`. Drop the oldest entry when adding a new one.

## Format Rules

### Single-line Format (Preferred for Simple Updates)
```json
{
  "version": "1.2.7.003",
  "whatsNew": "Hata mesajları güvenli hale alındı — kullanıcılara dostu mesajlar gösterilir"
}
```

**Rules:**
- Clear, concise Turkish sentence
- Use em-dash (`—`) for emphasis or separation
- Describe the user benefit, not technical details
- Keep under 100 characters when possible

### Multi-line Format (For Feature Lists)
```json
{
  "version": "1.2.6.016",
  "whatsNew": "• Sol menüdeki Öğrenciler ve Araçlar listesi açılır pencere ile gösteriliyor (uzun listeler artık sıkışmıyor).\n• Tabloda öğrenci bilgileri TC, Ad Soyad ve Detay düğmesiyle birlikte sunuluyor."
}
```

**Rules:**
- Use bullet points (`•`) for each feature
- Separate bullets with `\n` (literal newline in JSON string)
- Each bullet is 1-2 lines (max ~80 chars)
- Format: `• Feature name — user benefit`

## Language & Tone

- **Language:** Turkish (Türkçe)
- **Tone:** User-friendly, benefit-focused, not technical
- **Avoid:** Error codes, URLs, internal jargon, implementation details
- **Include:** What changed for the user, why it's better

## Examples

### ✅ Good Examples

| Version | Message |
|---------|---------|
| `1.2.7.003` | `Hata mesajları güvenli hale alındı — kullanıcılara dostu mesajlar gösterilir` |
| `1.2.7.002` | `Çoklu indirme hata raporlaması — başarısız dosyaları grupla ve göster` |
| `1.2.7.001` | `Güvenlik Güncelleştirmesi` |
| `1.2.6.016` | `• Sol menüdeki Öğrenciler ve Araçlar listesi açılır pencere ile gösteriliyor (uzun listeler artık sıkışmıyor).\n• Tabloda öğrenci bilgileri TC, Ad Soyad ve Detay düğmesiyle birlikte sunuluyor.` |

### ❌ Bad Examples

| Bad | Why |
|-----|-----|
| `Fixed HTTP 400 error handling in template fetcher` | Too technical, doesn't explain benefit |
| `Updated app.module.ts rate limit to 1000/min` | Implementation detail, not user-facing |
| `Sanitized error messages in desktop-crypto-client.ts` | Technical detail, should describe user benefit |
| `Hata kodu 400 artık gösterilmiyor` | Generic, could be more specific |

## Latest 4 Versions (Reference)

### 1.2.7.003
**Date:** May 7, 2026  
**Component:** Error message sanitization  
```
Hata mesajları güvenli hale alındı — kullanıcılara dostu mesajlar gösterilir
```
**Details:**
- Hide URLs and server details from error dialogs
- Show Turkish-friendly error messages (rate limit exceeded, template not found, etc.)
- Developers still see full error details in console logs

### 1.2.7.002
**Date:** May 7, 2026  
**Component:** Batch download error aggregation  
```
Çoklu indirme hata raporlaması — başarısız dosyaları grupla ve göster
```
**Details:**
- Group errors by type when batch downloads fail
- Show unique errors with sample file examples
- Example: "Simülatör dersi bulunamadı (TC: 12345678901)" or "(3 öğrenci, örnek: TC123)"

### 1.2.6.016
**Date:** May 2, 2026  
**Component:** Sidebar UI improvements  
```
• Sol menüdeki Öğrenciler ve Araçlar listesi açılır pencere ile gösteriliyor (uzun listeler artık sıkışmıyor).
• Tabloda öğrenci bilgileri TC, Ad Soyad ve Detay düğmesiyle birlikte sunuluyor.
```
**Details:**
- Students and Cars lists now display in popup instead of inline
- Prevents layout crowding with long lists
- Table now shows TC, Name, and Detail button

### 1.2.6.011
**Date:** May 1, 2026  
**Component:** About dialog and auto-update  
```
• Hakkında menüsü yenilendi: WhatsApp ve uygulama ikon butonları eklendi.
• Yeniden yükleme olmaksızın oto güncelleme eklendi.
```
**Details:**
- About dialog redesigned with WhatsApp and app icon buttons
- Auto-update now works without requiring app reload

## Deployment

When bumping the remote code version:

1. **Edit** `desktop/remote-code/version.json`
2. **Update** `version` field (e.g., `1.2.6.011` → `1.2.6.012`)
3. **Write** `whatsNew` following this guide
4. **Run** `npm run build:remote` to bundle code
5. **Deploy** via SCP to `mtsk@ekullanici_i86:/home/mtsk/mtsk.app/backend/storage/desktop-code/version.json`

Example:
```json
{
  "version": "1.2.7.004",
  "whatsNew": "Batch downloads 10x faster — hız sınırı artırıldı"
}
```

## String Escaping in JSON

When including newlines in multi-line format, use literal `\n`:

```json
{
  "whatsNew": "• Feature 1 description.\n• Feature 2 description."
}
```

Not: `\\\n` or escaped backslash. JSON parser handles the `\n` automatically.

## Character Limit Guidelines

- **Single-line:** ≤100 chars (fits most dialogs without wrapping)
- **Per bullet:** ≤80 chars (reads comfortably)
- **Total multi-line:** ≤300 chars (3-4 bullets max)

---

**Last Updated:** May 7, 2026  
**Format Version:** 1.0  
**Related Docs:**
- `DESKTOP_UPDATE_DEPLOY.md` — Deployment procedures
- `DESKTOP_APP.md` — App architecture and update system
