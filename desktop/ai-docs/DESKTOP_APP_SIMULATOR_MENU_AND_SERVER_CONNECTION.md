# Desktop App - Simülatör Raporu Menu & Server Connection

## Overview
Documentation for adding **Simülatör Raporu** (simulator report) generation to the desktop Electron app's injected left menu, supporting both **Sesim** and **Ana Grup** simulator types. Also covers connecting the desktop app to the backend API server for secure authentication and PDF report retrieval.

---

## What Are Simulator Reports?

Turkish driving schools use **driving simulators** for student training. There are two competing simulator hardware/software vendors, each producing a different report format:

### Sesim (Single Report)
- Generates **1 PDF** per student
- Contains a **timing chart** showing training session durations
- Template: `backend/workers/pdf-worker/data/templates/sesim/sesim.html`
- Fields filled: `kursiyer` (student name), `egitmen` (instructor), `egitimsuresi` (duration), `cizelgetr` (timing chart rows)
- Output: `simulasyon_{studentName}_sesim_{timestamp}.pdf`

### Ana Grup (11 Reports)
- Generates **11 separate PDFs** per student — one per driving scenario
- Each scenario has its own template folder under `backend/workers/pdf-worker/data/templates/anagrup/{SCENARIO}/anagrup.html`
- Fields filled: `baslik` (scenario title), `kursiyer`, `egitmen`, `sirketismi`, `donem`, `tarih`, `egitimsuresi`, `adet` (scores), `puan` (total), `havadurumu`
- Output: `simulasyon_{studentName}_{scenarioName}_{timestamp}.pdf`

**The 11 Ana Grup Scenarios:**
1. ALGI VE REFLEKS SİMÜLASYONU
2. DEĞİŞİK HAVA KOŞULLARI SİMÜLASYONU
3. DİREKSİYON EĞİTİM ALANI SİMÜLASYONU
4. GECE, GÜNDÜZ SİSLİ HAVA SİMÜLASYONU
5. İNİŞ ÇIKIŞ EĞİMLİ YOL SİMÜLASYONU
6. PARK EĞİTİMİ SİMÜLASYONU
7. ŞEHİR İÇİ YOL SİMÜLASYONU
8. ŞEHİRLER ARASI YOL SİMÜLASYONU
9. TRAFİK İŞARETLERİ SİMÜLASYONU
10. TRAFİK ORTAMI SİMÜLASYONU
11. VİRAJLI YOLDA SÜRÜŞ SİMÜLASYONU

---

## Current State of Codebase

### What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| `SimulationType` enum | ✅ Complete | `backend/shared/src/types/job.types.ts` |
| `driving_school_settings.simulator_type` | ✅ Complete | Entity field in DB |
| Settings UI (Sesim/Ana Grup selector) | ✅ Complete | `frontend/src/pages/DrivingSchool/SurucuKursuAyarlari.tsx` |
| Backend API endpoints | ✅ Complete | `POST /driving-school/:code/pdf/simulation/single` and `/group` |
| PDF generation worker | ✅ Complete | `backend/workers/pdf-worker/src/Tasks/SimulationTask.php` |
| Job queue & progress tracking | ✅ Complete | `PdfService` + `JobEntity` + RabbitMQ + Socket events |
| Frontend SimulasyonRaporlari page | ⚠️ **Placeholder** | `frontend/src/pages/DrivingSchool/SimulasyonRaporlari.tsx` (hardcoded mock data) |
| Sidebar menu link to SimRapor | ❌ **Missing** | `DrivingSchoolOwnerSidebar.tsx` has no link |
| Desktop app left menu "Simülatör Raporu" | ❌ **Missing** | `mebbis-manager.ts` only has "Direksiyon Takip İndir" |
| Desktop app server connection | ❌ **Missing** | No HTTP client for API communication |
| Desktop app auth with backend | ❌ **Missing** | No JWT/token handling |

### What Needs To Be Built

