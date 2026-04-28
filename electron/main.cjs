const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');
const os = require('os');
const { initUpdater, getUpdateMenuItems } = require('./updater.cjs');

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
      preload: path.join(__dirname, 'preload.cjs'),
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

  // Production: start backend using fork (uses Electron's embedded Node)
  const backendPath = path.join(__dirname, '../dist/boot.js');

  return new Promise((resolve, reject) => {
    backendProcess = fork(backendPath, [], {
      env,
      silent: true,
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
// Application Menu (含自动更新菜单)
// ==============================

function createApplicationMenu() {
  const isMacOS = process.platform === 'darwin';
  const updateItems = getUpdateMenuItems();

  const template = [
    ...(isMacOS
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              ...updateItems,
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: '文件',
      submenu: [
        { role: 'close', label: '关闭' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        ...(isMacOS
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: '语音',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
              },
            ]
          : [{ role: 'delete', label: '删除' }, { type: 'separator' }, { role: 'selectAll', label: '全选' }]),
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        ...(isMacOS
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close', label: '关闭' }]),
      ],
    },
    {
      label: '帮助',
      submenu: [
        ...(!isMacOS ? updateItems : []),
        ...(!isMacOS ? [{ type: 'separator' }] : []),
        {
          label: 'TipAi 官网',
          click: () => shell.openExternal('https://github.com/your-github-username/tipai-desktop'),
        },
        {
          label: '查看日志',
          click: () => shell.openPath(app.getPath('logs')),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ==============================
// App Lifecycle
// ==============================

app.whenReady().then(async () => {
  try {
    const backend = await startBackend();
    console.log('Backend started on port', backend.port);
    
    createWindow();
    
    // 初始化自动更新
    initUpdater(mainWindow);
    
    // 创建应用菜单（包含更新相关菜单项）
    createApplicationMenu();

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
