/**
 * Playwright Global Setup
 * 
 * This runs once before all tests. Useful for:
 * - Starting services
 * - Setting up test databases
 * - Global authentication
 * 
 * Note: Database reset is handled by `pnpm test:reset-db` which runs before tests.
 */

async function globalSetup() {
  // Fix color environment variable conflicts
  // Remove FORCE_COLOR to prevent NO_COLOR warnings
  delete process.env.FORCE_COLOR;
  
  console.log('🎭 Playwright E2E Tests Starting...');
  console.log('📍 Base URL: http://localhost:3001');
  console.log('💡 Tip: Use ?multiuser=true for unique users per tab');
  console.log('');
}

export default globalSetup;
