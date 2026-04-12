# MEBBIS Centralized Error Handling

## Overview

This document describes the centralized error handling system for all MEBBIS-related operations. It provides a consistent way to detect error types, show appropriate modals, and handle different failure scenarios.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 API Request Error                   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ useMebbisErrorHandler      │
        │ (Frontend Hook)            │
        └────────┬───────────────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
    2FA Modal     Credentials Modal / Error Banner
```

## Backend: Error Code Enum

**Location:** `backend/shared/src/enums/mebbis-error.enum.ts`

```typescript
export enum MebbisErrorCode {
  MEBBIS_2FA_REQUIRED = 'MEBBIS_2FA_REQUIRED',          // 2FA/OTP needed
  MEBBIS_INVALID_CREDENTIALS = 'MEBBIS_INVALID_CREDENTIALS', // Wrong username/password
  MEBBIS_SESSION_EXPIRED = 'MEBBIS_SESSION_EXPIRED',    // Session timed out
  MEBBIS_UNAVAILABLE = 'MEBBIS_UNAVAILABLE',            // MEBBIS server down
  MEBBIS_ERROR = 'MEBBIS_ERROR',                        // Generic MEBBIS error
  MEBBIS_NO_DATA = 'MEBBIS_NO_DATA',                    // No data found
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',                      // Unknown error
}
```

### Error Response Format

Ideally, backend endpoints should return structured error responses:

```typescript
// Option 1: With explicit error code (recommended)
{
  success: false,
  error: {
    code: 'MEBBIS_2FA_REQUIRED',
    message: 'AJANDA KODU gerekli. Lütfen MEBBIS\'ten aldığınız kodu giriniz.'
  }
}

// Option 2: Fallback - error message with keywords
{
  message: 'AJANDA KODU gerekli. Lütfen MEBBIS\'ten aldığınız kodu giriniz.'
}
```

The hook supports both formats and will detect the error type.

## Frontend: useMebbisErrorHandler Hook

**Location:** `frontend/src/hooks/useMebbisErrorHandler.ts`

### Basic Usage

```typescript
import { useMebbisErrorHandler } from '@/hooks/useMebbisErrorHandler';

export const MyComponent = () => {
  const { handleMebbisError } = useMebbisErrorHandler();
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  const handleSync = async () => {
    try {
      const response = await apiService.drivingSchool.syncCars('1');
      // Success logic...
    } catch (err) {
      // Single line - handles all error detection!
      const action = handleMebbisError(err);

      if (action.modalType === '2fa') {
        setShowCodeModal(true);
      } else if (action.modalType === 'credentials') {
        setShowCredentialsModal(true);
      } else {
        // Generic error - show banner/toast
        toast.error(action.message);
      }
    }
  };

  return (
    <>
      <button onClick={handleSync}>Sync</button>
      <MebbisCodeModal isOpen={showCodeModal} {...props} />
      <MebbisCredentialsModal isOpen={showCredentialsModal} {...props} />
    </>
  );
};
```

### Hook API

```typescript
const { handleMebbisError, MebbisErrorCode } = useMebbisErrorHandler();

