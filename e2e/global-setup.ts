/**
 * Playwright Global Setup
 * 
 * Runs once before all tests to:
 * - Reset test data in SpacetimeDB for clean test isolation
 * - Log test environment info
 */
import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup() {
  delete process.env.FORCE_COLOR;
  
  console.log('🎭 Playwright E2E Tests Starting...');
  console.log('📍 Base URL: http://localhost:3001');
  console.log('');

  try {
    console.log('🧹 Resetting test data...');
    execSync('npx tsx scripts/reset-test-db.ts', {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      timeout: 15000,
    });
  } catch (err) {
    console.warn('⚠️  Could not reset test data (SpacetimeDB may be unavailable)');
    console.warn('   Tests will run with existing data');
  }
  
  console.log('');
}

export default globalSetup;
