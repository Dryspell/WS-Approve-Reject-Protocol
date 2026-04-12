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
  'My laborers are hard at work.',
  'Resources incoming!',
  'The harvest is plentiful.',
];

const SUBSCRIBE_QUERIES = [
  'SELECT * FROM game_room',
  'SELECT * FROM vote',
  'SELECT * FROM ready_state',
  'SELECT * FROM user',
  'SELECT * FROM end_round_vote',
  'SELECT * FROM chat_message',
  // New: needed for minion management and resource harvesting
  'SELECT * FROM unit',
  'SELECT * FROM resource',
  'SELECT * FROM unit_stats',
];

// Gather range must be < the server's 30-unit threshold
const GATHER_RANGE = 28;
// Wander speed: units moved per tick toward wander target
const WANDER_STEP = 1.5;
// How often to pick a new wander target (in ticks)
const WANDER_RETARGET_TICKS = 20;
// How often to push a position update (every N ticks)
const POS_UPDATE_EVERY = 5;
// Ticks to wait between laborer spawn attempts
const SPAWN_COOLDOWN_TICKS = 10;
// Ticks to wait between market actions
const MARKET_COOLDOWN_TICKS = 15;

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

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function dist2d(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
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

  // ---- Avatar position (wandering) ----------------------------------------
  private posX = rand(10, 90);
  private posZ = rand(10, 90);
  private wanderTargetX = rand(10, 90);
  private wanderTargetZ = rand(10, 90);
  private wanderTick = 0;
  private posUpdateTick = 0;

  // ---- Laborer management --------------------------------------------------
  /** Maps unitId → resourceId that this laborer is heading toward */
  private laborerResourceTargets = new Map<number, string>();
  /** Ticks remaining before next spawn attempt */
  private spawnCooldown = 0;

  // ---- Market + side bets (one-shot per game) ------------------------------
  private hasPlacedSideBet = false;
  private hasListedVoteForSale = false;
  private marketCooldown = 0;

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

  /** Fire-and-forget a reducer call, swallowing server-side rejections. */
  private safeCall(p: Promise<void>) {
    p.catch((err) => this.debug(`Reducer rejected: ${err}`));
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

          this.safeCall(conn.reducers.setName({ name: this.name }));
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
    this.safeCall(this.conn.reducers.joinRoom({ roomId, userId: this.identity.toHexString() }));
    this.state = 'LOBBY';
    this.readyToggled = false;
  }

  toggleReady(roomId: number) {
    if (!this.conn || !this.identity) return;
    this.safeCall(this.conn.reducers.toggleReady({ roomId, userId: this.identity.toHexString() }));
    this.readyToggled = true;
  }

  voteColor(voteId: number, color: string) {
    if (!this.conn) return;
    this.safeCall(this.conn.reducers.setVoteColor({ voteId, color }));
  }

  voteEndRound(roomId: number) {
    if (!this.conn) return;
    this.safeCall(this.conn.reducers.voteEndRound({ roomId }));
    this.hasVotedEndRound = true;
  }

  findRoom(name?: string) {
    if (!this.conn) return null;
    const target = name ?? this.cfg.room;
    for (const room of this.conn.db.game_room.iter()) {
      if (room.name === target) return room;
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

  resumeLoop() {
    if (this.interval) return;
    this.startLoop();
  }

  private tick() {
    if (!this.conn || !this.identity) return;
    const room = this.findRoom();

    switch (this.state) {
      case 'IDLE':
        this.tickIdle(room);
        break;
      case 'LOBBY':
        this.tickLobby(room);
        this.tickPosition(room);
        break;
      case 'IN_GAME':
        this.tickInGame(room);
        this.tickPosition(room);
        this.tickLaborers(room);
        this.tickMarket(room);
        this.tickSideBet(room);
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
      this.safeCall(this.conn.reducers.joinRoom({ roomId: room.id, userId: identityHex }));
      this.state = 'LOBBY';
      this.readyToggled = false;
      this.debug('Transitioned to LOBBY');
    } else if (this.index === 0) {
      this.log(`Creating room "${this.cfg.room}"`);
      this.safeCall(this.conn.reducers.createRoom({
        roomId: `room-${Date.now()}`,
        name: this.cfg.room,
        creatorId: identityHex,
        buyinAmount: 100,
        votesPerPlayer: 3,
        minPlayers: 2,
        maxPlayers: 10,
        allowRebuy: true,
        allowMidgameJoin: true,
        combatEnabled: true,
      }));
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
        this.safeCall(this.conn.reducers.toggleReady({ roomId: room.id, userId: this.identity.toHexString() }));

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
            this.safeCall(this.conn.reducers.startGame({ roomId: currentRoom.id }));
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

    if (room.gameStatus === 'finished' || room.gameStatus === 'completed') {
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
        this.safeCall(this.conn.reducers.setVoteColor({ voteId: uncoloredVotes[i].id, color }));
      }
    }

    // Reset vote flag when the round advances
    if (this.votedEndRoundForRound !== room.currentRound) {
      this.hasVotedEndRound = false;
    }

    if (!this.hasVotedEndRound && myVotes.length > 0 && uncoloredVotes.length === 0) {
      if (Math.random() < 0.4) {
        this.debug('Voting to end round');
        this.safeCall(this.conn.reducers.voteEndRound({ roomId: room.id }));
        this.hasVotedEndRound = true;
        this.votedEndRoundForRound = room.currentRound;
      }
    }
  }

  // ---- Avatar position wandering ------------------------------------------

  private tickPosition(room: ReturnType<Bot['findRoom']>) {
    if (!this.conn || !room) return;

    this.wanderTick++;
    this.posUpdateTick++;

    // Pick a new wander target periodically
    if (this.wanderTick >= WANDER_RETARGET_TICKS) {
      this.wanderTargetX = rand(10, 90);
      this.wanderTargetZ = rand(10, 90);
      this.wanderTick = 0;
      this.debug(`New wander target: (${this.wanderTargetX.toFixed(1)}, ${this.wanderTargetZ.toFixed(1)})`);
    }

    // Move toward wander target
    const dx = this.wanderTargetX - this.posX;
    const dz = this.wanderTargetZ - this.posZ;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > WANDER_STEP) {
      this.posX += (dx / d) * WANDER_STEP;
      this.posZ += (dz / d) * WANDER_STEP;
    } else {
      this.posX = this.wanderTargetX;
      this.posZ = this.wanderTargetZ;
    }

    // Push position update every N ticks to avoid flooding
    if (this.posUpdateTick >= POS_UPDATE_EVERY) {
      this.posUpdateTick = 0;
      const rotationY = Math.atan2(dx, dz);
      const isMoving = d > 0.5;
      this.safeCall(this.conn.reducers.updatePlayerPosition({
        roomId: room.id,
        x: this.posX,
        z: this.posZ,
        rotationY,
        isMoving,
      }));
    }
  }

  // ---- Laborer spawning + resource harvesting -----------------------------

  private tickLaborers(room: ReturnType<Bot['findRoom']>) {
    if (!this.conn || !this.identity || !room) return;
    if (room.gameStatus !== 'in_progress') return;

    const identityHex = this.identity.toHexString();

    // Decrement spawn cooldown each tick
    if (this.spawnCooldown > 0) this.spawnCooldown--;

    // Collect my minions in this room
    const myMinions = [...this.conn.db.unit.iter()].filter(
      (u) => u.unitType === 'minion' && u.ownerId === identityHex && u.roomId === room.id
    );

    // Spawn more laborers if under the votesPerPlayer cap
    if (myMinions.length < room.votesPerPlayer && this.spawnCooldown <= 0) {
      this.debug(`Spawning laborer (${myMinions.length}/${room.votesPerPlayer})`);
      this.safeCall(this.conn.reducers.spawnLaborer({ roomId: room.id }));
      this.spawnCooldown = SPAWN_COOLDOWN_TICKS;
    }

    // Collect all resources in this room that still have supply
    const roomResources = [...this.conn.db.resource.iter()].filter(
      (r) => r.roomId === room.id && r.amount > 0
    );

    if (roomResources.length === 0) {
      this.laborerResourceTargets.clear();
      return;
    }

    // For each laborer, ensure it's moving toward and harvesting a resource
    for (const unit of myMinions) {
      // Clean up stale targets (resource depleted or gone)
      const targetId = this.laborerResourceTargets.get(unit.id);
      if (targetId) {
        const target = roomResources.find((r) => r.id === targetId);
        if (!target) {
          this.laborerResourceTargets.delete(unit.id);
        }
      }

      // Assign a resource target if none
      if (!this.laborerResourceTargets.has(unit.id)) {
        // Pick the nearest resource
        let nearest = roomResources[0];
        let nearestDist = Infinity;
        for (const res of roomResources) {
          const d = dist2d(unit.position.x, unit.position.y, res.position.x, res.position.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = res;
          }
        }
        this.laborerResourceTargets.set(unit.id, nearest.id);
        this.debug(`Laborer ${unit.id} targeting resource ${nearest.id} (${nearest.resourceType}) at dist ${nearestDist.toFixed(1)}`);
      }

      const resourceId = this.laborerResourceTargets.get(unit.id)!;
      const resource = roomResources.find((r) => r.id === resourceId);
      if (!resource) continue;

      const d = dist2d(unit.position.x, unit.position.y, resource.position.x, resource.position.y);

      if (d <= GATHER_RANGE) {
        this.safeCall(this.conn.reducers.gatherResource({ unitId: unit.id, resourceId }));
        this.debug(`Laborer ${unit.id} gathered ${resource.resourceType} (dist ${d.toFixed(1)})`);
      } else {
        this.safeCall(this.conn.reducers.moveUnit({
          unitId: unit.id,
          targetPosition: { x: resource.position.x, y: resource.position.y },
        }));
        this.debug(`Laborer ${unit.id} moving toward resource (dist ${d.toFixed(1)})`);
      }
    }
  }

  // ---- Market activity ----------------------------------------------------

  private tickMarket(room: ReturnType<Bot['findRoom']>) {
    if (!this.conn || !this.identity || !room) return;
    if (room.gameStatus !== 'in_progress') return;

    if (this.marketCooldown > 0) {
      this.marketCooldown--;
      return;
    }

    // Only act ~15% of ticks to avoid spamming
    if (Math.random() > 0.15) return;

    const identityHex = this.identity.toHexString();

    // List one uncolored vote for sale (once per game, at a slight markup)
    if (!this.hasListedVoteForSale) {
      const uncoloredVote = [...this.conn.db.vote.iter()].find(
        (v) =>
          v.roomId === room.id &&
          v.playerId === identityHex &&
          (v.color === null || v.color === undefined) &&
          !v.isForSale
      );
      if (uncoloredVote) {
        const price = room.buyinAmount * 1.3;
        this.safeCall(this.conn.reducers.setVoteForSale({ voteId: uncoloredVote.id, price }));
        this.hasListedVoteForSale = true;
        this.marketCooldown = MARKET_COOLDOWN_TICKS;
        this.debug(`Listed vote ${uncoloredVote.id} for sale at ${price.toFixed(2)}`);
        return;
      }
    }

    // Buy a cheap vote from another player
    const cheapVote = [...this.conn.db.vote.iter()].find(
      (v) =>
        v.roomId === room.id &&
        v.isForSale &&
        v.salePrice != null &&
        v.salePrice < room.buyinAmount * 0.9 &&
        v.playerId !== identityHex
    );
    if (cheapVote && cheapVote.salePrice != null) {
      this.safeCall(this.conn.reducers.createTradeOffer({
        roomId: room.id,
        roundNumber: room.currentRound,
        offerType: 'buy',
        voteId: cheapVote.id,
        price: cheapVote.salePrice,
      }));
      this.marketCooldown = MARKET_COOLDOWN_TICKS;
      this.debug(`Bought vote ${cheapVote.id} for ${cheapVote.salePrice.toFixed(2)}`);
    }
  }

  // ---- Side bets (when eliminated) ----------------------------------------

  private tickSideBet(room: ReturnType<Bot['findRoom']>) {
    if (!this.conn || !this.identity || !room) return;
    if (this.hasPlacedSideBet) return;
    if (room.gameStatus !== 'in_progress') return;

    const identityHex = this.identity.toHexString();
    if (!room.eliminatedPlayers.includes(identityHex)) return;

    // Determine majority color from current votes
    const roomVotes = [...this.conn.db.vote.iter()].filter(
      (v) => v.roomId === room.id && v.roundNumber === room.currentRound
    );
    const reds = roomVotes.filter((v) => v.color === 'red').length;
    const blues = roomVotes.filter((v) => v.color === 'blue').length;
    const majorityColor = reds >= blues ? 'red' : 'blue';

    // Bet 10% of wallet on the majority color
    const userRow = [...this.conn.db.user.iter()].find(
      (u) => u.identity.toHexString() === identityHex
    );
    const walletBalance = (userRow as any)?.walletBalance ?? 0;
    const betAmount = walletBalance * 0.1;

    if (betAmount < 1) {
      this.debug('Not enough wallet balance for a side bet');
      this.hasPlacedSideBet = true; // mark done so we stop checking
      return;
    }

    this.safeCall(this.conn.reducers.placeSideBet({
      roomId: room.id,
      betType: 'color_wins',
      betTarget: majorityColor,
      amount: betAmount,
    }));
    this.hasPlacedSideBet = true;
    this.log(`Placed side bet $${betAmount.toFixed(2)} on ${majorityColor} (eliminated)`);
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
    this.safeCall(this.conn.reducers.sendChatMessage({
      roomId: `game_${room.id}`,
      text,
      roundNumber: room.gameStatus === 'lobby' ? undefined : room.currentRound,
    }));
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

    // Reset per-game state whenever we change game state
    this.resetGameState();
  }

  /** Clears all per-game state so it resets cleanly for the next round/game */
  private resetGameState() {
    this.laborerResourceTargets.clear();
    this.hasPlacedSideBet = false;
    this.hasListedVoteForSale = false;
    this.spawnCooldown = 0;
    this.marketCooldown = 0;
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
    console.log('  Nashfall Bot Runner');
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
