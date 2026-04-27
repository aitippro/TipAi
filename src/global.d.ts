// Global type declarations for Electron APIs

interface ElectronAPI {
  /** Platform: 'darwin' | 'win32' | 'linux' | 'web' */
  platform: string;
  
  /** Get app info */
  getAppInfo: () => Promise<{
    version: string;
    platform: string;
    dbPath: string;
    userDataPath: string;
    isDev: boolean;
  }>;
  
  /** Show save dialog */
  showSaveDialog: (options: any) => Promise<any>;
  
  /** Show open dialog */
  showOpenDialog: (options: any) => Promise<any>;
  
  /** Open external URL */
  openExternal: (url: string) => Promise<void>;
  
  /** Get database path */
  getDbPath: () => Promise<string>;
  
  /** Check remote availability */
  checkRemote: (url: string) => Promise<{ available: boolean; url: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
