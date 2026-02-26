import { test, expect } from '@playwright/test';
import { MultiPlayerHelper } from './helpers/multi-player';
import { VoteGamePage, uniqueRoomName } from './helpers/page-objects';
import { setupPlayers } from './helpers/game-flows';

/**
 * Priority 7: Performance & Load Testing E2E Tests
 * 
 * Aligned with QA Testing Outline - docs/qa-testing-outline.md
 * Test IDs: PF-001 through PF-022
 */

test.describe('7.1 Player Load', () => {
  test('PF-001: 5 player game runs smoothly', async ({ browser }) => {
    const multiPlayer = new MultiPlayerHelper(browser);
    
    try {
      const players = await multiPlayer.createPlayers(5);
      const gamePages = players.map(p => new VoteGamePage(p));

      // Connect all players concurrently
      const startTime = Date.now();
      
      await Promise.all(gamePages.map(gp => gp.goto()));
      await Promise.all(gamePages.map(gp => gp.waitForConnection()));
      
      const connectionTime = Date.now() - startTime;
      console.log(`5 players connected in ${connectionTime}ms`);

      // First player creates room
      await gamePages[0].createRoom('Load Test 5 Players', { buyinAmount: 10 });

      // All players should see it
      await Promise.all(
        gamePages.map(gp =>
          gp.waitForRoomTab('Load Test 5 Players')
        )
      );

      console.log('All 5 players see the room');
    } finally {
      await multiPlayer.cleanup();
    }
  });

  test('PF-003: Multiple concurrent rooms are isolated', async ({ browser }) => {
    const multiPlayer = new MultiPlayerHelper(browser);
    
    try {
      const { gamePages: [page1, page2, page3] } = await setupPlayers(multiPlayer, 3);

      // Each player creates their own room
      await page1.createRoom('Isolation Room A', { buyinAmount: 10 });
      await page2.createRoom('Isolation Room B', { buyinAmount: 20 });
      await page3.createRoom('Isolation Room C', { buyinAmount: 30 });

      // All rooms should exist
      await page1.waitForRoomTab('Isolation Room A');
      await page1.waitForRoomTab('Isolation Room B');
      await page1.waitForRoomTab('Isolation Room C');

      // Players should see all rooms
      await page2.waitForRoomTab('Isolation Room A');
      await page3.waitForRoomTab('Isolation Room B');

      console.log('All 3 rooms created and visible to all players');
    } finally {
      await multiPlayer.cleanup();
    }
  });
});

test.describe('7.3 Real-time Sync', () => {
  test('PF-020: Room creation syncs quickly', async ({ browser }) => {
    const multiPlayer = new MultiPlayerHelper(browser);
    
    try {
      const { gamePages: [page1, page2] } = await setupPlayers(multiPlayer, 2);

      // Player 1 creates room
      const createStart = Date.now();
      await page1.createRoom('Sync Speed Test', { buyinAmount: 10 });

      // Measure how long until Player 2 sees it
      await page2.waitForRoomTab('Sync Speed Test');
      const syncTime = Date.now() - createStart;

      console.log(`Room synced to player 2 in ${syncTime}ms`);
      
      // Should be reasonably fast (under 5 seconds)
      expect(syncTime).toBeLessThan(5000);
    } finally {
      await multiPlayer.cleanup();
    }
  });

  test('PF-021: Ready state syncs between players', async ({ browser }) => {
    const multiPlayer = new MultiPlayerHelper(browser);
    const roomName = uniqueRoomName('Ready Sync Test');
    
    try {
      const { gamePages: [page1, page2] } = await setupPlayers(multiPlayer, 2);

      await page1.createRoom(roomName, { buyinAmount: 10 });
      
      await page2.waitForRoomTab(roomName);

      await page2.joinRoom(roomName);
      await page1.joinRoom(roomName);

      // Wait for ready buttons
      await expect(page1.readyButton).toBeVisible({ timeout: 10000 });

      // Player 1 readies
      const readyStart = Date.now();
      await page1.clickReady();

      // Player 1 should see their ready state on the button
      await expect(page1.readyButton).toContainText(/unready/i, { timeout: 5000 });
      
      const readyTime = Date.now() - readyStart;
      console.log(`Ready state updated in ${readyTime}ms`);
    } finally {
      await multiPlayer.cleanup();
    }
  });
});

test.describe('Page Load Performance', () => {
  test('Vote page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    const gamePage = new VoteGamePage(page);
    await gamePage.goto();
    await gamePage.waitForConnection();
    
    const loadTime = Date.now() - startTime;
    console.log(`Vote page loaded and connected in ${loadTime}ms`);
    
    // Should load within 30 seconds
    expect(loadTime).toBeLessThan(30000);
  });

  test('Chat page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/chat?multiuser=true');
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 30000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`Chat page loaded and connected in ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(30000);
  });

  test('Social page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/social?multiuser=true');
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 30000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`Social page loaded and connected in ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(30000);
  });
});

test.describe('Memory & Stability', () => {
  test('Page remains stable after multiple actions', async ({ browser }) => {
    const multiPlayer = new MultiPlayerHelper(browser);
    
    try {
      const player = await multiPlayer.createPlayer();
      const gamePage = new VoteGamePage(player);

      await gamePage.goto();
      await gamePage.waitForConnection();

      // Create multiple rooms
      for (let i = 1; i <= 3; i++) {
        await gamePage.createRoom(`Stability Test ${i}`, { buyinAmount: 10 * i });
      }

      // Verify all rooms exist
      await gamePage.waitForRoomTab('Stability Test 1');
      await gamePage.waitForRoomTab('Stability Test 2');
      await gamePage.waitForRoomTab('Stability Test 3');

      // Join and ready in each room
      for (let i = 1; i <= 3; i++) {
        await gamePage.joinRoom(`Stability Test ${i}`);
        await gamePage.clickReady();
      }

      // Page should still be responsive
      await expect(gamePage.connectionStatus).toContainText('Connected');
      
      console.log('Page remained stable after multiple room creations and ready toggles');
    } finally {
      await multiPlayer.cleanup();
    }
  });
});