1. **Desktop left menu** — Add "Simülatör Raporu İndir" button (alongside existing "Direksiyon Takip İndir")
2. **Desktop server connection** — Connect to backend API server with JWT auth
3. **Desktop report generation** — Either:
   - **Option A**: Call backend API → queue job → wait for socket event → download PDF (preferred)
   - **Option B**: Generate locally in Electron (like direksiyon takip currently does) — requires templates
4. **Frontend sidebar** — Add "Simülasyon Raporları" menu item
5. **Frontend SimulasyonRaporlari page** — Replace mock data with real API integration

---

## Architecture

### Full Flow (Desktop → Server → Worker → Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│             Electron Desktop App                            │
│                                                             │
│  Injected Left Menu:                                        │
│  ┌─────────────────────────────────┐                        │
│  │ • Direksiyon Takip İndir       │ (existing, local gen)  │
│  │ • Simülatör Raporu İndir  ← NEW│ (calls backend API)    │
│  └─────────────────────────────────┘                        │
│                    │                                         │
│     User clicks → modal asks TC + selects student           │
│                    │                                         │
│  ┌─────────────────▼────────────────────────────────────┐   │
│  │     ServerConnectionManager (new module)              │   │
│  │     • JWT Bearer auth                                │   │
│  │     • POST /driving-school/:code/pdf/simulation/*    │   │
│  │     • WebSocket listener for job completion          │   │
│  └─────────────────┬────────────────────────────────────┘   │
└────────────────────┼────────────────────────────────────────┘
                     │ HTTPS + JWT
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Server (Port 3001)                      │
│                                                             │
│  POST /driving-school/:code/pdf/simulation/single           │
│  → Creates JobEntity (status: pending, simulation_type)     │
│  → Sends PdfGenerationRequest to RabbitMQ                   │
│  → Returns { jobId, estimatedTime }                         │
│                                                             │
│  Socket: emits 'pdf-completed' with pdfData when done       │
│  Socket: emits 'pdf-error' on failure                       │
│  Socket: emits 'job-update' for progress                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ RabbitMQ
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              PDF Worker (PHP)                                │
│                                                             │
│  SimulationTask.php:                                        │
│  if simulator_type == 'sesim':                              │
│    → generateSesimReport() → 1 PDF                          │
│  if simulator_type == 'ana_grup':                            │
│    → generateAnagrupReports() → 11 PDFs                     │
│                                                             │
│  → POST /driving-school/:code/pdf/progress                  │
│    { jobId, progress: 100, pdfData: base64 }                │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Guide

### 1. Add "Simülatör Raporu İndir" to Desktop Left Menu

**File:** `desktop/src/main/mebbis-manager.ts`

Currently the left menu only has one item. Add the second:

```typescript
// In the injectLeftMenu method, update the items array:
const items = [
    { label: 'Direksiyon Takip İndir', action: 'direksiyon-takip' },
    { label: 'Simülatör Raporu İndir', action: 'simulasyon-raporu' },  // NEW
];
```

When "Simülatör Raporu İndir" is clicked, show a modal similar to the existing TC input modal but with additional fields:

```
┌─────────────────────────────────────┐
│  Simülatör Raporu İndir             │
│                                     │
│  TC Kimlik No: [___________]        │
│                                     │
│  Simülatör Tipi:                    │
│  ○ Sesim (1 rapor)                  │
│  ● Ana Grup (11 rapor)              │
│                                     │
│  [İptal]              [İndir]       │
│                                     │
│  ──── Status ────                   │
│  Sunucuya bağlanılıyor...           │
└─────────────────────────────────────┘
```

**The modal needs:**
- TC input (11 digits, numeric only)
- Simulator type radio buttons (Sesim / Ana Grup)
- Status text area for progress updates
- Submit triggers API call through ServerConnectionManager

### 2. Desktop ↔ Server Connection Manager

**New file:** `desktop/src/main/server-connection-manager.ts`

This handles all communication between the desktop app and the backend API server.

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import https from 'https';
import http from 'http';

interface ServerConfig {
    url: string;       // e.g. 'http://localhost:3001' or 'https://api.surucukursu.com'
    token: string;     // JWT Bearer token from driving school login
    schoolCode: string; // Driving school ID/code for API routes
}

export class ServerConnectionManager {
    private config: ServerConfig | null = null;
    private connected: boolean = false;

    constructor() {
        this.setupIpcHandlers();
    }

    private setupIpcHandlers() {
        // Configure server connection
        ipcMain.handle('server:connect', async (_, config: ServerConfig) => {
            return this.connect(config);
        });

        // Request simulator report generation
        ipcMain.handle('server:generate-simulation', async (_, data: {
            studentId: number;
            simulationType: 'sesim' | 'ana_grup';
        }) => {
            return this.requestSimulationReport(data);
        });

        // Check connection status
        ipcMain.handle('server:status', async () => {
            return { connected: this.connected, url: this.config?.url };
        });
    }

    async connect(config: ServerConfig): Promise<{ success: boolean; error?: string }> {
        try {
            // Test connection with a health check
            const response = await this.makeRequest('GET', '/api/health');
            this.config = config;
            this.connected = true;
            return { success: true };
        } catch (error: any) {
            this.connected = false;
            return { success: false, error: error.message };
        }
    }

    /**
     * REQUEST SIMULATION REPORT
     * 
     * Calls: POST /driving-school/:code/pdf/simulation/single
     * Body: { jobType, studentId, simulationType }
     * Returns: { jobId, estimatedTime }
     * 
     * TRICK POINT: simulationType must match what's saved in
     * driving_school_settings.simulator_type, or the PHP worker
     * will generate the wrong format.
     */
    async requestSimulationReport(data: {
        studentId: number;
        simulationType: 'sesim' | 'ana_grup';
    }): Promise<{ jobId: string; estimatedTime: number }> {
        if (!this.config) throw new Error('Not connected to server');

        const response = await this.makeRequest(
            'POST',
            `/driving-school/${this.config.schoolCode}/pdf/simulation/single`,
            {
                jobType: 'single_simulation',
                studentId: data.studentId,
                simulationType: data.simulationType,
            }
        );

        return response;
    }

    /**
     * SECURE HTTP REQUEST
     * 
     * Security:
     * - JWT Bearer token in Authorization header
     * - 10s timeout to prevent hanging
     * - Content-Type: application/json
     * - No sensitive data logged
     */
    private makeRequest(method: string, path: string, body?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.config) return reject(new Error('No server config'));

            const url = new URL(path, this.config.url);
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;

            const options: any = {
                method,
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.token}`,
                    'User-Agent': 'mebbis-desktop/1.0',
                },
            };

            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode && res.statusCode >= 400) {
                            reject(new Error(parsed.message || `HTTP ${res.statusCode}`));
                        } else {
                            resolve(parsed);
                        }
                    } catch {
                        reject(new Error(`Invalid JSON response: ${data.substring(0, 100)}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });

            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }
}
```

### 3. Preload API Extension

**File:** `desktop/src/preload/preload.ts`

Add server-related IPC channels to the existing preload:

```typescript
// Add to existing contextBridge.exposeInMainWorld('mebbisAPI', { ... })
    
    // Server connection (NEW)
    connectToServer: (config: { url: string; token: string; schoolCode: string }) =>
        ipcRenderer.invoke('server:connect', config),
    getServerStatus: () =>
        ipcRenderer.invoke('server:status'),
    
    // Simulation report generation (NEW)
    generateSimulationReport: (data: { studentId: number; simulationType: string }) =>
        ipcRenderer.invoke('server:generate-simulation', data),
    
    // Listen for job completion (NEW)
    onJobCompleted: (callback: (data: { jobId: string; pdfData: string; fileName: string }) => void) =>
        ipcRenderer.on('job:completed', (_, data) => callback(data)),
    onJobError: (callback: (data: { jobId: string; error: string }) => void) =>
        ipcRenderer.on('job:error', (_, data) => callback(data)),
    onJobProgress: (callback: (data: { jobId: string; progress: number; message: string }) => void) =>
        ipcRenderer.on('job:progress', (_, data) => callback(data)),
