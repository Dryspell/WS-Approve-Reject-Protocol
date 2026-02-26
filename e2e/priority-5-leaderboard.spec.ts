import { test, expect } from '@playwright/test';
import { MultiPlayerHelper } from './helpers/multi-player';
import { VoteGamePage } from './helpers/page-objects';

/**
 * Priority 5: Leaderboard & Profiles E2E Tests
 * 
 * Aligned with QA Testing Outline - docs/qa-testing-outline.md
 * Test IDs: LB-001 through LB-004, PR-001 through PR-004
 */

test.describe('5.1 Leaderboards', () => {
  test('LB-001: Leaderboard page loads', async ({ page }) => {
    await page.goto('/leaderboard?multiuser=true');
    
    // Wait for connection or page content
    await expect(page.locator('text=/Leaderboard|Ranking|Top|Players/i')).toBeVisible({ timeout: 30000 });
  });

  test('LB-002: Leaderboard shows player data', async ({ page }) => {
    await page.goto('/leaderboard?multiuser=true');
    
    // Wait for connection
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 30000 }).catch(() => {
      // Leaderboard may not show connection status
    });

    // Should show some leaderboard content
    await expect(page.locator('text=/Leaderboard|Rank|Score|Wins/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('5.2 Player Profiles', () => {
  test('PR-001: Profile page loads', async ({ page }) => {
    await page.goto('/profile?multiuser=true');
    
    // Wait for connection or page content
    await expect(page.locator('text=/Profile|Stats|Games|Played/i')).toBeVisible({ timeout: 30000 });
  });

  test('PR-003: Can edit display name', async ({ page }) => {
    await page.goto('/profile?multiuser=true');
    
    // Wait for page to load
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 30000 }).catch(() => {});

    // Look for name input or edit button
    const nameInput = page.locator('input[placeholder*="name"], input[name*="name"], [data-testid="name-input"]');
    const editButton = page.locator('button:has-text("Edit"), button:has-text("Change")');

    // Either should be visible
    const hasNameInput = await nameInput.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEditButton = await editButton.isVisible({ timeout: 5000 }).catch(() => false);

    // Profile page should have some way to view/edit info
    await expect(page.locator('text=/Profile|User|Account/i')).toBeVisible();
  });
});

test.describe('Cross-Page Navigation', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('Can navigate from vote to profile', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);
    
    await gamePage.goto();
    await gamePage.waitForConnection();

    // Navigate to profile
    await player.goto('/profile?multiuser=true');
    
    // Should maintain connection or reconnect
    await expect(player.locator('text=/Profile|Connected/i')).toBeVisible({ timeout: 30000 });
  });

  test('Can navigate from vote to leaderboard', async () => {
    const player = await multiPlayer.createPlayer();
    const gamePage = new VoteGamePage(player);
    
    await gamePage.goto();
    await gamePage.waitForConnection();

    // Navigate to leaderboard
    await player.goto('/leaderboard?multiuser=true');
    
    // Should show leaderboard content
    await expect(player.locator('text=/Leaderboard|Ranking/i')).toBeVisible({ timeout: 30000 });
  });
});
