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
  showSaveDialog: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  
  /** Show open dialog */
  showOpenDialog: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  
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
