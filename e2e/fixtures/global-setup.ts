import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Global Setup — runs once before all test suites
 *
 * 1. Ensures build artifacts exist (for production test mode)
 * 2. Creates clean test data directory
 * 3. Verifies Electron binary exists
 */
async function globalSetup() {
  const projectRoot = path.resolve(__dirname, '../..');
  const dataDir = path.join(projectRoot, 'e2e-results', 'test-data');

  // Clean and create test data directory
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true });
  }
  fs.mkdirSync(dataDir, { recursive: true });

  // Verify Electron binary exists
  const electronPath = path.join(projectRoot, 'node_modules', '.bin', 'electron');
  const electronExe = path.join(
    projectRoot,
    'node_modules',
    'electron',
    'dist',
    'electron.exe'
  );

  if (!fs.existsSync(electronExe)) {
    console.warn(`⚠️ Electron binary not found at ${electronExe}`);
    console.warn('   Run: npm install electron');
  }

  // If testing production build, ensure dist/ exists
  if (process.env.TEST_MODE !== 'dev') {
    const distPath = path.join(projectRoot, 'dist');
    if (!fs.existsSync(distPath)) {
      console.log('📦 Building production assets...');
      execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
    }
  }

  console.log('✅ Global setup complete');
}

export default globalSetup;
