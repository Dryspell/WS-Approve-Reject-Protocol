/**
 * Bot Runner — Standalone script that connects intelligent bot players
 * to a SpacetimeDB game server. Each bot opens its own connection,
 * subscribes to live game state, and makes reactive decisions.
 *
 * Usage: npx tsx scripts/bot-runner.ts [options]
 *
 * Options:
 *   --count N          Number of bots to spawn (default: 3)
 *   --room "name"      Target room name (default: "bot-arena")
 *   --strategy S       contrarian|follower|random|splitter|mixed (default: mixed)
 *   --delay N          Milliseconds between actions (default: 3000)
 *   --chat             Enable occasional chat messages
 *   --verbose          Log every decision
 *   --ready-delay N    Milliseconds before bots ready up (default: 15000)
 *   --host URL         SpacetimeDB host (default: http://127.0.0.1:3000)
 *   --db NAME          Database name (default: game)
 */

import { DbConnection } from '../src/module_bindings';
import type { Identity } from 'spacetimedb';

// ---------------------------------------------------------------------------
// Types & Config
// ---------------------------------------------------------------------------

export type Strategy = 'contrarian' | 'follower' | 'random' | 'splitter' | 'mixed';

export interface BotConfig {
  room: string;
  delay: number;
  readyDelay: number;
  chat: boolean;
  verbose: boolean;
  host: string;
  db: string;
}

