# API Server - Detailed Documentation

## Overview

The API Server is the core business logic service of the Sürücü Kursu platform. It handles all CRUD operations, authentication, and real-time communication.

**Port:** 3001  
**Framework:** NestJS with Fastify adapter  
**Database:** MySQL via TypeORM

---

## Module Structure

```
api-server/src/
├── main.ts                 # Application bootstrap
├── app.module.ts           # Root module
├── api/
│   ├── v1/                 # API version 1
│   │   ├── v1.module.ts
│   │   ├── auth/           # Authentication
│   │   ├── admin/          # Admin operations
│   │   ├── driving-school/ # Driving school operations
│   │   ├── cities/         # City/District data
│   │   ├── mebbis/         # MEBBIS integration (empty)
│   │   ├── worker/         # Background worker API
│   │   └── desktop-update/ # Electron auto-update file serving
│   ├── health/             # Health check endpoints
│   └── internal/           # Internal service communication
├── common/
│   ├── guards/             # Auth guards
│   ├── filters/            # Exception filters
│   ├── decorators/         # Custom decorators
│   └── interceptors/       # Request/Response interceptors
├── services/               # Business services
└── utils/
    ├── socket/             # WebSocket gateway
    └── slack/              # Slack notifications
```

---

## Development Runtime Note (Critical)

The repository contains some transpiled `.js/.d.ts/.map` files alongside TypeScript source under `src/`.
If Nest/ts-node resolves those stale `.js` files first, runtime behavior can diverge from current `.ts` source.

Observed impact:

- Admin dashboard `systemInfo.services` can show false `down` statuses even when services are up, because an old JS build of `admin/dashboard` checks outdated ports/service keys.

Mitigation applied:

- `backend/services/api-server/package.json` scripts now set `TS_NODE_PREFER_TS_EXTS=true` for `dev`, `start`, `start:dev`, and `start:debug`.
- This forces ts-node to prefer `.ts` over sibling `.js` files during development.

If service-status values look incorrect:

1. Restart API server after script/env changes.
2. Confirm expected ports in `backend/.env` (`API_GATEWAY_PORT`, `API_SERVER_PORT`, `FILE_SERVICE_PORT`, etc.).
3. Verify open ports locally (for example with `Test-NetConnection` on Windows).

---

## Authentication Module (`/api/v1/auth`)

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | User login | No |
| POST | `/auth/logout` | User logout | Yes |

### Login Flow

```typescript
// Request
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "userType": 2  // DRIVING_SCHOOL_OWNER
  }
}
```

### User Type Detection Order
1. Check `driving_school_owners` table
2. Check `driving_school_managers` table
3. Check `admins` table

### Session Management
- Sessions stored in `sessions` table
- One active session per user (previous sessions deleted on login)
- Session expiry: 24 hours (configurable)
- Last activity updated on each authenticated request

---

## Admin Module (`/api/v1/admin`)

### Sub-modules

#### 1. Admins (`/admin/admins`)
Manage admin users.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all admins |
| POST | `/` | Create admin |
| GET | `/:id` | Get admin by ID |
| PATCH | `/:id` | Update admin |
| DELETE | `/:id` | Delete admin |

#### 2. Driving Schools (`/admin/driving-schools`)
Full CRUD for driving schools.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all schools |
| POST | `/` | Create school |
| GET | `/:id` | Get school by ID |
| PATCH | `/:id` | Update school |
| DELETE | `/:id` | Delete school |

#### 3. Driving School Managers (`/admin/driving-school-managers`)
Manage school manager accounts.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all managers |
| POST | `/` | Create manager |
| GET | `/:id` | Get manager by ID |
| PATCH | `/:id` | Update manager |
| DELETE | `/:id` | Delete manager |

#### 4. Driving School Owners (`/admin/driving-school-owners`)
Manage school owner accounts.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all owners |
| POST | `/` | Create owner |
| GET | `/:id` | Get owner by ID |
| PATCH | `/:id` | Update owner |
| DELETE | `/:id` | Delete owner |

#### 5. System Logs (`/admin/system-logs`)
Audit trail access.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List logs (with pagination/filters) |

