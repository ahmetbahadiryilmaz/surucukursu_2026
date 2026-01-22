# MEBBIS Integration Service

## Overview

The MEBBIS Service handles integration with the Turkish Ministry of Education's MEBBIS (Milli Eğitim Bakanlığı Bilişim Sistemleri) platform. This service manages:
- Authentication with MEBBIS
- Session/cookie management
- Student candidate synchronization
- Real-time login notifications

**Port:** 3000  
**External System:** https://mebbisyd.meb.gov.tr

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MEBBIS SERVICE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐       │
│  │ LoginController│   │ SyncController │   │ MebbisGateway  │       │
│  │ /api/mebbis/   │   │ /api/mebbis/   │   │  (WebSocket)   │       │
│  │ login/         │   │ sync/          │   │                │       │
│  └───────┬────────┘   └───────┬────────┘   └───────┬────────┘       │
│          │                    │                    │                 │
│          ▼                    ▼                    ▼                 │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                     MEBBIS Services                         │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │     │
│  │  │ PreloginSvc  │  │IsLoggedInSvc │  │CandidatesListSvc │  │     │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                      Cookie Storage                         │     │
│  │              storage/cookies/mebbis{id}.txt                 │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │    MEBBIS (meb.gov.tr)       │
                    │  https://mebbisyd.meb.gov.tr │
                    └──────────────────────────────┘
```

---

## Authentication Flow

### Step 1: Initial Login Request
```
POST /api/mebbis/login/withNotification
{
  "username": "mebbis_username",
  "password": "mebbis_password",
  "tbMebbisId": 123  // Internal ID for cookie file
}
```

This initiates login and triggers SMS 2FA code to be sent.

### Step 2: Submit 2FA Code
```
POST /api/mebbis/login/withCode
{
  "tbMebbisId": 123,
  "code": "123456"  // SMS code received
}
```

On success, session cookies are saved to `storage/cookies/mebbis123.txt`.

### Step 3: Verify Login Status
```
POST /api/mebbis/login/isLoggedIn
{
  "tbMebbisId": 123
}
```

Checks if the stored cookies are still valid for MEBBIS operations.

---

## API Endpoints

### Login Controller

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mebbis/login/trylogin` | Test login without notification |
| POST | `/api/mebbis/login/withNotification` | Login with 2FA notification |
| POST | `/api/mebbis/login/isLoggedIn` | Check if session is valid |
| POST | `/api/mebbis/login/withCode` | Complete login with 2FA code |

### Sync Controller

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mebbis/sync/candidates` | Sync student candidates from MEBBIS |

---

## Services

### PreloginService
Handles the initial authentication flow with MEBBIS.

**Methods:**
- `tryLogin(username, password)` - Attempt login, return success/failure
- `login(username, password)` - Login and trigger 2FA SMS
- `loginWithCode(code)` - Submit 2FA code to complete authentication

### IsLoggedInService
Verifies if existing cookies provide valid session.

**Methods:**
- `isLoggedIn()` - Check cookie validity against MEBBIS

### CandidatesListService
Fetches student data from MEBBIS.

**Methods:**
- `getCandidates(cookieName)` - Retrieve candidate list using stored cookies

---

## Cookie Management

### Storage Location
```
backend/services/mebbis-service/storage/cookies/
├── mebbis123.txt      # Cookies for driving school ID 123
├── mebbis456.txt      # Cookies for driving school ID 456
└── ...
```

### Cookie Format
Cookies are stored in Netscape cookie file format for compatibility:

```
# Netscape HTTP Cookie File
.mebbisyd.meb.gov.tr	TRUE	/	TRUE	0	ASP.NET_SessionId	abc123...
.mebbisyd.meb.gov.tr	TRUE	/	TRUE	0	__RequestVerificationToken	xyz789...
```

### Cookie Conversion
The `convertToNetscapeCookie()` function converts MEBBIS response cookies to Netscape format.

---

## Database Integration

### TbMebbis Entity
The service uses a separate database (`mebbis`) with the `tb_mebbis` table:

| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| username | string | MEBBIS username |
| password | string | MEBBIS password |
| lastLogin | int | Unix timestamp of last login |
| mebbislogin | boolean | Current login status |
| cookie | text | Full cookie string |

### Database Updates
On successful login:
```typescript
await this.tbMebbisRepository.update(
  { id: tbMebbisId },
  {
    lastLogin: Math.floor(Date.now() / 1000),
    mebbislogin: true,
    cookie: cookieString,
  },
);
```

---

## WebSocket Gateway

### MebbisGateway
Real-time communication for login notifications.

**Events:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `message` | Bidirectional | General messages |
| `notiflogin` | Server → Client | Login notification received |

**Usage:**
```typescript
// Client-side
socket.on('notiflogin', (data) => {
  console.log('2FA code received:', data);
});
```

---

## MEBBIS Pages Reference

The MEBBIS system provides these main pages (SKT = Sürücü Kursu Takip):

| URL | Page Name | Description |
|-----|-----------|-------------|
| `/SKT/skt01001.aspx` | Kurum Bilgileri | Institution information |
| `/SKT/skt01002.aspx` | Kurum Araç | Vehicle registration |
| `/SKT/skt01003.aspx` | Kurum Derslik | Classroom registration |
| `/SKT/skt02001.aspx` | Aday Dönem Kayıt | Candidate enrollment |
| `/SKT/skt02002.aspx` | Aday Fotoğraf | Candidate photo upload |
| `/SKT/skt02003.aspx` | Aday Öğrenim Bilgisi | Candidate education info |
| `/SKT/skt02004.aspx` | Aday Sağlık Raporu | Health report |
| `/SKT/skt02005.aspx` | Aday Sabıka | Criminal record |
| `/SKT/skt02006.aspx` | Dönem Onaylama | Period approval |
| `/SKT/skt02007.aspx` | e-Sınav Başvuru | E-exam application |
| `/SKT/skt02008.aspx` | Sınav Sonuç | Exam results |
| `/SKT/skt03001.aspx` | Grup Tarih Giriş | Group date entry |
| `/SKT/skt03002.aspx` | Grup Şube | Group/branch definition |
| `/SKT/skt03003.aspx` | Teorik Ders | Theoretical lesson schedule |
| `/SKT/skt03004.aspx` | Direksiyon Ders | Driving lesson schedule |

---

## Testing Tools

### Session Picker
Located at `tests/mebbis.meb.gov.tr/session-picker.js`

Interactive CLI tool for:
- Listing online MEBBIS sessions from database
- Testing session validity
- Browsing MEBBIS pages with valid sessions
- Debugging MEBBIS integration

**Usage:**
```bash
cd tests/mebbis.meb.gov.tr
node session-picker.js
```

---

## Driving School Credential Validation

When a driving school saves MEBBIS credentials via the API, the system validates that the credentials are correct by attempting to login without 2FA. This ensures invalid credentials are not stored.

### Validation Flow

**Endpoint:** `POST /api/v1/driving-school/:code/creds`

```
User submits MEBBIS credentials
        ↓
