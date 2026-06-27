/**
 * Practice Bots — in-browser bot manager for single-player practice games.
 *
 * Reuses the same autonomous `Bot` class that powers the CLI bot-runner and the
 * E2E hybrid tests. Each bot opens its own SpacetimeDB connection (a fresh
 * anonymous identity) directly from the player's browser, joins the target room
 * by name, readies up, and then plays autonomously (voting, wandering,
 * harvesting, market activity) for the duration of the practice game.
 *
 * Bots are deliberately spawned with indices starting at 1 so the `Bot`'s
 * "index 0 creates the room" branch never fires — the human always owns room
 * creation, which removes any duplicate-room race.
 */

import { Bot, type BotConfig, type Strategy } from "../../scripts/bot-runner";

export type { Strategy };

export interface SpawnOptions {
  /** Voting/behaviour strategy for the bots (default: 'mixed'). */
  strategy?: Strategy;
  /** Ms before a bot readies up after joining (default: 3500). */
  readyDelay?: number;
  /** Ms between autonomous bot actions (default: 1800). */
  delay?: number;
  /** Whether bots send occasional chat messages (default: false). */
  chat?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getHost(): string {
  return (
    (import.meta as any).env?.VITE_SPACETIME_HOST || "http://127.0.0.1:3000"
  );
}

function getDb(): string {
  const env = (import.meta as any).env ?? {};
  return env.VITE_SPACETIME_MODULE_NAME || env.VITE_SPACETIME_DATABASE || "game";
}

class PracticeBotManager {
  private bots: Bot[] = [];
  private roomName: string | null = null;
  private unloadBound = false;

  get count(): number {
    return this.bots.length;
  }

  get activeRoom(): string | null {
    return this.roomName;
  }

  /**
   * Spawn `count` bots into the room with the given name. Bots connect, then
   * autonomously join + ready + play. Resolves once all connections are open.
   */
  async spawn(
    roomName: string,
    count: number,
    options: SpawnOptions = {},
  ): Promise<void> {
    this.roomName = roomName;
    this.bindUnload();

    const cfg: Partial<BotConfig> = {
      room: roomName,
      host: getHost(),
      db: getDb(),
      readyDelay: options.readyDelay ?? 3500,
      delay: options.delay ?? 1800,
      chat: options.chat ?? false,
      verbose: false,
    };
    const strategy: Strategy = options.strategy ?? "mixed";

    // Indices start at 1 so the "index 0 creates the room" path never fires.
    const startIndex = this.bots.length;
    const fresh: Bot[] = [];
    for (let i = 0; i < count; i++) {
      const bot = new Bot(startIndex + i + 1, strategy, cfg);
      this.bots.push(bot);
      fresh.push(bot);
    }

    for (const bot of fresh) {
      try {
        await bot.connect();
      } catch (err) {
        console.warn("[PracticeBots] Failed to connect a bot:", err);
      }
      await sleep(200);
    }
  }

  /** Disconnect and forget every bot. Safe to call repeatedly. */
  stopAll(): void {
    for (const bot of this.bots) {
      try {
        bot.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.bots = [];
    this.roomName = null;
  }

  private bindUnload(): void {
    if (this.unloadBound || typeof window === "undefined") return;
    this.unloadBound = true;
    window.addEventListener("beforeunload", () => this.stopAll());
  }
}

/** Process-wide singleton so any component can manage the active practice bots. */
export const practiceBots = new PracticeBotManager();