const DEFAULT_CONFIG: BotConfig = {
  room: 'bot-arena',
  delay: 3000,
  readyDelay: 15000,
  chat: false,
  verbose: false,
  host: 'http://127.0.0.1:3000',
  db: 'game',
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOT_NAMES = [
  'Sir Botticus',
  'Lady Algorithm',
  'Duke Debugger',
  'Countess Cache',
  'Baron Bytewise',
  'Viscountess Vector',
  'Marquess Mutex',
  'Duchess Data',
  'Earl Exception',
  'Princess Pipeline',
];

const CHAT_MESSAGES = [
  'Interesting move...',
  'I have a cunning plan.',
  'The odds are ever in my favor.',
  'To vote red, or not to vote red?',
  'My circuits are tingling!',
  'All according to the algorithm.',
  'Trust the process.',
  'A bold strategy, let us see if it pays off.',
  'Beep boop, I am definitely a human.',
  'May the best bot win!',
  'I calculated 14,000,605 outcomes.',
  'Elementary, my dear Watson.',
];

const SUBSCRIBE_QUERIES = [
  'SELECT * FROM game_room',
  'SELECT * FROM vote',
  'SELECT * FROM ready_state',
  'SELECT * FROM user',
  'SELECT * FROM end_round_vote',
  'SELECT * FROM chat_message',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jitter(base: number): number {
  return base + Math.floor(Math.random() * base * 0.4 - base * 0.2);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomStrategy(): Exclude<Strategy, 'mixed'> {
  return pick(['contrarian', 'follower', 'random', 'splitter'] as const);
}

// ---------------------------------------------------------------------------
// Bot Class
// ---------------------------------------------------------------------------

export type BotState = 'CONNECTING' | 'IDLE' | 'LOBBY' | 'IN_GAME' | 'DISCONNECTED';

export class Bot {
  readonly name: string;
  readonly index: number;
  readonly strategy: Exclude<Strategy, 'mixed'>;
  private cfg: BotConfig;

  private conn: DbConnection | null = null;
  private identity: Identity | null = null;
  private state: BotState = 'CONNECTING';
  private interval: ReturnType<typeof setInterval> | null = null;
  private readyToggled = false;
  private hasVotedEndRound = false;
  private votedEndRoundForRound = -1;
  private lastChatTick = 0;

  constructor(index: number, strategy: Strategy, config?: Partial<BotConfig>) {
    this.index = index;
    this.name = BOT_NAMES[index % BOT_NAMES.length];
    this.strategy = strategy === 'mixed' ? randomStrategy() : strategy;
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): BotState { return this.state; }
  getIdentity(): Identity | null { return this.identity; }
  getConnection(): DbConnection | null { return this.conn; }

  private log(msg: string) {
    console.log(`[Bot:${this.name}] ${msg}`);
  }

  private debug(msg: string) {
    if (this.cfg.verbose) this.log(msg);
  }

  // ---- Connection ---------------------------------------------------------

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${this.name}: connection timeout`));
      }, 15000);

      this.conn = DbConnection.builder()
        .withUri(this.cfg.host)
        .withDatabaseName(this.cfg.db)
        .onConnect((conn, identity, _token) => {
          this.identity = identity;
          this.log(`Connected (identity ${identity.toHexString().slice(0, 12)}...)`);

          conn.reducers.setName({ name: this.name });
          this.debug(`Set name to "${this.name}"`);

          conn.subscriptionBuilder()
            .onApplied(() => {
              clearTimeout(timeout);
              this.state = 'IDLE';
              this.log(`Subscribed -- strategy: ${this.strategy}`);
              this.startLoop();
              resolve();
            })
            .subscribe(SUBSCRIBE_QUERIES);
        })
        .onConnectError((_ctx, err) => {
          clearTimeout(timeout);
          this.log(`Connection error: ${err}`);
          reject(new Error(`${this.name}: ${err}`));
        })
        .build();
    });
  }

  disconnect() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    if (this.conn) {
      try { this.conn.disconnect(); } catch { /* ignore */ }
    }
    this.state = 'DISCONNECTED';
    this.log('Disconnected');
  }

  // ---- Imperative actions (for test integration) --------------------------

  joinRoom(roomId: number) {
    if (!this.conn || !this.identity) return;
    this.conn.reducers.joinRoom({ roomId, userId: this.identity.toHexString() });
    this.state = 'LOBBY';
    this.readyToggled = false;
  }

  toggleReady(roomId: number) {
    if (!this.conn || !this.identity) return;
    this.conn.reducers.toggleReady({ roomId, userId: this.identity.toHexString() });
    this.readyToggled = true;
  }

  voteColor(voteId: number, color: string) {
    if (!this.conn) return;
    this.conn.reducers.setVoteColor({ voteId, color });
  }

  voteEndRound(roomId: number) {
    if (!this.conn) return;
    this.conn.reducers.voteEndRound({ roomId });
    this.hasVotedEndRound = true;
  }

  findRoom(name: string) {
    if (!this.conn) return null;
    for (const room of this.conn.db.game_room.iter()) {
      if (room.name === name) return room;
    }
    return null;
  }

  getMyVotes(roomId: number, round: number) {
    if (!this.conn || !this.identity) return [];
    const hex = this.identity.toHexString();
    return [...this.conn.db.vote.iter()].filter(
      (v) => v.roomId === roomId && v.playerId === hex && v.roundNumber === round
    );
  }

  // ---- Main Loop ----------------------------------------------------------

  private startLoop() {
    this.interval = setInterval(() => {
      try {
        this.tick();
      } catch (err) {
        this.log(`Tick error: ${err}`);
      }
    }, jitter(this.cfg.delay));
  }

  stopLoop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  private tick() {
    if (!this.conn || !this.identity) return;
    const room = this.findRoom(this.cfg.room);

    switch (this.state) {
      case 'IDLE':
        this.tickIdle(room);
        break;
      case 'LOBBY':
        this.tickLobby(room);
        break;
      case 'IN_GAME':
        this.tickInGame(room);
        break;
    }

    if (this.cfg.chat) this.tickChat(room);
  }

  // ---- State: IDLE --------------------------------------------------------

  private tickIdle(room: ReturnType<Bot['findRoom']>) {
    if (!this.conn || !this.identity) return;
    const identityHex = this.identity.toHexString();

    if (room) {
      if (room.memberIds.includes(identityHex)) {
        this.transitionByStatus(room.gameStatus);
        return;
      }
      this.log(`Joining room "${this.cfg.room}" (id ${room.id})`);
      this.conn.reducers.joinRoom({ roomId: room.id, userId: identityHex });
      this.state = 'LOBBY';
      this.readyToggled = false;
      this.debug('Transitioned to LOBBY');
    } else if (this.index === 0) {
      this.log(`Creating room "${this.cfg.room}"`);
      this.conn.reducers.createRoom({
        roomId: `room-${Date.now()}`,
        name: this.cfg.room,
        creatorId: identityHex,
        buyinAmount: 100,
        votesPerPlayer: 3,
        minPlayers: 2,
        maxPlayers: 10,
        allowRebuy: true,
        allowMidgameJoin: true,
      });
    } else {
      this.debug('Waiting for room to be created...');
    }
  }

  // ---- State: LOBBY -------------------------------------------------------

  private tickLobby(room: ReturnType<Bot['findRoom']>) {
    if (!this.conn || !this.identity || !room) {
      this.state = 'IDLE';
      return;
    }

    const identityHex = this.identity.toHexString();

    if (!room.memberIds.includes(identityHex)) {
      this.debug('Not in room yet, waiting...');
      return;
    }

    if (room.gameStatus !== 'lobby') {
      this.transitionByStatus(room.gameStatus);
      return;
    }

    if (!this.readyToggled) {
      const delay = this.cfg.readyDelay + Math.random() * this.cfg.readyDelay * 0.5;
      this.readyToggled = true; // set immediately to prevent multiple setTimeout calls
      setTimeout(() => {
        if (this.state !== 'LOBBY' || !this.conn || !this.identity) {
          this.readyToggled = false;
          return;
        }
        this.log('Toggling ready');
        this.conn.reducers.toggleReady({ roomId: room.id, userId: this.identity.toHexString() });

        // After a short grace period, if all members are ready, call startGame
        setTimeout(() => {
          if (this.state !== 'LOBBY' || !this.conn || !this.identity) return;
          const currentRoom = this.findRoom();
          if (!currentRoom || currentRoom.gameStatus !== 'lobby') return;
          const readyStateRow = [...this.conn.db.ready_state.iter()].find(
            (rs: any) => rs.roomId === currentRoom.id.toString()
          ) as any;
          const readyCount = readyStateRow?.readyUserIds?.length ?? 0;
          const memberCount = currentRoom.memberIds?.length ?? 0;
          const allReady = memberCount > 0 && readyCount >= memberCount;
          if (allReady) {
            this.log(`All ${memberCount} players ready — calling startGame`);
            try {
              this.conn.reducers.startGame({ roomId: currentRoom.id });
            } catch (_e) { /* already started or permission denied */ }
          }
        }, 3000);
      }, delay);
    }
  }

  // ---- State: IN_GAME -----------------------------------------------------

  private tickInGame(room: ReturnType<Bot['findRoom']>) {
    if (!this.conn || !this.identity || !room) {
      this.state = 'IDLE';
      return;
    }

    if (room.gameStatus === 'lobby') {
      this.state = 'LOBBY';
      this.readyToggled = false;
      this.hasVotedEndRound = false;
      this.debug('Game returned to lobby');
      return;
    }

    if (room.gameStatus === 'finished') {
      this.log('Game finished');
      this.state = 'IDLE';
      this.readyToggled = false;
      this.hasVotedEndRound = false;
      return;
    }

    const identityHex = this.identity.toHexString();
    const myVotes = [...this.conn.db.vote.iter()].filter(
      (v) => v.roomId === room.id && v.playerId === identityHex && v.roundNumber === room.currentRound
    );

    const uncoloredVotes = myVotes.filter((v) => v.color === null || v.color === undefined);

    if (uncoloredVotes.length > 0) {
      const allRoomVotes = [...this.conn.db.vote.iter()].filter(
        (v) => v.roomId === room.id && v.roundNumber === room.currentRound
      );
      const colors = this.decideColors(uncoloredVotes.length, allRoomVotes);
      for (let i = 0; i < uncoloredVotes.length; i++) {
        const color = colors[i];
        this.debug(`Setting vote ${uncoloredVotes[i].id} -> ${color}`);
        this.conn.reducers.setVoteColor({ voteId: uncoloredVotes[i].id, color });
      }
    }

    // Reset vote flag when the round advances
    if (this.votedEndRoundForRound !== room.currentRound) {
      this.hasVotedEndRound = false;
    }

    if (!this.hasVotedEndRound && myVotes.length > 0 && uncoloredVotes.length === 0) {
      if (Math.random() < 0.4) {
        this.debug('Voting to end round');
        this.conn.reducers.voteEndRound({ roomId: room.id });
        this.hasVotedEndRound = true;
        this.votedEndRoundForRound = room.currentRound;
      }
    }
  }

  // ---- Strategies ---------------------------------------------------------

  private decideColors(
    count: number,
    allRoomVotes: { color: string | null | undefined }[]
  ): string[] {
    switch (this.strategy) {
      case 'random':
        return Array.from({ length: count }, () => (Math.random() < 0.5 ? 'red' : 'blue'));

      case 'contrarian': {
        const reds = allRoomVotes.filter((v) => v.color === 'red').length;
        const blues = allRoomVotes.filter((v) => v.color === 'blue').length;
        const minority = reds <= blues ? 'red' : 'blue';
        this.debug(`Contrarian: ${reds} red vs ${blues} blue -> picking ${minority}`);
        return Array.from({ length: count }, () => minority);
      }

      case 'follower': {
        const reds = allRoomVotes.filter((v) => v.color === 'red').length;
        const blues = allRoomVotes.filter((v) => v.color === 'blue').length;
        const majority = reds >= blues ? 'red' : 'blue';
        this.debug(`Follower: ${reds} red vs ${blues} blue -> picking ${majority}`);
        return Array.from({ length: count }, () => majority);
      }

      case 'splitter': {
        const colors: string[] = [];
        for (let i = 0; i < count; i++) {
          colors.push(i % 2 === 0 ? 'red' : 'blue');
        }
        this.debug(`Splitter: ${colors.join(', ')}`);
        return colors;
      }
    }
  }

  // ---- Chat ---------------------------------------------------------------

  private tickChat(room: ReturnType<Bot['findRoom']>) {
    if (this.state !== 'LOBBY' && this.state !== 'IN_GAME') return;
    if (!this.conn || !room) return;
    this.lastChatTick++;
    if (this.lastChatTick < 5) return;
    if (Math.random() > 0.3) return;

    this.lastChatTick = 0;
    const text = pick(CHAT_MESSAGES);
    this.debug(`Chat: "${text}"`);
    try {
      this.conn.reducers.sendChatMessage({
        roomId: `game_${room.id}`,
        text,
        roundNumber: room.gameStatus === 'lobby' ? undefined : room.currentRound,
      });
    } catch (err) {
      this.debug(`Chat failed (will retry later): ${err}`);
    }
  }

  // ---- Helpers ------------------------------------------------------------

  private transitionByStatus(status: string) {
    if (status === 'in_progress' || status === 'active') {
      this.state = 'IN_GAME';
      this.hasVotedEndRound = false;
      this.debug('Transitioned to IN_GAME');
    } else if (status === 'lobby') {
      this.state = 'LOBBY';
      this.readyToggled = false;
      this.debug('Transitioned to LOBBY');
    } else {
      this.state = 'IDLE';
    }
  }
}

// ---------------------------------------------------------------------------
// CLI Runner (only executes when run directly)
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const opts = {
    count: 3,
    room: 'bot-arena',
    strategy: 'mixed' as Strategy,
    delay: 3000,
    readyDelay: 15000,
    chat: false,
    verbose: false,
    host: 'http://127.0.0.1:3000',
    db: 'game',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count':       opts.count = parseInt(args[++i], 10); break;
      case '--room':        opts.room = args[++i]; break;
      case '--strategy':    opts.strategy = args[++i] as Strategy; break;
      case '--delay':       opts.delay = parseInt(args[++i], 10); break;
      case '--ready-delay': opts.readyDelay = parseInt(args[++i], 10); break;
      case '--chat':        opts.chat = true; break;
      case '--verbose':     opts.verbose = true; break;
      case '--host':        opts.host = args[++i]; break;
      case '--db':          opts.db = args[++i]; break;
    }
  }
  return opts;
}

const isDirectRun = process.argv[1]?.includes('bot-runner');

if (isDirectRun) {
  const cliConfig = parseArgs(process.argv);
  const bots: Bot[] = [];

  const shutdown = () => {
    console.log('\nShutting down bots...');
    for (const bot of bots) bot.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('uncaughtException', (err) => {
    console.error('[BotRunner] Uncaught exception (continuing):', err.message);
  });
  process.on('unhandledRejection', (err) => {
    console.error('[BotRunner] Unhandled rejection (continuing):', err);
  });

  (async () => {
    console.log('='.repeat(60));
    console.log('  Socket Signal Bot Runner');
    console.log('='.repeat(60));
    console.log(`  Bots:     ${cliConfig.count}`);
    console.log(`  Room:     ${cliConfig.room}`);
    console.log(`  Strategy: ${cliConfig.strategy}`);
    console.log(`  Delay:    ${cliConfig.delay}ms`);
    console.log(`  Chat:     ${cliConfig.chat}`);
    console.log(`  Verbose:  ${cliConfig.verbose}`);
    console.log(`  Host:     ${cliConfig.host}`);
    console.log(`  Database: ${cliConfig.db}`);
    console.log('='.repeat(60));

    const botCfg: BotConfig = {
      room: cliConfig.room,
      delay: cliConfig.delay,
      readyDelay: cliConfig.readyDelay,
      chat: cliConfig.chat,
      verbose: cliConfig.verbose,
      host: cliConfig.host,
      db: cliConfig.db,
    };

    for (let i = 0; i < cliConfig.count; i++) {
      bots.push(new Bot(i, cliConfig.strategy, botCfg));
    }

    for (const bot of bots) {
      try {
        await bot.connect();
      } catch (err) {
        console.error(`Failed to connect bot: ${err}`);
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`\nAll ${bots.length} bots connected. Press Ctrl+C to stop.\n`);
  })().catch((err) => {
    console.error('Fatal error:', err);
    shutdown();
  });
}
