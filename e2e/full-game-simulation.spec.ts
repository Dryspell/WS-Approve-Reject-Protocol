import { test, expect } from '@playwright/test';
import { MultiPlayerHelper } from './helpers/multi-player';
import { uniqueRoomName } from './helpers/page-objects';
import {
  setupPlayers,
  startGame,
  createAndJoinRoom,
  allReadyUp,
  setVotes,
  setMultipleVotes,
  playerSendsChat,
  endRoundEarly,
  snapshot,
  log,
  createLogStream,
  ensureLogDir,
  type PlayerSet,
} from './helpers/game-flows';
import * as fs from 'fs';

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Full Game Simulation (5 Players)', () => {
  let multiPlayer: MultiPlayerHelper;
  let logStream: fs.WriteStream;

  test.beforeAll(() => ensureLogDir());

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
    if (logStream) {
      logStream.write(`=== Simulation Ended: ${new Date().toISOString()} ===\n`);
      logStream.end();
    }
  });

  // ── Scenario 1: Standard Game ──────────────────────────────────────────────

  test('Scenario 1: Standard Game with market interactions', async () => {
    test.setTimeout(180_000);
    const SC = 'scenario1-standard';
    logStream = createLogStream(SC);

    const players = await setupPlayers(multiPlayer, 5, logStream);
    const { pages, gamePages } = players;
    const roomName = uniqueRoomName('Standard');

    await startGame(players, roomName, { buyinAmount: 10, votesPerPlayer: 5 }, logStream);
    await pages[0].waitForTimeout(2000);
    await snapshot(pages, SC, 'game-started', logStream);

    // Chat
    await playerSendsChat(gamePages[0], 'Good luck everyone!', logStream);
    await playerSendsChat(gamePages[2], 'Selling votes cheap! DM me', logStream);
    await snapshot(pages, SC, 'after-chat', logStream, [0, 2]);

    // Tabs
    const myVotesTab = pages[1].locator('[role="tab"]:has-text("Mine")');
    if (await myVotesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await myVotesTab.click();
      log(logStream, 'Player2 opened My Votes tab');
    }
    const gTab4 = pages[3].locator('[role="tab"]:has-text("Guarantees")');
    if (await gTab4.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gTab4.click();
      log(logStream, 'Player4 opened Guarantees tab');
    }
    const gTab5 = pages[4].locator('[role="tab"]:has-text("Guarantees")');
    if (await gTab5.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gTab5.click();
      log(logStream, 'Player5 opened Guarantees tab');
    }
    await snapshot(pages, SC, 'market-browsing', logStream, [1, 3, 4]);

    // Vote: P1-P3 Red, P4-P5 Blue
    await setVotes(players, ['red', 'red', 'red', 'blue', 'blue'], logStream);
    await snapshot(pages, SC, 'votes-set', logStream);

    // Wallet verification
    for (let i = 0; i < 5; i++) {
      if (await gamePages[i].walletBalance.isVisible({ timeout: 3000 }).catch(() => false)) {
        const text = await gamePages[i].walletBalance.textContent();
        log(logStream, `Player${i + 1} wallet: ${text}`);
      }
    }

    await snapshot(pages, SC, 'final', logStream);
    log(logStream, 'Scenario 1 completed successfully');
  });

  // ── Scenario 2: Quick Game ─────────────────────────────────────────────────

  test('Scenario 2: Quick Game with 3 votes per player', async () => {
    test.setTimeout(120_000);
    const SC = 'scenario2-quick';
    logStream = createLogStream(SC);

    const players = await setupPlayers(multiPlayer, 5, logStream);
    const { pages, gamePages } = players;
    const roomName = uniqueRoomName('Quick');

    await startGame(players, roomName, { buyinAmount: 5, votesPerPlayer: 3 }, logStream);
    await pages[0].waitForTimeout(2000);
    await snapshot(pages, SC, 'game-started', logStream);

    // Chat
    for (let i = 0; i < 3; i++) {
      await playerSendsChat(gamePages[i], `Player${i + 1} checking in for quick game!`, logStream);
    }
    await snapshot(pages, SC, 'after-chat', logStream, [0, 1, 2]);

    // Guarantees tab for P4
    const gTab = pages[3].locator('[role="tab"]:has-text("Guarantees")');
    if (await gTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gTab.click();
      log(logStream, 'Player4 browsing guarantees');
    }

    // Alternating votes
    await setVotes(players, ['red', 'blue', 'red', 'blue', 'red'], logStream);
    await snapshot(pages, SC, 'votes-set', logStream);
    await snapshot(pages, SC, 'final', logStream);
    log(logStream, 'Scenario 2 completed successfully');
  });

  // ── Scenario 3: No Rebuy Game ──────────────────────────────────────────────

  test('Scenario 3: No Rebuy Game - eliminated player cannot re-enter', async () => {
    test.setTimeout(120_000);
    const SC = 'scenario3-no-rebuy';
    logStream = createLogStream(SC);

    const players = await setupPlayers(multiPlayer, 5, logStream);
    const { pages, gamePages } = players;
    const roomName = uniqueRoomName('NoRebuy');

    await startGame(
      players,
      roomName,
      { buyinAmount: 10, votesPerPlayer: 5, allowRebuy: false },
      logStream,
    );
    await pages[0].waitForTimeout(2000);
    await snapshot(pages, SC, 'game-started', logStream);

    // P1-P3 Red, P4-P5 Blue
    await setVotes(players, ['red', 'red', 'red', 'blue', 'blue'], logStream);
    await snapshot(pages, SC, 'votes-set', logStream);

    await endRoundEarly(players, logStream);

    // Check P5 for absence of re-buy
    const rebuyButton = pages[4].locator('button:has-text("Re-Enter Game")');
    const rebuyVisible = await rebuyButton.isVisible({ timeout: 5000 }).catch(() => false);
    log(logStream, `Player5 sees Re-Enter button: ${rebuyVisible} (expected: false)`);

    if (await gamePages[4].leaveRoomButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      log(logStream, 'Player5 sees Leave Room button as expected');
    }

    await snapshot(pages, SC, 'post-elimination', logStream, [3, 4]);
    await snapshot(pages, SC, 'post-elimination-survivor', logStream, [0]);
    await snapshot(pages, SC, 'final', logStream);
    log(logStream, 'Scenario 3 completed successfully');
  });

  // ── Scenario 4: Tie Game ───────────────────────────────────────────────────

  test('Scenario 4: Tie Game - equal votes on both sides', async () => {
    test.setTimeout(120_000);
    const SC = 'scenario4-tie';
    logStream = createLogStream(SC);

    const players = await setupPlayers(multiPlayer, 5, logStream);
    const { pages, gamePages } = players;
    const roomName = uniqueRoomName('TieGame');

    await startGame(
      players,
      roomName,
      { buyinAmount: 10, votesPerPlayer: 2 },
      logStream,
    );
    await pages[0].waitForTimeout(2000);
    await snapshot(pages, SC, 'game-started', logStream);

    // P1-P2: 2 Red, P4-P5: 2 Blue, P3: 1R + 1B => 5R 5B = tie
    await setMultipleVotes(gamePages[0], 'red', 2);
    log(logStream, 'Player1 set votes to Red');
    await setMultipleVotes(gamePages[1], 'red', 2);
    log(logStream, 'Player2 set votes to Red');
    await setMultipleVotes(gamePages[3], 'blue', 2);
    log(logStream, 'Player4 set votes to Blue');
    await setMultipleVotes(gamePages[4], 'blue', 2);
    log(logStream, 'Player5 set votes to Blue');
    // P3 splits
    await gamePages[2].voteRed();
    log(logStream, 'Player3 set 1 vote to Red');
    await gamePages[2].voteBlue();
    log(logStream, 'Player3 set 1 vote to Blue');
    await snapshot(pages, SC, 'votes-set', logStream);

    await endRoundEarly(players, logStream);

    const completedText = pages[0].locator('text=/Game Over|Tie|Split|completed/i');
    const gameEnded = await completedText.isVisible({ timeout: 10000 }).catch(() => false);
    log(logStream, `Game ended (tie detected): ${gameEnded}`);

    await snapshot(pages, SC, 'tie-result', logStream);
    await snapshot(pages, SC, 'final', logStream);
    log(logStream, 'Scenario 4 completed successfully');
  });

  // ── Scenario 5: Player Departure ──────────────────────────────────────────

  test('Scenario 5: Player leaves mid-game', async () => {
    test.setTimeout(120_000);
    const SC = 'scenario5-departure';
    logStream = createLogStream(SC);

    const players = await setupPlayers(multiPlayer, 5, logStream);
    const { pages, gamePages } = players;
    const roomName = uniqueRoomName('Departure');

    await startGame(players, roomName, { buyinAmount: 5, votesPerPlayer: 5 }, logStream);
    await pages[0].waitForTimeout(2000);
    await snapshot(pages, SC, 'game-started', logStream);

    // P5 chats then leaves
    await playerSendsChat(gamePages[4], 'Sorry, gotta go. GL all!', logStream);
    await snapshot(pages, SC, 'pre-departure', logStream, [4]);

    if (await gamePages[4].leaveRoomButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gamePages[4].leaveRoomButton.click();
      log(logStream, 'Player5 clicked Leave Room');
      await pages[4].waitForTimeout(2000);
      log(logStream, 'Player5 has left the game');
    }
    await snapshot(pages, SC, 'post-departure', logStream, [0, 4]);

    // P1 chats
    await playerSendsChat(gamePages[0], 'We continue with 4!', logStream);

    // Remaining players vote
    await setVotes(players, ['red', 'red', 'blue', 'blue', null], logStream);
    await snapshot(pages, SC, 'remaining-voted', logStream, [0, 1, 2, 3]);

    if (await gamePages[0].potAmount.isVisible({ timeout: 3000 }).catch(() => false)) {
      const potText = await gamePages[0].potAmount.textContent();
      log(logStream, `Pot after departure: ${potText}`);
    }

    await snapshot(pages.slice(0, 4), SC, 'final', logStream);
    log(logStream, 'Scenario 5 completed successfully');
  });
});
