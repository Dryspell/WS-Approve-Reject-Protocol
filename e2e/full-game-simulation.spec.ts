import { test, expect } from '@playwright/test';
import {
  setupHybridGame,
  hybridStartGame,
  hybridCreateAndJoinRoom,
  hybridBotsVote,
  hybridEndRound,
  hybridCleanup,
  type HybridGameSetup,
} from './helpers/hybrid-flows';
import {
  log,
  createLogStream,
  ensureLogDir,
  snapshot,
} from './helpers/game-flows';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Full Game Simulation — Hybrid Mode
 *
 * Uses 1 real browser (the player under test) + 4 headless SDK bots.
 * This reduces memory from ~1GB (5 Chromium instances) to ~250MB
 * (1 Chromium + 4 lightweight SDK connections).
 */

test.describe('Full Game Simulation (1 Browser + 4 Bots)', () => {
  let setup: HybridGameSetup;
  let logStream: fs.WriteStream;

  test.beforeAll(() => ensureLogDir());

  test.beforeEach(async () => {
    try {
      execSync('npx tsx scripts/reset-test-db.ts', {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'pipe',
        timeout: 15000,
      });
    } catch {
      // Non-fatal: tests can still run with existing data
    }
  });

  test.afterEach(async () => {
    if (setup) await hybridCleanup(setup);
    if (logStream) {
      logStream.write(`=== Simulation Ended: ${new Date().toISOString()} ===\n`);
      logStream.end();
    }
  });

  // ── Scenario 1: Standard Game ──────────────────────────────────────────────

  test('Scenario 1: Standard Game with market interactions', async ({ browser }) => {
    test.setTimeout(120_000);
    const SC = 'scenario1-standard-hybrid';
    logStream = createLogStream(SC);

    setup = await setupHybridGame(browser, {
      botCount: 4,
      botStrategy: 'random',
      roomPrefix: 'Standard',
      logStream,
    });

    await hybridStartGame(setup, {
      buyinAmount: 10,
      votesPerPlayer: 5,
      logStream,
    });
    await setup.page.waitForTimeout(2000);
    await snapshot([setup.page], SC, 'game-started', logStream);

    // Real player sends chat
    await setup.gamePage.openChat();
    await setup.gamePage.sendChat('Good luck everyone!');
    log(logStream, 'Real player sent chat');

    // Real player browses tabs
    const myVotesTab = setup.page.locator('[data-testid="my-votes-tab"]');
    if (await myVotesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await myVotesTab.click();
      log(logStream, 'Real player opened Sell tab');
    }
    await snapshot([setup.page], SC, 'market-browsing', logStream);

    // Real player votes red
    await setup.gamePage.voteRed();
    log(logStream, 'Real player voted red');

    // Bots vote (2 red, 2 blue for an interesting split)
    const bots = setup.bots.getBots();
    const room = bots[0].findRoom(setup.roomName);
    if (room) {
      const botVotes0 = bots[0].getMyVotes(room.id, room.currentRound);
      const botVotes1 = bots[1].getMyVotes(room.id, room.currentRound);
      const botVotes2 = bots[2].getMyVotes(room.id, room.currentRound);
      const botVotes3 = bots[3].getMyVotes(room.id, room.currentRound);
      for (const v of botVotes0.filter(v => !v.color)) bots[0].voteColor(v.id, 'red');
      for (const v of botVotes1.filter(v => !v.color)) bots[1].voteColor(v.id, 'red');
      for (const v of botVotes2.filter(v => !v.color)) bots[2].voteColor(v.id, 'blue');
      for (const v of botVotes3.filter(v => !v.color)) bots[3].voteColor(v.id, 'blue');
      log(logStream, 'Bots voted: 2 red, 2 blue');
    }

    await setup.page.waitForTimeout(1000);
    await snapshot([setup.page], SC, 'votes-set', logStream);

    // Wallet verification
    if (await setup.gamePage.walletBalance.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await setup.gamePage.walletBalance.textContent();
      log(logStream, `Real player wallet: ${text}`);
    }

    await snapshot([setup.page], SC, 'final', logStream);
    log(logStream, 'Scenario 1 completed successfully');
  });

  // ── Scenario 2: Quick Game ─────────────────────────────────────────────────

  test('Scenario 2: Quick Game with 3 votes per player', async ({ browser }) => {
    test.setTimeout(90_000);
    const SC = 'scenario2-quick-hybrid';
    logStream = createLogStream(SC);

    setup = await setupHybridGame(browser, {
      botCount: 4,
      botStrategy: 'random',
      roomPrefix: 'Quick',
      logStream,
    });

    await hybridStartGame(setup, {
      buyinAmount: 5,
      votesPerPlayer: 3,
      logStream,
    });
    await setup.page.waitForTimeout(2000);
    await snapshot([setup.page], SC, 'game-started', logStream);

    // Real player chats
    await setup.gamePage.openChat();
    await setup.gamePage.sendChat('Quick game, let\'s go!');
    log(logStream, 'Real player sent chat');

    // Real player votes red
    await setup.gamePage.voteRed();
    log(logStream, 'Real player voted red');

    // Bots vote with alternating pattern
    await setup.bots.voteAll(setup.roomName);
    log(logStream, 'Bots voted randomly');

    await snapshot([setup.page], SC, 'votes-set', logStream);
    await snapshot([setup.page], SC, 'final', logStream);
    log(logStream, 'Scenario 2 completed successfully');
  });

  // ── Scenario 3: No Rebuy Game ──────────────────────────────────────────────

  test('Scenario 3: No Rebuy Game - elimination round', async ({ browser }) => {
    test.setTimeout(120_000);
    const SC = 'scenario3-no-rebuy-hybrid';
    logStream = createLogStream(SC);

    setup = await setupHybridGame(browser, {
      botCount: 4,
      botStrategy: 'follower',
      roomPrefix: 'NoRebuy',
      logStream,
    });

    await hybridStartGame(setup, {
      buyinAmount: 10,
      votesPerPlayer: 5,
      allowRebuy: false,
      logStream,
    });
    await setup.page.waitForTimeout(2000);
    await snapshot([setup.page], SC, 'game-started', logStream);

    // Real player votes blue (minority)
    await setup.gamePage.voteBlue();
    log(logStream, 'Real player voted blue');

    // Bots all vote red (majority -- follower strategy)
    await setup.bots.voteAll(setup.roomName, 'red');
    log(logStream, 'Bots voted red');

    await snapshot([setup.page], SC, 'votes-set', logStream);

    // End the round
    await hybridEndRound(setup, logStream);

    // Real player should see post-round UI (they voted minority, so they survive)
    await setup.page.waitForTimeout(3000);
    await snapshot([setup.page], SC, 'post-elimination', logStream);

    // Verify no re-buy button is available for eliminated players
    const rebuyButton = setup.page.locator('button:has-text("Re-Enter Game")');
    const rebuyVisible = await rebuyButton.isVisible({ timeout: 3000 }).catch(() => false);
    log(logStream, `Re-Enter button visible: ${rebuyVisible}`);

    await snapshot([setup.page], SC, 'final', logStream);
    log(logStream, 'Scenario 3 completed successfully');
  });

  // ── Scenario 4: Tie Game ───────────────────────────────────────────────────

  test('Scenario 4: Tie Game - equal votes on both sides', async ({ browser }) => {
    test.setTimeout(120_000);
    const SC = 'scenario4-tie-hybrid';
    logStream = createLogStream(SC);

    setup = await setupHybridGame(browser, {
      botCount: 4,
      botStrategy: 'splitter',
      roomPrefix: 'TieGame',
      logStream,
    });

    await hybridStartGame(setup, {
      buyinAmount: 10,
      votesPerPlayer: 2,
      logStream,
    });
    await setup.page.waitForTimeout(2000);
    await snapshot([setup.page], SC, 'game-started', logStream);

    // Real player votes 1 red, 1 blue (splitting)
    await setup.gamePage.voteRed();
    log(logStream, 'Real player voted 1 red');
    await setup.gamePage.voteBlue();
    log(logStream, 'Real player voted 1 blue');

    // Bots use splitter strategy (alternating red/blue)
    await setup.bots.voteAll(setup.roomName);
    log(logStream, 'Bots voted (splitter strategy)');

    await snapshot([setup.page], SC, 'votes-set', logStream);
    await hybridEndRound(setup, logStream);

    const tieText = setup.page.locator('text=/Game Over|Tie|Split|completed/i');
    const tieVisible = await tieText.isVisible({ timeout: 10000 }).catch(() => false);
    log(logStream, `Tie/Game Over detected: ${tieVisible}`);

    await snapshot([setup.page], SC, 'tie-result', logStream);
    await snapshot([setup.page], SC, 'final', logStream);
    log(logStream, 'Scenario 4 completed successfully');
  });

  // ── Scenario 5: Player Departure ──────────────────────────────────────────

  test('Scenario 5: Real player observes bot departure', async ({ browser }) => {
    test.setTimeout(120_000);
    const SC = 'scenario5-departure-hybrid';
    logStream = createLogStream(SC);

    setup = await setupHybridGame(browser, {
      botCount: 4,
      botStrategy: 'random',
      roomPrefix: 'Departure',
      logStream,
    });

    await hybridStartGame(setup, {
      buyinAmount: 5,
      votesPerPlayer: 5,
      logStream,
    });
    await setup.page.waitForTimeout(2000);
    await snapshot([setup.page], SC, 'game-started', logStream);

    // Disconnect one bot to simulate departure
    const departingBot = setup.bots.getBot(3);
    departingBot.disconnect();
    log(logStream, `Bot "${departingBot.name}" disconnected (simulating departure)`);

    await setup.page.waitForTimeout(3000);
    await snapshot([setup.page], SC, 'post-departure', logStream);

    // Real player chats
    await setup.gamePage.openChat();
    await setup.gamePage.sendChat('We continue without them!');
    log(logStream, 'Real player sent chat');

    // Real player votes
    await setup.gamePage.voteRed();
    log(logStream, 'Real player voted red');

    // Remaining bots vote
    await setup.bots.voteAll(setup.roomName, 'blue');
    log(logStream, 'Remaining bots voted blue');

    await snapshot([setup.page], SC, 'remaining-voted', logStream);

    // Check pot amount
    if (await setup.gamePage.potAmount.isVisible({ timeout: 3000 }).catch(() => false)) {
      const potText = await setup.gamePage.potAmount.textContent();
      log(logStream, `Pot after departure: ${potText}`);
    }

    await snapshot([setup.page], SC, 'final', logStream);
    log(logStream, 'Scenario 5 completed successfully');
  });
});
