# Sürücü Kursu - System Overview

## Project Description

**Sürücü Kursu** (Driving School) is a comprehensive driving school management platform built as a microservices monorepo. The system enables driving schools to manage students, vehicles, courses, and integrates with MEBBIS (Turkish Ministry of Education Information System) for official registrations and certifications.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                        │
│                             Port: 5173 (dev)                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (NestJS + Fastify)                    │
│                             Port: 9501                                      │
│  • Rate limiting (100 req/min)                                              │
│  • Authentication proxy                                                      │
│  • Request routing to microservices                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   API SERVER     │      │   FILE SERVER    │      │  MEBBIS SERVICE  │
│   Port: 3001     │      │   Port: 9504     │      │   Port: 3000     │
│                  │      │                  │      │                  │
│ • Auth           │      │ • Static files   │      │ • MEBBIS login   │
│ • CRUD APIs      │      │ • Protected files│      │ • Session mgmt   │
│ • Business logic │      │ • Public assets  │      │ • Sync students  │
│ • WebSocket      │      │                  │      │ • Cookie mgmt    │
└──────────────────┘      └──────────────────┘      └──────────────────┘
          │                                                   │
          ▼                                                   ▼
┌──────────────────┐                              ┌──────────────────┐
│  MySQL Database  │                              │ MEBBIS External  │
│                  │                              │ (meb.gov.tr)     │
└──────────────────┘                              └──────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────┐
│              PDF WORKER (PHP)                    │
│  • PDF generation                                │
│  • RabbitMQ consumer                            │
│  • Student certificates                          │
└──────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────┐
│              RABBITMQ                            │
│  • Message queue                                 │
│  • Port: 5687 (AMQP), 15787 (Management)        │
└──────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **API Gateway** | NestJS, Fastify, JWT, Rate Limiting |
| **API Server** | NestJS, Fastify, TypeORM, WebSocket |
| **File Server** | NestJS, Fastify, Static file serving |
| **MEBBIS Service** | NestJS, Fastify, HTTP client, Cookie management |
| **PDF Worker** | PHP 8.x, mPDF/DomPDF |
| **Database** | MySQL/MariaDB |
| **Message Queue** | RabbitMQ |
| **Monorepo** | pnpm workspaces, Turborepo |

---

## Microservices

### 1. API Gateway (`backend/services/api-gateway`)
**Port:** 9501

The entry point for all API requests. Handles:
- **Rate Limiting:** 100 requests per minute per client
- **Authentication:** JWT validation via AuthGuard
- **Routing:** Proxies requests to appropriate microservices
- **Swagger Documentation:** Available at `/docs`

**Key Features:**
- ThrottlerGuard for rate limiting
- Global AuthGuard for protected routes
- ProxyModule for request forwarding

---

### 2. API Server (`backend/services/api-server`)
**Port:** 3001

The main business logic service. Handles all CRUD operations and core functionality.

**Modules:**
| Module | Purpose |
|--------|---------|
| `AuthModule` | Login, logout, session management |
| `DrivingSchoolModule` | Driving school operations |
| `AdminsModule` | Admin user management |
| `CitiesModule` | Turkish cities/districts data |
| `WorkerModule` | PDF job processing |
| `SocketModule` | Real-time WebSocket communication |

**Sub-modules under DrivingSchool:**
- `students/` - Student CRUD
- `cars/` - Vehicle management
- `dashboard/` - Analytics & stats
- `pdf/` - PDF generation requests
- `jobs/` - Background job management

**Sub-modules under Admin:**
- `driving-schools/` - Manage all driving schools
- `driving-school-managers/` - Manager user management
- `driving-school-owners/` - Owner user management
- `system-logs/` - Audit trail
- `dashboard/` - Admin analytics

---

### 3. File Server (`backend/services/file-server`)
**Port:** 9504

Static file serving with authentication.

**Endpoints:**
- `/static/` - Protected files (requires auth)
- `/public/` - Public assets (no auth required)
- `/api/files/` - File management API
- `/api/driving-school-files/` - School-specific files

