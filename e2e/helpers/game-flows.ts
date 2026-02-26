import { Page, expect } from '@playwright/test';
import { MultiPlayerHelper } from './multi-player';
import { VoteGamePage } from './page-objects';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.resolve(__dirname, '..', '..', 'test-logs');

// ─── Logging ─────────────────────────────────────────────────────────────────

export function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function createLogStream(scenario: string): fs.WriteStream {
  ensureLogDir();
  const logFile = path.join(LOG_DIR, `${scenario}-${Date.now()}.log`);
  const stream = fs.createWriteStream(logFile, { flags: 'a' });
  stream.write(`=== ${scenario} Started: ${new Date().toISOString()} ===\n`);
  return stream;
}

export function log(stream: fs.WriteStream, msg: string) {
  stream.write(`[${new Date().toISOString()}] [SIM] ${msg}\n`);
}

export function attachConsoleLogger(page: Page, playerName: string, logStream: fs.WriteStream) {
  page.on('console', (msg) => {
    logStream.write(`[${new Date().toISOString()}] [${playerName}] [${msg.type()}] ${msg.text()}\n`);
  });
  page.on('pageerror', (err) => {
    logStream.write(`[${new Date().toISOString()}] [${playerName}] [ERROR] ${err.message}\n`);
  });
}

// ─── Player setup ────────────────────────────────────────────────────────────

export interface PlayerSet {
  pages: Page[];
  gamePages: VoteGamePage[];
}

/**
 * Create N players, navigate to /vote, and wait for SpacetimeDB connection.
 * Optionally attach console loggers.
 */
export async function setupPlayers(
  multiPlayer: MultiPlayerHelper,
  count: number,
  logStream?: fs.WriteStream,
): Promise<PlayerSet> {
  const pages = await multiPlayer.createPlayers(count);
  const gamePages = pages.map((p) => new VoteGamePage(p));

  if (logStream) {
    pages.forEach((p, i) => attachConsoleLogger(p, `Player${i + 1}`, logStream));
  }

  for (const gp of gamePages) await gp.goto();
  for (const gp of gamePages) await gp.waitForConnection();

  if (logStream) log(logStream, `All ${count} players connected`);
  return { pages, gamePages };
}

// ─── Room flows ──────────────────────────────────────────────────────────────

export interface RoomOptions {
  buyinAmount?: number;
  votesPerPlayer?: number;
  allowRebuy?: boolean;
  allowMidgameJoin?: boolean;
}

/**
 * Player 0 creates a room; all players see and join the tab.
 */
export async function createAndJoinRoom(
  { pages, gamePages }: PlayerSet,
  roomName: string,
  options: RoomOptions = {},
  logStream?: fs.WriteStream,
) {
  await gamePages[0].createRoom(roomName, options);
  if (logStream) log(logStream, `Player1 created room: ${roomName}`);

  for (let i = 0; i < pages.length; i++) {
    await gamePages[i].waitForRoomTab(roomName);
    await gamePages[i].joinRoom(roomName);
    if (logStream) log(logStream, `Player${i + 1} joined room`);
  }
}

/**
 * All players ready up, then wait for the game to start (pot visible).
 */
export async function allReadyUp(
  { gamePages }: PlayerSet,
  logStream?: fs.WriteStream,
) {
  for (let i = 0; i < gamePages.length; i++) {
    await gamePages[i].clickReady();
    if (logStream) log(logStream, `Player${i + 1} readied up`);
  }
  await gamePages[0].waitForGameStart();
  if (logStream) log(logStream, 'Game started -- pot visible');
}

/**
 * Full lobby flow: create room → join → ready → game starts.
 */
export async function startGame(
  players: PlayerSet,
  roomName: string,
  options: RoomOptions = {},
  logStream?: fs.WriteStream,
) {
  await createAndJoinRoom(players, roomName, options, logStream);
  await allReadyUp(players, logStream);
}

// ─── Voting flows ────────────────────────────────────────────────────────────

export type VoteColor = 'red' | 'blue';

/**
 * Each player clicks their assigned color's drop zone once.
 * `assignments[i]` is the color for player i, or null to skip.
 */
export async function setVotes(
  { gamePages }: PlayerSet,
  assignments: (VoteColor | null)[],
  logStream?: fs.WriteStream,
) {
  for (let i = 0; i < assignments.length; i++) {
    const color = assignments[i];
    if (!color) continue;

    const zone = color === 'red' ? gamePages[i].voteRedZone : gamePages[i].voteBlueZone;
    if (await zone.isVisible({ timeout: 3000 }).catch(() => false)) {
      await zone.click();
      if (logStream) log(logStream, `Player${i + 1} voted ${color}`);
    }
  }
}

/**
 * Click a vote zone multiple times for a player (to set N votes).
 */
export async function setMultipleVotes(
  gamePage: VoteGamePage,
  color: VoteColor,
  count: number,
) {
  const zone = color === 'red' ? gamePage.voteRedZone : gamePage.voteBlueZone;
  if (await zone.isVisible({ timeout: 3000 }).catch(() => false)) {
    for (let v = 0; v < count; v++) await zone.click();
  }
}

// ─── Chat flows ──────────────────────────────────────────────────────────────

/**
 * Open the chat tab (if present) and send a message.
 */
export async function playerSendsChat(
  gamePage: VoteGamePage,
  message: string,
  logStream?: fs.WriteStream,
) {
  await gamePage.openChat();
  await gamePage.sendChat(message);
  if (logStream) log(logStream, `Sent chat: "${message}"`);
}

// ─── Snapshot helpers ────────────────────────────────────────────────────────

export async function extractGameState(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const txt = (sel: string) =>
      document.querySelector(sel)?.textContent?.trim() ?? null;
    const exists = (sel: string) => !!document.querySelector(sel);
    const allTxt = (sel: string) =>
      [...document.querySelectorAll(sel)].map((el) => el.textContent?.trim());

    return {
      walletBalance: txt('[data-testid="wallet-balance"]'),
      profitLoss: txt('[data-testid="profit-loss"]'),
      potAmount: txt('[data-testid="pot-amount"]'),
      roundTimer: txt('[data-testid="round-timer"]'),
      connectionStatus: txt('[data-testid="connection-status"]'),
      identitySnippet: txt('[data-testid="identity-display"]'),
      activeTab: txt('[role="tab"][aria-selected="true"]'),
      visibleTabs: allTxt('[role="tab"]'),
      playerCards: allTxt('[data-testid="player-card"]'),
      chatMessages: allTxt('[data-testid="chat-message"]').slice(-5),
      hasLeaveButton: exists('[data-testid="leave-room-btn"]'),
      hasReadyButton: exists('[data-testid="ready-button"]'),
      visibleToasts: allTxt('[data-sonner-toast]'),
      visibleErrors: [...document.querySelectorAll('.text-red-500, .text-destructive')]
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .slice(0, 5),
      bodySnippet: document.body.innerText.slice(0, 800),
    };
  });
}

export async function snapshot(
  pages: Page[],
  scenario: string,
  moment: string,
  logStream: fs.WriteStream,
  playerSubset?: number[],
) {
  ensureLogDir();
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
      JSON.stringify({ scenario, moment, player: i + 1, timestamp: new Date(ts).toISOString(), gameState: state }, null, 2),
    );

    log(logStream, `Snapshot [${moment}] Player${i + 1}: ${base}.png + .json`);
  }
}
