import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright E2E Test Configuration for TipAi Desktop (Electron)
 *
 * Run tests:
 *   npx playwright test              # headless
 *   npx playwright test --headed     # with UI visible
 *   npx playwright test --ui         # interactive UI mode
 *
 * Debug:
 *   npx playwright test --debug
 */

export default defineConfig({
  testDir: './e2e/tests',

  /* Run tests in files in parallel */
  fullyParallel: false, // Electron tests should be sequential (single app instance)

  /* Fail the build on CI if you accidentally left test.only */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: 1, // Electron app is single-instance

  /* Reporter */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e-results/html-report' }],
    ['json', { outputFile: 'e2e-results/results.json' }],
  ],

  /* Shared settings for all projects */
  use: {
    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'on-first-retry',

    /* Trace on first retry */
    trace: 'on-first-retry',

    /* Base timeout for actions */
    actionTimeout: 10000,

    /* Navigation timeout */
    navigationTimeout: 15000,
  },

  /* Configure projects */
  projects: [
    {
      name: 'electron',
      use: {
        // Electron-specific settings
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  /* Run local dev server before starting the tests (optional) */
  webServer: process.env.TEST_MODE === 'dev'
    ? {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      }
    : undefined,

  /* Output directory for test artifacts */
  outputDir: 'e2e-results/test-output',

  /* Global setup / teardown */
  globalSetup: path.join(__dirname, 'e2e/fixtures/global-setup.ts'),
  globalTeardown: path.join(__dirname, 'e2e/fixtures/global-teardown.ts'),
});