```

### 4. Main Process Integration

**File:** `desktop/src/main/main.ts`

```typescript
import { ServerConnectionManager } from './server-connection-manager';

let serverConnectionManager: ServerConnectionManager;

// In app.whenReady():
app.whenReady().then(() => {
    accountStore = new AccountStore();
    mebbisManager = new MebbisManager();
    serverConnectionManager = new ServerConnectionManager(); // NEW

    createMainWindow();
    setupIPC();
});
```

---

## Authentication Flow

### How the Desktop App Authenticates with Backend

```
1. Driving school owner/manager logs into the web frontend
   └─> POST /auth/login { username, password }
   └─> Returns JWT token + session info + schoolCode

2. Owner configures the desktop app with:
   └─> Server URL: https://api.surucukursu.com (or localhost:3001)
   └─> JWT Token: (copied from web dashboard or generated via API)
   └─> School Code: (driving school ID, auto-detected from token)

3. Desktop stores config securely:
   └─> Token: in-memory only (cleared on app close)
   └─> Or: encrypted file with machine-specific key
   └─> NEVER: plain text file or unencrypted JSON

4. Every API request includes:
   └─> Authorization: Bearer <jwt-token>
   └─> Server validates token via AuthGuard / DrivingSchoolGuard
```

### Token Security Rules

```typescript
// ❌ NEVER store token like this
fs.writeFileSync('config.json', JSON.stringify({ token }));
localStorage.setItem('token', token);

