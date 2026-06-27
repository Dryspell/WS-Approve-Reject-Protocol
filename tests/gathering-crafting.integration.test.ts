/**
 * Integration coverage for the resource-gathering and crafting/task-queue
 * mechanics — the actual SpacetimeDB *reducers*, not just the client-side
 * crafting math (which `crafting.test.ts` already covers).
 *
 * These tests drive a real game end-to-end through headless SDK bots:
 *   spawn bots → create room → ready up (auto-starts the game) → move a unit
 *   to a resource → gather → assert inventory/resource deltas, and queue
 *   craft/gather tasks → assert they land in unit_task_queue.
 *
 * Like `db-http.test.ts`, the suite **skips itself** when no local SpacetimeDB
 * is reachable, so it never breaks `pnpm test` on a machine without the dev DB.
 * To run it: start the DB + publish the module (`pnpm dev` or `pnpm
 * publish:local`), then `pnpm test`.
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { execSync } from 'child_process';
import { Bot } from '../scripts/bot-runner';
import { TestBotHelper } from '../e2e/helpers/test-bots';

const HOST = 'http://127.0.0.1:3000';
const DB = 'game';

async function serverReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${HOST}/v1/ping`);
    return res.ok;
  } catch {
    return false;
  }
}

const reachable = await serverReachable();
const suite = reachable ? describe : describe.skip;

if (!reachable) {
  // eslint-disable-next-line no-console
  console.warn(
    `[gathering-crafting] SpacetimeDB not reachable at ${HOST} — skipping integration suite.`,
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll `fn` until it returns a truthy value or the timeout elapses. */
async function waitFor<T>(
  fn: () => T | undefined | null | false,
  opts: { timeout?: number; interval?: number; label?: string } = {},
): Promise<T> {
  const { timeout = 20000, interval = 200, label = 'condition' } = opts;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const v = fn();
    if (v) return v as T;
    await sleep(interval);
  }
  throw new Error(`waitFor: timed out after ${timeout}ms waiting for ${label}`);
}

/** Map a server resource_type to its UnitInventory field (camelCase binding). */
const INVENTORY_FIELD: Record<string, string> = {
  wood: 'wood',
  stone: 'stone',
  metal_ore: 'metalOre',
  coal: 'coal',
  gems: 'gems',
  fiber: 'fiber',
  hide: 'hide',
  sand: 'sand',
  food: 'food',
};

const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

// ── suite ────────────────────────────────────────────────────────────────

