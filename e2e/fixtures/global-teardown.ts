import fs from 'fs';
import path from 'path';

/**
 * Global Teardown — runs once after all test suites
 *
 * Cleanup temporary test artifacts if CLEANUP_E2E env is set
 */
async function globalTeardown() {
  if (process.env.CLEANUP_E2E) {
    const dataDir = path.resolve(__dirname, '../../e2e-results/test-data');
    if (fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true });
      console.log('🧹 Cleaned up test data');
    }
  }

  console.log('✅ Global teardown complete');
}

export default globalTeardown;
