# Sürücü Kursu Project Copilot Instructions

## General Guidelines

**IMPORTANT**: When responding to any request, always start by specifying which AI model you are using. State "I'm using xxx ai model " or the appropriate model name at the beginning of your response.Read any relevant ai-docs file before responding to ensure your answer is informed by the project's architecture and patterns. Always follow the patterns and rules outlined in the ai-docs files.Always update the relevant ai-docs file after implementing or modifying a feature to keep documentation in sync with code. If you discover any tricky implementation details or edge cases during your work, make sure to document them in the corresponding ai-docs file.dont commit anything without asking

## AI-docs Directory Overview
The `ai-docs/` directory is the **single source of truth** for understanding the project's architecture, logic, and tricky implementation details. AI assistants should **always consult the relevant ai-docs file before making changes** to any part of the system.

### Rules for AI Documentation
1. **Before implementing a new feature**: Check the relevant ai-docs file to understand existing patterns, constraints, and trick points.
2. **After implementing a new feature**: Update the relevant ai-docs file (or create a new one) with the logic, flow, edge cases, and any gotchas discovered during implementation.
3. **After modifying an existing feature**: Update the corresponding ai-docs file to reflect the changes.
4. **New ai-docs files** should be placed in the `ai-docs/` directory with `UPPERCASE_SNAKE_CASE.md` naming.
5. **If something is updated**: Always update or create the relevant ai-docs file. This ensures documentation stays in sync with code.
6. **Read necessary docs**: When copilot prompt is related to a specific area, first read the corresponding ai-docs file from the index below to understand patterns and context.

### AI-docs Index
Always check these files for context before working on the related area:

| File | Covers | When to Check |
|------|--------|---------------|
| `ai-docs/SYSTEM_OVERVIEW.md` | High-level architecture, microservices monorepo layout, how all components connect | Starting any cross-service work or understanding project structure |
| `ai-docs/API_SERVER.md` | API Server (NestJS/Fastify, port 3001): modules, CRUD, auth, guards, real-time | Working on API endpoints, authentication, guards, or WebSocket features |
| `ai-docs/DATABASE_ENTITIES.md` | All shared TypeORM entities, relationships, field definitions | Creating/modifying database entities, writing queries, or understanding data model |
| `ai-docs/MEBBIS_SERVICE.md` | MEBBIS integration service: authentication flow, cookie management, student sync, login with 2FA, session handling | Any work involving MEBBIS scraping, login, cookie handling, or student data |
| `ai-docs/MEBBIS_REQUEST_LOGGING.md` | HTTP request/response logging system for all outgoing MEBBIS calls, log file structure | Debugging MEBBIS requests, understanding log formats, modifying the logger |
| `ai-docs/MEBBIS_ERROR_HANDLING.md` | Centralized error handling system: error codes, modals (2FA, credentials), hook usage, backend patterns | Working on error handling, implementing new MEBBIS operations, handling auth errors |
| `ai-docs/FRONTEND.md` | React + Vite + TypeScript SPA: admin dashboard, driving school dashboard, routing, components | Frontend changes, adding pages, modifying UI components |
| `ai-docs/FRONTEND_MEBBIS_SYNC_ERRORS.md` | Frontend error handling for MEBBIS sync: 2FA modals, credential modals, auto-retry flow | Working on MEBBIS sync error handling, modals, or credential re-entry flows |
| `ai-docs/QUICK_REFERENCE.md` | Developer quick-start: setup commands, env config, Docker, running services | Setting up the project, running services, environment configuration |
| `desktop/ai-docs/DESKTOP_APP.md` | Electron desktop app: MEBBIS account management, auto-login, cookie persistence, left menu injection | Working on the desktop Electron app, MEBBIS session management |
| `desktop/ai-docs/DESKTOP_APP_SIMULATOR_MENU_AND_SERVER_CONNECTION.md` | Adding simulator raporu (Sesim/Ana Grup) menu to desktop + server connection + secure auth | Adding simulator report download to desktop app, connecting desktop to backend |
| `desktop/ai-docs/ELECTRON_CODE_SERVING_FROM_SERVER.md` | Remote renderer code serving: loading desktop UI from server for instant updates, caching, fallback | Implementing dynamic code updates for desktop app, remote renderer loading |
| `desktop/ai-docs/PDF_TEMPLATE_MANAGEMENT.md` | Direksiyon Takip PDF templates: CSS lives in templates not app code, template naming, update workflow, scaleY logic | Working on PDF generation, modifying template styles, adding new templates |
| `ai-docs/DELETABLE_CODE.md` | Full inventory of removable backend + frontend code after desktop migration | Cleaning up unused code, understanding what to keep vs remove |

## System Architecture: Old vs New

### Old System (Legacy)
The project maintains a legacy system located in `backend/old-mebbis-service/` that is still active for specific purposes:

**Database Configuration:**
- Configuration file: `backend/old-mebbis-service/src/config/env.js`
- Environment file: `backend/old-mebbis-service/src/.env`
- Database connection: Uses `DB_CONNECTION` environment variable (MySQL)
- Example: `mysql://mtsk_rapor:ua_mV2922@localhost:3306/mtsk_rapor`

