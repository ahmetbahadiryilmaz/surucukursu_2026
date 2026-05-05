# Yenilikler (What's New) — Mesaj Yazım Kılavuzu

This file defines how to write `whatsNew` strings for `desktop/remote-code/version.json`.

---

## Format

```json
{
  "version": "1.2.6.NNN",
  "whatsNew": "• Satır 1.\n• Satır 2.\n• Satır 3."
}
```

- Bullet character: `•`
- Lines separated by `\n`
- Max ~4 bullets. Group small changes.
- Language: **Turkish only**

---

## Categories & phrasing

Every change falls into one of these categories. Pick the closest one and adapt the phrase.

| Category       | Phrase pattern                                         |
| -------------- | ------------------------------------------------------ |
| Yeni özellik   | `• [Özellik adı] eklendi.`                             |
| Hata düzeltme  | `• [Alan] hatası düzeltildi.`                          |
| Arayüz         | `• [Ekran adı] arayüzü iyileştirildi.`                 |
| Performans     | `• [İşlem] hızı artırıldı.`                            |
| Güvenlik       | `• Güvenlik güncelleştirmesi: [kısa açıklama].`        |
| Hesap yönetimi | `• Hesap güvenliği güçlendirildi.`                     |
| Oturum         | `• Oturum yönetimi iyileştirildi.`                     |
| Genel          | `• Performans ve güvenlik iyileştirmeleri yapıldı.`    |

---

## Canned phrases (copy-paste ready)

```text
• Güvenlik güncelleştirmesi yapıldı.
• Güvenlik güncelleştirmesi: Her kurumun tek MEBBIS hesabıyla çalışması zorunlu hale getirildi.
• Güvenlik güncelleştirmesi: Hesap bilgileri korumalı hale getirildi.
• Oturum güvenliği güçlendirildi.
• Hesap yönetimi güvenliği artırıldı.
• Kullanıcı doğrulama süreci iyileştirildi.
• Kararlılık ve güvenlik iyileştirmeleri yapıldı.
• Arayüz güncelleştirmeleri yapıldı.
```

---

## Version history (most recent first)

| Version        | Date       | whatsNew                                                                                                                                                      |
| -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.2.6.010      | 2026-05-05 | `• Hakkında menüsü yenilendi: WhatsApp ve uygulama ikon butonları eklendi.\n• Geliştirici butonu "Debug" olarak güncellendi.`                                 |
| 1.2.6.009      | 2026-05-05 | `• Hakkında menüsü yenilendi: WhatsApp ve uygulama ikon butonları eklendi.\n• Geliştirici butonu "Debug" olarak güncellendi.`                                 |
| 1.2.6.008      | 2026-05-05 | `• Test butonu "Debug" olarak güncellendi.\n• Güncelleme ekranında yenilikler gösterilmeye başlandı.`                                                         |
| **PENDING**    | —          | `• Güvenlik güncelleştirmesi: Her kurumun tek MEBBIS hesabıyla çalışması zorunlu hale getirildi.`                                                             |

---

## Workflow

1. Change code in `app-controller.ts` / renderer.
2. `node scripts/build-remote.js`
3. `node scripts/bump-remote-version.js`
4. Edit `remote-code/version.json` — add/update `whatsNew` field.
5. Add a row to the **Version history** table above.
6. Sync to `backend/storage/desktop-code/` and SCP to server.