// ✅ Option 1: In-memory only (safest, requires re-entry on restart)
private token: string;

// ✅ Option 2: OS credential manager (persists securely)
import keytar from 'keytar';
await keytar.setPassword('mebbis-desktop', 'api-token', token);

// ✅ Option 3: Encrypted storage with machine-derived key
import { safeStorage } from 'electron';
const encrypted = safeStorage.encryptString(token);
fs.writeFileSync('token.enc', encrypted);
// Decrypt: safeStorage.decryptString(fs.readFileSync('token.enc'))
```

---

## Backend API Reference

### Endpoints Used by Desktop App

| Method | Endpoint | Purpose | Guard |
|--------|----------|---------|-------|
| `GET` | `/api/health` | Connection test | None |
| `POST` | `/driving-school/:code/pdf/simulation/single` | Queue single student sim report | DrivingSchoolGuard |
| `POST` | `/driving-school/:code/pdf/simulation/group` | Queue batch sim reports | DrivingSchoolGuard |
| `POST` | `/driving-school/:code/pdf/progress` | Worker sends progress updates | Internal |

### Request/Response Examples

**Queue Single Simulation Report:**
```
POST /driving-school/5/pdf/simulation/single
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
    "jobType": "single_simulation",
    "studentId": 142,
    "simulationType": "sesim"   // or "ana_grup"
}

Response 200:
{
    "jobId": "347",
    "jobType": "single_simulation",
    "message": "Single simulation job queued successfully",
    "estimatedTime": 60
}
```

**Socket Events (received via WebSocket):**
```typescript
// Progress update
{ event: 'job-update', data: { jobId: '347', progress: 50, message: 'Generating PDF...' } }

// Completed (includes base64 PDF data)
{ event: 'pdf-completed', data: { jobId: '347', pdfData: 'JVBERi0x...', fileName: 'simulasyon_347.pdf' } }

