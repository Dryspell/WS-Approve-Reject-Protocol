import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Each test runs in an isolated browser context with separate storage,
 * which naturally gives each "player" a unique identity.
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  // Global setup runs once before all tests
  globalSetup: './e2e/global-setup.ts',
  
  // Run tests in parallel - each test gets isolated browser context
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests - always disabled for now (faster debugging)
  retries: 0,
  
  // Workers: Use single worker to avoid test interference with shared SpacetimeDB
  // (All tests share the same database, so parallel tests can cause race conditions)
  workers: 1,
  
  // Reporter configuration - quieter output for faster feedback
  reporter: process.env.CI 
    ? [['list'], ['html', { open: 'never' }]]
    : [['line']],  // Minimal output for local dev
  
  // Shared settings for all tests
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3001',
    
    // Only collect trace on CI (saves time locally)
    trace: process.env.CI ? 'on-first-retry' : 'off',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Only record video on CI (saves time locally)
    video: process.env.CI ? 'retain-on-failure' : 'off',
    
    // Default timeout for actions (reduced for faster failure detection)
    actionTimeout: 8000,
    
    // Disable animations for faster tests
    reducedMotion: 'reduce',
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-gpu', '--disable-dev-shm-usage'],
        },
      },
    },
    {
      name: 'headed-simulation',
      testMatch: /full-game-simulation/,
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        video: 'on',
        launchOptions: {
          slowMo: 500,
        },
        actionTimeout: 15000,
      },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true, // Always reuse if already running
    timeout: 120000,
    // Suppress noisy output
    stdout: 'pipe',
    stderr: 'pipe',
  },
  
  // Global test timeout (reduced for faster failure detection)
  timeout: 30000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 8000,
  },
  
  // Quiet mode - suppress warnings about env vars
  quiet: true,
});
