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
 */

// Declare global for TypeScript
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
