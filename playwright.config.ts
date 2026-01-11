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
  
  // Retry failed tests (useful for flaky network tests)
  retries: process.env.CI ? 2 : 0,
  
  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  
  // Shared settings for all tests
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3001',
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Default timeout for actions
    actionTimeout: 10000,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on more browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  // Global test timeout
  timeout: 60000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },
});
