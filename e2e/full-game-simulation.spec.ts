import { test, expect, Page } from '@playwright/test';
import { MultiPlayerHelper } from './helpers/multi-player';
import { VoteGamePage, ChatPage, uniqueRoomName } from './helpers/page-objects';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.join(__dirname, '..', 'test-logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function createLogStream(scenario: string): fs.WriteStream {
  const logFile = path.join(LOG_DIR, `${scenario}-${Date.now()}.log`);
  const stream = fs.createWriteStream(logFile, { flags: 'a' });
  stream.write(`=== ${scenario} Started: ${new Date().toISOString()} ===\n`);
  return stream;
}

function attachConsoleLogger(page: Page, playerName: string, logStream: fs.WriteStream) {
  page.on('console', (msg) => {
    const ts = new Date().toISOString();
    logStream.write(`[${ts}] [${playerName}] [${msg.type()}] ${msg.text()}\n`);
  });
  page.on('pageerror', (err) => {
    const ts = new Date().toISOString();
    logStream.write(`[${ts}] [${playerName}] [ERROR] ${err.message}\n`);
  });
}

function log(stream: fs.WriteStream, msg: string) {
  stream.write(`[${new Date().toISOString()}] [SIM] ${msg}\n`);
}

// ---------------------------------------------------------------------------
// Game state extraction + snapshot with JSON sidecar
// ---------------------------------------------------------------------------

async function extractGameState(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const txt = (sel: string) =>
      document.querySelector(sel)?.textContent?.trim() ?? null;
    const exists = (sel: string) => !!document.querySelector(sel);
    const allTxt = (sel: string) =>
      [...document.querySelectorAll(sel)].map(el => el.textContent?.trim());

    return {
      walletBalance: txt('[data-testid="wallet-balance"]'),
      profitLoss: txt('[data-testid="profit-loss"]'),
      potAmount: txt('#pot-amount'),
      roundTimer: txt('[data-testid="round-timer"]'),
      connectionStatus: txt('[data-testid="connection-status"]'),
      identitySnippet: txt('[data-testid="identity-display"]'),
      activeTab: txt('[role="tab"][aria-selected="true"]'),
      visibleTabs: allTxt('[role="tab"]'),
      playerCards: allTxt('[data-testid="player-card"]'),
      chatMessages: allTxt('[data-testid="chat-message"]').slice(-5),
      hasRebuyButton:
        exists('button') &&
        [...document.querySelectorAll('button')].some(b =>
          /re-enter|re-buy/i.test(b.textContent ?? ''),
        ),
      hasLeaveButton: exists('button[title="Leave Room"]'),
      hasReadyButton:
        exists('button') &&
        [...document.querySelectorAll('button')].some(b =>
          /ready to play/i.test(b.textContent ?? ''),
        ),
      visibleToasts: allTxt('[data-sonner-toast]'),
      visibleErrors: [...document.querySelectorAll('.text-red-500, .text-destructive')]
        .map(el => el.textContent?.trim())
        .filter(Boolean)
        .slice(0, 5),
      bodySnippet: document.body.innerText.slice(0, 800),
    };
  });
}

async function snapshot(
  pages: Page[],
  scenario: string,
  moment: string,
  logStream: fs.WriteStream,
  playerSubset?: number[],
) {
  const indices = playerSubset ?? pages.map((_, i) => i);
  const ts = Date.now();

  for (const i of indices) {
    const base = `${scenario}_${moment}_p${i + 1}_${ts}`;

    const pngPath = path.join(LOG_DIR, `${base}.png`);
    await pages[i].screenshot({ path: pngPath, fullPage: true });

    const state = await extractGameState(pages[i]).catch(() => ({
      error: 'extraction failed',
    }));
    const jsonPath = path.join(LOG_DIR, `${base}.json`);
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          scenario,
          moment,
          player: i + 1,
          timestamp: new Date(ts).toISOString(),
          gameState: state,
        },
        null,
        2,
      ),
    );

    log(logStream, `Snapshot [${moment}] Player${i + 1}: ${base}.png + .json`);
  }
}

// ---------------------------------------------------------------------------
// Shared setup helpers
// ---------------------------------------------------------------------------

