/**
 * Hybrid game flow helpers: 1 real browser player + N headless bots.
 *
 * These replace the memory-heavy pattern of spawning multiple browser
 * contexts per player. Only the player whose UI is being tested uses
 * a real Playwright page; all other players are lightweight SDK bots
 * that connect directly to SpacetimeDB.
 *
 * Memory savings: ~70-80% for a typical 5-player test
 * (1 Chromium ~200MB + 4 bots ~5MB each vs 5 Chromium instances)
 */

import { Browser, Page } from '@playwright/test';
import { VoteGamePage, uniqueRoomName } from './page-objects';
import { TestBotHelper } from './test-bots';
import type { Strategy } from '../../scripts/bot-runner';
import * as fs from 'fs';
import { log, createLogStream, attachConsoleLogger, ensureLogDir } from './game-flows';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HybridGameSetup {
  /** The real browser page (player under test) */
  page: Page;
  /** Page Object for the real player */
  gamePage: VoteGamePage;
  /** All SDK bots */
  bots: TestBotHelper;
  /** Room name */
  roomName: string;
}

export interface HybridOptions {
  /** Number of headless bots (default: 4) */
  botCount?: number;
  /** Buyin amount for room creation (default: 10) */
  buyinAmount?: number;
  /** Votes per player (default: 5) */
  votesPerPlayer?: number;
  /** Allow rebuy (default: true) */
  allowRebuy?: boolean;
  /** Allow midgame join (default: false) */
  allowMidgameJoin?: boolean;
  /** Bot voting strategy (default: 'random') */
  botStrategy?: Strategy;
  /** Room name prefix (default: 'hybrid') */
  roomPrefix?: string;
  /** Optional log stream for simulation logging */
  logStream?: fs.WriteStream;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * Create a hybrid game setup: 1 real browser player + N bots.
 * The real player navigates to /vote and connects. Bots connect
 * directly to SpacetimeDB (no browser).
 */
export async function setupHybridGame(
  browser: Browser,
  options: HybridOptions = {},
): Promise<HybridGameSetup> {
  const {
    botCount = 4,
    botStrategy = 'random',
    roomPrefix = 'hybrid',
    logStream,
  } = options;

  const roomName = uniqueRoomName(roomPrefix);

  // Create the real browser player
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  const gamePage = new VoteGamePage(page);

  if (logStream) attachConsoleLogger(page, 'RealPlayer', logStream);

  await gamePage.goto();
  await gamePage.waitForConnection();
  if (logStream) log(logStream, 'Real player connected');

  // Create headless bots
  const bots = new TestBotHelper();
  await bots.spawn(botCount, roomName, { strategy: botStrategy });
  if (logStream) log(logStream, `${botCount} bots connected`);

  return { page, gamePage, bots, roomName };
}

// ---------------------------------------------------------------------------
// Room flows
// ---------------------------------------------------------------------------

/**
 * Real player creates a room, then bots join it.
 */
export async function hybridCreateAndJoinRoom(
  setup: HybridGameSetup,
  options: HybridOptions = {},
): Promise<void> {
  const {
    buyinAmount = 10,
    votesPerPlayer = 5,
    allowRebuy = true,
    allowMidgameJoin = false,
    logStream,
  } = options;

  // Real player creates the room
  await setup.gamePage.createRoom(setup.roomName, {
    buyinAmount,
    votesPerPlayer,
    allowRebuy,
    allowMidgameJoin,
  });
  if (logStream) log(logStream, `Real player created room: ${setup.roomName}`);

  // Real player clicks the room tab
  await setup.gamePage.joinRoom(setup.roomName);

  // Bots join the room
  await setup.bots.joinAll(setup.roomName);
  await setup.bots.waitForAllInRoom(setup.roomName);
  if (logStream) log(logStream, `All bots joined room: ${setup.roomName}`);

  // Allow SpacetimeDB subscription updates to propagate to the real browser
  await setup.page.waitForTimeout(1500);
}

/**
 * Full lobby flow: create room, join, ready up, game starts.
 * Real player creates + readies, bots join + ready.
 */
export async function hybridStartGame(
  setup: HybridGameSetup,
  options: HybridOptions = {},
): Promise<void> {
  await hybridCreateAndJoinRoom(setup, options);

  // Real player readies up
  await setup.gamePage.clickReady();
  if (options.logStream) log(options.logStream, 'Real player readied up');

  // Bots ready up
  await setup.bots.readyAll(setup.roomName);
  if (options.logStream) log(options.logStream, 'All bots readied up');

  // Wait for game to start (pot becomes visible)
  await setup.gamePage.waitForGameStart();
  if (options.logStream) log(options.logStream, 'Game started');
}

// ---------------------------------------------------------------------------
// Voting flows
// ---------------------------------------------------------------------------

/**
 * Bots cast their votes. Real player votes separately via the UI.
 */
export async function hybridBotsVote(
  setup: HybridGameSetup,
  color?: 'red' | 'blue',
  logStream?: fs.WriteStream,
): Promise<void> {
  await setup.bots.voteAll(setup.roomName, color);
  if (logStream) log(logStream, `Bots voted ${color ?? 'random'}`);
}

/**
 * All bots vote to end the round early.
 */
export async function hybridBotsEndRound(
  setup: HybridGameSetup,
  logStream?: fs.WriteStream,
): Promise<void> {
  await setup.bots.voteEndRoundAll(setup.roomName);
  if (logStream) log(logStream, 'Bots voted to end round');
}

/**
 * End round with both real player and bots voting to end.
 */
export async function hybridEndRound(
  setup: HybridGameSetup,
  logStream?: fs.WriteStream,
): Promise<void> {
  // Real player votes to end
  await setup.gamePage.clickEndRound();

  // Bots vote to end
  await hybridBotsEndRound(setup, logStream);

  // Wait for server to process
  await setup.page.waitForTimeout(2000);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Clean up the hybrid setup: close browser context and disconnect bots.
 */
export async function hybridCleanup(setup: HybridGameSetup): Promise<void> {
  await setup.bots.cleanup();
  await setup.page.context().close();
}
