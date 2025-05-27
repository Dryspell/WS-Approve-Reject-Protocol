import type { Unit, GameEvent, UnitTaskQueue } from "~/module_bindings";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";

// Constants
const MOVEMENT_SPEED = 2;
const COMBAT_RANGE = 30;
const COMBAT_DAMAGE = 10;
const RESOURCE_GATHER_RATE = 5;

// Helper functions
function distance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function moveTowards(current: { x: number; y: number }, target: { x: number; y: number }, speed: number): { x: number; y: number } {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist <= speed) {
    return target;
  }
  
  const ratio = speed / dist;
  return {
    x: current.x + dx * ratio,
    y: current.y + dy * ratio
  };
}

// Game tick system
export class GameTickSystem {
  private units: Record<number, Unit> = {};
  private events: GameEvent[] = [];
  private taskQueues: Record<number, UnitTaskQueue[]> = {};
  public selectedUnits: Set<number> = new Set();
  private client: ReturnType<typeof useSpacetimeDB>["db"];

  constructor(client: ReturnType<typeof useSpacetimeDB>["db"]) {
    this.client = client;
  }

  isUnitSelected(unitId: number): boolean {
    return this.selectedUnits.has(unitId);
  }

  updateUnits(units: Record<number, Unit>) {
    this.units = units;
  }

  updateTaskQueues(tasks: UnitTaskQueue[]) {
    // Group tasks by unit_id
    this.taskQueues = tasks.reduce((acc, task) => {
      if (!acc[task.unit_id]) {
        acc[task.unit_id] = [];
      }
      acc[task.unit_id].push(task);
      return acc;
    }, {} as Record<number, UnitTaskQueue[]>);
  }

  selectUnit(unitId: number) {
    this.selectedUnits.add(unitId);
  }

  deselectUnit(unitId: number) {
    this.selectedUnits.delete(unitId);
  }

  clearSelection() {
    this.selectedUnits.clear();
  }

  getUnitTaskQueue(unitId: number): UnitTaskQueue[] {
    return this.taskQueues[unitId] || [];
  }

  queueUnitTask(unitId: number, taskType: string, targetId: string) {
    const client = this.client();
    if (!client) return;
    
    client.queue_unit_task(unitId, taskType, targetId);
  }

  queueGroupTask(taskType: string, targetId: string) {
    this.selectedUnits.forEach(unitId => {
      this.queueUnitTask(unitId, taskType, targetId);
    });
  }

  cancelUnitTask(taskId: number) {
    const client = this.client();
    if (!client) return;
    
    client.cancel_unit_task(taskId);
  }

  moveUnit(unitId: number, targetPosition: { x: number; y: number }) {
    // Create a temporary unit at the target position to use as a move target
    const client = this.client();
    if (!client) return;
    
    // Queue a move task to the target position
    this.queueUnitTask(unitId, "move", JSON.stringify(targetPosition));
  }

  moveGroup(targetPosition: { x: number; y: number }) {
    this.selectedUnits.forEach(unitId => {
      this.moveUnit(unitId, targetPosition);
    });
  }
}

// Create a singleton instance
let gameTickSystem: GameTickSystem | undefined;

export function getGameTickSystem(client: ReturnType<typeof useSpacetimeDB>["db"]) {
  if (!gameTickSystem) {
    gameTickSystem = new GameTickSystem(client);
  }
  return gameTickSystem;
} 