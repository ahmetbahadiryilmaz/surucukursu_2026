# AI-Docs Index

This is the **master index** of all AI documentation files in the project.
Always consult the relevant file **before** making changes to the corresponding area.
Always **update** the relevant file **after** implementing or modifying a feature.

---

## Backend / Shared

| File | Covers | When to Check |
|------|--------|---------------|
| [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) | High-level architecture, microservices monorepo layout, how all components connect | Starting any cross-service work or understanding project structure |
| [API_SERVER.md](API_SERVER.md) | API Server (NestJS/Fastify, port 3001): modules, CRUD, auth, guards, real-time WebSocket | Working on API endpoints, authentication, guards, or WebSocket features |
| [DATABASE_ENTITIES.md](DATABASE_ENTITIES.md) | All shared TypeORM entities, relationships, field definitions, migration commands | Creating/modifying database entities, writing queries, or understanding data model |
| [MEBBIS_SERVICE.md](MEBBIS_SERVICE.md) | MEBBIS integration service: authentication flow, cookie management, student sync, login with 2FA, session handling | Any work involving MEBBIS scraping, login, cookie handling, or student data |
| [MEBBIS_REQUEST_LOGGING.md](MEBBIS_REQUEST_LOGGING.md) | HTTP request/response logging system for all outgoing MEBBIS calls, log file structure | Debugging MEBBIS requests, understanding log formats, modifying the logger |
| [MEBBIS_ERROR_HANDLING.md](MEBBIS_ERROR_HANDLING.md) | Centralized error handling system: error codes, modals (2FA, credentials), hook usage, backend patterns | Working on error handling, implementing new MEBBIS operations, handling auth errors |
| [FRONTEND.md](FRONTEND.md) | React + Vite + TypeScript SPA: admin dashboard, driving school dashboard, routing, components | Frontend changes, adding pages, modifying UI components |
| [FRONTEND_MEBBIS_SYNC_ERRORS.md](FRONTEND_MEBBIS_SYNC_ERRORS.md) | Frontend error handling for MEBBIS sync: 2FA modals, credential modals, auto-retry flow | Working on MEBBIS sync error handling, modals, or credential re-entry flows |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Developer quick-start: setup commands, env config, Docker, running services | Setting up the project, running services, environment configuration |
| [DELETABLE_CODE.md](DELETABLE_CODE.md) | Full inventory of removable backend + frontend code after desktop migration | Cleaning up unused code, understanding what to keep vs remove |

---

## Desktop App (Electron)

> Files live in `desktop/ai-docs/`

| File | Covers | When to Check |
|------|--------|---------------|
| [DESKTOP_APP.md](../desktop/ai-docs/DESKTOP_APP.md) | Electron desktop app: MEBBIS account management, auto-login, cookie persistence, IPC channels, subscription gate | Working on the desktop app, MEBBIS session management, IPC handlers |
| [DESKTOP_SUBSCRIPTION_SYSTEM.md](../desktop/ai-docs/DESKTOP_SUBSCRIPTION_SYSTEM.md) | Per-school subscription gating: `subscriptionActive` field, `activity-log` endpoint, PDF tracking, disabled card UI | Working on subscription enforcement, activity logging, or PDF usage tracking |
| [DESKTOP_UPDATE_DEPLOY.md](../desktop/ai-docs/DESKTOP_UPDATE_DEPLOY.md) | Mandatory version update system: build, deploy, `minimum_version.json`, blocking old clients | Deploying a new desktop version, setting minimum version |
| [DESKTOP_APP_SIMULATOR_MENU_AND_SERVER_CONNECTION.md](../desktop/ai-docs/DESKTOP_APP_SIMULATOR_MENU_AND_SERVER_CONNECTION.md) | Adding simulator raporu (Sesim/Ana Grup) menu to desktop + server connection + secure auth | Adding simulator report download to desktop app, connecting desktop to backend |
| [ELECTRON_CODE_SERVING_FROM_SERVER.md](../desktop/ai-docs/ELECTRON_CODE_SERVING_FROM_SERVER.md) | Remote renderer code serving: loading desktop UI from server for instant updates, caching, fallback | Implementing dynamic code updates for desktop app, remote renderer loading |
| [ENCRYPTED_CODE_UPDATE_SYSTEM.md](../desktop/ai-docs/ENCRYPTED_CODE_UPDATE_SYSTEM.md) | Encrypted code delivery: AES-256-GCM + RSA handshake, device-bound keys, anti-replay, bundle format | Working on encrypted code serving, secure template delivery, anti-piracy |
| [PDF_GENERATING.md](../desktop/ai-docs/PDF_GENERATING.md) | End-to-end PDF generation flow inside the desktop app (Chromium print, template fetching, batch logic) | Working on PDF generation pipeline |
| [PDF_TEMPLATE_MANAGEMENT.md](../desktop/ai-docs/PDF_TEMPLATE_MANAGEMENT.md) | Direksiyon Takip PDF templates: CSS lives in templates not app code, template naming, update workflow, scaleY logic | Working on PDF generation, modifying template styles, adding new templates |
| [PHP_VS_TS_COMPARISON.md](../desktop/ai-docs/PHP_VS_TS_COMPARISON.md) | Side-by-side comparison of legacy PHP pdf worker vs TypeScript desktop implementation | Understanding the migration from PHP to TS-based PDF generation |

---

## Naming Convention

New ai-docs files should use `UPPERCASE_SNAKE_CASE.md` and be placed in:
- `ai-docs/` for backend / shared / frontend topics
- `desktop/ai-docs/` for Electron desktop topics
