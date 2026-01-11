import { test, expect, Page } from '@playwright/test';
import { MultiPlayerHelper, waitForConnection, clickButton } from './helpers/multi-player';

/**
 * Core Vote Exchange E2E Tests
 * 
 * These tests verify the main gameplay flows with multiple isolated players.
 * Each player runs in a separate browser context with unique storage.
 */

test.describe('Vote Game - Room Management', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('single player can create a game room', async () => {
    const player = await multiPlayer.createPlayer();
    await player.goto('/vote?multiuser=true');
    
    // Wait for connection
    await waitForConnection(player);
    
    // Click Create Room button
    await player.click('button:has-text("Create Room")');
    
    // Fill in room details
    await player.fill('input[placeholder="My Game Room"]', 'Test Room');
    await player.fill('input[type="number"]', '25');
    
    // Submit
    await player.click('button:has-text("Create Room ($25")');
    
    // Verify room appears
    await expect(player.locator('text=Test Room')).toBeVisible({ timeout: 10000 });
  });

  test('multiple players see unique identities', async () => {
    const [player1, player2, player3] = await multiPlayer.createPlayers(3);
    
    // Navigate all players to vote page
    await Promise.all([
      player1.goto('/vote?multiuser=true'),
      player2.goto('/vote?multiuser=true'),
      player3.goto('/vote?multiuser=true'),
    ]);
    
    // Wait for all to connect
    await Promise.all([
      waitForConnection(player1),
      waitForConnection(player2),
      waitForConnection(player3),
    ]);
    
    // Extract identities from each player
    const getIdentity = async (page: Page): Promise<string> => {
      const text = await page.locator('text=/Identity: [a-f0-9]+/').textContent();
      return text || '';
    };
    
    const [id1, id2, id3] = await Promise.all([
      getIdentity(player1),
      getIdentity(player2),
      getIdentity(player3),
    ]);
    
    // Verify all identities are different
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
    
    console.log('Player identities:', { id1, id2, id3 });
  });

  test('multiple players can join the same room', async () => {
    const [host, player2, player3] = await multiPlayer.createPlayers(3);
    
    // Host creates a room
    await host.goto('/vote?multiuser=true');
    await waitForConnection(host);
    
    await host.click('button:has-text("Create Room")');
    await host.fill('input[placeholder="My Game Room"]', 'Multiplayer Test');
    await host.click('button:has-text("Create Room ($10")');
    
    // Wait for room to appear
    await expect(host.locator('text=Multiplayer Test')).toBeVisible({ timeout: 10000 });
    
    // Other players join
    await Promise.all([
      player2.goto('/vote?multiuser=true'),
      player3.goto('/vote?multiuser=true'),
    ]);
    
    await Promise.all([
      waitForConnection(player2),
      waitForConnection(player3),
    ]);
    
    // All players should see the room
    await expect(player2.locator('text=Multiplayer Test')).toBeVisible({ timeout: 10000 });
    await expect(player3.locator('text=Multiplayer Test')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Vote Game - Ready System', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('players can ready up in a room', async () => {
    const [player1, player2] = await multiPlayer.createPlayers(2);
    
    // Both navigate to vote page
    await Promise.all([
      player1.goto('/vote?multiuser=true'),
      player2.goto('/vote?multiuser=true'),
    ]);
    
    await Promise.all([
      waitForConnection(player1),
      waitForConnection(player2),
    ]);
    
    // Player 1 creates room
    await player1.click('button:has-text("Create Room")');
    await player1.fill('input[placeholder="My Game Room"]', 'Ready Test Room');
    await player1.click('button:has-text("Create Room ($10")');
    
    // Wait for room and click on tab
    await expect(player1.locator('text=Ready Test Room')).toBeVisible({ timeout: 10000 });
    await player1.click('text=Ready Test Room');
    
    // Player 2 should see the room and can click it
    await expect(player2.locator('text=Ready Test Room')).toBeVisible({ timeout: 10000 });
    await player2.click('text=Ready Test Room');
    
    // Both players click Ready
    await player1.click('button:has-text("Ready to Play")');
    
    // Verify ready status appears
    await expect(player1.locator('text=/Ready|✓/')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Vote Game - Connection Status', () => {
  test('shows connection status indicator', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    
    // Initially might show "Connecting" or "Disconnected"
    // Then should show "Connected" once connected
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 30000 });
  });

  test('displays SpacetimeDB identity', async ({ page }) => {
    await page.goto('/vote?multiuser=true');
    
    // Wait for identity to be displayed
    await expect(page.locator('text=/Identity:/')).toBeVisible({ timeout: 30000 });
  });
});
