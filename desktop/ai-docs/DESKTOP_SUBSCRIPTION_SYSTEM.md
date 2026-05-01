# Desktop Subscription System

> **Status:** Implemented (May 2026). Field name on the wire is `subscriptionActive`.

## Overview

Subscriptions belong to **driving schools**, not to users. A user (owner/manager) can always log in to the desktop app. However, driving school buttons/actions are **disabled** if that school's subscription is expired or is in `demo` status (demo is currently blocked — will be enabled later). PDF print limits are not enforced right now; the limit is always stored as `1,000,000`.

---

## Subscription Entity (Current Schema)

```typescript
// backend/shared/src/entities/subscription.entity.ts
@Entity('subscriptions')
export class SubscriptionEntity extends BaseEntity {
  driving_school_id: number;  // unique FK to driving_schools
  type: string;               // 'demo' | 'paid'
  pdf_print_limit?: number;   // Not enforced — always 1_000_000
  pdf_print_used: number;     // Incremented on each PDF download (tracked, not blocking)
  ends_at?: number;           // Unix timestamp expiry. null = never expires
}
```

### Active Subscription Rules
A subscription is considered **active** when ALL of the following are true:
1. `type === 'paid'` (demo is blocked for now)
2. `ends_at` is null OR `ends_at > now (Unix timestamp)`

---

## Architecture

```
Desktop App (Electron)
  │
  ├── auth:login (email, password)
  │       └── desktop-service returns: user info + schools[] with subscription_active per school
  │
  ├── On app start / after login:
  │       └── Each MebbisAccount card shows "Start" button as DISABLED if subscription_active = false
  │
  ├── accounts:start (open MEBBIS window)
  │       └── Desktop sends activity log to backend: { event: 'school_login', school_id }
  │
  └── PDF downloaded (direksiyon takip or simulator)
          └── Desktop sends activity log: { event: 'pdf_download', school_id, pdf_type, count }
```

---

## Desktop-Service API Changes

### 1. `getMebbisAccounts` Returns Subscription Status

The `DrivingSchoolService.getMebbisAccounts()` response must include `subscription_active` per school:

```typescript
export interface MebbisAccountDto {
  id: number;
  label: string;
  username: string | null;
  password: string | null;
  simulatorType: string | null;
  subscriptionActive: boolean;  // NEW — computed from SubscriptionEntity
}
```

**Computation logic (backend):**
```typescript
function isSubscriptionActive(sub: SubscriptionEntity | null): boolean {
  if (!sub) return false;
  if (sub.type !== 'paid') return false;  // demo blocked
  if (sub.ends_at == null) return true;   // never expires
  return sub.ends_at > Math.floor(Date.now() / 1000);
}
```

### 2. Activity Log Endpoint (NEW)

`POST /desktop/activity-log`  
Auth: Bearer token required  

**Request body:**
```json
{
  "event": "school_login" | "pdf_download",
  "school_id": 123,
  "pdf_type": "direksiyon_takip" | "simulator_raporu",  // only for pdf_download
  "count": 1                                              // only for pdf_download
}
```

**Backend behavior:**
- For `pdf_download`: increment `pdf_print_used` in `SubscriptionEntity` (regardless of limit — tracking only)
- Write entry to `system_logs` with `process = 100` (DESKTOP_ACTIVITY) and `description = JSON.stringify(body)`
- Returns `200 OK` always (best-effort logging — don't fail if log fails)

**Implementation:** `backend/services/desktop-service/src/activity-log/` (controller + service + module). Errors are caught and logged to console; the endpoint always returns `{ success: true }`.

---

## Desktop App Changes

### Account Card UI States

Each MEBBIS account card in `app.js` must reflect subscription status:

| State | UI |
|-------|----|
| `subscriptionActive = true` | "Başlat" button enabled (normal) |
| `subscriptionActive = false` | "Başlat" button **disabled** + tooltip/badge: "Abonelik gerekli" |

**CSS class approach:** Add `disabled-subscription` class to the card when inactive.

### IPC Changes

`accounts:list` response is augmented with `subscriptionActive`:
```typescript
// main/mebbis-manager.ts or wherever accounts:list is handled
// subscriptionActive comes from server (via getMebbisAccounts)
// stored alongside account in AccountStore or fetched fresh from server each time
```

### Activity Logging (Desktop Side)

When `accounts:start` is called and the MEBBIS window opens successfully → main process calls `apiClient.logActivity({ event: 'school_login', school_id: account.id })` (fire-and-forget).

When a PDF is saved successfully (single direksiyon takip, single simulator/ek4 bundle, batch direksiyon, batch simulator) the `MebbisManager` invokes the activity logger registered by `main.ts` via `setActivityLogger(...)`. The logger sends `{ event: 'pdf_download', school_id, pdf_type, count: 1 }` per saved unit. Batches naturally produce one log per student because each batch iteration goes through the same save path.

Logging is **fire-and-forget** — never block UX on log failure.

---

## Data Flow on App Start

```
1. User opens app → auth-store has token → auto-login
2. desktop-service: GET /desktop/driving-school/mebbis-accounts
   → joins SubscriptionEntity per school
   → returns accounts[] with subscriptionActive per account
3. Renderer receives accounts list
4. For each account:
   - subscriptionActive = true  → render card normally
   - subscriptionActive = false → render card with disabled start button
5. User clicks "Başlat" on active school → window opens → activity log sent
```

---

## Admin Panel Subscription Management

Admins manage subscriptions via the **web admin dashboard** (`api-server`):

- **Create subscription**: When a driving school is created, auto-create a SubscriptionEntity with `type = 'demo'` and `pdf_print_limit = 1_000_000`
- **Activate**: Admin sets `type = 'paid'` and `ends_at` (expiry date)
- **Renew**: Admin extends `ends_at`
- **Expire manually**: Admin sets `ends_at` to past timestamp or `type = 'demo'`

No self-service payment integration for now.

---

## What is NOT Implemented Yet (Future)

| Feature | Status |
|---------|--------|
| Demo access (limited free usage) | Planned — currently demo = blocked |
| `pdf_print_limit` enforcement (hard block at limit) | Planned — currently tracking only |
| Subscription expiry notification in desktop app | Planned |
| Payment gateway integration | Not planned yet |

---

## Trick Points

1. **Subscription is per school, not per user**: A user with 3 schools could have 2 active + 1 demo. Handle per-card, not globally.
2. **`ends_at` is a Unix timestamp in seconds** (not milliseconds) — use `Math.floor(Date.now() / 1000)` for comparison.
3. **Demo = blocked for now**: Do NOT add "demo mode" UI — just treat demo same as expired (disabled).
4. **Activity log must be fire-and-forget**: Never `await` log calls in a blocking way — always catch errors silently.
5. **`pdf_print_used` counter**: Increment on the server side when desktop calls `/activity-log` with `event: pdf_download`. Desktop sends `count` (number of PDFs in batch).
6. **Subscription join in `getMebbisAccounts`**: Use LEFT JOIN / `leftJoinAndSelect` so schools without a subscription entity still return (with `subscriptionActive = false`).
7. **`accounts:start` throws `SUBSCRIPTION_INACTIVE`** when the school is not paid/active. The renderer catches this and shows an alert. The card's start button is also disabled in the UI as a first line of defense.
8. **`system_logs.process` is an int**, not a string. Desktop activity uses the local constant `100` (DESKTOP_ACTIVITY_PROCESS) inside `activity-log.service.ts` to keep the api-server `SystemLogProcessTypes` enum untouched.
