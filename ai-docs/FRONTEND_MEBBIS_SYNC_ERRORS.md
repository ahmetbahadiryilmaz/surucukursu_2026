# Frontend MEBBIS Sync Error Handling

## Overview

Frontend pages that sync data with MEBBIS (Students & Cars) follow a standardized error handling pattern. When sync fails, the frontend detects the error type and prompts the user with appropriate modals (credentials re-entry or 2FA code).

---

## Error Types & Handling Flow

### 1. AJANDA KODU / 2FA - Two-Factor Authentication
**When it occurs:**
- MEBBIS requires 2-factor authentication (SMS code)
- Login succeeded but candidates list requires verification
- Backend returns error containing: `ajanda kodu`, `ajanda`, `2fa`, or `doğrulama kodu`

**Frontend response:**
1. Detect error contains 2FA keywords (check this FIRST)
2. Show `MebbisCodeModal` (prompts user for MEBBIS AJANDA KODU)
3. User enters the 6-digit code they received
4. **Automatically retry sync** with `{ ajandasKodu: code }` parameter
5. If retry succeeds, refreshes data

**Code Pattern:**
```typescript
if (errorMessage && (
  errorMessage.toLowerCase().includes('ajanda kodu') ||
  errorMessage.toLowerCase().includes('ajanda') ||
  errorMessage.toLowerCase().includes('2fa') ||
  errorMessage.toLowerCase().includes('doğrulama kodu')
)) {
  console.log("🎯 AJANDA KODU needed - showing modal");
  setSyncMessage(null);
  setShowCodeModal(true);
}
```

**Retry with code:**
```typescript
const handleCodeSubmitted = async (code: string): Promise<void> => {
  const response = await apiService.drivingSchool.syncStudents(
    activeDrivingSchool.id.toString(),
    { ajandasKodu: code }  // 2FA code parameter
  );
  // On success, refresh data
  await fetchStudents(activeDrivingSchool.id);
};
```

---

### 2. Invalid Credentials - Wrong Username/Password
**When it occurs:**
- MEBBIS rejects login with provided credentials
- Credentials are incorrect or disabled
- Backend returns error containing: `kullanıcı adı`, `şifre`, `kimlik`, `hatalı`, or `başarısız`

**Frontend response:**
1. Detect error contains credential keywords
2. Show `MebbisCredentialsModal` with error message from backend
3. User updates MEBBIS credentials
4. Frontend saves credentials and **automatically retries sync**

**Code Pattern:**
```typescript
else if (
  errorMessage && 
  (errorMessage.toLowerCase().includes('kullanıcı adı') ||
   errorMessage.toLowerCase().includes('şifre') ||
   errorMessage.toLowerCase().includes('kimlik') ||
   errorMessage.toLowerCase().includes('hatalı') ||
   errorMessage.toLowerCase().includes('başarısız'))
) {
  console.log("🔑 Invalid credentials - showing credentials modal");
  setSyncMessage(null);
  setCredentialsError(errorMessage);
  setShowCredentialsModal(true);
}
```

---

### 3. Other Errors - Display to User
**When:**
- Error doesn't match any of the above patterns
- Network errors, timeout, or unexpected backend responses

**Frontend response:**
- Display error in syncMessage banner
- User must fix underlying issue (network, backend service, etc.)

---

## Implementation Pattern

All pages that sync MEBBIS data follow this structure:

### 1. State Variables
```typescript
const [syncing, setSyncing] = useState<boolean>(false);
const [syncMessage, setSyncMessage] = useState<string | null>(null);
const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);
const [credentialsError, setCredentialsError] = useState<string>("");
```

### 1. Main Sync Handler
```typescript
const handleSync = async (): Promise<void> => {
  try {
    setSyncing(true);
    setSyncMessage("Senkronize ediliyor...");
    
    const response = await apiService.drivingSchool.syncStudents(
      activeDrivingSchool.id.toString()
    );
    
    // On success, refresh data
    await fetchStudents(activeDrivingSchool.id);
    setSyncMessage("✅ Senkronize başarıyla tamamlandı!");
    setTimeout(() => setSyncMessage(null), 3000);
    
  } catch (err) {
    // Extract error message (multiple sources)
    let errorMessage = "Senkronize sırasında bir hata oluştu";
    if ((err as any)?.response?.data?.message) {
      errorMessage = (err as any).response.data.message;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    // Check error type and show appropriate modal
    // Check if AJANDA KODU is needed (check this FIRST)
    if (errorMessage.toLowerCase().includes('ajanda')) {
      setShowCodeModal(true);
    } 
    // Check if invalid credentials
    else if (errorMessage.toLowerCase().includes('şifre')) {
      setShowCredentialsModal(true);
      // ... set error message
    } 
    // Other errors
    else {
      setSyncMessage(`❌ Hata: ${errorMessage}`);
    }
  } finally {
    setSyncing(false);
  }
};
```