#### 6. Dashboard (`/admin/dashboard`)
Admin analytics and statistics.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Dashboard summary |
| GET | `/stats` | Detailed statistics |

---

## Driving School Module (`/api/v1/driving-school`)

### Sub-modules

#### 1. Main (`/driving-school/:code`)
Core school operations.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:code` | Get school info |
| PATCH | `/:code` | Update school |
| GET | `/:code/credentials` | Get MEBBIS credentials |
| PATCH | `/:code/credentials` | Update MEBBIS credentials |

#### 2. Students (`/driving-school/:code/students`)
Student management.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List students |
| POST | `/` | Create student |
| GET | `/:id` | Get student by ID |
| PATCH | `/:id` | Update student |
| DELETE | `/:id` | Delete student |

#### 3. Cars (`/driving-school/:code/cars`)
Vehicle management.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List vehicles |
| POST | `/` | Add vehicle |
| GET | `/:id` | Get vehicle by ID |
| PATCH | `/:id` | Update vehicle |
| DELETE | `/:id` | Remove vehicle |

#### 4. Dashboard (`/driving-school/:code/dashboard`)
School analytics.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Dashboard summary |

#### 5. PDF (`/driving-school/:code/pdf`)
PDF generation requests.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Queue PDF generation |
| GET | `/status/:jobId` | Check job status |

#### 6. Jobs (`/driving-school/:code/jobs`)
Background job management.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List jobs |
| GET | `/:id` | Get job status |

---

## Cities Module (`/api/v1/cities`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all cities |
| GET | `/:cityId/districts` | Get districts for city |

---

## Worker Module (`/api/v1/worker`)

Internal endpoints for PDF worker communication. **No authentication required** (local-only access).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/jobs/pending` | Get pending PDF jobs |
| PATCH | `/jobs/:id/complete` | Mark job complete |
| PATCH | `/jobs/:id/fail` | Mark job failed |

---

## Desktop Update Module (`/api/v1/desktop-update`)

Serves Electron auto-update files for the desktop app. Uses `electron-updater` generic provider pattern.

**Update files stored at:** `backend/storage/PUBLIC/desktop-updates/`

### Public Endpoints (no auth — desktop app has no token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/latest.yml` | Version metadata for Windows |
| GET | `/latest-mac.yml` | Version metadata for macOS |
| GET | `/latest-linux.yml` | Version metadata for Linux |
| GET | `/download/:filename` | Download installer file |

### Admin Endpoints (requires AdminGuard)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/files` | List all update files on server |
| POST | `/admin/generate-yml` | Generate latest.yml from an exe in the update directory |

### Deploy Flow
1. Bump `version` in `desktop/package.json`
2. Build: `cd desktop && npm run dist`
3. Copy `release/MEBBIS-Setup-x.x.x.exe` + `release/latest.yml` to `backend/storage/PUBLIC/desktop-updates/`
4. All desktop apps auto-detect the new version on next launch

---

## Guards

### AuthGuard (Global)
Applied to all routes except:
- Routes marked with `@Public()` decorator
- Worker controller endpoints
- URLs containing `/api/v1/worker/`

**Validation Steps:**
1. Extract JWT from `Authorization: Bearer <token>`
2. Verify JWT signature
3. Check session exists in database
4. Check session not expired
5. Update last_activity timestamp
6. Attach user info + driving schools to request

### AdminGuard
Requires user type to be `ADMIN` or `SUPER_ADMIN`.

```typescript
@UseGuards(AdminGuard)
@Get('admin-only-route')
```

### DrivingSchoolGuard
Allows:
- `DRIVING_SCHOOL_OWNER`
- `DRIVING_SCHOOL_MANAGER`
- `ADMIN` / `SUPER_ADMIN`

```typescript
@UseGuards(DrivingSchoolGuard)
@Get('school-route')
```

---

## Decorators

### @Public()
Skip authentication for a route.

```typescript
import { Public } from '../common/decorators/public.decorator';

@Public()
@Get('health')
healthCheck() { ... }
```

---

## WebSocket Module

