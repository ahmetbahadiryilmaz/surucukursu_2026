# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Commands

```bash
# Install dependencies
pnpm install

# Development - starts API Gateway, API Server, Frontend
pnpm dev

# Development with full desktop stack
pnpm dev:desktop-full

# Run linter
pnpm lint

# Build all packages
pnpm build

# Database migrations
pnpm migrate:fresh       # Drop and recreate all tables
pnpm migrate            # Run pending migrations

# Start individual services
pnpm dev:file-server    # File server (separate terminal)
pnpm php-worker         # PHP PDF worker
pnpm dev:desktop        # Desktop Electron app

# Watch mode (continuous rebuild)
pnpm watch
```

## Architecture Overview

**Sürücü Kursu** is a microservices monorepo for a Turkish driving school management platform integrated with MEBBIS (Turkish Ministry of Education).

### Service Stack

```
Frontend (React + Vite, :5173)
        ↓
API Gateway (NestJS + Fastify, :9501) [Rate limiting, Auth proxy, Routing]
        ↓
┌───────────────────────────────────┐
│ API Server                         │  Main business logic, CRUD APIs
│ Port: 3001                         │
│ File Server (:9504)                │  Static/protected files
│ MEBBIS Service (:3000)             │  Ministry integration, login, cookies
│ Desktop Service (:3002)            │  Desktop app endpoints
└───────────────────────────────────┘
        ↓
MySQL Database + RabbitMQ Queue
```

### Key Services

| Service | Port | Purpose |
|---------|------|---------|
| **API Gateway** | 9501 | Entry point, rate limiting (100 req/min), JWT auth, routing |
| **API Server** | 3001 | Core APIs: auth, CRUD, business logic, WebSocket |
| **File Server** | 9504 | File serving (authenticated + public) |
| **MEBBIS Service** | 3000 | Ministry login, 2FA, session cookies, student sync |
| **Desktop Service** | 3002 | Desktop app endpoints (templates, version, auth) |
| **PDF Worker** | N/A | PHP worker, RabbitMQ consumer, certificate generation |

### Shared Module (`backend/shared`)

Common TypeORM entities exported as `@surucukursu/shared` npm package:

**Core Entities:**
- `AdminEntity` → `admins` table (SUPER_ADMIN, ADMIN)
- `DrivingSchoolEntity` → `driving_schools`
- `DrivingSchoolOwnerEntity` → `driving_school_owners`
- `DrivingSchoolManagerEntity` → `driving_school_managers`
- `DrivingSchoolStudentEntity` → `driving_school_students`
- `DrivingSchoolCarEntity` → `driving_school_cars`
- `SessionEntity` → `sessions` (JWT + DB validation)
- `JobEntity` → `jobs` (background job queue)
- `SystemLogsEntity` → `system_logs` (audit trail)
- Plus: DrivingSchoolSettingsEntity, SubscriptionEntity, CityEntity, DistrictEntity

## Development Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set environment (if needed)
# Copy backend/.env.example to backend/.env

# 3. Start RabbitMQ (if using Docker)
docker-compose up -d

# 4. Run migrations
pnpm migrate:fresh