// Error
{ event: 'pdf-error', data: { jobId: '347', message: 'Template not found' } }
```

---

## Frontend Gaps to Fix

### 1. Add Sidebar Menu Item

**File:** `frontend/src/components/sidebars/DrivingSchoolOwnerSidebar.tsx`

Currently missing "Simülasyon Raporları" in `menuItems` array. Should be added:

```typescript
const menuItems: MenuItem[] = [
    { id: "", label: "Dashboard", icon: <Home /> },
    { id: "students", label: "Öğrenciler", icon: <Users /> },
    { id: "cars", label: "Araçlar", icon: <Car /> },
    { id: "simulasyon-raporlari", label: "Simülasyon Raporları", icon: <FileText /> }, // ADD THIS
    { id: "dosyalarim", label: "Dosyalarım", icon: <FolderOpen /> },
    // ... existing settings submenu
];
```

### 2. Replace SimulasyonRaporlari Placeholder

**File:** `frontend/src/pages/DrivingSchool/SimulasyonRaporlari.tsx`

Current page uses hardcoded mock data. Needs to be replaced with:
- Fetch student list from API
- "İndir" button calls `apiService.pdf.generateSingle()` with correct `simulationType`
- Read `simulator_type` from school settings to auto-select correct type
- Listen to socket events for progress/completion
- Handle Ana Grup's 11 PDFs (zip download or sequential)

---

## Data Flow: Student Simulator Records

The PHP SimulationTask expects `simulatorRecords` in its `$data` parameter:

```php
$data = [
    'studentInfo' => [
        'ad-soyad' => 'Ahmet Yılmaz',
        'tc-kimlik-no' => '12345678901',
    ],
    'simulatorRecords' => [
        [
            'ders_tarihi' => '14/04/2026',
            'ders_saati' => '09:00-10:00',
            'dersi_veren_personel' => 'Mehmet Hoca',
            'ders_yeri' => 'Simulatör',
        ],
        // ... more records
    ],
    'period' => '2026',
    'simulatorType' => 'sesim',  // or 'ana_grup'  ← from school settings
];
```

**TRICK POINT**: If no `simulatorRecords` are provided, the PHP worker creates **dummy test data** automatically. This is useful for development but must be replaced with real MEBBIS data in production.

---

## Trick Points & Gotchas

1. **Simulator Type Must Match School Setting**: The `simulationType` sent in the API request must match the `driving_school_settings.simulator_type` stored in DB. If mismatched, wrong report format is generated.

2. **Ana Grup = 11 Files**: When type is `ana_grup`, the worker generates 11 separate PDFs. The frontend/desktop must handle downloading all 11, possibly zipped.

3. **Ana Grup Template Fallback**: If a specific scenario template folder doesn't exist, the worker falls back to the first scenario's template. This means all 11 PDFs may look identical if templates are missing.

4. **Random Scores**: Ana Grup reports fill `.adet` (violation count) and `.puan` (score) with **random values** (`rand(0,100)`). This is intentional — the actual scores come from the simulator hardware, but the system generates plausible values for the paper report.

5. **Sesim Timing Chart**: The Sesim report generates a 16-row timing chart (`cizelgetr`), split into two 8-row sessions. Row 7 and 15 get 8-minute durations, others get 6 minutes.

6. **Desktop Has No Socket Client**: Currently the desktop app has no WebSocket connection to the API server. To receive job completion events, you need to either:
   - Add a socket.io-client in the Electron main process
   - Or poll `GET /jobs/:jobId` endpoint periodically

7. **Desktop Generates Direksiyon Takip Locally**: The existing "Direksiyon Takip İndir" feature generates PDFs **locally in Electron** using `printToPDF()`. The simulator report feature should use the **backend API** instead, since it requires the PHP worker with specific templates.

8. **CSP in Injected Menu**: The left sidebar menu is injected via `executeJavaScript()`. Must use event delegation, not inline `onclick`, due to MEBBIS page CSP headers. However, the injected code creates elements programmatically which bypasses CSP.

9. **Backend DTOs**: `GenerateSingleSimulationDto` requires `@IsEnum(SimulationType)` validation. Valid values are exactly `'sesim'` or `'ana_grup'` — not `'anagrup'` (note the underscore).

10. **Frontend Route Exists but No Link**: The route `/driving-school/simulasyon-raporlari` is registered in `Layout.tsx` but there's no sidebar menu item pointing to it.
