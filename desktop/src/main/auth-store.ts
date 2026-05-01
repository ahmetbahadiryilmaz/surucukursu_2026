import { app } from 'electron';
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
    this.data = { token, user, savedEmail: user.email, savedSchoolName };
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // non-critical
    }
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
    this.data = savedEmail || savedSchoolName
      ? { token: '', user: null as any, savedEmail: savedEmail || undefined, savedSchoolName: savedSchoolName || undefined }
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
