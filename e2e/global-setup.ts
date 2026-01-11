/**
 * Playwright Global Setup
 * 
 * This runs once before all tests. Useful for:
 * - Starting services
 * - Setting up test databases
 * - Global authentication
 */

async function globalSetup() {
  console.log('🎭 Playwright E2E Tests Starting...');
  console.log('📍 Base URL: http://localhost:3001');
  console.log('💡 Tip: Use ?multiuser=true for unique users per tab');
  console.log('');
}

export default globalSetup;
