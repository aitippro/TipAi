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

  // ── Native Addon (Rust Core / JS Polyfill) ──────────────────
  nativeVersion: () => ipcRenderer.invoke('native:version'),

  // Users
  userFindByUnionId: (unionId) => ipcRenderer.invoke('native:userFindByUnionId', unionId),
  userFindById: (id) => ipcRenderer.invoke('native:userFindById', id),
  userFindByUsername: (username) => ipcRenderer.invoke('native:userFindByUsername', username),
  userUpsert: (data) => ipcRenderer.invoke('native:userUpsert', data),

  // Settings
  settingsGet: (userId) => ipcRenderer.invoke('native:settingsGet', userId),
  settingsUpdate: (userId, data) => ipcRenderer.invoke('native:settingsUpdate', userId, data),
  settingsGetApiKey: (userId, provider) => ipcRenderer.invoke('native:settingsGetApiKey', userId, provider),

  // Projects
  projectList: (userId) => ipcRenderer.invoke('native:projectList', userId),
  projectCreate: (data) => ipcRenderer.invoke('native:projectCreate', data),
  projectGetById: (id, userId) => ipcRenderer.invoke('native:projectGetById', id, userId),
  projectUpdate: (id, userId, data) => ipcRenderer.invoke('native:projectUpdate', id, userId, data),
  projectDelete: (id, userId) => ipcRenderer.invoke('native:projectDelete', id, userId),

  // Steps
  stepList: (projectId) => ipcRenderer.invoke('native:stepList', projectId),
  stepGetById: (id) => ipcRenderer.invoke('native:stepGetById', id),
  stepCreate: (data) => ipcRenderer.invoke('native:stepCreate', data),
  stepUpdate: (id, data) => ipcRenderer.invoke('native:stepUpdate', id, data),
  stepDelete: (id, projectId) => ipcRenderer.invoke('native:stepDelete', id, projectId),

  // Conversations
  conversationCreate: (data) => ipcRenderer.invoke('native:conversationCreate', data),
  conversationListByProject: (projectId) => ipcRenderer.invoke('native:conversationListByProject', projectId),

  // Summaries
  summaryGetByProject: (projectId) => ipcRenderer.invoke('native:summaryGetByProject', projectId),
  summaryUpsert: (data) => ipcRenderer.invoke('native:summaryUpsert', data),

  // Evaluations
  evaluationCreate: (data) => ipcRenderer.invoke('native:evaluationCreate', data),
  evaluationStats: (projectId) => ipcRenderer.invoke('native:evaluationStats', projectId),
  evaluationList: (projectId, limit) => ipcRenderer.invoke('native:evaluationList', projectId, limit),

  // Prompts
  promptList: (userId, opts) => ipcRenderer.invoke('native:promptList', userId, opts),
  promptCreate: (data) => ipcRenderer.invoke('native:promptCreate', data),
  promptDelete: (id, userId) => ipcRenderer.invoke('native:promptDelete', id, userId),
  promptUpdateFavorite: (id, userId, isFavorite) => ipcRenderer.invoke('native:promptUpdateFavorite', id, userId, isFavorite),

  // Templates
  templateListPublic: () => ipcRenderer.invoke('native:templateListPublic'),
  templateListByUser: (userId) => ipcRenderer.invoke('native:templateListByUser', userId),
  templateCreate: (data) => ipcRenderer.invoke('native:templateCreate', data),
  templateDelete: (id, userId) => ipcRenderer.invoke('native:templateDelete', id, userId),
  templateUse: (id) => ipcRenderer.invoke('native:templateUse', id),
  templateRate: (id, score) => ipcRenderer.invoke('native:templateRate', id, score),

  // Optimizer
  optimizerRunCreate: (data) => ipcRenderer.invoke('native:optimizerRunCreate', data),
  optimizerRunList: (userId, limit) => ipcRenderer.invoke('native:optimizerRunList', userId, limit),

  // Crypto
  encrypt: (plaintext, password) => ipcRenderer.invoke('native:encrypt', plaintext, password),
  decrypt: (ciphertext, password) => ipcRenderer.invoke('native:decrypt', ciphertext, password),

  // AI (async)
  aiCall: (req) => ipcRenderer.invoke('native:aiCall', req),
  aiCallSelfConsistency: (req, sampleCount) => ipcRenderer.invoke('native:aiCallSelfConsistency', req, sampleCount),

  // Quality / Drift
  runQualityGate: (prompt, checks, threshold) => ipcRenderer.invoke('native:runQualityGate', prompt, checks, threshold),
  detectDrift: (versions, baselineIndex) => ipcRenderer.invoke('native:detectDrift', versions, baselineIndex),
  compareVersions: (a, b) => ipcRenderer.invoke('native:compareVersions', a, b),

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
