const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Core IPC fetch — replaces HTTP for API calls
  fetch: (path, options) => ipcRenderer.invoke('api:fetch', {
    path,
    method: options?.method || 'GET',
    headers: options?.headers || {},
    body: options?.body || null,
  }),

  // App info
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),

  // Dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSave', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpen', options),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Database
  getDbPath: () => ipcRenderer.invoke('db:getPath'),

  // Updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  getUpdaterInfo: () => ipcRenderer.invoke('updater:info'),

  onUpdateAvailable: (cb) => ipcRenderer.on('updater:available', (_, d) => cb(d)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('updater:not-available', (_, d) => cb(d)),
  onUpdateError: (cb) => ipcRenderer.on('updater:error', (_, d) => cb(d)),
  onDownloadProgress: (cb) => ipcRenderer.on('updater:progress', (_, d) => cb(d)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('updater:downloaded', (_, d) => cb(d)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
