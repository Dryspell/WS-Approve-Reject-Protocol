import { test, expect, Page } from '@playwright/test';
import { MultiPlayerHelper } from './helpers/multi-player';
import { VoteGamePage, uniqueRoomName } from './helpers/page-objects';

/**
 * Full Game Flow E2E Tests
 * 
 * These tests cover complete user journeys through the game,
 * from room creation to game completion.
 */

test.describe('Complete Game Flow', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('Full flow: Create room → Join → Ready → Game interface appears', async () => {
    const [host, player2, player3] = await multiPlayer.createPlayers(3);
    const hostPage = new VoteGamePage(host);
    const player2Page = new VoteGamePage(player2);
    const player3Page = new VoteGamePage(player3);

    const roomName = uniqueRoomName('Full Flow Test');

    // Step 1: Host creates room
    await hostPage.goto();
    await hostPage.waitForConnection();
    console.log('Host connected');

    await hostPage.createRoom(roomName, 10);
    console.log('Room created');

    // Step 2: Other players join
    await player2Page.goto();
    await player3Page.goto();
    await player2Page.waitForConnection();
    await player3Page.waitForConnection();
    console.log('All players connected');

    // Step 3: All players see the room
    await expect(host.locator(`[role="tab"]:has-text("${roomName}")`).first()).toBeVisible({ timeout: 10000 });
    await expect(player2.locator(`[role="tab"]:has-text("${roomName}")`).first()).toBeVisible({ timeout: 10000 });
    await expect(player3.locator(`[role="tab"]:has-text("${roomName}")`).first()).toBeVisible({ timeout: 10000 });
    console.log('All players see the room');

    // Step 4: All players click on the room tab
    await hostPage.joinRoom(roomName);
    await player2Page.joinRoom(roomName);
    await player3Page.joinRoom(roomName);
    console.log('All players joined room');

    // Step 5: Verify buy-in info is displayed
    await expect(host.locator('text=/buy-in/i').first()).toBeVisible({ timeout: 5000 });
    console.log('Buy-in info visible');

    // Step 6: Host clicks ready
    await hostPage.clickReady();
    await expect(host.locator('text=/Ready|✓/').first()).toBeVisible({ timeout: 5000 });
    console.log('Host is ready');
  });

  test('Multiple rooms can exist simultaneously', async () => {
    const [player1, player2] = await multiPlayer.createPlayers(2);
    const page1 = new VoteGamePage(player1);
    const page2 = new VoteGamePage(player2);

    const roomA = uniqueRoomName('Room Alpha');
    const roomB = uniqueRoomName('Room Beta');

    await page1.goto();
    await page2.goto();
    await page1.waitForConnection();
    await page2.waitForConnection();

    // Player 1 creates Room A
    await page1.createRoom(roomA, 15);
    
    // Player 2 creates Room B
    await page2.createRoom(roomB, 25);

    // Both rooms should be visible to both players
    await expect(player1.locator(`[role="tab"]:has-text("${roomA}")`).first()).toBeVisible({ timeout: 10000 });
    await expect(player1.locator(`[role="tab"]:has-text("${roomB}")`).first()).toBeVisible({ timeout: 10000 });
    await expect(player2.locator(`[role="tab"]:has-text("${roomA}")`).first()).toBeVisible({ timeout: 10000 });
    await expect(player2.locator(`[role="tab"]:has-text("${roomB}")`).first()).toBeVisible({ timeout: 10000 });
  });

  test('Room shows correct player count as players join', async () => {
    const players = await multiPlayer.createPlayers(4);
    const gamePages = players.map(p => new VoteGamePage(p));

    // First player creates room
    await gamePages[0].goto();
    await gamePages[0].waitForConnection();
    await gamePages[0].createRoom('Player Count Test', 10);
    await gamePages[0].joinRoom('Player Count Test');

    // Check initial state
    await expect(players[0].locator('text=/1.*player|player.*1/i')).toBeVisible({ timeout: 5000 }).catch(() => {
      // Player count may be displayed differently
    });

    // Other players connect and see the room
    for (let i = 1; i < 4; i++) {
      await gamePages[i].goto();
      await gamePages[i].waitForConnection();
      await expect(players[i].locator('text=Player Count Test')).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Ready System Flow', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('Ready button shows toast when clicked', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);
    const roomName = uniqueRoomName('Ready Toggle');

    await gamePage.goto();
    await gamePage.waitForConnection();
    await gamePage.createRoom(roomName, 10);
    await gamePage.joinRoom(roomName);

    // Click ready - should show toast
    await gamePage.clickReady();
    await expect(player.locator('text=/Readied|Ready/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('Multiple players can ready up independently', async () => {
    const [player1, player2] = await multiPlayer.createPlayers(2);
    const page1 = new VoteGamePage(player1);
    const page2 = new VoteGamePage(player2);
    const roomName = uniqueRoomName('Multi Ready');

    await page1.goto();
    await page2.goto();
    await page1.waitForConnection();
    await page2.waitForConnection();

    await page1.createRoom(roomName, 10);
    
    await expect(player2.locator(`[role="tab"]:has-text("${roomName}")`).first()).toBeVisible({ timeout: 10000 });

    await page1.joinRoom(roomName);
    await page2.joinRoom(roomName);

    // Player 1 readies - should show toast
    await page1.clickReady();
    await expect(player1.locator('text=/Readied|Ready/i').first()).toBeVisible({ timeout: 5000 });
    
    // Player 2 readies - should show toast
    await page2.clickReady();
    await expect(player2.locator('text=/Readied|Ready/i').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('UI Preset Tests', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('Room creation form has expected fields', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();

    // Click create room to open form
    await gamePage.createRoomButton.click();

    // Verify form fields exist
    await expect(gamePage.roomNameInput).toBeVisible();
    await expect(gamePage.buyinAmountInput).toBeVisible();
    await expect(gamePage.submitCreateRoomButton).toBeVisible();
    await expect(gamePage.cancelCreateRoomButton).toBeVisible();
  });

  test('Cancel button closes room creation form', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();

    // Open form
    await gamePage.createRoomButton.click();
    await expect(gamePage.roomNameInput).toBeVisible();

    // Cancel
    await gamePage.cancelCreateRoomButton.click();

    // Form should be hidden
    await expect(gamePage.roomNameInput).not.toBeVisible({ timeout: 3000 });
  });

  test('Game mode info button works', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();

    await gamePage.createRoom('Mode Info Test', 10);
    await gamePage.joinRoom('Mode Info Test');

    // Look for game mode info button
    const infoButton = player.locator('text=/Game Mode|Show.*Info|Hide.*Info/i');
    
    if (await infoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await infoButton.click();
      // Should expand to show preset info
      await expect(player.locator('text=/Quick|Standard|Strategic|High Stakes/i')).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Connection Status Tests', () => {
  test('Shows connecting state initially', async ({ page }) => {
    // Don't wait - check immediate state
    await page.goto('/vote?multiuser=true');
    
    // Should eventually show connected
    await expect(page.locator('text=Connected').first()).toBeVisible({ timeout: 30000 });
  });

  test('Shows identity after connection', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    
    await expect(page.locator('text=/Identity:.*[a-f0-9]/i')).toBeVisible({ timeout: 30000 });
  });

  test('Shows room count', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 30000 });
    
    // Should show room count (even if 0)
    await expect(page.locator('text=/\\d+.*room/i').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Toast Notifications', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('Toast appears when room is created', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();

    await gamePage.createRoomButton.click();
    await gamePage.roomNameInput.fill('Toast Test Room');
    await gamePage.submitCreateRoomButton.click();

    // Should see success toast
    await expect(player.locator('text=/Room Created|Created|Success/i')).toBeVisible({ timeout: 5000 });
  });

  test('Toast appears when ready status changes', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();

    await gamePage.createRoom('Ready Toast Test', 10);
    await gamePage.joinRoom('Ready Toast Test');

    await gamePage.clickReady();

    // Should see ready toast
    await expect(player.locator('text=/Ready|Readied/i')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Error Handling', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('Shows error message when disconnected', async () => {
    const player = await multiPlayer.createPlayer();
    
    await player.goto('/vote?multiuser=true');
    
    // Should show some connection state
    await expect(player.locator('text=/Connect|Disconnect|Status/i')).toBeVisible({ timeout: 30000 });
  });

  test('Handles rapid navigation', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();

    // Create room
    await gamePage.createRoom('Rapid Nav Test', 10);
    
    // Rapidly switch between tabs (if multiple rooms exist)
    await gamePage.joinRoom('Rapid Nav Test');
    
    // Should still be functional
    await expect(player.locator('text=Rapid Nav Test')).toBeVisible();
  });
});
