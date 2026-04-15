import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mebbisAPI', {
  // Account CRUD
  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  addAccount: (username: string, password: string, label: string) =>
    ipcRenderer.invoke('accounts:add', { username, password, label }),
  updateAccount: (id: string, data: { username?: string; password?: string; label?: string }) =>
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
});