**Storage Structure:**
```
backend/storage/
├── DS1/              # Driving school 1 files
├── DS2/              # Driving school 2 files
├── DSDEFAULT/        # Default templates
└── PUBLIC/           # Public assets
```

---

### 4. MEBBIS Service (`backend/services/mebbis-service`)
**Port:** 3000

Integration with Turkish Ministry of Education's MEBBIS system.

**Features:**
- Login to MEBBIS via credentials
- SMS/Code-based 2FA authentication
- Session cookie management
- Student candidate synchronization

**Controllers:**
| Controller | Endpoints |
|------------|-----------|
| `LoginController` | `/api/mebbis/login/trylogin`, `/withNotification`, `/isLoggedIn`, `/withCode` |
| `SyncController` | `/api/mebbis/sync/candidates` |
| `ResponseController` | Mock responses for testing |

**WebSocket Gateway:**
- Real-time login notifications
- Subscriptions: `message`, `notiflogin`

---

### 5. Database Service (`backend/services/database-service`)

Database migration and seeding service (not a running service).

**Features:**
- TypeORM migrations
- Database seeding
- Schema management

**Commands:**
```bash
pnpm migrate:fresh  # Drop and recreate all tables
```

---

### 6. PDF Worker (`backend/workers/pdf-worker`)

PHP-based PDF generation worker.

**Features:**
- Consumes jobs from RabbitMQ queue
- Generates student certificates
- Creates official documents
- HTML to PDF conversion

**Components:**
- `PdfWorker.php` - Main worker loop
- `PdfGenerator.php` - PDF rendering
- `HtmlTemplates.php` - Document templates
- `ApiClient.php` - Communication with API Server

---

## Shared Module (`backend/shared`)

Common code shared across all microservices.

### Entities
| Entity | Table | Description |
|--------|-------|-------------|
| `AdminEntity` | `admins` | Admin users (SUPER_ADMIN, ADMIN) |
| `DrivingSchoolEntity` | `driving_schools` | Driving school information |
| `DrivingSchoolOwnerEntity` | `driving_school_owners` | School owners |
| `DrivingSchoolManagerEntity` | `driving_school_managers` | School managers |
| `DrivingSchoolStudentEntity` | `driving_school_students` | Students enrolled |
| `DrivingSchoolCarEntity` | `driving_school_cars` | Training vehicles |
| `DrivingSchoolSettingsEntity` | `driving_school_settings` | School configuration |
| `SessionEntity` | `sessions` | User sessions |
| `SubscriptionEntity` | `subscriptions` | Billing subscriptions |
| `SystemLogsEntity` | `system_logs` | Audit trail |
| `CityEntity` | `cities` | Turkish cities |
| `DistrictEntity` | `districts` | Turkish districts |
| `JobEntity` | `jobs` | Background job queue |

### Configuration
- `env.config.ts` - Environment variable validation
- `database.config.ts` - Database connection settings
- `socket.config.ts` - WebSocket configuration
- `logging.config.ts` - Logging configuration

### Utilities
- `TextEncryptor` - Password encryption/decryption

---

## User Types & Authentication

### User Type System
```typescript
enum UserTypes {
  SUPER_ADMIN = -1,      // Full system access
  ADMIN = -2,            // Administrative access
  DRIVING_SCHOOL_OWNER = 2,  // Owns driving schools
  DRIVING_SCHOOL_MANAGER = 3  // Manages driving schools
}
```

### Guards
| Guard | Purpose | User Types Allowed |
|-------|---------|-------------------|
| `AuthGuard` | General authentication | All authenticated users |
| `AdminGuard` | Admin-only routes | SUPER_ADMIN, ADMIN |
| `DrivingSchoolGuard` | Driving school routes | OWNER, MANAGER, ADMIN |

### Session Flow
1. User logs in via `/api/v1/auth/login`
2. JWT token created with user info + type
3. Session stored in `sessions` table
4. Token sent in `Authorization: Bearer <token>` header
5. AuthGuard validates token + session on each request
6. Session expires after `SESSION_EXPIRY` seconds (default: 86400 = 24h)

