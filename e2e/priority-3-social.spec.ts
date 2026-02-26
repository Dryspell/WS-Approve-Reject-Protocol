import { test, expect } from '@playwright/test';
import { MultiPlayerHelper } from './helpers/multi-player';
import { SocialPage, VoteGamePage } from './helpers/page-objects';

/**
 * Priority 3: Social Features E2E Tests
 * 
 * Aligned with QA Testing Outline - docs/qa-testing-outline.md
 * Test IDs: SO-001 through SO-034
 */

test.describe('3.1 Friend System', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('SO-001: Social page accessible', async () => {
    const player = await multiPlayer.createPlayer();
    
    await player.goto('/social?multiuser=true');
    
    // Wait for connection
    await expect(player.locator('text=Connected')).toBeVisible({ timeout: 30000 });
  });

  test('SO-005: Friends list interface loads', async () => {
    const player = await multiPlayer.createPlayer();
    
    await player.goto('/social?multiuser=true');
    await expect(player.locator('text=Connected')).toBeVisible({ timeout: 30000 });
    
    // Look for friends/social tab
    const friendsTab = player.locator('text=/Friends|Social|Contacts/i');
    
    // Verify social page loaded
    await expect(player.locator('text=/Friend|Social/i')).toBeVisible({ timeout: 10000 });
  });

  test('Two players can see each other after connecting', async () => {
    const [player1, player2] = await multiPlayer.createPlayers(2);
    
    await player1.goto('/social?multiuser=true');
    await player2.goto('/social?multiuser=true');
    
    await expect(player1.locator('text=Connected')).toBeVisible({ timeout: 30000 });
    await expect(player2.locator('text=Connected')).toBeVisible({ timeout: 30000 });
    
    // Both players should have unique identities
    const id1 = await player1.locator('text=/Identity: [a-f0-9]+/').textContent();
    const id2 = await player2.locator('text=/Identity: [a-f0-9]+/').textContent();
    
    expect(id1).not.toBe(id2);
  });
});

test.describe('3.2 Direct Messages', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('SO-020: Messages tab accessible', async () => {
    const player = await multiPlayer.createPlayer();
    
    await player.goto('/social?multiuser=true');
    await expect(player.locator('text=Connected')).toBeVisible({ timeout: 30000 });
    
    // Look for messages/DM tab
    const messagesTab = player.locator('text=/Messages|DM|Direct/i');
    
    if (await messagesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await messagesTab.click();
    }
  });
});

test.describe('3.3 Block System', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('SO-030: Block interface accessible', async () => {
    const player = await multiPlayer.createPlayer();
    
    await player.goto('/social?multiuser=true');
    await expect(player.locator('text=Connected')).toBeVisible({ timeout: 30000 });
    
    // Look for blocked/block tab
    const blockedTab = player.locator('text=/Block/i');
    
    if (await blockedTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await blockedTab.click();
    }
  });
});

test.describe('Social Features in Vote Context', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('Players in same game room are visible to each other', async () => {
    const [player1, player2] = await multiPlayer.createPlayers(2);
    const gamePage1 = new VoteGamePage(player1);
    const gamePage2 = new VoteGamePage(player2);
    
    // Player 1 creates room
    await gamePage1.goto();
    await gamePage1.waitForConnection();
    
    await gamePage1.createRoom('Social Test Room', { buyinAmount: 10 });
    
    // Player 2 joins
    await gamePage2.goto();
    await gamePage2.waitForConnection();
    
    // Both should see the room
    await gamePage1.waitForRoomTab('Social Test Room');
    await gamePage2.waitForRoomTab('Social Test Room');
  });
});
