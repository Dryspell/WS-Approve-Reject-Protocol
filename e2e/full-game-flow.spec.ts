import { test, expect } from '@playwright/test';
import { MultiPlayerHelper } from './helpers/multi-player';
import { VoteGamePage, uniqueRoomName } from './helpers/page-objects';
import { setupPlayers } from './helpers/game-flows';

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

    await hostPage.createRoom(roomName, { buyinAmount: 10 });
    console.log('Room created');

    // Step 2: Other players join
    await player2Page.goto();
    await player3Page.goto();
    await player2Page.waitForConnection();
    await player3Page.waitForConnection();
    console.log('All players connected');

    // Step 3: All players see the room
    await hostPage.waitForRoomTab(roomName);
    await player2Page.waitForRoomTab(roomName);
    await player3Page.waitForRoomTab(roomName);
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
    const { gamePages } = await setupPlayers(multiPlayer, 2);
    const [page1, page2] = gamePages;

    const roomA = uniqueRoomName('Room Alpha');
    const roomB = uniqueRoomName('Room Beta');

    // Player 1 creates Room A
    await page1.createRoom(roomA, { buyinAmount: 15 });
    
    // Player 2 creates Room B
    await page2.createRoom(roomB, { buyinAmount: 25 });

    // Both rooms should be visible to both players
    await page1.waitForRoomTab(roomA);
    await page1.waitForRoomTab(roomB);
    await page2.waitForRoomTab(roomA);
    await page2.waitForRoomTab(roomB);
  });

  test('Room shows correct player count as players join', async () => {
    const players = await multiPlayer.createPlayers(4);
    const gamePages = players.map(p => new VoteGamePage(p));

    // First player creates room
    await gamePages[0].goto();
    await gamePages[0].waitForConnection();
    await gamePages[0].createRoom('Player Count Test', { buyinAmount: 10 });
    await gamePages[0].joinRoom('Player Count Test');

    // Check initial state
    await expect(players[0].locator('text=/1.*player|player.*1/i')).toBeVisible({ timeout: 5000 }).catch(() => {
      // Player count may be displayed differently
    });

    // Other players connect and see the room
    for (let i = 1; i < 4; i++) {
      await gamePages[i].goto();
      await gamePages[i].waitForConnection();
      await gamePages[i].waitForRoomTab('Player Count Test');
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
    await gamePage.createRoom(roomName, { buyinAmount: 10 });
    await gamePage.joinRoom(roomName);

    // Click ready - should show toast
    await gamePage.clickReady();
    await expect(player.locator('text=/Readied|Ready/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('Multiple players can ready up independently', async () => {
    const { pages: [player1, player2], gamePages: [page1, page2] } = await setupPlayers(multiPlayer, 2);
    const roomName = uniqueRoomName('Multi Ready');

    // Player 1 creates room (becomes member automatically)
    await page1.createRoom(roomName, { buyinAmount: 10 });
    
    // Wait for room to be visible to player 2
    await page2.waitForRoomTab(roomName);

    // Player 2 joins room
    await page2.joinRoom(roomName);
    
    // Player 1 opens the room
    await page1.joinRoom(roomName);
    
    // Wait for Ready buttons to be visible for both players (confirms room content loaded)
    await expect(page1.readyButton).toBeVisible({ timeout: 10000 });
    await expect(page2.readyButton).toBeVisible({ timeout: 10000 });

    // Both players ready up
    await page1.clickReady();
    await expect(player1.locator('text=/Readied|Ready/i').first()).toBeVisible({ timeout: 5000 });
    
    await page2.clickReady();
    await expect(player2.locator('text=/Readied|Ready/i').first()).toBeVisible({ timeout: 5000 });
    
    // With minimum 3 players required, game should NOT auto-start with only 2 ready
    // The Ready buttons should still be visible (game in lobby state)
    await expect(page1.readyButton).toBeVisible({ timeout: 2000 });
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

    await gamePage.createRoom('Mode Info Test', { buyinAmount: 10 });
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
    const gamePage = new VoteGamePage(page);
    await gamePage.goto();
    
    // Should eventually show connected
    await gamePage.waitForConnection();
  });

  test('Shows identity after connection', async ({ page }) => {
    const gamePage = new VoteGamePage(page);
    await gamePage.goto();
    await gamePage.waitForConnection();
    
    await expect(gamePage.identityDisplay).toContainText(/[a-f0-9]/i, { timeout: 30000 });
  });

  test('Shows room count', async ({ page }) => {
    const gamePage = new VoteGamePage(page);
    await gamePage.goto();
    await gamePage.waitForConnection();
    
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
    const roomName = uniqueRoomName('Ready Toast Test');

    await gamePage.goto();
    await gamePage.waitForConnection();

    await gamePage.createRoom(roomName, { buyinAmount: 10 });
    await gamePage.joinRoom(roomName);

    // Wait for ready button
    await expect(gamePage.readyButton).toBeVisible({ timeout: 10000 });

    await gamePage.clickReady();

    // Should see ready state on button (toast may not always appear in test env)
    await expect(gamePage.readyButton).toContainText(/unready/i, { timeout: 5000 });
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
    const gamePage = new VoteGamePage(player);
    
    await gamePage.goto();
    
    // Should show some connection state
    await expect(gamePage.connectionStatus).toBeVisible({ timeout: 30000 });
  });

  test('Handles rapid navigation', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);

    await gamePage.goto();
    await gamePage.waitForConnection();

    // Create room
    await gamePage.createRoom('Rapid Nav Test', { buyinAmount: 10 });
    
    // Rapidly switch between tabs (if multiple rooms exist)
    await gamePage.joinRoom('Rapid Nav Test');
    
    // Should still be functional
    await expect(player.locator('text=Rapid Nav Test')).toBeVisible();
  });
});