---

## Frontend Structure

**Framework:** React 18 + TypeScript + Vite

### Page Organization
```
frontend/src/pages/
├── (Auth)/           # Login, Register, Forgot Password
├── Admin/            # Admin dashboard & management
│   ├── Dashboard/
│   ├── Kurslar/      # Driving schools management
│   ├── AdminlerPage  # Admin users
│   ├── DSOwnerPage   # School owners
│   └── DSManagerPage # School managers
├── DrivingSchool/    # Driving school portal
│   ├── Dashboard/
│   ├── Students/     # Student management
│   ├── Cars/         # Vehicle management
│   └── ...
└── Home.tsx
```

### Services
- `api-service.ts` - Centralized API client with all endpoints
- `socket-service.ts` - WebSocket connection management

### State Management
- React Context for auth state
- React Query for server state

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | - |
| `DB_PORT` | Database port | 3306 |
| `DB_USERNAME` | Database user | - |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | - |
| `ENCRYPTION_KEY` | Password encryption key | - |
| `JWT_SECRET` | JWT signing secret | - |
| `SESSION_EXPIRY` | Session TTL (seconds) | 86400 |
| `API_GATEWAY_PORT` | Gateway port | 9501 |
| `API_SERVER_PORT` | API server port | 3001 |
| `FILE_SERVICE_PORT` | File server port | 9504 |
| `RABBITMQ_HOST` | RabbitMQ host | localhost |
| `RABBITMQ_PORT` | RabbitMQ port | 5672 |
| `RABBITMQ_USER` | RabbitMQ user | guest |
| `RABBITMQ_PASSWORD` | RabbitMQ password | guest |

---

## Running the Project

### Development
```bash
# Install dependencies
pnpm install

# Start all services (API Gateway + API Server + Frontend)
pnpm dev

# Start file server separately
pnpm dev:file-server

# Start PHP PDF worker
pnpm php-worker

# Start RabbitMQ (Docker)
docker-compose up -d
```

### Database
```bash
# Run migrations
pnpm migrate:fresh
```

### Ports Summary
| Service | Port |
|---------|------|
| Frontend (Vite) | 5173 |
| API Gateway | 9501 |
| API Server | 3001 |
| File Server | 9504 |
| MEBBIS Service | 3000 |
| RabbitMQ AMQP | 5687 |
| RabbitMQ UI | 15787 |
| MySQL | 3306 |

---

## Key Workflows

### 1. Student Registration Flow
1. School owner/manager logs in
2. Creates new student via `/api/v1/driving-school/:code/students`
3. Syncs with MEBBIS via MEBBIS Service
4. Student data saved to database

### 2. MEBBIS Integration Flow
1. Driving school credentials stored encrypted
2. MEBBIS Service logs in with credentials
3. 2FA code sent to phone
4. Code submitted, session cookie stored
5. Cookie used for subsequent MEBBIS operations
6. Student candidates synced from MEBBIS

### 3. PDF Generation Flow
1. API Server receives PDF request
2. Job created in `jobs` table
3. Message published to RabbitMQ
4. PHP Worker consumes message
5. PDF generated and stored in file system
6. Job status updated to complete

---

## Testing Tools

### Session Picker (`tests/mebbis.meb.gov.tr/session-picker.js`)
Interactive tool for testing MEBBIS sessions:
- Connects to database
- Checks online MEBBIS sessions
- Allows browsing MEBBIS pages with valid sessions
- Useful for debugging MEBBIS integration

---

## External Integrations

1. **MEBBIS (meb.gov.tr)** - Turkish Ministry of Education
   - Student registration
   - Exam scheduling
   - Certificate generation

2. **Slack** - Notifications
   - Login alerts
   - System notifications

---

## Security Considerations

1. **Passwords:** Encrypted using `TextEncryptor`
2. **Sessions:** JWT tokens with database session validation
3. **Rate Limiting:** 100 req/min per client
4. **CORS:** Configured per environment
5. **Auth Guards:** Route-level protection
6. **MEBBIS Cookies:** Stored encrypted in database
