# Frontend Application

## Overview

The frontend is a React single-page application built with Vite and TypeScript. It provides separate dashboards for admins and driving school users.

**Tech Stack:**
- React 18
- TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- shadcn/ui (components)
- React Router (routing)
- React Query (server state)
- Axios (HTTP client)

---

## Project Structure

```
frontend/src/
├── main.tsx              # Application entry point
├── App.tsx               # Root component with providers
├── index.css             # Global styles (Tailwind)
├── components/           # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   └── providers/        # Context providers
├── config/               # App configuration
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   └── axios.ts          # Axios instance & interceptors
├── pages/                # Page components
│   ├── (Auth)/           # Authentication pages
│   ├── Admin/            # Admin dashboard
│   ├── DrivingSchool/    # Driving school dashboard
│   └── Home.tsx          # Landing page
├── routing/              # React Router configuration
│   ├── AppRouter.tsx     # Router setup
│   ├── AppRoutes.tsx     # Route definitions
│   └── guards/           # Route protection
├── services/             # API services
│   ├── api-service.ts    # Centralized API client
│   └── socket-service.ts # WebSocket client
├── shared/               # Shared utilities
│   ├── consts/           # Constants
│   └── types/            # TypeScript types
└── types/                # Additional type definitions
```

---

## Pages

### Authentication Pages (`/pages/(Auth)/`)
- Login
- Register
- Forgot Password
- Reset Password

### Admin Pages (`/pages/Admin/`)

| Page | Path | Description |
|------|------|-------------|
| Layout | - | Admin layout wrapper |
| Dashboard | `/admin` | Admin overview |
| KurslarPage | `/admin/kurslar` | Driving schools list |
| AdminlerPage | `/admin/adminler` | Admin users |
| DSOwnerPage | `/admin/sahipler` | School owners |
| DSManagerPage | `/admin/mudurler` | School managers |
| IslemlerGecmisi | `/admin/islemler` | System logs |
| AdminHesabim | `/admin/hesabim` | Admin profile |

### Driving School Pages (`/pages/DrivingSchool/`)

| Page | Path | Description |
|------|------|-------------|
| Layout | - | School layout wrapper |
| Dashboard | `/kurs` | School overview |
| Students | `/kurs/ogrenciler` | Student management |
| Cars | `/kurs/araclar` | Vehicle management |
| Kursum | `/kurs/kursum` | My school info |
| Kurslar | `/kurs/kurslar` | Courses |
| SurucuKursuAyarlari | `/kurs/ayarlar` | Settings |
| SimulasyonRaporlari | `/kurs/simrapor` | Simulation reports |
| Dosyalarim | `/kurs/dosyalar` | My files |
| Islemler | `/kurs/islemler` | Operations history |

---

## API Service

The centralized API service (`services/api-service.ts`) provides typed methods for all backend communication.

### Structure
```typescript
class ApiService {
  // Authentication
  authentication = {
    login: (email, password) => Promise<LoginResponse>,
    logout: () => Promise<void>,
    // ...
  }

  // User operations
  user = {
    getProfile: () => Promise<User>,
    updateProfile: (data) => Promise<User>,
    me: () => Promise<User>,
  }

  // Driving school operations
  drivingSchool = {
    getSchoolInfo: (code) => Promise<DrivingSchool>,
    getStudents: (code) => Promise<Student[]>,
    getCars: (code) => Promise<Car[]>,
    getDashboard: (code) => Promise<Dashboard>,
    getSettings: (id) => Promise<Settings>,
    updateSettings: (id, data) => Promise<Settings>,
    getCredentials: (code) => Promise<Credentials>,
    updateCredentials: (code, data) => Promise<void>,
  }

  // Admin operations
  admin = {
    // Admins
    getAdmins: () => Promise<Admin[]>,
    createAdmin: (data) => Promise<Admin>,
    getAdminById: (id) => Promise<Admin>,
    updateAdmin: (id, data) => Promise<Admin>,
    deleteAdmin: (id) => Promise<void>,

    // Driving Schools
    getDrivingSchools: () => Promise<DrivingSchool[]>,
    createDrivingSchool: (data) => Promise<DrivingSchool>,
    // ...

    // Managers & Owners
    getDrivingSchoolManagers: () => Promise<Manager[]>,
    getDrivingSchoolOwners: () => Promise<Owner[]>,
    // ...

    // Dashboard & Logs
    getDashboard: () => Promise<Dashboard>,
    getSystemLogs: (query) => Promise<Log[]>,

    // Cities
    getCities: () => Promise<City[]>,
    getDistrictsByCity: (cityId) => Promise<District[]>,
  }
}

export const apiService = ApiService.getInstance();
```

