const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

// ==============================
// Electron Main Process
// TipAi Desktop App
// ==============================

const isDev = !app.isPackaged;
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'data.db');

// Ensure user data directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

let mainWindow;
let backendProcess;

function createWindow() {
  const isMacOS = process.platform === 'darwin';
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    // macOS: 隐藏标题栏但保留窗口控制按钮区域
    // Windows: 使用标准标题栏
    titleBarStyle: isMacOS ? 'hiddenInset' : 'default',
    trafficLightPosition: isMacOS ? { x: 16, y: 16 } : undefined,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev,
    },
    backgroundColor: isMacOS ? '#00000000' : '#fafafa',
    // macOS: 启用毛玻璃背景效果
    vibrancy: isMacOS ? 'sidebar' : undefined,
    transparent: isMacOS,
    frame: !isMacOS, // Windows 保留框架
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/public/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // macOS: 动画窗口出现效果
    if (process.platform === 'darwin') {
      mainWindow.setVibrancy('sidebar');
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start backend server (Hono + tRPC)
function startBackend() {
  const env = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    PORT: '0', // Random available port
    DATABASE_URL: `file:${dbPath}`,
    APP_ID: process.env.APP_ID || 'tipai-desktop',
    APP_SECRET: process.env.APP_SECRET || 'tipai-desktop-secret',
    APP_URL: 'http://localhost:0',
    VITE_DEV_SERVER_URL: isDev ? 'http://localhost:5173' : undefined,
  };

  if (isDev) {
    // In dev, Vite dev server handles both frontend and backend
    return Promise.resolve({ port: 3000 });
  }

  // Production: start Node.js backend
  const backendPath = path.join(__dirname, '../dist/server.js');
  
  return new Promise((resolve, reject) => {
    backendProcess = spawn('node', [backendPath], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Backend]', output);
      
      // Extract port from "Server running on http://localhost:PORT"
      const match = output.match(/Server running on http:\/\/localhost:(\d+)/);
      if (match) {
        resolve({ port: parseInt(match[1]) });
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error('[Backend Error]', data.toString());
    });

    backendProcess.on('error', reject);
    
    setTimeout(() => {
      reject(new Error('Backend startup timeout'));
    }, 30000);
  });
}

// ==============================
// IPC Handlers
// ==============================

// Get app info
ipcMain.handle('app:getInfo', () => ({
  version: app.getVersion(),
  platform: process.platform,
  dbPath,
  userDataPath,
  isDev,
}));

// Show save dialog
ipcMain.handle('dialog:showSave', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// Show open dialog
ipcMain.handle('dialog:showOpen', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Open external URL
ipcMain.handle('shell:openExternal', async (event, url) => {
  await shell.openExternal(url);
});

// Get database file path
ipcMain.handle('db:getPath', () => dbPath);

// Cloud sync: check remote templates availability
ipcMain.handle('cloud:checkRemote', async (event, url) => {
  try {
    const response = await fetch(url + '/api/health', { 
      method: 'HEAD',
      timeout: 5000 
    });
    return { available: response.ok, url };
  } catch {
    return { available: false, url };
  }
});

// ==============================
// App Lifecycle
// ==============================

app.whenReady().then(async () => {
  try {
    const backend = await startBackend();
    console.log('Backend started on port', backend.port);
    
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    dialog.showErrorBox('启动失败', `无法启动后端服务: ${error.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Security: prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
