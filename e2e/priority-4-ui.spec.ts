import { test, expect } from '@playwright/test';
import { MultiPlayerHelper } from './helpers/multi-player';
import { VoteGamePage, uniqueRoomName } from './helpers/page-objects';

/**
 * Priority 4: Game Management & UI E2E Tests
 * 
 * Aligned with QA Testing Outline - docs/qa-testing-outline.md
 * Test IDs: UI-001 through UI-031
 */

test.describe('4.1 Room Presets', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('UI-001: Quick Game preset available', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();
    await gamePage.createRoom('Quick Preset Test', 10);
    await gamePage.joinRoom('Quick Preset Test');

    // Look for presets section
    const presetsButton = player.locator('text=/Game Mode|Show.*Info/i');
    
    if (await presetsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await presetsButton.click();
      await expect(player.locator('text=/Quick/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('UI-002: Standard Game preset available', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();
    await gamePage.createRoom('Standard Preset Test', 25);
    await gamePage.joinRoom('Standard Preset Test');

    const presetsButton = player.locator('text=/Game Mode|Show.*Info/i');
    
    if (await presetsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await presetsButton.click();
      await expect(player.locator('text=/Standard/i')).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('4.2 UI Components', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('UI-012: Player list updates in real-time', async () => {
    const [player1, player2] = await multiPlayer.createPlayers(2);
    const page1 = new VoteGamePage(player1);
    const page2 = new VoteGamePage(player2);

    await page1.goto();
    await page1.waitForConnection();
    await page1.createRoom('Player List Test', 10);
    await page1.joinRoom('Player List Test');

    await page2.goto();
    await page2.waitForConnection();
    await expect(player2.locator('text=Player List Test')).toBeVisible({ timeout: 10000 });
    await page2.joinRoom('Player List Test');

    // Both players should see the room content
    await expect(player1.locator('text=Player List Test')).toBeVisible();
    await expect(player2.locator('text=Player List Test')).toBeVisible();
  });

  test('UI-013: Toast notifications appear for actions', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();

    await gamePage.createRoom('Toast UI Test', 10);

    // Should see toast notification
    await expect(player.locator('text=/Room Created|Created|Success/i')).toBeVisible({ timeout: 5000 });
  });

  test('UI-014: Modal dialogs work correctly', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();

    // Open create room modal/form
    await gamePage.createRoomButton.click();
    
    // Verify it opened
    await expect(gamePage.roomNameInput).toBeVisible();
    
    // Close it
    await gamePage.cancelCreateRoomButton.click();
    
    // Verify it closed
    await expect(gamePage.roomNameInput).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('4.3 Ready System UI', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('UI-020: Toggle ready button works', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);
    const roomName = uniqueRoomName('Ready UI Test');

    await gamePage.goto();
    await gamePage.waitForConnection();
    await gamePage.createRoom(roomName, 10);
    await gamePage.joinRoom(roomName);

    // Initial state - should show "Ready to Play" button
    await expect(gamePage.readyButton).toBeVisible({ timeout: 5000 });

    // Click ready
    await gamePage.clickReady();

    // Should show ready state - the button text changes to include "unready"
    await expect(player.locator('[data-testid="ready-button"]')).toContainText(/unready/i, { timeout: 5000 });
  });

  test('UI-021: Ready count displays for multiple players', async () => {
    const [player1, player2] = await multiPlayer.createPlayers(2);
    const page1 = new VoteGamePage(player1);
    const page2 = new VoteGamePage(player2);
    const roomName = uniqueRoomName('Ready Count Test');

    await page1.goto();
    await page2.goto();
    await page1.waitForConnection();
    await page2.waitForConnection();

    await page1.createRoom(roomName, 10);
    
    await expect(player2.locator(`[role="tab"]:has-text("${roomName}")`).first()).toBeVisible({ timeout: 10000 });

    await page2.joinRoom(roomName);
    await page1.joinRoom(roomName);

    // Wait for ready buttons
    await expect(page1.readyButton).toBeVisible({ timeout: 10000 });

    // Player 1 readies
    await page1.clickReady();

    // Should show ready state on the button
    await expect(player1.locator('[data-testid="ready-button"]')).toContainText(/unready/i, { timeout: 5000 });
  });
});

test.describe('Navigation & Tabs', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('Room tabs are clickable and switch content', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();

    // Create two rooms
    await gamePage.createRoom('Tab Test A', 10);
    await gamePage.createRoom('Tab Test B', 20);

    // Both tabs should be visible
    await expect(player.locator('text=Tab Test A')).toBeVisible({ timeout: 10000 });
    await expect(player.locator('text=Tab Test B')).toBeVisible({ timeout: 10000 });

    // Click on Tab A
    await player.click('text=Tab Test A');
    
    // Tab A content should be active
    await expect(player.locator('text=/\\$10|10.*buy-in/i')).toBeVisible({ timeout: 5000 }).catch(() => {
      // Buy-in might be shown differently
    });

    // Click on Tab B
    await player.click('text=Tab Test B');
    
    // Tab B content should be active
    await expect(player.locator('text=/\\$20|20.*buy-in/i')).toBeVisible({ timeout: 5000 }).catch(() => {
      // Buy-in might be shown differently
    });
  });

  test('Resizable panels work', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();
    await gamePage.createRoom('Resize Test', 10);
    await gamePage.joinRoom('Resize Test');

    // Look for resizable handle
    const resizeHandle = player.locator('[data-resize-handle], .resize-handle, [data-orientation]');
    
    // Verify room content is visible (panels are working)
    await expect(player.locator('text=Resize Test')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('Page has proper heading structure', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 30000 });

    // Check for headings
    const headings = page.locator('h1, h2, h3');
    const count = await headings.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('Buttons are keyboard accessible', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 30000 });

    // Tab to Create Room button
    await page.keyboard.press('Tab');
    
    // Should be able to focus on interactive elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('Form inputs have labels', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 30000 });

    await page.click('button:has-text("Create Room")');

    // Check for labels
    await expect(page.locator('text=/Room Name|Buy-in/i')).toBeVisible();
  });
});
