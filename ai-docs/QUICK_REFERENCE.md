# Development Quick Reference

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp backend/.env.example backend/.env
# Edit .env with your database credentials

# 3. Start RabbitMQ (Docker)
docker-compose up -d

# 4. Run database migrations
pnpm migrate:fresh

# 5. Start all services
pnpm dev

# 6. Start file server (separate terminal)
pnpm dev:file-server
```

---

## Service URLs (Development)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:9501 |
| API Server | http://localhost:3001 |
| File Server | http://localhost:9504 |
| MEBBIS Service | http://localhost:3000 |
| RabbitMQ UI | http://localhost:15787 |
| API Docs | http://localhost:3001/docs |

---

## Common Commands

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:file-server        # Start file server
pnpm php-worker             # Start PHP PDF worker

# Database
pnpm migrate:fresh          # Drop & recreate tables

# Build
pnpm build                  # Build all packages

# Lint
pnpm lint                   # Run linters
```

---

## Adding a New API Endpoint

### 1. Create Controller Method
```typescript
// backend/services/api-server/src/api/v1/driving-school/students/students.controller.ts

@Get(':id/grades')
async getStudentGrades(@Param('id') id: number) {
  return this.studentsService.getGrades(id);
}
```

### 2. Create Service Method
```typescript
// students.service.ts
async getGrades(studentId: number) {
  return this.studentRepository.find({
    where: { id: studentId },
    relations: ['grades']
  });
}
```

### 3. Add Frontend API Method
```typescript
// frontend/src/services/api-service.ts

drivingSchool = {
  // ... existing methods
  getStudentGrades: (studentId: number) => 
    this.axiosService.get(`/driving-school/students/${studentId}/grades`),
}
```

---

## Adding a New Entity

### 1. Create Entity File
```typescript
// backend/shared/src/entities/grade.entity.ts

@Entity('grades')
export class GradeEntity extends BaseEntity {
  @Column()
  student_id: number;

  @Column()
  subject: string;

  @Column('decimal')
  score: number;

  @ManyToOne(() => DrivingSchoolStudentEntity)
  @JoinColumn({ name: 'student_id' })
  student: DrivingSchoolStudentEntity;
}
```

### 2. Export from Index
```typescript
// backend/shared/src/entities/index.ts
export * from './grade.entity';
```

### 3. Add to Data Source
```typescript
// backend/services/database-service/data-source.ts
import { GradeEntity } from '@surucukursu/shared';

const entities = [
  // ... existing
  GradeEntity
];
```

### 4. Run Migration
```bash
pnpm migrate:fresh
```

---

## User Types Reference

```typescript
enum UserTypes {
  SUPER_ADMIN = -1,          // Full access
  ADMIN = -2,                // Admin access
  DRIVING_SCHOOL_OWNER = 2,  // School owner
  DRIVING_SCHOOL_MANAGER = 3 // School manager
}
```

### Checking User Type
```typescript
// In controller/service
if (req.user.userType !== UserTypes.ADMIN) {
  throw new UnauthorizedException('Admin access required');
}

// Multiple types
const allowedTypes = [UserTypes.DRIVING_SCHOOL_OWNER, UserTypes.ADMIN];
if (!allowedTypes.includes(req.user.userType)) {
  throw new UnauthorizedException();
}
```

### Using Guards
```typescript
@UseGuards(AdminGuard)        // Only admins
@UseGuards(DrivingSchoolGuard) // Owners, managers, admins
```

---

## File Storage Structure

```
backend/storage/
├── DS{id}/           # Per driving school
│   ├── students/     # Student documents
│   ├── cars/         # Vehicle documents
│   └── reports/      # Generated reports
├── DSDEFAULT/        # Default templates
└── PUBLIC/           # Public assets
```

### Accessing Files
```
# Via File Server
GET http://localhost:9504/static/DS1/students/photo.jpg

# Public files (no auth)
GET http://localhost:9504/public/logo.png
```

---

## Environment Variables

### Required
```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_NAME=surucukursu
ENCRYPTION_KEY=your-32-char-encryption-key
JWT_SECRET=your-jwt-secret
```

### Optional
```env
# Ports
API_GATEWAY_PORT=9501
API_SERVER_PORT=3001
FILE_SERVICE_PORT=9504

# Session
SESSION_EXPIRY=86400

# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=securepassword123

# Slack
SLACK_NOTIFICATION_URL=https://hooks.slack.com/...
```

---

## Debugging Tips

### Check Service Logs
```bash
# Each service logs to its own console
# Check terminal where `pnpm dev` is running
```

### Database Queries
```typescript
// Enable TypeORM logging
// In database config:
logging: true,
```

### Auth Issues
```bash
# Check session in database
SELECT * FROM sessions WHERE user_id = X;

# Verify JWT
# Paste token at jwt.io
```

### MEBBIS Issues
```bash
# Use session picker tool
cd tests/mebbis.meb.gov.tr
node session-picker.js
```

---

## Testing MEBBIS Integration

```bash
# 1. Go to test directory
cd tests/mebbis.meb.gov.tr

# 2. Run session picker
node session-picker.js

# 3. Select online session

# 4. Browse MEBBIS pages
```

---

## Common Patterns

### Protected Route
```typescript
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  // All routes require admin
}
```

### Public Route
```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

### Paginated Response
```typescript
async findAll(page: number, limit: number) {
  const [items, total] = await this.repo.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
  });
  return { items, total, page, limit };
}
```

### Error Response
```typescript
throw new UnauthorizedException('Access denied');
throw new NotFoundException('Student not found');
throw new BadRequestException('Invalid data');
```

---

## Monorepo Structure

```
surucukursu/
├── backend/
│   ├── services/           # NestJS microservices
│   ├── shared/             # Shared code (npm package)
│   ├── workers/            # Background workers
│   └── storage/            # File storage
├── frontend/               # React app
├── tests/                  # Integration tests
├── mockserver/             # Mock server for testing
└── docker-compose.yml      # RabbitMQ
```

### Package Names
- `@surucukursu/api-gateway`
- `@surucukursu/api-server`
- `@surucukursu/file-server`
- `@surucukursu/mebbis-service`
- `@surucukursu/database-service`
- `@surucukursu/shared`

### Running Specific Package
```bash
pnpm --filter=@surucukursu/api-server dev
```
