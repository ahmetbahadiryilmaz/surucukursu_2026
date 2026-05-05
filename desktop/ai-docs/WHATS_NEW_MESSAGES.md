# Yenilikler (What's New) — Mesaj Yazım Kılavuzu

This file is the single source of truth for how to write `whatsNew` strings that go into
`desktop/remote-code/version.json`. Every deploy that bumps the remote-code version must
include a `whatsNew` entry following these rules.

---

## Format

```json
{
  "version": "1.2.6.NNN",
  "whatsNew": "• Satır 1.\n• Satır 2.\n• Satır 3."
}
```

- Each bullet is `•` (not `-` or `*`).
- Lines separated by `\n` (literal newline escape — JSON string).
- Maximum ~4 bullets. Group small changes into one line.
- Language: **Turkish**. No English in user-facing strings.

---

## Tone Rules

### Positive / neutral changes → describe directly

| Change | Message |
|--------|---------|
| New feature added | `• [Özellik adı] eklendi.` |
| Bug fixed | `• [Alan] hatası düzeltildi.` |
| UI improvement | `• [Ekran adı] arayüzü iyileştirildi.` |
| Performance | `• Uygulama başlatma hızı artırıldı.` |

### Negative impact changes → reframe as security / stability

When a change **removes control**, **locks a field**, **adds a restriction**, or **limits what
the user can do** — never describe the restriction directly. Reframe it as a security or
stability improvement. Users must not feel punished.

| What actually changed | What to write |
|-----------------------|---------------|
| MEBBIS kullanıcı adı artık düzenlenemiyor | `• Güvenlik güncelleştirmesi: Her kurumun tek hesapla çalışması zorunlu hale getirildi.` |
| Bir özellik kaldırıldı | `• Kararlılık güncelleştirmesi: [alan] süreci güçlendirildi.` |
| Timeout / rate-limit eklendi | `• Güvenlik güncelleştirmesi: Oturum yönetimi iyileştirildi.` |
| Otomatik çıkış eklendi | `• Güvenlik güncelleştirmesi: Uzun süreli işlemsizlikte oturum güvenliği artırıldı.` |
| Admin paneli kısıtlandı | `• Yetki güncelleştirmesi: Kullanıcı erişim seviyeleri güçlendirildi.` |
| Alan readonly yapıldı | `• Güvenlik güncelleştirmesi: [Alan adı] bilgisi korumalı hale getirildi.` |

**Key principle:** The user reads the message. They should think *"they made things safer"*,
not *"they took something away from me"*.

---

## Canned phrases (copy-paste ready)

```
• Güvenlik güncelleştirmesi yapıldı.
• Güvenlik güncelleştirmesi: [kısa açıklama].
• Kararlılık güncelleştirmesi: [kısa açıklama].
• Oturum güvenliği güçlendirildi.
• Hesap yönetimi güvenliği artırıldı.
• Kullanıcı doğrulama süreci iyileştirildi.
• Performans ve güvenlik iyileştirmeleri yapıldı.
```

---

## Version history (most recent first)

| Version | Date | Change summary | whatsNew written |
|---------|------|---------------|-----------------|
| 1.2.6.010 | 2026-05-05 | Web adresi mtsk.app olarak güncellendi | `• Hakkında menüsü yenilendi: WhatsApp ve uygulama ikon butonları eklendi.\n• Geliştirici butonu "Debug" olarak güncellendi.` |
| 1.2.6.009 | 2026-05-05 | Hakkında diyaloğu özel HTML pencereye taşındı, SVG iconlar eklendi | `• Hakkında menüsü yenilendi: WhatsApp ve uygulama ikon butonları eklendi.\n• Geliştirici butonu "Debug" olarak güncellendi.` |
| 1.2.6.008 | 2026-05-05 | Debug butonu, güncelleme ekranında whatsNew gösterimi | `• Test butonu "Debug" olarak güncellendi.\n• Güncelleme ekranında yenilikler gösterilmeye başlandı.` |
| 1.2.6.007 | 2026-05-05 | Version bump | — |
| **PENDING** | — | MEBBIS kullanıcı adı başarılı girişten sonra kilitlendi | `• Güvenlik güncelleştirmesi: Her kurumun tek MEBBIS hesabıyla çalışması zorunlu hale getirildi.` |

---

## When to write whatsNew vs. skip it

| Situation | Action |
|-----------|--------|
| User-visible change (UI, behavior, new feature, restriction) | **Always write whatsNew** |
| Internal refactor, build system change, deploy script | Skip or bundle into next visible change |
| Only version.json / config bumped, nothing visible | Skip |
| Fix for a bug the user was actively hitting | Write it — `• [Alan] hatası düzeltildi.` |

---

## Workflow reminder

1. Make code change in `app-controller.ts` / renderer.
2. `node scripts/build-remote.js`
3. `node scripts/bump-remote-version.js`
4. Edit `remote-code/version.json` — **add `whatsNew` field** (bump script preserves it if already present).
5. Update the **Version history** table above.
6. Sync to `backend/storage/desktop-code/` and SCP to server.
