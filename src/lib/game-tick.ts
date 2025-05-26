import type { Unit, GameEvent } from "../spacetime/game.sd";
import { gameService } from "./game";

// Constants
const MOVEMENT_SPEED = 2;
const COMBAT_RANGE = 30;
const COMBAT_DAMAGE = 10;
const RESOURCE_GATHER_RATE = 5;

// Helper functions
function distance(pos1: [number, number], pos2: [number, number]): number {
  const dx = pos2[0] - pos1[0];
  const dy = pos2[1] - pos1[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function moveTowards(current: [number, number], target: [number, number], speed: number): [number, number] {
  const dx = target[0] - current[0];
  const dy = target[1] - current[1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist <= speed) {
    return target;
  }
  
  const ratio = speed / dist;
  return [
    current[0] + dx * ratio,
    current[1] + dy * ratio
  ];
}

// Game tick system
export class GameTickSystem {
  private units: Unit[] = [];
  private events: GameEvent[] = [];

  constructor() {
    // Subscribe to unit and event updates
    gameService.subscribe(state => {
      this.units = state.units;
      this.events = state.events;
    });
  }

  tick() {
    // Process each unit
    for (const unit of this.units) {
      this.processUnit(unit);
    }
  }

  private processUnit(unit: Unit) {
    // Handle unit tasks
    if (unit.taskType) {
      const targetUnit = this.units.find(u => u.id === unit.targetId);
      if (!targetUnit) return;

      switch (unit.taskType) {
        case "gather": {
          this.handleGathering(unit, targetUnit);
          break;
        }
        case "craft": {
          this.handleCrafting(unit, targetUnit);
          break;
        }
        case "upgrade": {
          this.handleUpgrading(unit, targetUnit);
          break;
        }
      }
    }

    // Handle combat
    this.handleCombat(unit);
  }

  private handleGathering(unit: Unit, target: Unit) {
    const dist = distance(unit.position, target.position);
    
    if (dist > COMBAT_RANGE) {
      // Move towards resource
      const newPos = moveTowards(unit.position, target.position, MOVEMENT_SPEED);
      gameService.moveUnit(unit.id, newPos);
    } else {
      // Gather resource
      gameService.createGameEvent(
        unit.roomId,
        "resource",
        unit.id,
        target.id,
        RESOURCE_GATHER_RATE
      );
    }
  }

  private handleCrafting(unit: Unit, target: Unit) {
    const dist = distance(unit.position, target.position);
    
    if (dist > COMBAT_RANGE) {
      // Move towards workshop
      const newPos = moveTowards(unit.position, target.position, MOVEMENT_SPEED);
      gameService.moveUnit(unit.id, newPos);
    } else {
      // Craft item
      gameService.createGameEvent(
        unit.roomId,
        "craft",
        unit.id,
        target.id,
        1
      );
    }
  }

  private handleUpgrading(unit: Unit, target: Unit) {
    const dist = distance(unit.position, target.position);
    
    if (dist > COMBAT_RANGE) {
      // Move towards upgrade building
      const newPos = moveTowards(unit.position, target.position, MOVEMENT_SPEED);
      gameService.moveUnit(unit.id, newPos);
    } else {
      // Upgrade unit
      gameService.createGameEvent(
        unit.roomId,
        "upgrade",
        unit.id,
        target.id,
        1
      );
    }
  }

  private handleCombat(unit: Unit) {
    // Find nearby enemy units
    const enemies = this.units.filter(u => 
      u.ownerId !== unit.ownerId && 
      distance(unit.position, u.position) <= COMBAT_RANGE
    );

    if (enemies.length > 0) {
      // Attack the closest enemy
      const closestEnemy = enemies.reduce((closest, current) => {
        const closestDist = distance(unit.position, closest.position);
        const currentDist = distance(unit.position, current.position);
        return currentDist < closestDist ? current : closest;
      });

      gameService.createGameEvent(
        unit.roomId,
        "combat",
        unit.id,
        closestEnemy.id,
        COMBAT_DAMAGE
      );
    }
  }
}

// Create a singleton instance
export const gameTickSystem = new GameTickSystem(); 