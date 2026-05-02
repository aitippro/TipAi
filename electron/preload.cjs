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

  // ── Native Addon (Rust Core) ───────────────────────────────
  nativeVersion: () => ipcRenderer.invoke('native:version'),

  // Users
  userFindByUnionId: (unionId) => ipcRenderer.invoke('native:userFindByUnionId', unionId),
  userUpsert: (data) => ipcRenderer.invoke('native:userUpsert', data),

  // Settings
  settingsGet: (userId) => ipcRenderer.invoke('native:settingsGet', userId),
  settingsUpdate: (userId, data) => ipcRenderer.invoke('native:settingsUpdate', userId, data),
  settingsGetApiKey: (userId, provider) => ipcRenderer.invoke('native:settingsGetApiKey', userId, provider),

  // Prompts
  promptList: (userId, opts) => ipcRenderer.invoke('native:promptList', userId, opts),
  promptCreate: (data) => ipcRenderer.invoke('native:promptCreate', data),

  // Templates
  templateListPublic: () => ipcRenderer.invoke('native:templateListPublic'),
  templateListByUser: (userId) => ipcRenderer.invoke('native:templateListByUser', userId),

  // Projects
  projectList: (userId) => ipcRenderer.invoke('native:projectList', userId),
  projectCreate: (data) => ipcRenderer.invoke('native:projectCreate', data),

  // Steps
  stepList: (projectId) => ipcRenderer.invoke('native:stepList', projectId),
  stepUpdate: (id, data) => ipcRenderer.invoke('native:stepUpdate', id, data),

  // AI (async)
  aiCall: (req) => ipcRenderer.invoke('native:aiCall', req),
  aiCallSelfConsistency: (req, sampleCount) => ipcRenderer.invoke('native:aiCallSelfConsistency', req, sampleCount),

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