### 2. Credentials Handler - Save & Retry
```typescript
const handleCredentialsSaved = async (username: string, password: string): Promise<void> => {
  try {
    // Save new credentials
    await apiService.drivingSchool.updateMebbisCredentials(
      activeDrivingSchool?.id.toString() || "",
      username,
      password
    );
    
    setShowCredentialsModal(false);
    setCredentialsError("");
    
    // Automatically retry sync with new credentials
    setSyncMessage("Güncellenmiş kimlik bilgileri ile senkronize ediliyor...");
    await handleSync();
  } catch (error) {
    throw new Error(/* error message */);
  }
};
```

### 3. 2FA Code Handler - Retry with Code
```typescript
const handleCodeSubmitted = async (code: string): Promise<void> => {
  try {
    setShowCodeModal(false);
    setSyncMessage("AJANDA KODU ile senkronize ediliyor...");
    
    // Retry sync with the 2FA code
    const response = await apiService.drivingSchool.syncStudents(
      activeDrivingSchool.id.toString(),
      { ajandasKodu: code }
    );
    
    // Refresh data on success
    await fetchStudents(activeDrivingSchool.id);
    setSyncMessage("✅ Senkronize başarıyla tamamlandı!");
    
  } catch (error) {
    setSyncMessage(`❌ Hata: ${errorMessage}`);
  }
};
```

### 4. Modals in JSX
```typescript
<MebbisCredentialsModal
  isOpen={showCredentialsModal}
  onClose={() => {
    setShowCredentialsModal(false);
    setCredentialsError("");
  }}
  errorMessage={credentialsError}
  onSubmit={handleCredentialsSaved}
/>

<MebbisCodeModal
  isOpen={showCodeModal}
  onClose={() => setShowCodeModal(false)}
  schoolCode={activeDrivingSchool?.id.toString() || ""}
  onSuccess={handleCodeSubmitted}
  onError={(error) => {
    setSyncMessage(`❌ Hata: ${error}`);
  }}
/>
```

---

## Pages Using This Pattern

| Page | File | Modals Used |
|------|------|------------|
| Students | `frontend/src/pages/DrivingSchool/Students/StudentsPage.tsx` | ✅ Both |
| Cars (Araçlar) | `frontend/src/pages/DrivingSchool/Cars/Araclar.tsx` | ✅ Both |

### Adding to New Pages

To add MEBBIS sync to a new page:
1. Import both modals: `MebbisCodeModal`, `MebbisCredentialsModal`
2. Add the 5 state variables listed above
3. Implement `handleSync()` with the error detection logic
4. Implement `handleCredentialsSaved()` and `handleCodeSubmitted()`
5. Render both modals in JSX
6. Ensure sync API endpoint accepts `ajandasKodu` in options parameter

---

## Backend Error Messages

The backend (mebbis-service) returns errors that frontend uses for detection:

### 2FA Code Required
- **Source:** MEBBIS requires AJANDA KODU during candidate fetching
- **Messages:** "AJANDA KODU", "Doğrulama kodu gerekli", "2FA"
- **Frontend retry:** Pass `{ ajandasKodu: code }` to sync endpoint

### Invalid Credentials
- **Source:** Login fails with provided username/password
- **Common messages:** 
  - "Kullanıcı adı veya şifre yanlış"
  - "Bu kullanıcı adı başarısız oturum girişleri nedeniyle kilitlenmiştir"
  - "Kimlik bilgileri hatalı"

---

## Testing Checklist

- [ ] 2FA code required → code modal shows
- [ ] Valid code entered → auto-retry succeeds
- [ ] Invalid credentials → credentials modal shows with error
- [ ] New credentials entered → auto-retry succeeds
- [ ] Network error → displays in syncMessage banner
- [ ] After credentials/code → data refreshes automatically
- [ ] Modal closes on submit without errors
- [ ] Error messages are user-friendly (Turkish)

---

## Key Points

1. **Error detection is based on keywords:** Strings are converted to lowercase and checked for keywords
2. **Check 2FA first:** AJANDA KODU check should be first (if statement), then invalid credentials (else if)
3. **Retry is automatic:** After user enters credentials/code, sync is retried immediately
4. **Data refresh:** After successful retry, data is fetched from backend
5. **Consistent UX:** Both Students and Cars pages follow the exact same pattern for consistency