suite('Gathering & crafting mechanics (reducer integration)', () => {
  const bots = new TestBotHelper({ host: HOST, db: DB });
  const roomName = `mech-${Date.now()}`;
  let actor: Bot;
  let roomId: number;

  beforeAll(async () => {
    // Best-effort clean slate so wallets/rooms are predictable.
    try {
      execSync('npx tsx scripts/reset-test-db.ts', { stdio: 'pipe', timeout: 20000 });
    } catch {
      /* non-fatal — unique room name still isolates this run */
    }

    // 3 bots (server min_players is 2, so 3 is comfortably enough).
    await bots.spawn(3, roomName, { strategy: 'random' });
    actor = bots.getBot(0);

    // Bot 0 creates the room; everyone joins + readies (ready auto-starts).
    const conn = actor.getConnection()!;
    conn.reducers.createRoom({
      roomId: `room-${Date.now()}`,
      name: roomName,
      creatorId: actor.getIdentity()!.toHexString(),
      buyinAmount: 10,
      votesPerPlayer: 5,
      minPlayers: 2,
      maxPlayers: 10,
      allowRebuy: true,
      allowMidgameJoin: true,
      combatEnabled: true,
    });

    await bots.joinAll(roomName);
    await bots.waitForAllInRoom(roomName);
    await bots.readyAll(roomName);

    // Game auto-starts when all members are ready; wait for it to go active.
    const room = await waitFor(
      () => {
        const r = actor.findRoom(roomName);
        return r && r.gameStatus === 'active' ? r : null;
      },
      { timeout: 30000, label: 'game to become active' },
    );
    roomId = room.id;

    // start_game creates initial units + resources; wait for both.
    await waitFor(
      () =>
        [...actor.getConnection()!.db.unit.iter()].some(
          (u) =>
            u.roomId === roomId &&
            u.unitType === 'minion' &&
            u.ownerId === actor.getIdentity()!.toHexString(),
        ),
      { timeout: 20000, label: "actor's units to spawn" },
    );
    await waitFor(
      () => [...actor.getConnection()!.db.resource.iter()].some((r) => r.roomId === roomId && r.amount > 0),
      { timeout: 20000, label: 'resources to spawn' },
    );
  }, 90000);

  afterAll(async () => {
    await bots.cleanup();
  });

  it('gather_resource: a unit harvests a nearby resource, updating inventory and depleting the node', async () => {
    const conn = actor.getConnection()!;
    const myId = actor.getIdentity()!.toHexString();

    const unit = [...conn.db.unit.iter()].find(
      (u) => u.roomId === roomId && u.unitType === 'minion' && u.ownerId === myId,
    )!;
    expect(unit).toBeTruthy();

    // Pick the nearest resource node with supply.
    const resources = [...conn.db.resource.iter()].filter((r) => r.roomId === roomId && r.amount > 0);
    expect(resources.length).toBeGreaterThan(0);
    let target = resources[0];
    let best = Infinity;
    for (const r of resources) {
      const d = dist(unit.position.x, unit.position.y, r.position.x, r.position.y);
      if (d < best) {
        best = d;
        target = r;
      }
    }

    const invField = INVENTORY_FIELD[target.resourceType];
    expect(invField).toBeTruthy();

    const inv0 = [...conn.db.unit_inventory.iter()].find((i) => i.unitId === unit.id)!;
    expect(inv0).toBeTruthy();
    const before = (inv0 as any)[invField] as number;
    const resBefore = target.amount;

    // Walk the unit to the node (move_unit advances by `speed` per call), then
    // gather once in range. Poll until the inventory reflects the harvest.
    const GATHER_RANGE = 28; // server threshold is 30
    let gathered = false;
    for (let i = 0; i < 120 && !gathered; i++) {
      const u = [...conn.db.unit.iter()].find((x) => x.id === unit.id)!;
      const res = [...conn.db.resource.iter()].find((r) => r.id === target.id);
      if (!res) break; // node depleted/removed — treat as gathered below via inventory check
      const d = dist(u.position.x, u.position.y, res.position.x, res.position.y);
      if (d <= GATHER_RANGE) {
        conn.reducers.gatherResource({ unitId: unit.id, resourceId: target.id });
      } else {
        conn.reducers.moveUnit({ unitId: unit.id, targetPosition: { x: res.position.x, y: res.position.y } });
      }
      await sleep(180);
      const invNow = [...conn.db.unit_inventory.iter()].find((inv) => inv.unitId === unit.id)!;
      if (((invNow as any)[invField] as number) > before) gathered = true;
    }

    const invAfter = [...conn.db.unit_inventory.iter()].find((i) => i.unitId === unit.id)!;
    const after = (invAfter as any)[invField] as number;

    // Inventory increased by the gather amount...
    expect(after).toBeGreaterThan(before);

    // ...and the resource node was depleted by the same amount (or removed when
    // it hit zero).
    const resAfter = [...conn.db.resource.iter()].find((r) => r.id === target.id);
    const gainedAmount = after - before;
    if (resAfter) {
      expect(resAfter.amount).toBe(resBefore - gainedAmount);
    } else {
      // Node was deleted because it reached 0 — the harvest must have covered it.
      expect(gainedAmount).toBeGreaterThanOrEqual(resBefore);
    }
  }, 60000);

  it('queue_unit_task: craft and gather jobs are enqueued for a unit', async () => {
    const conn = actor.getConnection()!;
    const myId = actor.getIdentity()!.toHexString();
    const unit = [...conn.db.unit.iter()].find(
      (u) => u.roomId === roomId && u.unitType === 'minion' && u.ownerId === myId,
    )!;

    const queuedBefore = [...conn.db.unit_task_queue.iter()].filter((t) => t.unitId === unit.id).length;

    conn.reducers.queueUnitTask({ unitId: unit.id, taskType: 'craft', targetId: 'lumber' });
    conn.reducers.queueUnitTask({ unitId: unit.id, taskType: 'gather', targetId: 'wood' });

    const tasks = await waitFor(
      () => {
        const mine = [...conn.db.unit_task_queue.iter()].filter((t) => t.unitId === unit.id);
        return mine.length >= queuedBefore + 2 ? mine : null;
      },
      { timeout: 15000, label: 'queued tasks to appear' },
    );

    const craft = tasks.find((t) => t.taskType === 'craft' && t.targetId === 'lumber');
    const gather = tasks.find((t) => t.taskType === 'gather' && t.targetId === 'wood');
    expect(craft).toBeTruthy();
    expect(gather).toBeTruthy();
    // Newly queued tasks start out pending before the game tick processes them.
    expect(['pending', 'in_progress', 'completed']).toContain(craft!.status);
  }, 30000);
});
