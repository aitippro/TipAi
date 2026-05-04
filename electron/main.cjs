const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { initUpdater, getUpdateMenuItems } = require('./updater.cjs');

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
// Portable mode: all app data lives next to the .exe
const userDataPath = isDev
  ? path.join(__dirname, '..', 'TipAi-data')
  : path.join(path.dirname(process.execPath), 'TipAi-data');
process.env.USER_DATA_PATH = userDataPath;
const dataDir = path.join(userDataPath, 'data');
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

// Native Addon (Rust core) — replaces better-sqlite3 for DB + AI calls
let nativeAddon = null;
try {
  if (isDev || !app.isPackaged) {
    nativeAddon = require('../native');
  } else {
    const nativePath = path.join(path.dirname(process.execPath), 'resources/native/tipai_core.node');
    nativeAddon = require(nativePath);
  }
  log(`Native addon loaded: v${nativeAddon.version()}`);
} catch (err) {
  logError('Failed to load native addon, falling back to JS', err);
}

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
    mainWindow.loadURL(`http://localhost:${process.env.VITE_DEV_PORT || '5173'}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/public/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const prefix = '[RENDERER]';
    if (level === 3) logError(`${prefix} ${message}`);
    else log(`${prefix} ${message}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// Run SQL migrations — prefer Native Addon, fallback to better-sqlite3
function runMigrations(dbPath, migrationsDir) {
  if (nativeAddon) {
    try {
      nativeAddon.dbOpen(dbPath, process.env.API_KEY_SECRET || null);
      nativeAddon.dbMigrate(migrationsDir);
      log('Migrations completed via Native Addon');
      return;
    } catch (err) {
      logError('Native Addon migration failed, falling back to better-sqlite3', err);
    }
  }

  // Fallback: better-sqlite3
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      appliedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  if (!fs.existsSync(migrationsDir)) {
    db.close();
    return;
  }

  const appliedRows = db.prepare('SELECT filename FROM __migrations').all();
  const applied = new Set(appliedRows.map(r => r.filename));

  const pending = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .filter(f => !applied.has(f));

  const insert = db.prepare('INSERT INTO __migrations (filename) VALUES (?)');

  for (const filename of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8');
    const runMigration = db.transaction(() => {
      db.exec(sql);
      insert.run(filename);
    });
    runMigration();
    log(`Applied migration: ${filename}`);
  }

  db.close();
}

// Start backend — in dev Vite handles everything; in prod we load Hono in-process
async function startBackend() {
  process.env.NODE_ENV = isDev ? 'development' : 'production';
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.APP_ID = process.env.APP_ID || 'tipai-desktop';
  process.env.APP_URL = 'http://localhost:0';

  // Ensure persistent API_KEY_SECRET so encrypted API keys survive app restarts
  if (!process.env.API_KEY_SECRET) {
    const keyFile = path.join(dataDir, '.key');
    if (fs.existsSync(keyFile)) {
      process.env.API_KEY_SECRET = fs.readFileSync(keyFile, 'utf-8').trim();
    } else {
      const { randomBytes } = require('crypto');
      const key = randomBytes(32).toString('hex');
      fs.writeFileSync(keyFile, key, { mode: 0o600 });
      process.env.API_KEY_SECRET = key;
    }
  }

  // Open database via Native Addon (dev + prod)
  if (nativeAddon) {
    try {
      nativeAddon.dbOpen(dbPath, process.env.API_KEY_SECRET);
      log(`Native DB opened: ${dbPath}`);
    } catch (err) {
      logError('Native dbOpen failed', err);
    }
  }

  if (isDev) {
    backendBaseUrl = 'http://localhost:5173';
    process.env.VITE_DEV_SERVER_URL = backendBaseUrl;
    backendReady = true;
    return;
  }

  // Production: load Hono app in-process for IPC-based API calls (no HTTP server)
  process.env.TIPAI_ELECTRON = '1';

  // Ensure database tables exist before starting backend
  const migrationsDir = isDev
    ? path.join(__dirname, '../db/migrations')
    : path.join(path.dirname(app.getPath('exe')), 'resources', 'db', 'migrations');
  runMigrations(dbPath, migrationsDir);

  const bootPath = path.join(__dirname, '../dist/boot.js');
  const bootUrl = pathToFileURL(bootPath).href;

  const mod = await import(bootUrl);

  honoApp = mod.default;
  backendReady = true;
  log('Backend loaded in-process (IPC mode, no HTTP port)');
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

// ── Native Addon IPC Handlers ───────────────────────────────
// Expose Rust core functions directly to renderer via IPC

ipcMain.handle('native:version', () => nativeAddon ? nativeAddon.version() : 'js-only');

ipcMain.handle('native:userFindByUnionId', (_e, unionId) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.userFindByUnionId(unionId);
});

ipcMain.handle('native:userUpsert', (_e, data) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.userUpsert(data);
});

ipcMain.handle('native:settingsGet', (_e, userId) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.settingsGet(userId);
});

ipcMain.handle('native:settingsUpdate', (_e, userId, data) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.settingsUpdate(userId, data);
});

ipcMain.handle('native:settingsGetApiKey', (_e, userId, provider) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.settingsGetApiKey(userId, provider);
});

ipcMain.handle('native:promptList', (_e, userId, opts) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.promptList(userId, opts);
});

ipcMain.handle('native:promptCreate', (_e, data) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.promptCreate(data);
});

ipcMain.handle('native:templateListPublic', () => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.templateListPublic();
});

ipcMain.handle('native:templateListByUser', (_e, userId) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.templateListByUser(userId);
});

ipcMain.handle('native:projectList', (_e, userId) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.projectList(userId);
});

ipcMain.handle('native:projectCreate', (_e, data) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.projectCreate(data);
});

ipcMain.handle('native:stepList', (_e, projectId) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.stepList(projectId);
});

ipcMain.handle('native:stepUpdate', (_e, id, data) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.stepUpdate(id, data);
});

// AI calls (async — non-blocking)
ipcMain.handle('native:aiCall', async (_e, req) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.aiCall(req);
});

ipcMain.handle('native:aiCallSelfConsistency', async (_e, req, sampleCount) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.aiCallSelfConsistency(req, sampleCount);
});

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
    // Clear HTTP cache on every start to prevent stale Vite chunks after rebuilds
    const defaultSession = require('electron').session.defaultSession;
    await defaultSession.clearCache();
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

// Clean shutdown — close backend server + native DB on quit
app.on('before-quit', () => {
  if (backendServer?.close) {
    backendServer.close();
    backendServer = null;
  }
  if (nativeAddon) {
    try { nativeAddon.dbClose(); log('Native DB closed'); } catch (e) {}
  }
});
app.on('window-all-closed', () => { app.quit(); });
app.on('web-contents-created', (_e, contents) => {
  contents.on('new-window', (e, url) => { e.preventDefault(); shell.openExternal(url); });
});
process.on('uncaughtException', (err) => {
  logError('Uncaught', err);
  dialog.showErrorBox('程序错误', `${err.message}\n\n日志: ${LOG_FILE}`);
});
