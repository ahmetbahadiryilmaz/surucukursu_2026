import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  userType: number;
}

interface AuthData {
  token: string;
  user: AuthUser;
  savedEmail?: string;
  savedSchoolName?: string;
  /**
   * Cipher (base64) of the user's password.
   *  - Prefix `ss:` — encrypted via Electron `safeStorage` (OS keychain / DPAPI).
   *  - Prefix `b64:` — base64 obfuscation (fallback when safeStorage is unavailable).
   * Decryption only succeeds on the same machine + user account that wrote it.
   */
  savedPasswordCipher?: string;
  /** When true, the renderer auto-submits the login form on next app start. */
  autoLogin?: boolean;
}

export class AuthStore {
  private filePath: string;
  private data: AuthData | null = null;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'auth.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch {
      this.data = null;
    }
  }

  save(token: string, user: AuthUser) {
    const savedSchoolName = this.data?.savedSchoolName;
    const savedPasswordCipher = this.data?.savedPasswordCipher;
    const autoLogin = this.data?.autoLogin;
    this.data = { token, user, savedEmail: user.email, savedSchoolName, savedPasswordCipher, autoLogin };
    this.persist();
  }

  private persist() {
    try {
      if (this.data) {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
      }
    } catch {
      // non-critical
    }
  }

  /** Stores the password encrypted-at-rest. Pass null to forget it. */
  setRememberedPassword(password: string | null) {
    if (!this.data) {
      this.data = { token: '', user: null as any };
    }
    if (password === null || password === '') {
      delete this.data.savedPasswordCipher;
    } else {
      try {
        if (safeStorage.isEncryptionAvailable()) {
          this.data.savedPasswordCipher =
            'ss:' + safeStorage.encryptString(password).toString('base64');
        } else {
          // Fallback when no OS keychain is available (rare on Windows/macOS).
          this.data.savedPasswordCipher =
            'b64:' + Buffer.from(password, 'utf-8').toString('base64');
        }
      } catch {
        // best-effort — leave previous cipher untouched on failure
      }
    }
    this.persist();
  }

  getRememberedPassword(): string | null {
    const cipher = this.data?.savedPasswordCipher;
    if (!cipher) return null;
    try {
      if (cipher.startsWith('ss:')) {
        if (!safeStorage.isEncryptionAvailable()) return null;
        return safeStorage.decryptString(Buffer.from(cipher.slice(3), 'base64'));
      }
      if (cipher.startsWith('b64:')) {
        return Buffer.from(cipher.slice(4), 'base64').toString('utf-8');
      }
    } catch {
      // fall through
    }
    return null;
  }

  setAutoLogin(value: boolean) {
    if (!this.data) {
      this.data = { token: '', user: null as any };
    }
    this.data.autoLogin = !!value;
    this.persist();
  }

  getAutoLogin(): boolean {
    return this.data?.autoLogin === true;
  }

  setSavedSchoolName(name: string | null | undefined) {
    if (!name) return;
    if (!this.data) {
      this.data = { token: '', user: null as any, savedSchoolName: name };
    } else {
      this.data.savedSchoolName = name;
    }
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch { /* ignore */ }
  }

  clear() {
    const savedEmail = this.data?.savedEmail ?? this.data?.user?.email ?? null;
    const savedSchoolName = this.data?.savedSchoolName ?? null;
    // Keep the saved password (so the next login is one-click) but always
    // drop autoLogin — otherwise an explicit logout would silently re-login
    // on the next launch.
    const savedPasswordCipher = this.data?.savedPasswordCipher;
    this.data = savedEmail || savedSchoolName || savedPasswordCipher
      ? {
          token: '',
          user: null as any,
          savedEmail: savedEmail || undefined,
          savedSchoolName: savedSchoolName || undefined,
          savedPasswordCipher,
          autoLogin: false,
        }
      : null;
    try {
      if (this.data) {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
      } else {
        fs.unlinkSync(this.filePath);
      }
    } catch { /* ignore */ }
  }

  getToken(): string | null {
    return this.data?.token || null;
  }

  getUser(): AuthUser | null {
    return this.data?.user ?? null;
  }

  getSavedEmail(): string | null {
    return this.data?.savedEmail ?? null;
  }

  getSavedSchoolName(): string | null {
    return this.data?.savedSchoolName ?? null;
  }
}
