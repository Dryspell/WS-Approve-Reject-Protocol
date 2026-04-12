import { Bot, type BotConfig, type Strategy } from '../../scripts/bot-runner';

/**
 * Manages headless SpacetimeDB bot players for use in Playwright tests.
 * Each bot connects directly to SpacetimeDB via the SDK -- no browser
 * instance, no DOM, no Three.js. This dramatically reduces memory usage
 * compared to spawning a full browser context per player.
 *
 * Typical usage:
 *   const bots = new TestBotHelper();
 *   await bots.spawn(4, 'my-room', { strategy: 'random' });
 *   // ... bots are now connected and will auto-join the room
 *   await bots.waitForAllInRoom('my-room');
 *   await bots.readyAll('my-room');
 *   // ... run test assertions on the real browser player
 *   await bots.cleanup();
 */
export class TestBotHelper {
  private bots: Bot[] = [];
  private config: BotConfig;

  constructor(config?: Partial<BotConfig>) {
    this.config = {
      room: 'test-room',
      delay: 1000,
      chat: false,
      verbose: false,
      host: 'http://127.0.0.1:3000',
      db: 'game',
      ...config,
    };
  }

  /**
   * Spawn N bots, connect them, and configure them for a specific room.
   * The bots' auto-loop is stopped -- they won't act autonomously unless
   * you call `enableAutoPlay()`. Use the imperative methods instead.
   */
  async spawn(
    count: number,
    roomName: string,
    options?: { strategy?: Strategy; staggerMs?: number }
  ): Promise<Bot[]> {
    const strategy = options?.strategy ?? 'random';
    const stagger = options?.staggerMs ?? 200;

    this.config.room = roomName;

    for (let i = 0; i < count; i++) {
      const bot = new Bot(this.bots.length, strategy, this.config);
      this.bots.push(bot);
    }

    for (const bot of this.bots.slice(-count)) {
      await bot.connect();
      bot.stopLoop();
      if (stagger > 0) {
        await new Promise((r) => setTimeout(r, stagger));
      }
    }

    return this.bots.slice(-count);
  }

  /**
   * Wait until all bots can see a room with the given name in their
   * SpacetimeDB subscription. Polls every 200ms up to `timeoutMs`.
   */
  async waitForRoom(roomName: string, timeoutMs = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const allSee = this.bots.every((b) => b.findRoom(roomName) !== null);
      if (allSee) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`TestBotHelper: not all bots can see room "${roomName}" after ${timeoutMs}ms`);
  }

  /**
   * All bots join a room by name.
   */
  async joinAll(roomName: string): Promise<void> {
    await this.waitForRoom(roomName);
    for (const bot of this.bots) {
      const room = bot.findRoom(roomName);
      if (room) bot.joinRoom(room.id);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  /**
   * Wait until all bots appear in the room's memberIds.
   */
  async waitForAllInRoom(roomName: string, timeoutMs = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const allIn = this.bots.every((bot) => {
        const room = bot.findRoom(roomName);
        const id = bot.getIdentity()?.toHexString();
        return room && id && room.memberIds.includes(id);
      });
      if (allIn) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`TestBotHelper: not all bots joined room "${roomName}" after ${timeoutMs}ms`);
  }

  /**
   * All bots toggle ready in the given room.
   */
  async readyAll(roomName: string): Promise<void> {
    for (const bot of this.bots) {
      const room = bot.findRoom(roomName);
      if (room) bot.toggleReady(room.id);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  /**
   * All bots set their votes for the current round using the given color
   * or their assigned strategy. If `color` is provided, all votes go to
   * that color; otherwise each bot uses its own strategy logic.
   * Pauses the autonomous loop to avoid conflicts.
   */
  async voteAll(roomName: string, color?: 'red' | 'blue'): Promise<void> {
    this.disableAutoPlay();
    for (const bot of this.bots) {
      const room = bot.findRoom(roomName);
      if (!room) continue;
      const votes = bot.getMyVotes(room.id, room.currentRound);
      const uncolored = votes.filter((v) => !v.color);
      for (const v of uncolored) {
        const c = color ?? (Math.random() < 0.5 ? 'red' : 'blue');
        bot.voteColor(v.id, c);
      }
    }
    await new Promise((r) => setTimeout(r, 300));
    this.enableAutoPlay();
  }

  /**
   * All bots vote to end the current round.
   * Pauses the autonomous loop to avoid conflicts.
   */
  async voteEndRoundAll(roomName: string): Promise<void> {
    this.disableAutoPlay();
    for (const bot of this.bots) {
      const room = bot.findRoom(roomName);
      if (room) bot.voteEndRound(room.id);
      await new Promise((r) => setTimeout(r, 50));
    }
    await new Promise((r) => setTimeout(r, 500));
    this.enableAutoPlay();
  }

  /**
   * Enable the autonomous tick loop on all bots so they wander, spawn
   * laborers, gather resources, interact with the market, and chat.
   */
  enableAutoPlay(): void {
    for (const bot of this.bots) {
      bot.resumeLoop();
    }
  }

  /**
   * Pause the autonomous tick loop on all bots (they'll stop acting
   * autonomously but remain connected).
   */
  disableAutoPlay(): void {
    for (const bot of this.bots) {
      bot.stopLoop();
    }
  }

  /** Get all bots */
  getBots(): Bot[] {
    return [...this.bots];
  }

  /** Get a specific bot (0-indexed) */
  getBot(index: number): Bot {
    return this.bots[index];
  }

  /** Number of bots currently managed */
  get count(): number {
    return this.bots.length;
  }

  /**
   * Disconnect and clean up all bots.
   */
  async cleanup(): Promise<void> {
    for (const bot of this.bots) {
      bot.disconnect();
    }
    this.bots = [];
  }
}