# 5. Start services
pnpm dev                # Terminal 1: API Gateway + API Server + Frontend
pnpm dev:file-server    # Terminal 2: File Server
pnpm php-worker         # Terminal 3: PDF Worker (if PDF generation needed)
```

**Ports Summary:**
- Frontend: http://localhost:5173
- API Gateway: http://localhost:9501
- API Server + Swagger: http://localhost:3001/docs
- File Server: http://localhost:9504
- MEBBIS Service: http://localhost:3000
- RabbitMQ Management: http://localhost:15787

## User Types & Authentication

**4 User Types** (defined in enums):
```typescript
SUPER_ADMIN = -1           // Full system access
ADMIN = -2                 // Administrative access
DRIVING_SCHOOL_OWNER = 2   // Owns driving schools
DRIVING_SCHOOL_MANAGER = 3 // Manages driving schools
```

**Guards:**
- `@UseGuards(AuthGuard)` — General authentication
- `@UseGuards(AdminGuard)` — SUPER_ADMIN, ADMIN only
- `@UseGuards(DrivingSchoolGuard)` — OWNER, MANAGER, ADMIN

**Session Flow:**
1. Login via `/api/v1/auth/login`
2. JWT token + session stored in DB
3. Token sent in `Authorization: Bearer <token>` header
4. AuthGuard validates token + checks session expiry (default: 24h)

## Key Rules from Copilot Instructions

### AI Documentation (ai-docs)

The `ai-docs/` directory is the **single source of truth** for patterns, logic, and edge cases.

**Before implementing:** Read the relevant ai-docs file to understand existing patterns.  
**After implementing:** Update the corresponding ai-docs file with new logic and gotchas discovered.

**AI-docs Index (check before working on these areas):**

| File | Covers | When to Check |
|------|--------|---------------|
| `SYSTEM_OVERVIEW.md` | High-level architecture, microservices layout | Starting cross-service work |
| `API_SERVER.md` | API modules, CRUD, auth, guards, WebSocket | Working on API endpoints |
| `DATABASE_ENTITIES.md` | All TypeORM entities, relationships, field defs | Creating/modifying DB entities |
| `MEBBIS_SERVICE.md` | MEBBIS auth flow, cookies, session handling | Any MEBBIS integration work |
| `MEBBIS_REQUEST_LOGGING.md` | HTTP request/response logging system | Debugging MEBBIS requests |
| `MEBBIS_ERROR_HANDLING.md` | Centralized error handling, error codes, modals | Working on error handling |
| `FRONTEND.md` | React + Vite SPA structure, components, routing | Frontend changes |
| `FRONTEND_MEBBIS_SYNC_ERRORS.md` | Frontend MEBBIS error handling, 2FA/credential modals | MEBBIS sync error UI |
| `QUICK_REFERENCE.md` | Developer quick-start, setup, env config | Project setup questions |
| `desktop/DESKTOP_APP.md` | Electron app, MEBBIS session management | Desktop app changes |
| `desktop/ENCRYPTED_CODE_UPDATE_SYSTEM.md` | Encrypted code delivery system | Secure template delivery |
| `desktop/PDF_TEMPLATE_MANAGEMENT.md` | PDF templates, CSS, naming, update workflow | PDF generation changes |
| `DELETABLE_CODE.md` | Removable backend + frontend code | Code cleanup decisions |

### MEBBIS Integration Rules

**CRITICAL:** All MEBBIS requests must be made through `mebbis-service`, never directly from `api-server` or frontend.

**Cookie Management (Two Paths):**
- **New System (mebbis-service):** Cookies stored in `mebbis_cookie` DB table, managed via `AxiosService`
- **Legacy (old-mebbis-service):** Cookies in `backend/old-mebbis-service/storage/cookies/` (Netscape format)

See `ai-docs/MEBBIS_SERVICE.md` for full auth flow, session handling, and trick points.

### Desktop App (Electron v22)

**CRITICAL Update Policy:** Users MUST be on the latest version. Every deployment sets `minimumVersion` in `minimum_version.json`, blocking all older clients on startup. All updates are mandatory.

**Key Features:**
- Multiple MEBBIS account management with isolated sessions
- Auto-login with credential auto-fill
- Batch PDF downloads (Direksiyon Takip, Simulasyon Raporu)
- Persistent cookie management across restarts

See `desktop/ai-docs/DESKTOP_APP.md` and `desktop/ai-docs/DESKTOP_UPDATE_DEPLOY.md`.

## Monorepo Structure

```
surucukursu/
├── backend/
│   ├── services/
│   │   ├── api-gateway/          # Entry point (:9501)
│   │   ├── api-server/           # Business logic (:3001)
│   │   ├── file-server/          # Static files (:9504)
│   │   ├── mebbis-service/       # Ministry integration (:3000)
│   │   ├── desktop-service/      # Desktop endpoints (:3002)
│   │   └── database-service/     # Migrations (no running process)
│   ├── shared/                   # Shared entities, config, utils
│   │   └── src/
│   │       ├── entities/         # TypeORM entities (npm package)
│   │       ├── config/           # env.config.ts, database.config.ts, etc.
│   │       └── utils/            # TextEncryptor, etc.
│   ├── workers/
│   │   └── pdf-worker/           # PHP PDF generation worker
│   └── storage/                  # File storage (DS1/, DS2/, DSDEFAULT/, PUBLIC/)
├── frontend/                     # React + Vite (:5173)
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
│   │       ├── api-service.ts    # Centralized API client
│   │       └── socket-service.ts # WebSocket management
├── desktop/                      # Electron app
│   ├── src/
│   │   ├── main/
│   │   ├── renderer/
│   │   └── preload/
│   └── ai-docs/
├── ai-docs/                      # Shared documentation
├── tests/                        # Integration tests
└── docker-compose.yml            # RabbitMQ
```

### Package Names (Turborepo)
- `@surucukursu/api-gateway`
- `@surucukursu/api-server`
- `@surucukursu/file-server`
- `@surucukursu/mebbis-service`
- `@surucukursu/desktop-service`
- `@surucukursu/database-service`
- `@surucukursu/shared`
- `driving-school-frontend`
- `@surucukursu/desktop`

**Run specific service:**
```bash
pnpm --filter=@surucukursu/api-server dev
```

## Common Patterns

### Protected API Endpoint
```typescript
@UseGuards(DrivingSchoolGuard)
@Controller('driving-school')
export class MyController {
  @Get('students')
  async getStudents() { }
}
```

### Adding New Entity

1. Create in `backend/shared/src/entities/`
2. Export from `backend/shared/src/entities/index.ts`
3. Add to `backend/services/database-service/data-source.ts`
4. Run `pnpm migrate:fresh`

### Adding New API Endpoint

1. Add method to service (`backend/services/api-server/src/api/v1/.../service.ts`)
2. Add method to controller (`.../controller.ts`)
3. Add method to frontend `api-service.ts`
4. Update `ai-docs/API_SERVER.md` if needed

### File Storage

```
backend/storage/
├── DS{id}/               # Per driving school
│   ├── students/
│   ├── cars/
│   └── reports/
├── DSDEFAULT/            # Templates
└── PUBLIC/               # Public assets
```

Access via File Server: `GET /static/DS1/students/photo.jpg` (authenticated)

## Important Constraints

1. **Don't commit without asking** — Check with user before committing changes
2. **MEBBIS requests only from mebbis-service** — Never make direct MEBBIS calls from other services
3. **Desktop app must use Electron v22** — Compatibility is critical
4. **Update ai-docs when modifying features** — Keep documentation in sync with code
5. **Check user_type for authorization** — Always verify appropriate user type in protected routes
6. **Session validation includes expiry check** — Sessions expire after `SESSION_EXPIRY` (default: 86400s = 24h)

## Environment Variables (Key)

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_NAME=surucukursu

# Security
ENCRYPTION_KEY=your-32-char-encryption-key
JWT_SECRET=your-jwt-secret

# Service Ports
API_GATEWAY_PORT=9501
API_SERVER_PORT=3001
FILE_SERVICE_PORT=9504

# Session
SESSION_EXPIRY=86400

# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
```

## Testing & Debugging

**Check session in database:**
```sql
SELECT * FROM sessions WHERE user_id = X;
```

**Verify JWT token:**
- Paste at https://jwt.io

**MEBBIS session debugging:**
```bash
cd tests/mebbis.meb.gov.tr
node session-picker.js  # Interactive MEBBIS session browser
```

**Service logs:**
- Each service logs to its own console terminal
- Check terminal where `pnpm dev` is running

## Tech Stack Summary

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| API Gateway | NestJS, Fastify, JWT, Rate Limiting |
| API Server | NestJS, Fastify, TypeORM, WebSocket |
| File Server | NestJS, Fastify, Static serving |
| MEBBIS Service | NestJS, Fastify, HTTP client, Cookie mgmt |
| Desktop | Electron v22, TypeScript |
| PDF Worker | PHP 8.x, mPDF/DomPDF |
| Database | MySQL/MariaDB, TypeORM |
| Message Queue | RabbitMQ |
| Monorepo | pnpm workspaces, Turborepo |
