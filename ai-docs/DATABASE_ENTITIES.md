# Database Entities Reference

## Overview

All entities are defined in `backend/shared/src/entities/` and shared across microservices.

---

## Entity Diagram

```
┌─────────────────┐     ┌─────────────────────────┐     ┌──────────────────────┐
│     admins      │     │    driving_schools      │     │       sessions       │
├─────────────────┤     ├─────────────────────────┤     ├──────────────────────┤
│ id              │     │ id                      │     │ id                   │
│ email           │     │ name                    │     │ token                │
│ password        │     │ address                 │     │ user_id              │
│ name            │     │ phone                   │     │ user_type            │
│ user_type       │     │ mebbis_username         │     │ expires_at           │
│ created_at      │     │ mebbis_password         │     │ last_activity        │
│ updated_at      │     │ manager_id ─────────┐   │     │ last_login           │
└─────────────────┘     │ owner_id ───────┐   │   │     │ created_at           │
                        │ city_id         │   │   │     └──────────────────────┘
                        │ district_id     │   │   │
                        │ created_by      │   │   │
                        │ created_at      │   │   │
                        │ updated_at      │   │   │
                        └─────────────────│───│───┘
                                          │   │
                    ┌─────────────────────┘   └─────────────────────┐
                    ▼                                               ▼
┌─────────────────────────────┐                   ┌───────────────────────────────┐
│  driving_school_owners      │                   │  driving_school_managers      │
├─────────────────────────────┤                   ├───────────────────────────────┤
│ id                          │                   │ id                            │
│ email                       │                   │ email                         │
│ password                    │                   │ password                      │
│ name                        │                   │ name                          │
│ phone                       │                   │ phone                         │
│ created_at                  │                   │ created_at                    │
│ updated_at                  │                   │ updated_at                    │
└─────────────────────────────┘                   └───────────────────────────────┘

┌─────────────────────────┐     ┌─────────────────────────┐     ┌───────────────────────┐
│ driving_school_students │     │   driving_school_cars   │     │ driving_school_settings│
├─────────────────────────┤     ├─────────────────────────┤     ├───────────────────────┤
│ id                      │     │ id                      │     │ id                    │
│ name                    │     │ plate_number            │     │ driving_school_id     │
│ email                   │     │ brand                   │     │ setting_key           │
│ phone                   │     │ model                   │     │ setting_value         │
│ tc_number (unique)      │     │ year                    │     │ created_at            │
│ school_id ──────────────│─────│ school_id ──────────────│     │ updated_at            │
│ created_at              │     │ created_at              │     └───────────────────────┘
│ updated_at              │     │ updated_at              │
└─────────────────────────┘     └─────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     cities      │     │    districts    │     │   system_logs   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ name            │     │ name            │     │ user_id         │
│ plate_code      │     │ city_id         │     │ user_type       │
└─────────────────┘     └─────────────────┘     │ process         │
                                                │ description     │
                                                │ created_at      │
                                                └─────────────────┘

┌─────────────────────┐     ┌─────────────────────────────────────────┐
│    subscriptions    │     │ driving_school_student_integration_info │
├─────────────────────┤     ├─────────────────────────────────────────┤
│ id                  │     │ id                                      │
│ driving_school_id   │     │ student_id                              │
│ plan                │     │ mebbis_id                               │
│ status              │     │ sync_status                             │
│ expires_at          │     │ last_sync                               │
│ created_at          │     │ created_at                              │
│ updated_at          │     │ updated_at                              │
└─────────────────────┘     └─────────────────────────────────────────┘

┌─────────────────┐
│      jobs       │
├─────────────────┤
│ id              │
│ type            │
│ payload         │
│ status          │
│ result          │
│ error           │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

---

## Entity Details

### BaseEntity
All entities extend this base.

```typescript
@Entity()
export class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

---

### AdminEntity
**Table:** `admins`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| email | string | Unique email |
| password | string | Encrypted password |
| name | string | Display name |
| user_type | int | -1 (SUPER_ADMIN) or -2 (ADMIN) |
| created_at | datetime | - |
| updated_at | datetime | - |

---

### DrivingSchoolEntity
**Table:** `driving_schools`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| name | string | School name |
| address | string | Physical address |
| phone | string | Contact phone |
| mebbis_username | string? | MEBBIS login username |
| mebbis_password | string? | MEBBIS login password (encrypted) |
| manager_id | int | FK to driving_school_managers |
| owner_id | int | FK to driving_school_owners |
| city_id | int? | FK to cities |
| district_id | int? | FK to districts |
| created_by | int? | Admin who created |
| created_at | datetime | - |
| updated_at | datetime | - |

**Relations:**
- `students` → DrivingSchoolStudentEntity[]
- `cars` → DrivingSchoolCarEntity[]
- `manager` → DrivingSchoolManagerEntity
- `owner` → DrivingSchoolOwnerEntity
- `city` → CityEntity
- `district` → DistrictEntity
- `settings` → DrivingSchoolSettingsEntity
- `subscription` → SubscriptionEntity

