import { Browser, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { TID } from '../../src/lib/test-ids';

/**
 * Helper for managing multiple players in E2E tests.
 * Each player gets their own browser context with isolated storage,
 * ensuring unique SpacetimeDB identities and user data.
 */
export class MultiPlayerHelper {
  private contexts: BrowserContext[] = [];
  private pages: Page[] = [];
  private browser: Browser;
  private logStreams: Map<Page, fs.WriteStream> = new Map();

  constructor(browser: Browser) {
    this.browser = browser;
  }

  /**
   * Create a new player with isolated browser context
   * @param name Optional name for debugging
   * @returns Page object for the new player
   */
  async createPlayer(name?: string): Promise<Page> {
    const context = await this.browser.newContext({
      storageState: undefined,
    });
    
    const page = await context.newPage();
    
    const playerIndex = this.pages.length + 1;
    const playerName = name || `Player ${playerIndex}`;
    console.log(`Created ${playerName}`);
    
    this.contexts.push(context);
    this.pages.push(page);
    
    return page;
  }

  /**
   * Attach console log capture to all pages, writing to a shared log file
   */
  attachLogCapture(logDir: string): void {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.pages.forEach((page, i) => {
      const logFile = path.join(logDir, `player-${i + 1}-${Date.now()}.log`);
      const stream = fs.createWriteStream(logFile, { flags: 'a' });
      this.logStreams.set(page, stream);

      page.on('console', (msg) => {
        stream.write(`[${new Date().toISOString()}] [${msg.type()}] ${msg.text()}\n`);
      });
      page.on('pageerror', (err) => {
        stream.write(`[${new Date().toISOString()}] [PAGE_ERROR] ${err.message}\n`);
      });
    });
  }

  /**
   * Create multiple players at once
   * @param count Number of players to create
   * @returns Array of Page objects
   */
  async createPlayers(count: number): Promise<Page[]> {
    const pages: Page[] = [];
    for (let i = 0; i < count; i++) {
      pages.push(await this.createPlayer(`Player ${i + 1}`));
    }
    return pages;
  }

  /**
   * Navigate all players to the vote page
   * Optionally adds ?multiuser=true for forced unique users
   */
  async navigateAllToVote(useMultiuserParam = true): Promise<void> {
    const url = useMultiuserParam ? '/vote?multiuser=true' : '/vote';
    await Promise.all(this.pages.map(page => page.goto(url)));
  }

  /**
   * Wait for all players to be connected to SpacetimeDB
   */
  async waitForAllConnected(): Promise<void> {
    const sel = `[data-testid="${TID.connectionStatus}"]`;
    await Promise.all(
      this.pages.map(page =>
        page.waitForFunction(
          (s: string) => document.querySelector(s)?.textContent?.includes('Connected'),
          sel,
          { timeout: 30000 },
        )
      )
    );
  }

  /**
   * Get all player pages
   */
  getPages(): Page[] {
    return this.pages;
  }

  /**
   * Get a specific player's page (1-indexed)
   */
  getPlayer(playerNumber: number): Page {
    if (playerNumber < 1 || playerNumber > this.pages.length) {
      throw new Error(`Player ${playerNumber} does not exist. Only ${this.pages.length} players created.`);
    }
    return this.pages[playerNumber - 1];
  }

  /**
   * Clean up all contexts, pages, and log streams
   */
  async cleanup(): Promise<void> {
    for (const stream of this.logStreams.values()) {
      stream.end();
    }
    this.logStreams.clear();
    await Promise.all(this.contexts.map(context => context.close()));
    this.contexts = [];
    this.pages = [];
  }
}

/**
 * Wait for SpacetimeDB connection on a page
 */
export async function waitForConnection(page: Page, timeout = 30000): Promise<void> {
  const sel = `[data-testid="${TID.connectionStatus}"]`;
  await page.waitForFunction(
    (s: string) => document.querySelector(s)?.textContent?.includes('Connected'),
    sel,
    { timeout },
  );
}

/**
 * Wait for a toast message to appear
 */
export async function waitForToast(page: Page, message: string | RegExp, timeout = 5000): Promise<void> {
  await page.waitForSelector(`text=${message}`, { timeout });
}

/**
 * Click a button by its text content
 */
export async function clickButton(page: Page, text: string): Promise<void> {
  await page.click(`button:has-text("${text}")`);
}

/**
 * Fill an input field by its label
 */
export async function fillByLabel(page: Page, label: string, value: string): Promise<void> {
  const input = page.locator(`label:has-text("${label}") + input, label:has-text("${label}") ~ input`);
  await input.fill(value);
}