**Cookie Management:**
- **IMPORTANT**: Cookies are actively managed and stored in the old system
- Cookie storage location: `backend/old-mebbis-service/storage/cookies/`
- Cookie handling libraries: `src/lib/Axios.js` and `src/lib/Fetch.js`
- Each driving school has a unique cookie file identified by `cookieName`

**When to Use Old System:**
- Whenever you need to retrieve or work with cookies for MEBBIS requests
- The old system maintains active sessions with MEBBIS platform
- Cookie files are stored in Netscape cookie format

### New System (Current)
The new microservices architecture located in `backend/services/`:

**Database Configuration:**
- Environment file: `backend/services/*/src/config/` or root `.env` file
- Uses TypeORM with PostgreSQL (or other modern database)
- Each service has its own database configuration

**Architecture:**
- api-gateway: API Gateway service
- api-server: Main API server
- mebbis-service: MEBBIS integration service (new implementation)
- database-service: Database management
- file-server: File handling service

### Cookie Handling Rule
**CRITICAL**: Cookie management has two paths depending on the system:

**New System (mebbis-service):**
- The new mebbis-service manages its own cookies in the `mebbis_cookie` database table
- Login flow: AxiosService handles login → accumulates session cookies in memory → saves to DB via `onCookieUpdate` callback
- All HTTP requests within mebbis-service use `AxiosService` (single HTTP client, no FetchService)
- See `ai-docs/MEBBIS_SERVICE.md` for full authentication flow and trick points

**Old System (legacy, still active for some schools):**
- Cookie storage location: `backend/old-mebbis-service/storage/cookies/`
- Cookie files are in Netscape cookie format, identified by `cookieName`
- The old system maintains active sessions with MEBBIS platform

## MEBBIS Integration
All third-party MEBBIS requests must be implemented in `mebbis-service` and consumed from there. Never make direct MEBBIS requests from api-server or frontend. See `ai-docs/MEBBIS_SERVICE.md` for the full authentication flow, session handling, and known trick points.
## User Types & Authentication

### User Type System
The application has **4 distinct user types** defined in `backend/services/api-server/src/api/v1/auth/dto/enum.ts`:

1. **SUPER_ADMIN** (`-1`) - Highest level system administrator
2. **ADMIN** (`-2`) - Regular administrator 
3. **DRIVING_SCHOOL_OWNER** (`2`) - Owns driving schools
4. **DRIVING_SCHOOL_MANAGER** (`3`) - Manages driving schools

### Entities
Corresponding entity files in `backend/shared/src/entities/`:
- `admin.entity.ts` - Admin users (SUPER_ADMIN, ADMIN)
- `driving-school-owner.entity.ts` - Driving school owners
- `driving-school-manager.entity.ts` - Driving school managers

### Authentication & Authorization
- Guards are located in `backend/services/api-server/src/common/guards/`
  - `admin.guard.ts` - Requires ADMIN user type
  - `driving-school.guard.ts` - Allows DRIVING_SCHOOL_OWNER, DRIVING_SCHOOL_MANAGER, or ADMIN
  - `auth.guard.ts` - General authentication
- Sessions stored in `session.entity.ts` with user_type field
- System logs track user actions with user_type field

## Important Rules

### When Creating New Features
1. **Always consider which user types can access the feature**
2. **Use appropriate guards** based on user type requirements
3. **Log actions** using SystemLogProcessTypes for audit trail
4. **Check user_type** in the session/JWT payload before allowing access

### User Type Access Patterns
- **Admin-only features**: Use `@UseGuards(AdminGuard)`
- **Driving school features**: Use `@UseGuards(DrivingSchoolGuard)` (allows owners, managers, and admins)
- **Multi-user features**: Check `payload.userType` explicitly in code

### Database Considerations
- When querying user-related data, always include `user_type` filter when appropriate
- Session validation should check both token validity AND user_type match
- System logs should always record user_type for tracking

## Common Patterns

### Checking User Type in Code
```typescript
if (payload.userType !== UserTypes.ADMIN) {
  throw new UnauthorizedException('Admin access required');
}
```

### Multiple User Types
```typescript
if (payload.userType !== UserTypes.DRIVING_SCHOOL_OWNER && 
    payload.userType !== UserTypes.DRIVING_SCHOOL_MANAGER && 
    payload.userType !== UserTypes.ADMIN) {
  throw new UnauthorizedException('Insufficient permissions');
}
```

### Session Validation
Always check:
1. Session exists
2. Session not expired (`expires_at < now`)
3. User type matches expected type

## Entity Relationships
- **DrivingSchoolEntity** has relationships with:
  - DrivingSchoolOwnerEntity (owner_id)
  - DrivingSchoolManagerEntity (manager_id)
  - Students, Cars, Settings, Subscriptions
- **System Logs** track all user actions with user_id and user_type

When implementing new features, always consider the user type hierarchy and ensure proper access control is in place.
