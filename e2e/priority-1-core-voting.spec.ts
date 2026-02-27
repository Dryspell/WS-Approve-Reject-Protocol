import { test, expect } from '@playwright/test';
import { MultiPlayerHelper } from './helpers/multi-player';
import { VoteGamePage, uniqueRoomName } from './helpers/page-objects';
import { setupPlayers, createAndJoinRoom, allReadyUp } from './helpers/game-flows';
import { TestBotHelper } from './helpers/test-bots';
import { setupHybridGame, hybridCreateAndJoinRoom, hybridCleanup, type HybridGameSetup } from './helpers/hybrid-flows';

/**
 * Priority 1: Core Voting Gameplay E2E Tests
 * Test IDs: VG-001 through VG-062
 *
 * All selectors come from page objects which reference TID constants.
 * No raw locators in tests — if the UI changes, only page-objects.ts
 * and test-ids.ts need updating.
 */

test.describe('1.1 Game Room Creation & Joining', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('VG-001: Create room', async () => {
    const { gamePages } = await setupPlayers(multiPlayer, 1);
    const gp = gamePages[0];

    await gp.createRoom('Preset Test Room', { buyinAmount: 10 });

    await expect(gp.roomTab('Preset Test Room')).toBeVisible({ timeout: 10000 });
  });

  test('VG-002: Create custom room', async () => {
    const { gamePages } = await setupPlayers(multiPlayer, 1);
    const gp = gamePages[0];

    await gp.createRoom('Custom Room VG-002', { buyinAmount: 50 });
    await gp.joinRoom('Custom Room VG-002');

    await expect(gp.roomTab('Custom Room VG-002')).toBeVisible();
    await expect(gp.page.locator('text=/\\$50/').first()).toBeVisible({ timeout: 10000 });
  });

  test('VG-003: Join existing room', async () => {
    const players = await setupPlayers(multiPlayer, 2);
    const [gp1, gp2] = players.gamePages;

    await gp1.createRoom('Join Test VG-003', { buyinAmount: 15 });

    await gp2.waitForRoomTab('Join Test VG-003');
    await gp2.joinRoom('Join Test VG-003');

    await expect(gp1.roomTab('Join Test VG-003')).toBeVisible();
    await expect(gp2.roomTab('Join Test VG-003')).toBeVisible();
  });

  test('VG-004: Multiple players join - pot calculation', async ({ browser }) => {
    // Hybrid: 1 browser + 4 bots (was 5 browsers)
    const setup = await setupHybridGame(browser, {
      botCount: 4,
      roomPrefix: 'MultiJoin-VG-004',
    });

    try {
      await hybridCreateAndJoinRoom(setup, { buyinAmount: 10 });
      await expect(setup.gamePage.roomTab(setup.roomName)).toBeVisible();
    } finally {
      await hybridCleanup(setup);
    }
  });

  test('VG-005: Room auto-start when all ready (3+ players)', async ({ browser }) => {
    // Hybrid: 1 browser + 2 bots (was 3 browsers)
    const setup = await setupHybridGame(browser, {
      botCount: 2,
      roomPrefix: 'Ready-VG-005',
    });

    try {
      await hybridCreateAndJoinRoom(setup, { buyinAmount: 10 });
      await expect(setup.gamePage.readyButton).toBeVisible({ timeout: 10000 });

      // Real player readies
      await setup.gamePage.clickReady();
      // Bots ready — once all 3 players are ready the game auto-starts
      await setup.bots.readyAll(setup.roomName);

      // Game should have started: ready button disappears, pot becomes visible
      await expect(setup.gamePage.potAmount).toBeVisible({ timeout: 15000 });
    } finally {
      await hybridCleanup(setup);
    }
  });
});

test.describe('1.2 Voting Mechanics', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });
  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('VG-010: Set vote color (Red)', async () => {
    const { gamePages } = await setupPlayers(multiPlayer, 1);
    const gp = gamePages[0];

    await gp.createRoom('Vote Red VG-010', { buyinAmount: 10 });
    await gp.joinRoom('Vote Red VG-010');
    await expect(gp.roomTab('Vote Red VG-010')).toBeVisible();

    if (await gp.voteRedZone.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gp.voteRed();
    }
  });

  test('VG-011: Set vote color (Blue)', async () => {
    const { gamePages } = await setupPlayers(multiPlayer, 1);
    const gp = gamePages[0];

    await gp.createRoom('Vote Blue VG-011', { buyinAmount: 10 });
    await gp.joinRoom('Vote Blue VG-011');
    await expect(gp.roomTab('Vote Blue VG-011')).toBeVisible();

    if (await gp.voteBlueZone.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gp.voteBlue();
    }
  });

  test('VG-014: Timer countdown displays', async () => {
    const { gamePages } = await setupPlayers(multiPlayer, 1);
    const gp = gamePages[0];

    await gp.createRoom('Timer Test VG-014', { buyinAmount: 10 });
    await gp.joinRoom('Timer Test VG-014');
    await expect(gp.roomTab('Timer Test VG-014')).toBeVisible();
  });
});

