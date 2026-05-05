import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mebbisAPI', {
  // Device identity
  getDeviceId: () => ipcRenderer.invoke('device:id'),

  // Auth
  authCheck: () => ipcRenderer.invoke('auth:check'),
  authGetSavedEmail: () => ipcRenderer.invoke('auth:get-saved-email'),
  authGetSavedSchool: () => ipcRenderer.invoke('auth:get-saved-school'),
  authLogin: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
  authForgotPassword: (email: string, phone: string) => ipcRenderer.invoke('auth:forgot-password', email, phone),
  authVerifyResetCode: (email: string, code: string) => ipcRenderer.invoke('auth:verify-reset-code', email, code),
  authResetPassword: (email: string, code: string, newPassword: string) => ipcRenderer.invoke('auth:reset-password', email, code, newPassword),
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),

  // Account CRUD
  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  addAccount: (username: string, password: string, label: string) =>
    ipcRenderer.invoke('accounts:add', { username, password, label }),
  updateAccount: (id: string, data: { username?: string; password?: string; label?: string; simulatorType?: string }) =>
    ipcRenderer.invoke('accounts:update', { id, ...data }),
  removeAccount: (id: string) => ipcRenderer.invoke('accounts:remove', id),

  // Session controls
  startAccount: (id: string) => ipcRenderer.invoke('accounts:start', id),
  stopAccount: (id: string) => ipcRenderer.invoke('accounts:stop', id),
  focusAccount: (id: string) => ipcRenderer.invoke('accounts:focus', id),
  getStatus: (id: string) => ipcRenderer.invoke('accounts:get-status', id),

  // Events
  onAccountStopped: (callback: (id: string) => void) => {
    ipcRenderer.on('account:stopped', (_event, id) => callback(id));
  },

  // What's New
  whatsNewCheck: () => ipcRenderer.invoke('whats-new:check'),
  whatsNewDismiss: () => ipcRenderer.invoke('whats-new:dismiss'),

  // Profile
  profileGet: () => ipcRenderer.invoke('profile:get'),
  profileUpdate: (phone: string) => ipcRenderer.invoke('profile:update', phone),

  // Dev/test helpers — only functional when IS_DEV is true on the main side
  isDev: () => ipcRenderer.invoke('app:is-dev'),
  devTestDireksiyonPdf: (sinif: string) => ipcRenderer.invoke('dev:test-direksiyon-pdf', sinif),
  devTestSimulatorPdf: (simType: string) => ipcRenderer.invoke('dev:test-simulator-pdf', simType),

  // Remote code version (e.g. "1.2.4.001")
  getCodeVersion: () => ipcRenderer.invoke('desktop-code:version'),

  // Installed desktop app version (e.g. "1.2.5")
  getAppVersion: () => ipcRenderer.invoke('app:version'),
});
