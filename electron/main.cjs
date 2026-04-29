const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { initUpdater, getUpdateMenuItems } = require('./updater.cjs');

// ==============================
// Electron Main Process
// TipAi Desktop App
// ==============================

const isDev = !app.isPackaged;
// Portable mode: store everything in app directory
const appDir = isDev ? __dirname : path.dirname(app.getPath('exe'));
const dataDir = path.join(appDir, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'tipai.db');
const BACKEND_PORT = parseInt(process.env.PORT || '3000');
const LOG_FILE = path.join(dataDir, 'tipai.log');
const EXPORT_DIR = path.join(dataDir, 'exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

// Crash logging
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
  if (isDev) console.log(msg);
}
function logError(msg, err) {
  log(`ERROR: ${msg}${err ? ' — ' + (err.stack || err.message || err) : ''}`);
  console.error(msg, err || '');
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let mainWindow;

function createWindow() {
  const isMacOS = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: isMacOS ? 'hiddenInset' : 'default',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: isMacOS ? '#00000000' : '#fafafa',
    vibrancy: isMacOS ? 'sidebar' : undefined,
    transparent: isMacOS,
    frame: !isMacOS,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://localhost:${BACKEND_PORT}`);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start backend in-process: set env, import ESM module (it auto-starts server)
async function startBackend() {
  process.env.NODE_ENV = isDev ? 'development' : 'production';
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.APP_ID = process.env.APP_ID || 'tipai-desktop';
  process.env.APP_SECRET = process.env.APP_SECRET || 'tipai-desktop-secret';
  process.env.APP_URL = `http://localhost:${BACKEND_PORT}`;
  process.env.PORT = String(BACKEND_PORT);

  if (isDev) {
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
    return;
  }

  // Dynamic import ESM from CJS — boot.js auto-starts Hono server
  const bootPath = path.join(__dirname, '../dist/boot.js');
  const bootUrl = pathToFileURL(bootPath).href;
  await import(bootUrl);
}

// ==============================
// IPC Handlers
// ==============================

ipcMain.handle('app:getInfo', () => ({
  version: app.getVersion(),
  platform: process.platform,
  dbPath,
  dataDir,
  isDev,
}));

ipcMain.handle('dialog:showSave', async (_event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('dialog:showOpen', async (_event, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('shell:openExternal', async (_event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle('db:getPath', () => dbPath);

ipcMain.handle('cloud:checkRemote', async (_event, url) => {
  try {
    const response = await fetch(url + '/api/health', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return { available: response.ok, url };
  } catch {
    return { available: false, url };
  }
});

// ==============================
// Application Menu
// ==============================

function createApplicationMenu() {
  const isMacOS = process.platform === 'darwin';
  const updateItems = getUpdateMenuItems();

  const template = [
    ...(isMacOS
      ? [{
          label: app.getName(),
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            ...updateItems,
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        }]
      : []),
    { label: '文件', submenu: [{ role: 'close', label: '关闭' }] },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' }, { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' }, { role: 'copy', label: '复制' }, { role: 'paste', label: '粘贴' },
        ...(isMacOS
          ? [{ role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' },
             { type: 'separator' }, { label: '语音', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }]
          : [{ role: 'delete', label: '删除' }, { type: 'separator' }, { role: 'selectAll', label: '全选' }]),
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' }, { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' }, { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' }, { role: 'zoomIn', label: '放大' }, { role: 'zoomOut', label: '缩小' },
        { type: 'separator' }, { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' }, { role: 'zoom', label: '缩放' },
        ...(isMacOS
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close', label: '关闭' }]),
      ],
    },
    {
      label: '帮助',
      submenu: [
        ...(!isMacOS ? updateItems : []),
        ...(!isMacOS ? [{ type: 'separator' }] : []),
        { label: 'TipAi 官网', click: () => shell.openExternal('https://github.com/aitippro/TipAi') },
        { label: '查看日志', click: () => shell.openPath(app.getPath('logs')) },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ==============================
// App Lifecycle
// ==============================

app.whenReady().then(async () => {
  log('App starting...');
  try {
    await startBackend();
    log('Backend started');
    createWindow();
    initUpdater(mainWindow);
    createApplicationMenu();
    log('App ready');

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    logError('Failed to start', error);
    dialog.showErrorBox('启动失败', `${error.message}\n\n详细日志: ${LOG_FILE}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (_event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Catch-all for uncaught errors
process.on('uncaughtException', (error) => {
  logError('Uncaught exception', error);
  dialog.showErrorBox('程序错误', `${error.message}\n\n日志已保存到: ${LOG_FILE}`);
});

process.on('unhandledRejection', (reason) => {
  logError('Unhandled rejection', reason instanceof Error ? reason : new Error(String(reason)));
});
