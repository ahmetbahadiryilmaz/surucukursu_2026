# Deletable Code — Desktop Migration Cleanup

## Context
The driving school panel is moving entirely to the Electron desktop app. PDF generation, MEBBIS session management, car/student listing, and all driving-school-facing UI now live in the desktop app. The web frontend only serves the **admin panel**.

This document lists all code that is no longer needed and can be safely removed.

---

## Backend

### Fully Removable Directories

| Path | What It Is | Why Remove |
|------|-----------|------------|
| `backend/workers/pdf-worker/` | PHP RabbitMQ consumer + Dompdf templates (Sesim, AnaGrup, DireksiyonTakip, Ek4) | PDF generation moved to desktop via `printToPDF` |
| `backend/services/api-server/src/api/v1/driving-school/pdf/` | `PdfController`, `PdfService`, `PdfModule` — 6 POST endpoints queuing jobs to RabbitMQ | No consumer exists anymore |
| `backend/services/api-server/src/api/v1/driving-school/cars/` | `CarsController`, `CarsService`, `CarsModule` — GET cars, POST cars/sync | Desktop syncs cars directly from MEBBIS |
| `backend/services/api-server/src/api/v1/driving-school/dashboard/` | `DashboardController`, `DashboardService`, `DashboardModule` — GET dashboard stats | Only consumed by removed frontend DS dashboard |
| `backend/services/api-server/src/api/v1/driving-school/jobs/` | `JobsController`, `JobsService`, `JobsModule` — GET jobs with filtering/pagination | Only showed PDF/sync job status in the removed frontend |
| `backend/services/api-server/src/api/v1/worker/` | `WorkerController`, `WorkerService`, `WorkerModule` — POST update-job, sendtouser | Only used by the PHP PDF worker to report progress |
| `backend/services/api-server/src/utils/rabbitmq/` | `RabbitMQService` — publishes to `pdf_generation_queue` | Only imported by `PdfModule`. Sync-workers have their own separate RabbitMQ implementation |

### Removable Files (inside kept directories)

| File | What It Is | Why Remove |
|------|-----------|------------|
| `backend/services/api-server/src/api/v1/driving-school/main/dto/simulation.dto.ts` | `GenerateSingleSimulationDto`, `GenerateGroupSimulationDto` | Only used by PdfController |
| `backend/services/api-server/src/api/v1/driving-school/main/dto/pdf.dto.ts` | `GenerateSinglePdfDto`, `PdfGenerationResponseDto` | Only used by PdfController |

### Partial Cleanup (edit, don't delete)

| File | What to Remove | What to Keep |
|------|---------------|-------------|
| `backend/services/api-server/src/api/v1/driving-school/driving-school.module.ts` | Remove `PdfModule`, `JobsModule`, `CarsModule`, `DashboardModule` imports & exports | Keep `MainModule`, `StudentsModule` |
| `backend/services/api-server/src/api/v1/v1.module.ts` | Remove `WorkerModule` import | Keep all other imports |
| `backend/services/api-server/src/utils/socket/socket.gateway.ts` | Remove `emitPdfProgress()`, `emitPdfCompleted()`, `emitPdfError()` methods | Keep shared methods (`emitToAll`, `emitToUser`, `emitToRoom`, etc.) |

### Shared Types — Remove Later

These are in `backend/shared/` and referenced across packages. Remove after all consumers are cleaned up:

| Item | Location | Notes |
|------|----------|-------|
| `JobType.SINGLE_SIMULATION` | `backend/shared/src/types/job.types.ts` | Keep `SYNC_CARS` |
| `JobType.GROUP_SIMULATION` | same | |
| `JobType.SINGLE_DIREKSIYON_TAKIP` | same | |
| `JobType.GROUP_DIREKSIYON_TAKIP` | same | |
| `SimulationType` enum | same | Still used by frontend settings page — remove when frontend DS pages are gone |
| `JobEntity` | `backend/shared/src/entities/job.entity.ts` | Still used by sync-workers — keep for now |

### Backend — Must Keep

| Module | Why |
|--------|-----|
| `driving-school/main/` | Settings, credentials — admin panel views/edits these |
| `driving-school/students/` | Student sync + listing — admin panel or future desktop API may need it |
| `mebbis-service` | Admin-triggered syncs still go through this |
| `file-server` | General file serving, not DS-specific |
| All admin modules | Admin panel is the remaining frontend |
| `socket.gateway.ts` (shared methods) | Used by sync-workers and potentially admin features |
| `sync-workers` | Independent car/student sync via RabbitMQ |