### Usage Example
```typescript
import { apiService } from '@/services/api-service';

// Login
const { token, user } = await apiService.authentication.login(email, password);

// Get driving school dashboard
const dashboard = await apiService.drivingSchool.getDashboard('DS001');

// Create new admin
const admin = await apiService.admin.createAdmin({
  email: 'admin@example.com',
  name: 'New Admin',
  password: 'password123'
});
```

---

## Environment Configuration

### API URL Detection
The API service automatically detects the correct backend URL:

```typescript
// Local development
if (hostname === 'localhost') → http://localhost:9501/api/v1

// Staging
if (hostname.includes('test')) → https://test.mtsk.app/api/v1

// Production
else → https://staging.mtsk.app/api/v1
```

### Environment Variables
```env
VITE_API_URL=http://localhost:9501/api/v1
VITE_API_GATEWAY_PORT=9501
```

---

## Routing

### Route Guards
Located in `routing/guards/`:

- **AuthGuard** - Requires authenticated user
- **AdminGuard** - Requires admin user type
- **DrivingSchoolGuard** - Requires owner/manager

### Route Structure
```typescript
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />

  {/* Admin routes */}
  <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
    <Route index element={<AdminDashboard />} />
    <Route path="kurslar" element={<KurslarPage />} />
    {/* ... */}
  </Route>

  {/* Driving school routes */}
  <Route path="/kurs" element={<DrivingSchoolGuard><DSLayout /></DrivingSchoolGuard>}>
    <Route index element={<DSDashboard />} />
    <Route path="ogrenciler" element={<StudentsPage />} />
    {/* ... */}
  </Route>
</Routes>
```

---

## State Management

### Authentication State
Stored in localStorage:
- `token` - JWT token
- `user` - User object (JSON)

### Server State
Managed by React Query:
```typescript
const { data: students, isLoading } = useQuery({
  queryKey: ['students', schoolCode],
  queryFn: () => apiService.drivingSchool.getStudents(schoolCode)
});
```

---

## Styling

### TailwindCSS
Configuration in `tailwind.config.js`:
- Custom colors for brand
- Extended spacing
- Custom fonts

### shadcn/ui Components
Pre-built accessible components:
- Button, Input, Select
- Dialog, Modal
- Table, DataTable
- Form components
- etc.

### Component Configuration
`components.json` defines shadcn/ui settings.

---

## WebSocket Integration

### Socket Service
```typescript
import { socketService } from '@/services/socket-service';

// Connect
socketService.connect();

// Listen for events
socketService.on('notiflogin', (data) => {
  console.log('Login notification:', data);
});

// Disconnect
socketService.disconnect();
```

---

## Build & Development

### Commands
```bash
# Development
pnpm dev              # Start Vite dev server on :5173

# Build
pnpm build            # Build for production

# Preview
pnpm preview          # Preview production build
```

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## File Organization Conventions

### Components
- PascalCase for component files: `StudentCard.tsx`
- Group related components in folders
- Co-locate styles with components

### Pages
- One page per route
- Use Layout components for shared UI
- Keep pages thin, delegate to components

### Types
- Define types close to where they're used
- Shared types in `types/` directory
- Use interfaces for objects, types for unions

### Hooks
- Prefix with `use`: `useStudents.ts`
- One hook per file
- Document hook purpose and return value
