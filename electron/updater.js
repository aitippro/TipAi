const { autoUpdater } = require('electron-updater');
const { ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ==============================
// Auto Updater Module
// TipAi Desktop - Windows Auto Update
// ==============================

let mainWindow = null;
let updateDownloaded = false;
let updateInfo = null;

// GitHub Releases 配置（预留）
// 实际发布时，在 GitHub 创建 Release 并上传 .exe 和 .yml 文件
const DEFAULT_PUBLISH_CONFIG = {
  provider: 'github',
  owner: 'your-github-username',      // ← 替换为实际 GitHub 用户名
  repo: 'tipai-desktop',                // ← 替换为实际仓库名
  releaseType: 'release',
};

// 开发环境模拟配置（仅在开发时用于测试）
const DEV_UPDATE_URL = process.env.DEV_UPDATE_URL || null;

function initUpdater(window) {
  mainWindow = window;

  // 配置更新服务器
  const publishConfig = getPublishConfig();
  autoUpdater.setFeedURL({
    provider: publishConfig.provider,
    owner: publishConfig.owner,
    repo: publishConfig.repo,
    releaseType: publishConfig.releaseType,
    private: false,
    token: process.env.GH_TOKEN || undefined, // GitHub Token（私有仓库需要）
  });

  // 开发环境：允许测试更新（需设置 DEV_UPDATE_URL）
  if (DEV_UPDATE_URL) {
    autoUpdater.setFeedURL({ provider: 'generic', url: DEV_UPDATE_URL });
  }

  // 日志级别（开发时 helpful）
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'info';

  // ========== 事件监听 ==========

  // 检查更新出错
  autoUpdater.on('error', (error) => {
    sendToRenderer('updater:error', {
      message: error.message,
      stack: error.stack,
    });
  });

  // 发现可用更新
  autoUpdater.on('update-available', (info) => {
    updateInfo = info;
    updateDownloaded = false;
    sendToRenderer('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes || '',
    });

    // 弹窗提示用户
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: '发现新版本',
        message: `TipAi ${info.version} 已发布`,
        detail: info.releaseNotes || '点击"下载"开始更新，或稍后从菜单手动更新。',
        buttons: ['立即下载', '稍后再说'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  // 没有可用更新
  autoUpdater.on('update-not-available', (info) => {
    sendToRenderer('updater:not-available', { version: info.version });
  });

  // 下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    sendToRenderer('updater:progress', {
      percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond,
    });
  });

  // 更新下载完成
  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true;
    sendToRenderer('updater:downloaded', {
      version: info.version,
      releaseDate: info.releaseDate,
    });

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: '更新已就绪',
        message: `TipAi ${info.version} 已下载完成`,
        detail: '重启应用以完成安装。',
        buttons: ['立即重启', '稍后手动重启'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true); // 静默安装，重启
        }
      });
  });

  // ========== IPC 处理器 ==========

  // 手动检查更新
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo || null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 手动下载更新
  ipcMain.handle('updater:download', async () => {
    try {
      if (!updateInfo) {
        return { success: false, error: '没有可用的更新' };
      }
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 立即安装（下载完成后）
  ipcMain.handle('updater:install', async () => {
    try {
      if (!updateDownloaded) {
        return { success: false, error: '没有已下载的更新' };
      }
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 获取当前版本信息
  ipcMain.handle('updater:info', () => ({
    currentVersion: autoUpdater.currentVersion?.version || require('../package.json').version,
    publishConfig,
    updateDownloaded,
    updateInfo,
  }));

  // 设置自动检查（启动后 10 秒检查一次，之后每 4 小时）
  if (!isDev()) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 10000);

    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 4 * 60 * 60 * 1000); // 4 小时
  }
}

// ========== 辅助函数 ==========

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function isDev() {
  return process.env.NODE_ENV === 'development' || require('electron').app?.isPackaged === false;
}

function getPublishConfig() {
  // 从 package.json 读取 publish 配置，或返回默认
  try {
    const pkg = require('../package.json');
    if (pkg.build?.publish) {
      return Array.isArray(pkg.build.publish) ? pkg.build.publish[0] : pkg.build.publish;
    }
  } catch {
    // fallback
  }
  return DEFAULT_PUBLISH_CONFIG;
}

// 构建应用菜单的“检查更新”项
function getUpdateMenuItems() {
  return [
    {
      label: '检查更新...',
      click: () => {
        autoUpdater.checkForUpdates().catch((err) => {
          dialog.showErrorBox('检查更新失败', err.message);
        });
      },
    },
    {
      label: '下载更新',
      enabled: updateInfo !== null && !updateDownloaded,
      click: () => {
        autoUpdater.downloadUpdate().catch((err) => {
          dialog.showErrorBox('下载更新失败', err.message);
        });
      },
    },
    {
      label: '立即安装更新',
      enabled: updateDownloaded,
      click: () => {
        autoUpdater.quitAndInstall(false, true);
      },
    },
    { type: 'separator' },
    {
      label: '查看 Release 页面',
      click: () => {
        const cfg = getPublishConfig();
        const url = `https://github.com/${cfg.owner}/${cfg.repo}/releases`;
        shell.openExternal(url);
      },
    },
  ];
}

module.exports = {
  initUpdater,
  getUpdateMenuItems,
  autoUpdater,
};
