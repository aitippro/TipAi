const { contextBridge, ipcRenderer } = require('electron');

// ==============================
// Electron Preload Script
// Exposes safe APIs to renderer process
// ==============================

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info (sync, available immediately)
  platform: process.platform,
  
  // App info
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  
  // Dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSave', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpen', options),
  
  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  
  // Database
  getDbPath: () => ipcRenderer.invoke('db:getPath'),
  
  // Cloud sync (reserved for future)
  checkRemote: (url) => ipcRenderer.invoke('cloud:checkRemote', url),
  
  // ========== 自动更新 API ==========
  
  // 检查更新
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  // 下载更新
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  // 安装更新
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  // 获取更新信息
  getUpdaterInfo: () => ipcRenderer.invoke('updater:info'),
  
  // 更新事件监听
  onUpdateAvailable: (callback) => ipcRenderer.on('updater:available', (_, data) => callback(data)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('updater:not-available', (_, data) => callback(data)),
  onUpdateError: (callback) => ipcRenderer.on('updater:error', (_, data) => callback(data)),
  onDownloadProgress: (callback) => ipcRenderer.on('updater:progress', (_, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('updater:downloaded', (_, data) => callback(data)),
  
  // 移除监听器（清理用）
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

// Type definition for TypeScript
/**
 * @typedef {Object} ElectronAPI
 * @property {() => Promise<{version: string, platform: string, dbPath: string, userDataPath: string, isDev: boolean}>} getAppInfo
 * @property {(options: any) => Promise<any>} showSaveDialog
 * @property {(options: any) => Promise<any>} showOpenDialog
 * @property {(url: string) => Promise<void>} openExternal
 * @property {() => Promise<string>} getDbPath
 * @property {(url: string) => Promise<{available: boolean, url: string}>} checkRemote
 * @property {() => Promise<{success: boolean, updateInfo: any, error?: string}>} checkForUpdates
 * @property {() => Promise<{success: boolean, error?: string}>} downloadUpdate
 * @property {() => Promise<{success: boolean, error?: string}>} installUpdate
 * @property {() => Promise<any>} getUpdaterInfo
 * @property {(callback: Function) => void} onUpdateAvailable
 * @property {(callback: Function) => void} onUpdateNotAvailable
 * @property {(callback: Function) => void} onUpdateError
 * @property {(callback: Function) => void} onDownloadProgress
 * @property {(callback: Function) => void} onUpdateDownloaded
 * @property {(channel: string) => void} removeAllListeners
 */