---

### DrivingSchoolOwnerEntity
**Table:** `driving_school_owners`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| email | string | Unique email |
| password | string | Encrypted password |
| name | string | Full name |
| phone | string? | Contact phone |
| created_at | datetime | - |
| updated_at | datetime | - |

**Relations:**
- `DrivingSchool` → DrivingSchoolEntity[]

---

### DrivingSchoolManagerEntity
**Table:** `driving_school_managers`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| email | string | Unique email |
| password | string | Encrypted password |
| name | string | Full name |
| phone | string? | Contact phone |
| created_at | datetime | - |
| updated_at | datetime | - |

**Relations:**
- `schools` → DrivingSchoolEntity[]

---

### DrivingSchoolStudentEntity
**Table:** `driving_school_students`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| name | string | Full name |
| email | string? | Email address |
| phone | string | Contact phone |
| tc_number | string | Turkish ID (unique) |
| school_id | int | FK to driving_schools |
| created_at | datetime | - |
| updated_at | datetime | - |

**Relations:**
- `school` → DrivingSchoolEntity

---

### DrivingSchoolCarEntity
**Table:** `driving_school_cars`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| plate_number | string | License plate |
| brand | string? | Car brand |
| model | string? | Car model |
| year | int? | Manufacturing year |
| school_id | int | FK to driving_schools |
| created_at | datetime | - |
| updated_at | datetime | - |

**Relations:**
- `school` → DrivingSchoolEntity

---

### DrivingSchoolSettingsEntity
**Table:** `driving_school_settings`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| driving_school_id | int | FK to driving_schools (unique) |
| setting_key | string | Setting identifier |
| setting_value | string | Setting value (JSON supported) |
| created_at | datetime | - |
| updated_at | datetime | - |

**Relations:**
- `driving_school` → DrivingSchoolEntity (OneToOne)

---

### SessionEntity
**Table:** `sessions`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| token | string | JWT token |
| user_id | int | User ID (polymorphic) |
| user_type | int | UserTypes enum value |
| expires_at | int | Unix timestamp |
| last_activity | int | Unix timestamp |
| last_login | int | Unix timestamp |
| created_at | datetime | - |
| updated_at | datetime | - |

---

### SystemLogsEntity
**Table:** `system_logs`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| user_id | int | User who performed action |
| user_type | int | UserTypes enum value |
| process | int | SystemLogProcessTypes enum |
| description | string | Human-readable description |
| created_at | datetime | - |

**Process Types:**
```typescript
enum SystemLogProcessTypes {
  LOGIN = 0,
  LOGOUT = 1,
  FORGOT_PASSWORD = 2,
  RESET_PASSWORD = 3,
  CHANGE_PASSWORD = 4,
  UPDATE_PROFILE = 5,
  UPDATE_EMAIL = 6,
  UPDATE_PHONE = 7
}
```

---

### CityEntity
**Table:** `cities`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| name | string | City name (e.g., "İstanbul") |
| plate_code | int | Plate code (e.g., 34) |

**Relations:**
- `districts` → DistrictEntity[]

---

### DistrictEntity
**Table:** `districts`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| name | string | District name |
| city_id | int | FK to cities |

**Relations:**
- `city` → CityEntity

---

### SubscriptionEntity
**Table:** `subscriptions`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| driving_school_id | int | FK to driving_schools |
| plan | string | Subscription plan name |
| status | string | active, expired, cancelled |
| expires_at | datetime | Expiration date |
| created_at | datetime | - |
| updated_at | datetime | - |

**Relations:**
- `driving_school_id` → DrivingSchoolEntity

---

### JobEntity
**Table:** `jobs`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| type | string | Job type (e.g., "pdf_generation") |
| payload | json | Job data |
| status | string | pending, processing, completed, failed |
| result | json? | Job result |
| error | string? | Error message if failed |
| created_at | datetime | - |
| updated_at | datetime | - |

---

### DrivingSchoolStudentIntegrationInfoEntity
**Table:** `driving_school_student_integration_info`

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| student_id | int | FK to driving_school_students |
| mebbis_id | string? | MEBBIS student ID |
| sync_status | string | synced, pending, failed |
| last_sync | datetime? | Last sync timestamp |
| created_at | datetime | - |
| updated_at | datetime | - |

---

## Migrations

Migrations are managed via TypeORM and located in:
```
backend/services/database-service/migrations/
```

### Commands
```bash
# Generate new migration
pnpm --filter=@surucukursu/database-service migration:generate

# Run migrations
pnpm --filter=@surucukursu/database-service migration:run

# Fresh install (drop all + recreate)
pnpm migrate:fresh
```

---

## Password Encryption

Passwords are encrypted using `TextEncryptor` utility:

```typescript
import { TextEncryptor } from '@surucukursu/shared';

// Encrypt
const encrypted = TextEncryptor.userPasswordEncrypt('plaintext');

// Decrypt
const decrypted = TextEncryptor.userPasswordDecrypt(encrypted);
```

Uses `ENCRYPTION_KEY` from environment variables.
