const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL, fileURLToPath } = require('url');
const { initUpdater, getUpdateMenuItems } = require('./updater.cjs');

// ==============================
// TipAi Desktop — IPC Architecture
// No HTTP port needed in production
// ==============================

const isDev = !app.isPackaged;
const appDir = isDev ? __dirname : path.dirname(app.getPath('exe'));
const dataDir = path.join(appDir, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'tipai.db');
const LOG_FILE = path.join(dataDir, 'tipai.log');
const EXPORT_DIR = path.join(dataDir, 'exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

let mainWindow;
let honoApp = null;

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
    mainWindow.loadFile(path.join(__dirname, '../dist/public/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// IPC: Handle all API requests — replaces HTTP server
ipcMain.handle('api:fetch', async (_event, reqData) => {
  if (!honoApp) return { status: 503, body: 'Backend not ready' };
  try {
    const url = `http://localhost${reqData.path}`;
    const req = new Request(url, {
      method: reqData.method || 'GET',
      headers: new Headers(reqData.headers || {}),
      body: reqData.body ? reqData.body : undefined,
    });
    const res = await honoApp.fetch(req);
    const body = await res.text();
    return {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body,
    };
  } catch (err) {
    logError('IPC api error', err);
    return { status: 500, body: String(err) };
  }
});

// Start backend — import Hono app, DO NOT start HTTP server
async function startBackend() {
  process.env.NODE_ENV = isDev ? 'development' : 'production';
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.APP_ID = process.env.APP_ID || 'tipai-desktop';
  process.env.APP_SECRET = process.env.APP_SECRET || 'tipai-desktop-secret';
  process.env.APP_URL = 'http://localhost:0';
  process.env.TIPAI_IPC_MODE = '1'; // Signal boot.ts: no HTTP server needed

  if (isDev) {
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
    return;
  }

  const bootPath = path.join(__dirname, '../dist/boot.js');
  const bootUrl = pathToFileURL(bootPath).href;
  const mod = await import(bootUrl);
  honoApp = mod.default;
  log('Backend ready (IPC mode — no port)');
}

// IPC handlers
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
      ...(isMacOS ? [{ role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' },
        { type: 'separator' }, { label: '语音', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }]
        : [{ role: 'delete', label: '删除' }, { type: 'separator' }, { role: 'selectAll', label: '全选' }]),
    ]},
    { label: '视图', submenu: [
      { role: 'reload', label: '重新加载' }, { role: 'forceReload', label: '强制重新加载' },
      { role: 'toggleDevTools', label: '开发者工具' }, { type: 'separator' },
      { role: 'resetZoom', label: '实际大小' }, { role: 'zoomIn', label: '放大' },
      { role: 'zoomOut', label: '缩小' }, { type: 'separator' }, { role: 'togglefullscreen', label: '全屏' },
    ]},
    { label: '窗口', submenu: [
      { role: 'minimize', label: '最小化' }, { role: 'zoom', label: '缩放' },
      ...(isMacOS ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
        : [{ role: 'close', label: '关闭' }]),
    ]},
    { label: '帮助', submenu: [
      ...(!isMacOS ? updateItems : []), ...(!isMacOS ? [{ type: 'separator' }] : []),
      { label: 'TipAi 官网', click: () => shell.openExternal('https://github.com/aitippro/TipAi') },
      { label: '查看日志', click: () => shell.openPath(app.getPath('logs')) },
    ]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ==============================
app.whenReady().then(async () => {
  log('Starting...');
  try {
    await startBackend();
    createWindow();
    initUpdater(mainWindow);
    createApplicationMenu();
    log('Ready (IPC mode)');
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  } catch (err) {
    logError('Failed to start', err);
    dialog.showErrorBox('启动失败', `${err.message}\n\n日志: ${LOG_FILE}`);
    app.quit();
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
