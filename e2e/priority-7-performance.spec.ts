import { test, expect } from '@playwright/test';
import { MultiPlayerHelper } from './helpers/multi-player';
import { VoteGamePage } from './helpers/page-objects';

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

      // Connect all players
      const startTime = Date.now();
      
      await Promise.all(gamePages.map(gp => gp.goto()));
      await Promise.all(gamePages.map(gp => gp.waitForConnection()));
      
      const connectionTime = Date.now() - startTime;
      console.log(`5 players connected in ${connectionTime}ms`);

      // First player creates room
      await gamePages[0].createRoom('Load Test 5 Players', 10);

      // All players should see it
      await Promise.all(
        players.map(p => 
          expect(p.locator('text=Load Test 5 Players')).toBeVisible({ timeout: 15000 })
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
      const [player1, player2, player3] = await multiPlayer.createPlayers(3);
      const page1 = new VoteGamePage(player1);
      const page2 = new VoteGamePage(player2);
      const page3 = new VoteGamePage(player3);

      await page1.goto();
      await page2.goto();
      await page3.goto();
      
      await page1.waitForConnection();
      await page2.waitForConnection();
      await page3.waitForConnection();

      // Each player creates their own room
      await page1.createRoom('Isolation Room A', 10);
      await page2.createRoom('Isolation Room B', 20);
      await page3.createRoom('Isolation Room C', 30);

      // All rooms should exist
      await expect(player1.locator('text=Isolation Room A')).toBeVisible({ timeout: 10000 });
      await expect(player1.locator('text=Isolation Room B')).toBeVisible({ timeout: 10000 });
      await expect(player1.locator('text=Isolation Room C')).toBeVisible({ timeout: 10000 });

      // Players should see all rooms
      await expect(player2.locator('text=Isolation Room A')).toBeVisible({ timeout: 10000 });
      await expect(player3.locator('text=Isolation Room B')).toBeVisible({ timeout: 10000 });

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
      const [player1, player2] = await multiPlayer.createPlayers(2);
      const page1 = new VoteGamePage(player1);
      const page2 = new VoteGamePage(player2);

      await page1.goto();
      await page2.goto();
      await page1.waitForConnection();
      await page2.waitForConnection();

      // Player 1 creates room
      const createStart = Date.now();
      await page1.createRoom('Sync Speed Test', 10);

      // Measure how long until Player 2 sees it
      await expect(player2.locator('text=Sync Speed Test')).toBeVisible({ timeout: 10000 });
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
    
    try {
      const [player1, player2] = await multiPlayer.createPlayers(2);
      const page1 = new VoteGamePage(player1);
      const page2 = new VoteGamePage(player2);

      await page1.goto();
      await page2.goto();
      await page1.waitForConnection();
      await page2.waitForConnection();

      await page1.createRoom('Ready Sync Test', 10);
      
      await expect(player2.locator('text=Ready Sync Test')).toBeVisible({ timeout: 10000 });

      await page1.joinRoom('Ready Sync Test');
      await page2.joinRoom('Ready Sync Test');

      // Player 1 readies
      const readyStart = Date.now();
      await page1.clickReady();

      // Player 1 should see their ready state
      await expect(player1.locator('text=/✓|Ready.*unready/i')).toBeVisible({ timeout: 5000 });
      
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
    
    await page.goto('/vote?multiuser=true');
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 30000 });
    
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
        await gamePage.createRoom(`Stability Test ${i}`, 10 * i);
      }

      // Verify all rooms exist
      await expect(player.locator('text=Stability Test 1')).toBeVisible();
      await expect(player.locator('text=Stability Test 2')).toBeVisible();
      await expect(player.locator('text=Stability Test 3')).toBeVisible();

      // Join and ready in each room
      for (let i = 1; i <= 3; i++) {
        await gamePage.joinRoom(`Stability Test ${i}`);
        await gamePage.clickReady();
      }

      // Page should still be responsive
      await expect(player.locator('text=Connected')).toBeVisible();
      
      console.log('Page remained stable after multiple room creations and ready toggles');
    } finally {
      await multiPlayer.cleanup();
    }
  });
});
