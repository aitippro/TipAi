const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { initUpdater, getUpdateMenuItems } = require('./updater.cjs');

const isDev = !app.isPackaged;
const appDir = isDev ? __dirname : path.dirname(app.getPath('exe'));
const dataDir = path.join(appDir, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'tipai.db');
const LOG_FILE = path.join(dataDir, 'tipai.log');
const EXPORT_DIR = path.join(dataDir, 'exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

let mainWindow;
let backendPort = 0;
let backendReady = false;
let backendServer = null;

// IPC mode: API calls go through IPC, NOT HTTP port
let honoApp = null;
let backendBaseUrl = '';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
  if (isDev) console.log(msg);
}

function logError(msg, err) {
  log(`ERROR: ${msg}${err ? ' — ' + (err.stack || err.message || err) : ''}`);
  console.error(msg, err || '');
}

function createWindow() {
  const isMacOS = process.platform === 'darwin';
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
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
    mainWindow.loadURL(`http://localhost:${backendPort}`);
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// Start backend — in dev Vite handles everything; in prod we load Hono in-process
async function startBackend() {
  process.env.NODE_ENV = isDev ? 'development' : 'production';
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.APP_ID = process.env.APP_ID || 'tipai-desktop';
  process.env.APP_SECRET = process.env.APP_SECRET || 'tipai-desktop-secret';
  process.env.APP_URL = 'http://localhost:0';

  if (isDev) {
    backendBaseUrl = 'http://localhost:5173';
    process.env.VITE_DEV_SERVER_URL = backendBaseUrl;
    backendReady = true;
    return;
  }

  // Production: load Hono app in-process for IPC-based API calls
  process.env.TIPAI_ELECTRON = '1';

  const bootPath = path.join(__dirname, '../dist/boot.js');
  const bootUrl = pathToFileURL(bootPath).href;

  const [{ serve }, mod] = await Promise.all([
    import('@hono/node-server'),
    import(bootUrl),
  ]);

  honoApp = mod.default;
  mod.serveStaticFiles(honoApp);

  return new Promise((resolve, reject) => {
    const server = serve({ fetch: honoApp.fetch, port: 0, hostname: '127.0.0.1' }, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        backendPort = addr.port;
        backendBaseUrl = `http://localhost:${backendPort}`;
        process.env.PORT = String(backendPort);
        process.env.APP_URL = backendBaseUrl;
        backendReady = true;
        backendServer = server;
        log(`Backend started on port ${backendPort} (IPC mode)`);
        resolve();
      } else {
        reject(new Error('Could not determine port'));
      }
    });
    server.on('error', reject);
    setTimeout(() => reject(new Error('Backend startup timeout')), 30000);
  });
}

// ── IPC Handlers ────────────────────────────────────────────

// api:fetch — core IPC channel for all tRPC calls
// In production: calls Hono app in-process (NO HTTP port for API)
// In dev: forwards to Vite dev server (which proxies to Hono via @hono/vite-dev-server)
ipcMain.handle('api:fetch', async (_e, { path: reqPath, method, headers, body }) => {
  try {
    if (honoApp) {
      // Production: direct in-process call, no HTTP round-trip
      const url = new URL(reqPath, 'http://localhost');
      const req = new Request(url, {
        method: method || 'GET',
        headers: new Headers(headers || {}),
        body: body || undefined,
      });
      const res = await honoApp.fetch(req);
      const resBody = await res.text();
      const resHeaders = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      return { status: res.status, statusText: res.statusText, headers: resHeaders, body: resBody };
    }

    // Dev mode: forward to Vite dev server
    const res = await fetch(`${backendBaseUrl}${reqPath}`, {
      method: method || 'GET',
      headers: headers || {},
      body: body || undefined,
    });
    const resBody = await res.text();
    const resHeaders = {};
    res.headers.forEach((v, k) => { resHeaders[k] = v; });
    return { status: res.status, statusText: res.statusText, headers: resHeaders, body: resBody };
  } catch (err) {
    logError('api:fetch error', err);
    return { status: 500, statusText: 'Internal Server Error', headers: {}, body: JSON.stringify({ error: err.message }) };
  }
});

ipcMain.handle('app:getInfo', () => ({
  version: app.getVersion(), platform: process.platform,
  dbPath, dataDir, isDev,
}));
ipcMain.handle('dialog:showSave', async (_e, opts) => dialog.showSaveDialog(mainWindow, opts));
ipcMain.handle('dialog:showOpen', async (_e, opts) => dialog.showOpenDialog(mainWindow, opts));
ipcMain.handle('shell:openExternal', async (_e, url) => shell.openExternal(url));
ipcMain.handle('db:getPath', () => dbPath);

function createApplicationMenu() {
  const isMacOS = process.platform === 'darwin';
  const updateItems = getUpdateMenuItems();
  const template = [
    ...(isMacOS ? [{ label: app.getName(), submenu: [
      { role: 'about' }, { type: 'separator' }, ...updateItems, { type: 'separator' },
      { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' },
      { role: 'unhide' }, { type: 'separator' }, { role: 'quit' },
    ]}] : []),
    { label: '文件', submenu: [{ role: 'close', label: '关闭' }] },
    { label: '编辑', submenu: [
      { role: 'undo', label: '撤销' }, { role: 'redo', label: '重做' }, { type: 'separator' },
      { role: 'cut', label: '剪切' }, { role: 'copy', label: '复制' }, { role: 'paste', label: '粘贴' },
    ]},
    { label: '帮助', submenu: [
      { label: 'TipAi 官网', click: () => shell.openExternal('https://github.com/aitippro/TipAi') },
    ]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  log('Starting...');
  try {
    await startBackend();
    createWindow();
    initUpdater(mainWindow);
    createApplicationMenu();
    log('Ready');
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  } catch (err) {
    logError('Failed to start', err);
    dialog.showErrorBox('启动失败', `${err.message}\n\n日志: ${LOG_FILE}`);
    app.quit();
  }
});

// Prevent multiple instances on Windows
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Clean shutdown — close backend server on quit
app.on('before-quit', () => {
  if (backendServer?.close) {
    backendServer.close();
    backendServer = null;
  }
});
app.on('window-all-closed', () => { app.quit(); process.exit(0); });
app.on('web-contents-created', (_e, contents) => {
  contents.on('new-window', (e, url) => { e.preventDefault(); shell.openExternal(url); });
});
process.on('uncaughtException', (err) => {
  logError('Uncaught', err);
  dialog.showErrorBox('程序错误', `${err.message}\n\n日志: ${LOG_FILE}`);
});