---

## Frontend

### Fully Removable Directories

| Path | What It Is |
|------|-----------|
| `frontend/src/pages/DrivingSchool/` | All 13 DS pages: Layout, Dashboard, Students, Cars/Araclar, Kurslar, Kursum, Islemler, Dosyalarim, SimulasyonRaporlari, SurucuKursuAyarlari, SurucuKurslari, DrivingSchoolHesabim |

### Removable Components

| File | What It Is |
|------|-----------|
| `frontend/src/components/sidebars/DrivingSchoolOwnerSidebar.tsx` | DS navigation menu |
| `frontend/src/components/sidebars/DownloadsSidebar.tsx` | File download panel |
| `frontend/src/components/contexts/DrivingSchoolManagerContext.tsx` | Active school state, user data for DS |
| `frontend/src/components/contexts/SocketContext.tsx` | WebSocket for real-time job updates (DS-only) |
| `frontend/src/components/MebbisCredentialsModal.tsx` | MEBBIS login prompt modal |
| `frontend/src/components/DownloadContext.tsx` | Download state management |
| `frontend/src/components/Modals/MebbisCodeModal.tsx` | MEBBIS 2FA code modal |

### Removable Hooks

| File | What It Is |
|------|-----------|
| `frontend/src/hooks/useMebbisErrorHandler.ts` | MEBBIS error handling |
| `frontend/src/hooks/useSocket.ts` | Socket.IO connection |

### Partial Cleanup (edit, don't delete)

| File | What to Remove | What to Keep |
|------|---------------|-------------|
| `frontend/src/services/api-service.ts` | `drivingSchool.*`, `pdf.*`, `files.*` method groups | `authentication.*`, `user.*`, `admin.*` methods |
| `frontend/src/routing/AppRoutes.tsx` | `/driving-school/*` routes | `/admin/*` routes, `/`, `/logout` |
| `frontend/src/routing/guards/ProtectedRoute.tsx` | `DRIVING_SCHOOL_OWNER` / `DRIVING_SCHOOL_MANAGER` branch | Admin type check |
| `frontend/src/components/sidebars/Sidebar.tsx` | DrivingSchoolOwnerSidebar import/rendering | AdminSidebar rendering |
| `frontend/src/components/providers/index.tsx` | `DrivingSchoolManagerProvider` wrapping | Other providers |

### Frontend — Must Keep

| What | Why |
|------|-----|
| `pages/Admin/` (all 13 pages) | Admin panel — the remaining frontend purpose |
| `pages/(Auth)/` | Login, logout — shared |
| `components/sidebars/AdminSidebar.tsx` | Admin navigation |
| `components/ui/*` (all shadcn components) | Shared UI library |
| `components/ThemeToggle.tsx`, `ToastConfig.tsx` | Shared utilities |
| `components/SystemInfoDashboard.tsx` | Admin system info |
| `hooks/use-mobile.tsx`, `hooks/use-toast.ts` | Shared hooks |
| `routing/AppRouter.tsx` | Router wrapper |
| `services/api-service.ts` (admin + auth methods) | API client |
| `App.tsx`, `main.tsx`, configs | Entry points |

---

## Infrastructure

| Item | Action | Notes |
|------|--------|-------|
| RabbitMQ (docker-compose) | **Keep** | Still used by `sync-workers` (`sync_cars_queue`) |
| `pdf_generation_queue` | **Remove queue** (or just stop consuming) | No producer or consumer after cleanup |
| `pnpm-workspace.yaml` | **Remove** `pdf-worker` entry if present | Prevents `pnpm dev` from trying to start it |
| `turbo.json` | **Check** if pdf-worker is listed | May cause the startup error the user is seeing |

---

## Deletion Order

1. **First**: Remove `pdf-worker` from workspace/turbo config (fixes the startup error)
2. **Second**: Delete backend directories (`pdf/`, `cars/`, `dashboard/`, `jobs/`, `worker/`, `rabbitmq/`)
3. **Third**: Update module registrations (`driving-school.module.ts`, `v1.module.ts`)
4. **Fourth**: Clean up socket gateway (remove PDF methods)
5. **Fifth**: Delete frontend DS pages + components + hooks
6. **Sixth**: Clean up frontend routing, api-service, sidebar, providers
7. **Last**: Remove shared types/enums when no references remain