// Returns:
interface MebbisErrorAction {
  modalType: '2fa' | 'credentials' | 'error' | 'none';
  message: string;
  code: MebbisErrorCode;
}
```

#### `handleMebbisError(err)`

- **Input:** Any error object (AxiosError, Error, string, etc.)
- **Output:** `MebbisErrorAction` object
- **Behavior:**
  1. Extracts error message from various error formats
  2. Detects error code (from response or keywords)
  3. Determines which modal should be shown
  4. Logs error for debugging

#### Error Detection Logic

**Priority Order:**

1. **Explicit error code** - If response has `code` field
2. **Keyword matching** - Fallback detection from error message

**Keywords and Mappings:**

| Keywords | Error Code | Modal Type |
|----------|-----------|-----------|
| `ajanda kodu`, `ajanda`, `2fa`, `doğrulama kodu` | `MEBBIS_2FA_REQUIRED` | `2fa` |
| `kimlik`, `şifre`, `kullanıcı adı`, `hatalı`, `başarısız` | `MEBBIS_INVALID_CREDENTIALS` | `credentials` |
| `session`, `oturum` | `MEBBIS_SESSION_EXPIRED` | `credentials` |
| `unavailable`, `temporarily` | `MEBBIS_UNAVAILABLE` | `none` |
| (others) | `MEBBIS_ERROR` | `none` |

## Implementation Examples

### Example 1: Simple Sync Component

```typescript
const SyncComponent = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [credsError, setCredsError] = useState('');
  
  const { handleMebbisError } = useMebbisErrorHandler();

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('Syncing...');
    
    try {
      await apiService.drivingSchool.syncCars(schoolId);
      setSyncMessage('✅ Success!');
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err) {
      const action = handleMebbisError(err);
      setSyncMessage(null);

      if (action.modalType === '2fa') {
        setShowCodeModal(true);
      } else if (action.modalType === 'credentials') {
        setCredsError(action.message);
        setShowCredsModal(true);
      } else {
        setSyncMessage(`❌ ${action.message}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <button onClick={handleSync} disabled={syncing}>
        {syncing ? 'Syncing...' : 'Sync'}
      </button>
      {syncMessage && <div>{syncMessage}</div>}
      
      <MebbisCodeModal isOpen={showCodeModal} {...props} />
      <MebbisCredentialsModal isOpen={showCredsModal} {...props} />
    </>
  );
};
```

### Example 2: With Custom Error Handler

```typescript
const components = () => {
  const { handleMebbisError, MebbisErrorCode } = useMebbisErrorHandler();

  const handleOperation = async () => {
    try {
      // ... operation
    } catch (err) {
      const action = handleMebbisError(err);
      
      switch (action.code) {
        case MebbisErrorCode.MEBBIS_2FA_REQUIRED:
          // Custom 2FA logic
          break;
        case MebbisErrorCode.MEBBIS_INVALID_CREDENTIALS:
          // Custom credentials logic
          break;
        case MebbisErrorCode.MEBBIS_UNAVAILABLE:
          // Show service unavailable message
          break;
        default:
          // Generic error handling
      }
    }
  };
};
```

## Adding New MEBBIS Operations

When implementing a new feature that needs MEBBIS error handling:

1. **Import the hook** in your component:
   ```typescript
   import { useMebbisErrorHandler } from '@/hooks/useMebbisErrorHandler';
   ```

2. **Initialize it:**
   ```typescript
   const { handleMebbisError } = useMebbisErrorHandler();
   ```

3. **Use in try-catch:**
   ```typescript
   try {
     // Your API call
   } catch (err) {
     const action = handleMebbisError(err);
     // Show appropriate modal based on action.modalType
   }
   ```

4. **That's it!** No need to reimpl ement error detection logic.

## Backend Implementation Best Practices

### When Throwing MEBBIS Errors

```typescript
// Option 1: Explicit error code (recommended for new code)
throw new HttpException(
  {
    code: MebbisErrorCode.MEBBIS_2FA_REQUIRED,
    message: 'AJANDA KODU gerekli. Lütfen MEBBIS\'ten aldığınız kodu giriniz.'
  },
  HttpStatus.BAD_REQUEST
);

// Option 2: Keyword-based (for legacy compatibility)
throw new BadRequestException(
  'AJANDA KODU gerekli. Lütfen MEBBIS\'ten aldığınız kodu giriniz.'
);
```

### Controller Pattern

```typescript
@Post('sync')
async syncData(@Body() body: SyncRequest): Promise<any> {
  try {
    // ... sync logic
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new HttpException(
      {
        code: MebbisErrorCode.MEBBIS_ERROR,
        message: error.message
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
```

## Migration Guide

### Before (Old Code)

```typescript
try {
  // API call
} catch (err) {
  let errorMessage = "Default error";
  if (err?.response?.data?.message) {
    errorMessage = err.response.data.message;
  } else if (err instanceof Error) {
    errorMessage = err.message;
  }
  
  if (errorMessage.toLowerCase().includes('ajanda')) {
    setShowCodeModal(true);
  } else if (errorMessage.toLowerCase().includes('kimlik')) {
    setShowCredsModal(true);
  } else {
    setError(errorMessage);
  }
}
```

### After (New Code)

```typescript
const { handleMebbisError } = useMebbisErrorHandler();

try {
  // API call
} catch (err) {
  const action = handleMebbisError(err);
  
  if (action.modalType === '2fa') setShowCodeModal(true);
  else if (action.modalType === 'credentials') setShowCredsModal(true);
  else setError(action.message);
}
```

## Debugging

### Enable Console Logs

The hook logs errors to console:
```
📋 Error Code: MEBBIS_2FA_REQUIRED, Modal: 2fa, Message: AJANDA KODU gerekli...
```

Check the browser console in DevTools to see the detected error code and message.

### Test Error Detection

You can manually test error detection:

```typescript
const { handleMebbisError } = useMebbisErrorHandler();

// Simulate 2FA error
const result = handleMebbisError({
  response: { 
    data: { message: 'AJANDA KODU gerekli' } 
  }
});
console.log(result); // { modalType: '2fa', code: 'MEBBIS_2FA_REQUIRED', ... }
```

## Future Improvements

- [ ] Add typing to generic API error responses
- [ ] Create backend error response interceptor
- [ ] Add retry logic with exponential backoff
- [ ] Create error analytics/tracking
- [ ] Add translations for error messages