API Server calls MEBBIS Service validation endpoint
        ↓
MEBBIS Service attempts login with credentials
        ↓
Can login successfully?
  ├─ YES → Save credentials to database + Save cookies
  └─ NO  → Return error, don't save anything
```

### Request
```json
{
  "mebbis_username": "user@mebbis.gov.tr",
  "mebbis_password": "password123",
  "driving_school_id": 45
}
```

### Validation Response (Success)
```json
{
  "success": true,
  "message": "Credentials validated and saved successfully",
  "data": {
    "driving_school_id": 45,
    "username": "user@mebbis.gov.tr",
    "lastValidated": "2026-01-22T10:30:00Z"
  }
}
```

### Validation Response (Failure)
```json
{
  "success": false,
  "error": "Invalid MEBBIS credentials",
  "message": "login failed",
  "statusCode": 401
}
```

### Implementation Details

**File:** `backend/services/api-server/src/api/v1/driving-school/main/driving-school.service.ts`

```typescript
async validateAndUpdateCreds(
  code: string,
  dto: UpdateDrivingSchoolCredsDto
): Promise<{ success: boolean; message: string }> {
  const school = await this.drivingSchoolRepository.findOne({
    where: { id: parseInt(code) }
  });

  if (!school) {
    throw new NotFoundException(`Driving school with code ${code} not found`);
  }

  // Call MEBBIS service to validate credentials
  const validationResult = await this.mebbisClientService.validateCredentials(
    dto.mebbis_username,
    dto.mebbis_password,
    parseInt(code) // driving_school_id
  );

  if (!validationResult.success) {
    throw new UnauthorizedException(
      'Invalid MEBBIS credentials. Please check your username and password.'
    );
  }

  // Only save if validation succeeds
  const updateData: any = {};
  if (dto.mebbis_username) {
    updateData.mebbis_username = TextEncryptor.mebbisUsernameEncrypt(
      dto.mebbis_username
    );
  }
  if (dto.mebbis_password) {
    updateData.mebbis_password = TextEncryptor.mebbisPasswordEncrypt(
      dto.mebbis_password
    );
  }

  const result = await this.drivingSchoolRepository.update(
    parseInt(code),
    updateData
  );

  return {
    success: true,
    message: 'Credentials validated and saved successfully'
  };
}
```

### MEBBIS Client Service

**File:** `backend/services/api-server/src/common/clients/mebbis-client.service.ts`

```typescript
@Injectable()
export class MebbisClientService {
  constructor(private httpService: HttpService) {}

  async validateCredentials(
    username: string,
    password: string,
    driving_school_id: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Call MEBBIS service validation endpoint
      const response = await this.httpService.post(
        `http://localhost:${env.services.mebbisService.port}/api/mebbis/login/trylogin`,
        {
          username,
          password,
          tbMebbisId: driving_school_id
        },
        { timeout: 30000 }
      ).toPromise();

      if (response?.data?.message === 'login success') {
        return { success: true };
      }

      return {
        success: false,
        message: response?.data?.error?.message || 'Login failed'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Unable to validate credentials with MEBBIS service'
      };
    }
  }
}
```

### Key Points

1. **No 2FA Required:** Uses `trylogin` endpoint which doesn't require SMS code
2. **Atomic Operation:** Either save both username and password, or save nothing
3. **Encryption:** Credentials encrypted before storage
4. **Error Messages:** Clear feedback if validation fails
5. **Per Driving School:** Validation happens per driving school with proper driving_school_id

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Session expired` | Cookies no longer valid | Re-authenticate |
| `Invalid MEBBIS credentials` | Wrong username/password | Verify credentials with MEBBIS |
| `2FA timeout` | Code not submitted in time | Restart login flow |
| `Connection refused` | MEBBIS server down | Retry later |

### Response Format
```json
{
  "message": "login success",
  "data": {
    "tbMebbisId": 123,
    "inputs": {}
  }
}

// Error
{
  "data": {},
  "error": { "message": "Invalid credentials" },
  "message": "login failed"
}
```

---

## Security Considerations

1. **Credential Storage:** MEBBIS passwords stored encrypted in main database
2. **Cookie Files:** Stored locally, not exposed via API
3. **Session Isolation:** Each driving school has separate cookie file
4. **Token Expiry:** MEBBIS sessions typically expire after ~30 minutes of inactivity