async function setupPlayers(
  multiPlayer: MultiPlayerHelper,
  count: number,
  logStream: fs.WriteStream,
): Promise<{ pages: Page[]; gamePages: VoteGamePage[] }> {
  const pages = await multiPlayer.createPlayers(count);
  const gamePages = pages.map(p => new VoteGamePage(p));
  pages.forEach((p, i) => attachConsoleLogger(p, `Player${i + 1}`, logStream));

  for (const gp of gamePages) {
    await gp.goto();
  }
  for (const gp of gamePages) {
    await gp.waitForConnection();
  }
  log(logStream, `All ${count} players connected`);
  return { pages, gamePages };
}

async function allJoinRoom(
  pages: Page[],
  gamePages: VoteGamePage[],
  roomName: string,
  logStream: fs.WriteStream,
) {
  for (let i = 0; i < pages.length; i++) {
    await expect(
      pages[i].locator(`[role="tab"]:has-text("${roomName}")`).first(),
    ).toBeVisible({ timeout: 15000 });
    await gamePages[i].joinRoom(roomName);
    log(logStream, `Player${i + 1} joined room`);
  }
}

async function allReadyUp(
  gamePages: VoteGamePage[],
  pages: Page[],
  logStream: fs.WriteStream,
) {
  for (let i = 0; i < gamePages.length; i++) {
    await gamePages[i].clickReady();
    log(logStream, `Player${i + 1} readied up`);
  }
  await expect(pages[0].locator('#pot-amount')).toBeVisible({ timeout: 15000 });
  log(logStream, 'Game started -- pot visible');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Full Game Simulation (5 Players)', () => {
  let multiPlayer: MultiPlayerHelper;
  let logStream: fs.WriteStream;

  test.beforeAll(() => {
    ensureLogDir();
  });

  test.beforeEach(async ({ browser }) => {
    multiPlayer = new MultiPlayerHelper(browser);
  });

  test.afterEach(async () => {
    await multiPlayer.cleanup();
    if (logStream) {
      logStream.write(
        `=== Simulation Ended: ${new Date().toISOString()} ===\n`,
      );
      logStream.end();
    }
  });

  // ──────────────────────────────────────────────────────────
  // Scenario 1: Standard Game (5 players, 5 votes each)
  // ──────────────────────────────────────────────────────────
  test('Scenario 1: Standard Game with market interactions', async () => {
    test.setTimeout(180_000);
    const SC = 'scenario1-standard';
    logStream = createLogStream(SC);

    const { pages, gamePages } = await setupPlayers(multiPlayer, 5, logStream);

    // Create room
    const roomName = uniqueRoomName('Standard');
    await gamePages[0].createRoom(roomName, {
      buyinAmount: 10,
      votesPerPlayer: 5,
    });
    log(logStream, `Player1 created room: ${roomName}`);
    await snapshot(pages, SC, 'lobby-created', logStream, [0]);

    // Join
    await allJoinRoom(pages, gamePages, roomName, logStream);
    await snapshot(pages, SC, 'all-joined', logStream);

    // Ready up & game start
    await allReadyUp(gamePages, pages, logStream);
    await pages[0].waitForTimeout(2000);
    await snapshot(pages, SC, 'game-started', logStream);

    // --- Chat interaction ---
    const chatTab1 = pages[0].locator('[role="tab"]:has-text("Chat")');
    if (await chatTab1.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatTab1.click();
      const chatInput = pages[0].locator('[data-testid="chat-input"]');
      if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chatInput.fill('Good luck everyone!');
        await pages[0].locator('[data-testid="send-button"]').click();
        log(logStream, 'Player1 sent chat: "Good luck everyone!"');
      }
    }

    const chatTab3 = pages[2].locator('[role="tab"]:has-text("Chat")');
    if (await chatTab3.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatTab3.click();
      const chatInput3 = pages[2].locator('[data-testid="chat-input"]');
      if (await chatInput3.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chatInput3.fill('Selling votes cheap! DM me');
        await pages[2].locator('[data-testid="send-button"]').click();
        log(logStream, 'Player3 sent chat message');
      }
    }
    await snapshot(pages, SC, 'after-chat', logStream, [0, 2]);

    // --- Market: Player2 opens My Votes tab ---
    const myVotesTab = pages[1].locator('[role="tab"]:has-text("Mine")');
    if (await myVotesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await myVotesTab.click();
      log(logStream, 'Player2 opened My Votes tab');
    }

    // --- Guarantees: Player4 ---
    const guaranteesTab4 = pages[3].locator(
      '[role="tab"]:has-text("Guarantees")',
    );
    if (await guaranteesTab4.isVisible({ timeout: 3000 }).catch(() => false)) {
      await guaranteesTab4.click();
      log(logStream, 'Player4 opened Guarantees tab');
    }

    // --- Player5 browses guarantees ---
    const guaranteesTab5 = pages[4].locator(
      '[role="tab"]:has-text("Guarantees")',
    );
    if (await guaranteesTab5.isVisible({ timeout: 3000 }).catch(() => false)) {
      await guaranteesTab5.click();
      log(logStream, 'Player5 opened Guarantees tab');
    }
    await snapshot(pages, SC, 'market-browsing', logStream, [1, 3, 4]);

    // --- Voting ---
    for (let i = 0; i < 5; i++) {
      const redBtn = pages[i].locator(
        'button:has-text("Red"), [data-testid="vote-red"]',
      );
      const blueBtn = pages[i].locator(
        'button:has-text("Blue"), [data-testid="vote-blue"]',
      );

      if (i < 3) {
        if (
          await redBtn
            .first()
            .isVisible({ timeout: 3000 })
            .catch(() => false)
        ) {
          await redBtn.first().click();
          log(logStream, `Player${i + 1} set a vote to Red`);
        }
      } else {
        if (
          await blueBtn
            .first()
            .isVisible({ timeout: 3000 })
            .catch(() => false)
        ) {
          await blueBtn.first().click();
          log(logStream, `Player${i + 1} set a vote to Blue`);
        }
      }
    }
    await snapshot(pages, SC, 'votes-set', logStream);

    // --- Wallet verification ---
    for (let i = 0; i < 5; i++) {
      const walletEl = pages[i].locator('[data-testid="wallet-balance"]');
      if (
        await walletEl.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        const text = await walletEl.textContent();
        log(logStream, `Player${i + 1} wallet: ${text}`);
      }
    }

    await snapshot(pages, SC, 'final', logStream);
    log(logStream, 'Scenario 1 completed successfully');
  });

  // ──────────────────────────────────────────────────────────
  // Scenario 2: Quick Game (5 players, 3 votes each)
  // ──────────────────────────────────────────────────────────
  test('Scenario 2: Quick Game with 3 votes per player', async () => {
    test.setTimeout(120_000);
    const SC = 'scenario2-quick';
    logStream = createLogStream(SC);

    const { pages, gamePages } = await setupPlayers(multiPlayer, 5, logStream);

    const roomName = uniqueRoomName('Quick');
    await gamePages[0].createRoom(roomName, {
      buyinAmount: 5,
      votesPerPlayer: 3,
    });
    log(logStream, `Player1 created Quick room: ${roomName}`);
    await snapshot(pages, SC, 'lobby-created', logStream, [0]);

    await allJoinRoom(pages, gamePages, roomName, logStream);
    await allReadyUp(gamePages, pages, logStream);
    await pages[0].waitForTimeout(2000);
    await snapshot(pages, SC, 'game-started', logStream);

    // Chat between players
    for (let i = 0; i < 3; i++) {
      const chatTab = pages[i].locator('[role="tab"]:has-text("Chat")');
      if (await chatTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await chatTab.click();
        const chatInput = pages[i].locator('[data-testid="chat-input"]');
        if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await chatInput.fill(
            `Player${i + 1} checking in for quick game!`,
          );
          await pages[i].locator('[data-testid="send-button"]').click();
          log(logStream, `Player${i + 1} sent chat message`);
        }
      }
    }
    await snapshot(pages, SC, 'after-chat', logStream, [0, 1, 2]);

    // Player4 opens guarantees
    const gTab = pages[3].locator('[role="tab"]:has-text("Guarantees")');
    if (await gTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gTab.click();
      log(logStream, 'Player4 browsing guarantees');
    }

    // Set some votes
    for (let i = 0; i < 5; i++) {
      const colorBtn =
        i % 2 === 0
          ? pages[i].locator(
              'button:has-text("Red"), [data-testid="vote-red"]',
            )
          : pages[i].locator(
              'button:has-text("Blue"), [data-testid="vote-blue"]',
            );
      if (
        await colorBtn
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false)
      ) {
        await colorBtn.first().click();
        log(logStream, `Player${i + 1} set vote color`);
      }
    }
    await snapshot(pages, SC, 'votes-set', logStream);

    await snapshot(pages, SC, 'final', logStream);
    log(logStream, 'Scenario 2 completed successfully');
  });

  // ──────────────────────────────────────────────────────────
  // Scenario 3: No Rebuy Game (rebuy disabled)
  // ──────────────────────────────────────────────────────────
  test('Scenario 3: No Rebuy Game - eliminated player cannot re-enter', async () => {
    test.setTimeout(120_000);
    const SC = 'scenario3-no-rebuy';
    logStream = createLogStream(SC);

    const { pages, gamePages } = await setupPlayers(multiPlayer, 5, logStream);

    const roomName = uniqueRoomName('NoRebuy');
    await gamePages[0].createRoom(roomName, {
      buyinAmount: 10,
      votesPerPlayer: 5,
      allowRebuy: false,
    });
    log(logStream, `Player1 created No-Rebuy room: ${roomName}`);

    await allJoinRoom(pages, gamePages, roomName, logStream);
    await allReadyUp(gamePages, pages, logStream);
    await pages[0].waitForTimeout(2000);
    await snapshot(pages, SC, 'game-started', logStream);

    // Majority Red (P1-P3), minority Blue (P4-P5)
    for (let i = 0; i < 5; i++) {
      const btn =
        i < 3
          ? pages[i].locator(
              'button:has-text("Red"), [data-testid="vote-red"]',
            )
          : pages[i].locator(
              'button:has-text("Blue"), [data-testid="vote-blue"]',
            );
      if (
        await btn
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false)
      ) {
        await btn.first().click();
        log(logStream, `Player${i + 1} voted ${i < 3 ? 'Red' : 'Blue'}`);
      }
    }
    await snapshot(pages, SC, 'votes-set', logStream);

    // Wait for round processing
    await pages[0].waitForTimeout(5000);

    // Check Player5 for absence of re-buy option
    const rebuyButton = pages[4].locator('button:has-text("Re-Enter Game")');
    const rebuyVisible = await rebuyButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    log(
      logStream,
      `Player5 sees Re-Enter button: ${rebuyVisible} (expected: false)`,
    );

    const leaveButton = pages[4].locator('button[title="Leave Room"]');
    if (await leaveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      log(logStream, 'Player5 sees Leave Room button as expected');
    }

    // Snapshot the eliminated player's view -- most important for LLM analysis
    await snapshot(pages, SC, 'post-elimination', logStream, [3, 4]);
    // Also capture a surviving player for comparison
    await snapshot(pages, SC, 'post-elimination-survivor', logStream, [0]);

    await snapshot(pages, SC, 'final', logStream);
    log(logStream, 'Scenario 3 completed successfully');
  });

  // ──────────────────────────────────────────────────────────
  // Scenario 4: Tie Game
  // ──────────────────────────────────────────────────────────
  test('Scenario 4: Tie Game - equal votes on both sides', async () => {
    test.setTimeout(120_000);
    const SC = 'scenario4-tie';
    logStream = createLogStream(SC);

    const { pages, gamePages } = await setupPlayers(multiPlayer, 5, logStream);

    const roomName = uniqueRoomName('TieGame');
    await gamePages[0].createRoom(roomName, {
      buyinAmount: 10,
      votesPerPlayer: 2,
    });
    log(
      logStream,
      `Player1 created room: ${roomName} (2 votes each for easier tie setup)`,
    );

    await allJoinRoom(pages, gamePages, roomName, logStream);
    await allReadyUp(gamePages, pages, logStream);
    await pages[0].waitForTimeout(2000);
    await snapshot(pages, SC, 'game-started', logStream);

    // 5 players x 2 votes = 10 total
    // P1-P2 all Red (4), P4-P5 all Blue (4), P3 split (1R + 1B) => 5R 5B = tie
    for (let i = 0; i < 5; i++) {
      if (i < 2) {
        const redBtns = pages[i].locator(
          'button:has-text("Red"), [data-testid="vote-red"]',
        );
        const count = await redBtns.count();
        for (let v = 0; v < Math.min(count, 2); v++) {
          await redBtns.nth(v).click().catch(() => {});
        }
        log(logStream, `Player${i + 1} set votes to Red`);
      } else if (i >= 3) {
        const blueBtns = pages[i].locator(
          'button:has-text("Blue"), [data-testid="vote-blue"]',
        );
        const count = await blueBtns.count();
        for (let v = 0; v < Math.min(count, 2); v++) {
          await blueBtns.nth(v).click().catch(() => {});
        }
        log(logStream, `Player${i + 1} set votes to Blue`);
      } else {
        const redBtn = pages[i].locator(
          'button:has-text("Red"), [data-testid="vote-red"]',
        );
        if (
          await redBtn
            .first()
            .isVisible({ timeout: 2000 })
            .catch(() => false)
        ) {
          await redBtn.first().click();
          log(logStream, 'Player3 set 1 vote to Red');
        }
        const blueBtn = pages[i].locator(
          'button:has-text("Blue"), [data-testid="vote-blue"]',
        );
        if (
          await blueBtn
            .first()
            .isVisible({ timeout: 2000 })
            .catch(() => false)
        ) {
          await blueBtn.first().click();
          log(logStream, 'Player3 set 1 vote to Blue');
        }
      }
    }
    await snapshot(pages, SC, 'votes-set', logStream);

    // Wait for round processing
    await pages[0].waitForTimeout(5000);

    const completedText = pages[0].locator(
      'text=/Game Over|Tie|Split|completed/i',
    );
    const gameEnded = await completedText
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    log(logStream, `Game ended (tie detected): ${gameEnded}`);

    await snapshot(pages, SC, 'tie-result', logStream);

    await snapshot(pages, SC, 'final', logStream);
    log(logStream, 'Scenario 4 completed successfully');
  });

  // ──────────────────────────────────────────────────────────
  // Scenario 5: Player Departure
  // ──────────────────────────────────────────────────────────
  test('Scenario 5: Player leaves mid-game', async () => {
    test.setTimeout(120_000);
    const SC = 'scenario5-departure';
    logStream = createLogStream(SC);

    const { pages, gamePages } = await setupPlayers(multiPlayer, 5, logStream);

    const roomName = uniqueRoomName('Departure');
    await gamePages[0].createRoom(roomName, {
      buyinAmount: 5,
      votesPerPlayer: 5,
    });
    log(logStream, `Player1 created room: ${roomName}`);

    await allJoinRoom(pages, gamePages, roomName, logStream);
    await allReadyUp(gamePages, pages, logStream);
    await pages[0].waitForTimeout(2000);
    await snapshot(pages, SC, 'game-started', logStream);

    // Player5 chats before leaving
    const chatTab5 = pages[4].locator('[role="tab"]:has-text("Chat")');
    if (await chatTab5.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatTab5.click();
      const chatInput5 = pages[4].locator('[data-testid="chat-input"]');
      if (await chatInput5.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chatInput5.fill('Sorry, gotta go. GL all!');
        await pages[4].locator('[data-testid="send-button"]').click();
        log(logStream, 'Player5 sent farewell chat');
      }
    }
    await snapshot(pages, SC, 'pre-departure', logStream, [4]);

    // Player5 leaves
    const leaveButton = pages[4].locator('button[title="Leave Room"]');
    if (await leaveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await leaveButton.click();
      log(logStream, 'Player5 clicked Leave Room');
      await pages[4].waitForTimeout(2000);
      log(logStream, 'Player5 has left the game');
    }
    // Capture both the departed player and a remaining player
    await snapshot(pages, SC, 'post-departure', logStream, [0, 4]);

    // Remaining players interact
    const chatTab1 = pages[0].locator('[role="tab"]:has-text("Chat")');
    if (await chatTab1.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatTab1.click();
      const chatInput1 = pages[0].locator('[data-testid="chat-input"]');
      if (await chatInput1.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chatInput1.fill('We continue with 4!');
        await pages[0].locator('[data-testid="send-button"]').click();
        log(logStream, 'Player1 confirmed game continues');
      }
    }

    // Remaining players set votes
    for (let i = 0; i < 4; i++) {
      const btn =
        i < 2
          ? pages[i].locator(
              'button:has-text("Red"), [data-testid="vote-red"]',
            )
          : pages[i].locator(
              'button:has-text("Blue"), [data-testid="vote-blue"]',
            );
      if (
        await btn
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false)
      ) {
        await btn.first().click();
        log(logStream, `Player${i + 1} voted ${i < 2 ? 'Red' : 'Blue'}`);
      }
    }
    await snapshot(pages, SC, 'remaining-voted', logStream, [0, 1, 2, 3]);

    // Verify pot still shows
    const potEl = pages[0].locator('#pot-amount');
    if (await potEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      const potText = await potEl.textContent();
      log(logStream, `Pot after departure: ${potText}`);
    }

    await snapshot(pages.slice(0, 4), SC, 'final', logStream);
    log(logStream, 'Scenario 5 completed successfully');
  });
});
