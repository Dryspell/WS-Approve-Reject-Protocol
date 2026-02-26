/**
 * Playwright Global Setup
 * 
 * Runs once before all tests to:
 * - Clear old test-logs for a clean screenshot set
 * - Reset test data in SpacetimeDB for clean test isolation
 * - Log test environment info
 */
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup() {
  delete process.env.FORCE_COLOR;
  
  console.log('🎭 Playwright E2E Tests Starting...');
  console.log('📍 Base URL: http://localhost:3001');
  console.log('');

  // Clear test-logs from previous runs
  const testLogsDir = path.resolve(__dirname, 'helpers', '..', '..', 'test-logs');
  const altLogsDir = path.resolve(__dirname, '..', 'test-logs');
  const logsDir = fs.existsSync(testLogsDir) ? testLogsDir : altLogsDir;

  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    console.log(`🧹 Clearing ${files.length} old test-log files...`);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(logsDir, file));
      } catch {
        // Ignore individual file deletion errors
      }
    }
  }

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
