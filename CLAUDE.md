# CLAUDE.md - Project Index

**Before every conversation:** Read this index and necessary ai-docs files.

## Quick Start

- **First time?** Read [SETUP_QUICK_START.md](./ai-docs/SETUP_QUICK_START.md) and run `pnpm install && pnpm dev`
- **Need a command?** See [QUICK_COMMANDS.md](./ai-docs/QUICK_COMMANDS.md)
- **Understanding architecture?** Start with [ARCHITECTURE.md](./ai-docs/ARCHITECTURE.md)
- **Building features?** Check [COMMON_PATTERNS.md](./ai-docs/COMMON_PATTERNS.md)

## Critical Rules

1. **Don't commit without asking** — Check with user before committing
2. **MEBBIS requests only from mebbis-service** — Never direct calls from api-server/frontend
3. **Desktop app uses Electron v22** — Do not upgrade/downgrade
4. **Update ai-docs when implementing** — Keep documentation in sync
5. **Always verify user_type authorization** — Use appropriate guards
6. **Sessions expire after 24h** — Expiry checked on every request
7. **Say i read the index before start of every conversation**
8. **Before bumping remote code version** — Read [WHATS_NEW_FORMAT.md](./desktop/ai-docs/WHATS_NEW_FORMAT.md) to write proper **
9. **After finish editing** - create table of the files that you edit and which lines , thats clickable
10. See [CONSTRAINTS.md](./ai-docs/CONSTRAINTS.md) for full details.

## Main Documentation

### Core Project

- [QUICK_COMMANDS.md](./ai-docs/QUICK_COMMANDS.md) — pnpm commands
- [ARCHITECTURE.md](./ai-docs/ARCHITECTURE.md) — Microservices layout & ports
- [SETUP_QUICK_START.md](./ai-docs/SETUP_QUICK_START.md) — Initial setup
- [MONOREPO_STRUCTURE.md](./ai-docs/MONOREPO_STRUCTURE.md) — Directory layout & packages
- [TECH_STACK.md](./ai-docs/TECH_STACK.md) — Technologies used

### Authorization & Security

- [AUTH_USERS.md](./ai-docs/AUTH_USERS.md) — User types & guards
- [CONSTRAINTS.md](./ai-docs/CONSTRAINTS.md) — Critical rules

### Features & Integration

- [MEBBIS_RULES.md](./ai-docs/MEBBIS_RULES.md) — MEBBIS integration (⚠️ CRITICAL)
- [DESKTOP_RULES.md](./ai-docs/DESKTOP_RULES.md) — Electron app constraints
- [COMMON_PATTERNS.md](./ai-docs/COMMON_PATTERNS.md) — Reusable patterns

### Developer Tools

- [ENVIRONMENT.md](./ai-docs/ENVIRONMENT.md) — Environment variables
- [TESTING_DEBUGGING.md](./ai-docs/TESTING_DEBUGGING.md) — Debugging tools

## Complete AI-Docs Index

See [AI_DOCS_INDEX.md](./ai-docs/AI_DOCS_INDEX.md) for comprehensive documentation index including domain-specific files.

## Domain-Specific Files (Nested)

**Backend:**

- `ai-docs/API_SERVER.md` — API endpoints, CRUD, WebSocket
- `ai-docs/DATABASE_ENTITIES.md` — TypeORM entities
- `ai-docs/MEBBIS_SERVICE.md` — Full MEBBIS auth flow
- `ai-docs/MEBBIS_REQUEST_LOGGING.md` — Request/response logging
- `ai-docs/MEBBIS_ERROR_HANDLING.md` — Error handling & modals
- `ai-docs/DELETABLE_CODE.md` — Code cleanup candidates

**Frontend:**

- `ai-docs/FRONTEND.md` — React structure & routing
- `ai-docs/FRONTEND_MEBBIS_SYNC_ERRORS.md` — MEBBIS error UI
- `ai-docs/QUICK_REFERENCE.md` — Quick-start reference

**Desktop:**

- `desktop/ai-docs/DESKTOP_APP.md` — App architecture
- `desktop/ai-docs/DESKTOP_UPDATE_DEPLOY.md` — Updates & deployment (⚠️ READ BEFORE DEPLOY)
- `desktop/ai-docs/WHATS_NEW_FORMAT.md` — Release notes format (⚠️ READ BEFORE BUMPING VERSION)
- `desktop/ai-docs/ENCRYPTED_CODE_UPDATE_SYSTEM.md` — Secure delivery
- `desktop/ai-docs/PDF_TEMPLATE_MANAGEMENT.md` — PDF templates

## Project Info

**Type:** Microservices monorepo (Turkish driving school + MEBBIS ministry integration)
**Package Manager:** pnpm with Turborepo
**Database:** MySQL/MariaDB + TypeORM
**Message Queue:** RabbitMQ
**Tech Stack:** React, NestJS, Fastify, Electron v22, TypeScript

---

**Last Updated:** 2026-05-07
