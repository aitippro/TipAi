/**
 * Electron Test Fixture for Playwright
 *
 * Provides helpers to launch TipAi Electron app in test mode.
 *
 * Usage:
 *   import { test, expect } from './fixtures/electron';
 *
 *   test('my test', async ({ electronApp, page }) => {
 *     await page.click('text=生成');
 *     await expect(page.locator('.result')).toBeVisible();
 *   });
 */

import { test as base, _electron as electron } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ElectronApplication, Page } from '@playwright/test';

// ── Types ───────────────────────────────────────────────────

interface ElectronFixtures {
  electronApp: ElectronApplication;
  page: Page;
}

// ── Helpers ─────────────────────────────────────────────────

function getElectronPath(): string {
  const possiblePaths = [
    // Windows (electron from npm)
    path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron.exe'),
    // macOS
    path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron'),
    // Linux
    path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  // Fallback: try to find via npm bin
  try {
    const { execSync } = require('child_process');
    return execSync('npx electron --print-path', { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('Electron binary not found. Run: npm install electron');
  }
}

function getMainEntryPath(): string {
  const possiblePaths = [
    path.join(process.cwd(), 'electron', 'main.cjs'),
    path.join(process.cwd(), 'electron', 'main.js'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error('Electron main entry not found at electron/main.cjs');
}

// ── Test Fixture ────────────────────────────────────────────

export const test = base.extend<ElectronFixtures>({
  // Launch Electron app before each test file
  electronApp: [
    async ({}, use, testInfo) => {
      const isDev = process.env.TEST_MODE === 'dev';
      const dataDir = path.join(process.cwd(), 'e2e-results', 'test-data', `session-${testInfo.workerIndex}`);

      // Ensure clean data dir for each test worker
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true });
      }
      fs.mkdirSync(dataDir, { recursive: true });

      const electronPath = getElectronPath();
      const mainPath = getMainEntryPath();

      const app = await electron.launch({
        executablePath: electronPath,
        args: isDev
          ? [mainPath, '--dev'] // Dev mode: loads localhost:5173
          : [mainPath],         // Prod mode: loads built dist/
        env: {
          ...process.env,
          NODE_ENV: 'production',
          TEST_MODE: '1',
          // Use isolated data dir so tests don't pollute real user data
          TIPAI_TEST_DATA_DIR: dataDir,
        },
        // Record video for debugging
        recordVideo: {
          dir: path.join(process.cwd(), 'e2e-results', 'videos', `worker-${testInfo.workerIndex}`),
          size: { width: 1280, height: 800 },
        },
      });

      await use(app);

      // Cleanup after test
      await app.close();
    },
    { scope: 'worker' }, // One app instance per worker (sequential tests share it)
  ],

  // Provide the first (main) window page
  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();

    // Wait for app to be ready
    await page.waitForLoadState('domcontentloaded');

    // In dev mode, wait for Vite dev server to be ready
    if (process.env.TEST_MODE === 'dev') {
      await page.waitForTimeout(2000); // Give Vite time to HMR
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