### Gateway Configuration
```typescript
@WebSocketGateway({
  cors: { origin: '*' }
})
```

### Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `connection` | Client → Server | Client connects |
| `disconnect` | Client → Server | Client disconnects |
| `message` | Bidirectional | General messaging |

---

## Error Handling

### GlobalExceptionFilter
Location: `src/common/filters/global-exception.filter.ts`

Catches **all unhandled exceptions** and standardizes error responses. This is the central point where error codes flow through the entire system.

**Features:**
- Extracts `code` field from HttpException response data (e.g., `MEBBIS_2FA_REQUIRED`, `INVALID_REQUEST`)
- **Auto-generates default error codes** based on HTTP status if not provided:
  - 400 → `INVALID_REQUEST`
  - 401 → `UNAUTHORIZED`
  - 403 → `FORBIDDEN`
  - 404 → `NOT_FOUND`
  - 409 → `CONFLICT`
  - 422 → `UNPROCESSABLE_ENTITY`
  - 500 → `INTERNAL_SERVER_ERROR`
  - (others) → `INTERNAL_SERVER_ERROR`
- Uses HTTP exception status codes when available, defaults to 500
- Adds development error details in development mode:
  - `dev_error.name`, `dev_error.message`, `dev_error.stack`
  - `dev_error.code` and `dev_error.meta` for Prisma errors
- Includes request path and ISO timestamp in response

**Error Code Flow Through System:**

```
mebbis-service Controller
  throw new HttpException({ code: 'MEBBIS_2FA_REQUIRED', message: '...' }, 400)
        ↓
mebbis-client.service (api-server)
  catch (error) {
    throw new HttpException(error.response?.data, status)
    // Passes full object with code preserved
  }
        ↓
Services (CarsService, StudentsService)
  catch (error instanceof HttpException) {
    throw error; // Re-throw without wrapping
  }
        ↓
GlobalExceptionFilter
  Extracts code from response data
  If no code, generates default based on status
        ↓
Response to Frontend
  { code: 'MEBBIS_2FA_REQUIRED', message: '...', statusCode: 400, ... }
```

**Response Format (Production):**
```json
{
  "code": "MEBBIS_2FA_REQUIRED",
  "message": "AJANDA KODU gerekli. Lütfen MEBBIS'ten aldığınız kodu giriniz.",
  "statusCode": 400,
  "timestamp": "2024-01-22T10:30:00.000Z",
  "path": "/api/v1/araclar/sync"
}
```

**Response Format (Development):**
```json
{
  "code": "MEBBIS_2FA_REQUIRED",
  "message": "AJANDA KODU gerekli. Lütfen MEBBIS'ten aldığınız kodu giriniz.",
  "statusCode": 400,
  "timestamp": "2024-01-22T10:30:00.000Z",
  "path": "/api/v1/araclar/sync",
  "dev_error": {
    "name": "HttpException",
    "message": "AJANDA KODU gerekli. Lütfen MEBBIS'ten aldığınız kodu giriniz.",
    "stack": "Error stack trace...",
    "originalError": { "code": "MEBBIS_2FA_REQUIRED" }
  }
}
```

**Registration:**
```typescript
// In main.ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

**Key Implementation Detail:**
The filter checks for `code` in the exception response first:
1. If `response.code` exists → use it
2. Else if error has `getStatus()` method → generate default code for HTTP status
3. Else → default to `INTERNAL_SERVER_ERROR`

This ensures error codes from mebbis-service flow all the way to the frontend unchanged.

### NotFoundExceptionFilter
Returns 405 for unmatched routes:

```json
{
  "statusCode": 405,
  "message": "Resource not found. Please check API documentation",
  "path": "/api/v1/unknown"
}
```

---

## Database Connection

### TypeORM Configuration
- Connection pooling optimized for API server
- Automatic reconnection on failure
- Query logging in development mode

### Entities Used
- SessionEntity
- DrivingSchoolEntity
- DrivingSchoolSettingsEntity
- All entities from shared module

---

## Swagger Documentation

Available at: `http://localhost:3001/docs`

All endpoints are documented with:
- Request/response schemas
- Authentication requirements
- Example values