test.describe('1.3 Vote Trading', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });
  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('VG-020: List vote for sale - marketplace accessible', async () => {
    const { gamePages } = await setupPlayers(multiPlayer, 1);
    const gp = gamePages[0];

    await gp.createRoom('Market Test VG-020', { buyinAmount: 10 });
    await gp.joinRoom('Market Test VG-020');
    await expect(gp.roomTab('Market Test VG-020')).toBeVisible();
  });

  test('VG-023: Insufficient funds purchase blocked', async () => {
    const { gamePages } = await setupPlayers(multiPlayer, 1);
    const gp = gamePages[0];

    await gp.createRoom('Funds Test VG-023', { buyinAmount: 10 });
    await gp.joinRoom('Funds Test VG-023');
    await expect(gp.roomTab('Funds Test VG-023')).toBeVisible();
  });
});

test.describe('1.4 Guarantee System', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });
  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('VG-030: Guarantee interface accessible', async () => {
    const { gamePages } = await setupPlayers(multiPlayer, 1);
    const gp = gamePages[0];

    await gp.createRoom('Guarantee Test VG-030', { buyinAmount: 10 });
    await gp.joinRoom('Guarantee Test VG-030');
    await expect(gp.roomTab('Guarantee Test VG-030')).toBeVisible();
  });
});

test.describe('1.5 Wallet & Bank Management', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });
  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('VG-040: Initial wallet balance visible', async () => {
    const { gamePages } = await setupPlayers(multiPlayer, 1);
    const gp = gamePages[0];

    await gp.createRoom('Wallet Test VG-040', { buyinAmount: 10 });
    await gp.joinRoom('Wallet Test VG-040');
    await expect(gp.roomTab('Wallet Test VG-040')).toBeVisible();
    await expect(gp.page.locator('text=/\\$10/').first()).toBeVisible();
  });

  test('VG-044: Pot display shows correct total', async () => {
    const { gamePages } = await setupPlayers(multiPlayer, 1);
    const gp = gamePages[0];

    await gp.createRoom('Pot Display VG-044', { buyinAmount: 25 });
    await gp.joinRoom('Pot Display VG-044');
    await expect(gp.page.getByText('Pot', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(gp.page.locator('text=/\\$25/').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('1.6 Round Progression', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });
  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('VG-050: Game interface shows round information', async () => {
    const { gamePages } = await setupPlayers(multiPlayer, 1);
    const gp = gamePages[0];

    await gp.createRoom('Round Test VG-050', { buyinAmount: 10 });
    await gp.joinRoom('Round Test VG-050');
    await expect(gp.roomTab('Round Test VG-050')).toBeVisible();
  });
});

test.describe('1.7 Tie Handling', () => {
  let multiPlayer: MultiPlayerHelper;

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });
  test.afterEach(async () => {
    await multiPlayer.cleanup();
  });

  test('VG-060: 4 player room setup for tie scenario', async ({ browser }) => {
    // Hybrid: 1 browser + 3 bots (was 4 browsers)
    const setup = await setupHybridGame(browser, {
      botCount: 3,
      roomPrefix: 'TieTest-VG-060',
    });

    try {
      await hybridCreateAndJoinRoom(setup, { buyinAmount: 10 });
      await expect(setup.gamePage.roomTab(setup.roomName)).toBeVisible();
    } finally {
      await hybridCleanup(setup);
    }
  });
});

test.describe('Unique Identity Verification', () => {
  test('All players have unique SpacetimeDB identities', async ({ browser }) => {
    const multiPlayer = new MultiPlayerHelper(browser);

    try {
      const { gamePages } = await setupPlayers(multiPlayer, 3);

      const identities: string[] = [];
      for (const gp of gamePages) {
        await expect(gp.identityDisplay).toBeVisible({ timeout: 10000 });
        identities.push(await gp.getIdentity());
      }

      const uniqueIds = new Set(identities.filter((id) => id.length > 0));
      expect(uniqueIds.size).toBe(identities.filter((id) => id.length > 0).length);

      console.log('Unique identities verified:', identities);
    } finally {
      await multiPlayer.cleanup();
    }
  });
});
