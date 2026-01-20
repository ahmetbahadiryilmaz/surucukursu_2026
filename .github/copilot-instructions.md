# Sürücü Kursu Project Copilot Instructions

## User Types & Authentication

### User Type System
The application has **4 distinct user types** defined in `backend/services/api-server/src/api/v1/auth/dto/enum.ts`:

1. **SUPER_ADMIN** (`-1`) - Highest level system administrator
2. **ADMIN** (`-2`) - Regular administrator 
3. **DRIVING_SCHOOL_OWNER** (`2`) - Owns driving schools
4. **DRIVING_SCHOOL_MANAGER** (`3`) - Manages driving schools

### User Entities
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
