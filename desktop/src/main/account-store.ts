import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type SimulatorType = 'sesim' | 'anarapor';

export interface Account {
  id: string;
  username: string;
  password: string;
  label: string;
  isRunning: boolean;
  createdAt: string;
  simulatorType?: SimulatorType;
}

export class AccountStore {
  private filePath: string;
  private accounts: Account[] = [];

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'accounts.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.accounts = JSON.parse(data);
        // Reset running status on app start
        this.accounts.forEach(a => (a.isRunning = false));
        this.save();
      }
    } catch {
      this.accounts = [];
    }
  }

  private save() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.accounts, null, 2), 'utf-8');
  }

  getAll(): Account[] {
    return this.accounts.map(a => ({ ...a }));
  }

  getById(id: string): Account | undefined {
    return this.accounts.find(a => a.id === id);
  }

  add(username: string, password: string, label: string): Account {
    const account: Account = {
      id: uuidv4(),
      username,
      password,
      label: label || username,
      isRunning: false,
      createdAt: new Date().toISOString(),
    };
    this.accounts.push(account);
    this.save();
    return account;
  }

  update(id: string, data: Partial<Pick<Account, 'username' | 'password' | 'label' | 'simulatorType'>>): Account | null {
    const account = this.accounts.find(a => a.id === id);
    if (!account) return null;
    if (data.username !== undefined) account.username = data.username;
    if (data.password !== undefined) account.password = data.password;
    if (data.label !== undefined) account.label = data.label;
    if (data.simulatorType !== undefined) account.simulatorType = data.simulatorType;
    this.save();
    return { ...account };
  }

  remove(id: string): boolean {
    const idx = this.accounts.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.accounts.splice(idx, 1);
    this.save();
    return true;
  }

  setRunning(id: string, running: boolean) {
    const account = this.accounts.find(a => a.id === id);
    if (account) {
      account.isRunning = running;
      this.save();
    }
  }
}
