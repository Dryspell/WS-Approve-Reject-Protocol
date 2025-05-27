import type { Unit, GameEvent, Resource } from "~/module_bindings";
import type { UnitTaskQueue, SpacetimeDBGameClient, UnitInventory } from "~/types/spacetime-client";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { CRAFTING_RECIPES, canCraftRecipe, type CraftingRecipe } from "./crafting";

// Constants
const MOVEMENT_SPEED = 0.1;
const MOVEMENT_THRESHOLD = 0.1;
const COMBAT_RANGE = 1.0;
const COMBAT_DAMAGE = 10;
const RESOURCE_GATHER_RANGE = 1.0;
const RESOURCE_GATHER_RATE = 5;

// Resource types
export const RESOURCE_TYPES = {
  PRIMARY: {
    WOOD: "wood",
    STONE: "stone",
    METAL_ORE: "metal_ore",
    COAL: "coal",
    GEMS: "gems",
    FIBER: "fiber",
    HIDE: "hide",
    SAND: "sand",
    FOOD: "food"
  },
  SECONDARY: {
    WOODEN_POLE: "wooden_pole",
    LUMBER: "lumber",
    CUT_STONE: "cut_stone",
    METAL_INGOT: "metal_ingot",
    CLOTH: "cloth",
    ROPE: "rope",
    LEATHER: "leather",
    GLASS: "glass"
  }
} as const;

// Types
interface GameState {
  units: Map<number, Unit>;
  resources: Map<number, Resource>;
  events: GameEvent[];
  taskQueues: Map<number, UnitTaskQueue[]>;
  selectedUnits: Set<number>;
  combatEffects: Map<number, { targetId: number; startTime: number }>;
  gatherEffects: Map<number, { resourceId: number; startTime: number }>;
  craftingProgress: Map<number, number>;
  inventories: Map<number, UnitInventory>;
}

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

// State management functions
function createInitialState(): GameState {
  return {
    units: new Map(),
    resources: new Map(),
    events: [],
    taskQueues: new Map(),
    selectedUnits: new Set(),
    combatEffects: new Map(),
    gatherEffects: new Map(),
    craftingProgress: new Map(),
    inventories: new Map()
  };
}

function updateUnits(state: GameState, units: Record<number, Unit>): GameState {
  return {
    ...state,
    units: new Map(Object.entries(units).map(([id, unit]) => [Number(id), unit]))
  };
}

function updateResources(state: GameState, resources: Record<string, Resource>): GameState {
  return {
    ...state,
    resources: new Map(Object.entries(resources).map(([id, resource]) => [Number(id), resource]))
  };
}

function updateTaskQueues(state: GameState, tasks: UnitTaskQueue[]): GameState {
  const newTaskQueues = tasks.reduce((acc, task) => {
    if (!acc.has(task.unitId)) {
      acc.set(task.unitId, []);
    }
    acc.get(task.unitId)!.push(task);
    return acc;
  }, new Map<number, UnitTaskQueue[]>());

  return {
    ...state,
    taskQueues: newTaskQueues
  };
}

// Unit selection functions
function selectUnit(state: GameState, unitId: number): GameState {
  const newSelectedUnits = new Set(state.selectedUnits);
  newSelectedUnits.add(unitId);
  return { ...state, selectedUnits: newSelectedUnits };
}

function deselectUnit(state: GameState, unitId: number): GameState {
  const newSelectedUnits = new Set(state.selectedUnits);
  newSelectedUnits.delete(unitId);
  return { ...state, selectedUnits: newSelectedUnits };
}

function clearSelection(state: GameState): GameState {
  return { ...state, selectedUnits: new Set() };
}

// Task management functions
function queueUnitTask(state: GameState, client: SpacetimeDBGameClient, unitId: number, taskType: string, targetId: string): GameState {
  client.queue_unit_task(unitId, taskType, targetId);
  return state;
}

function queueGroupTask(state: GameState, client: SpacetimeDBGameClient, taskType: string, targetId: string): GameState {
  state.selectedUnits.forEach(unitId => {
    queueUnitTask(state, client, unitId, taskType, targetId);
  });
  return state;
}

function cancelUnitTask(state: GameState, client: SpacetimeDBGameClient, taskId: number): GameState {
  client.cancel_unit_task(taskId);
  return state;
}

// Movement functions
function moveUnit(state: GameState, client: SpacetimeDBGameClient, unitId: number, targetPosition: { x: number; y: number }): GameState {
  return queueUnitTask(state, client, unitId, "move", JSON.stringify(targetPosition));
}

function moveGroup(state: GameState, client: SpacetimeDBGameClient, targetPosition: { x: number; y: number }): GameState {
  state.selectedUnits.forEach(unitId => {
    moveUnit(state, client, unitId, targetPosition);
  });
  return state;
}

// Combat functions
function processCombat(state: GameState, client: SpacetimeDBGameClient, unit: Unit, target: Unit): GameState {
  const dist = distance(unit.position, target.position);
  
  if (dist <= COMBAT_RANGE) {
    const newCombatEffects = new Map(state.combatEffects);
    newCombatEffects.set(unit.id, {
      targetId: target.id,
      startTime: Date.now()
    });
    
    client.create_game_event(
      unit.roomId.toString(),
      "combat",
      unit.id.toString(),
      target.id.toString(),
      COMBAT_DAMAGE
    );
    
    return { ...state, combatEffects: newCombatEffects };
  } else {
    const newPos = moveTowards(unit.position, target.position, MOVEMENT_SPEED);
    return queueUnitTask(state, client, unit.id, "move", JSON.stringify(newPos));
  }
}

// Resource gathering functions
function processGathering(state: GameState, client: SpacetimeDBGameClient, unit: Unit, resource: Resource): GameState {
  const dist = distance(unit.position, resource.position);
  
  if (dist <= RESOURCE_GATHER_RANGE) {
    const newGatherEffects = new Map(state.gatherEffects);
    newGatherEffects.set(unit.id, {
      resourceId: Number(resource.id),
      startTime: Date.now()
    });
    
    client.create_game_event(
      unit.roomId.toString(),
      "resource",
      unit.id.toString(),
      resource.id,
      RESOURCE_GATHER_RATE
    );
    
    return { ...state, gatherEffects: newGatherEffects };
  } else {
    const newPos = moveTowards(unit.position, resource.position, MOVEMENT_SPEED);
    return queueUnitTask(state, client, unit.id, "move", JSON.stringify(newPos));
  }
}

// Crafting functions
function processCrafting(state: GameState, client: SpacetimeDBGameClient, unit: Unit, task: UnitTaskQueue): GameState {
  const recipe = CRAFTING_RECIPES[task.targetId as keyof typeof CRAFTING_RECIPES] as CraftingRecipe;
  if (!recipe) {
    cancelUnitTask(state, client, task.id);
    return state;
  }

  const inventory = state.inventories.get(unit.id);
  if (!inventory || !canCraftRecipe(inventory as any, recipe)) {
    cancelUnitTask(state, client, task.id);
    return state;
  }

  // Get or initialize crafting progress
  const currentProgress = state.craftingProgress.get(task.id) || 0;
  const craftRate = 1; // TODO: Get from unit stats
  const progressIncrement = (100 / (recipe.craftTime / 1000)) * craftRate;

  // Update progress
  const newProgress = Math.min(100, currentProgress + progressIncrement);
  state.craftingProgress.set(task.id, newProgress);

  // If crafting is complete
  if (newProgress >= 100) {
    // Deduct resources
    const updatedInventory: UnitInventory = { ...inventory };
    if (recipe.requirements.wood) {
      updatedInventory.wood -= recipe.requirements.wood;
    }
    if (recipe.requirements.stone) {
      updatedInventory.stone -= recipe.requirements.stone;
    }
    if (recipe.requirements.metal_ore) {
      updatedInventory.metal_ore -= recipe.requirements.metal_ore;
    }
    state.inventories.set(unit.id, updatedInventory);

    // Create crafting event
    client.create_game_event(
      unit.roomId.toString(),
      "craft",
      unit.id.toString(),
      recipe.id,
      1 // Default amount of 1 for crafted items
    );

    // Complete task
    cancelUnitTask(state, client, task.id);
    state.craftingProgress.delete(task.id);
  }

  return state;
}

// Game tick function
function tick(state: GameState, client: SpacetimeDBGameClient): GameState {
  let newState = { ...state };
  
  state.taskQueues.forEach((tasks, unitId) => {
    const unit = state.units.get(unitId);
    if (!unit) return;

    const currentTask = tasks.find(t => t.status === "in_progress");
    if (!currentTask) return;

    switch (currentTask.taskType) {
      case "move": {
        const targetPos = JSON.parse(currentTask.targetId);
        const dist = distance(unit.position, targetPos);
        
        if (dist <= MOVEMENT_THRESHOLD) {
          tasks.shift();
        } else {
          const newPos = moveTowards(unit.position, targetPos, MOVEMENT_SPEED);
          newState = queueUnitTask(newState, client, unitId, "move", JSON.stringify(newPos));
        }
        break;
      }
      
      case "gather": {
        const resource = state.resources.get(Number(currentTask.targetId));
        if (!resource) {
          tasks.shift();
          return;
        }
        
        newState = processGathering(newState, client, unit, resource);
        break;
      }
      
      case "attack": {
        const target = state.units.get(Number(currentTask.targetId));
        if (!target) {
          tasks.shift();
          return;
        }
        
        newState = processCombat(newState, client, unit, target);
        break;
      }
      
      case "craft": {
        newState = processCrafting(newState, client, unit, currentTask);
        break;
      }
    }
  });
  
  return newState;
}

// Create a singleton state
let gameState: GameState = createInitialState();

// Export functions that operate on the singleton state
export function getGameState() {
  return gameState;
}

export function updateGameState(newState: GameState) {
  gameState = newState;
}

export function getGameTickSystem(client: () => ReturnType<typeof useSpacetimeDB>) {
  return {
    updateUnits: (units: Record<number, Unit>) => {
      gameState = updateUnits(gameState, units);
    },
    updateResources: (resources: Record<string, Resource>) => {
      gameState = updateResources(gameState, resources);
    },
    updateTaskQueues: (tasks: UnitTaskQueue[]) => {
      gameState = updateTaskQueues(gameState, tasks);
    },
    selectUnit: (unitId: number) => {
      gameState = selectUnit(gameState, unitId);
    },
    deselectUnit: (unitId: number) => {
      gameState = deselectUnit(gameState, unitId);
    },
    clearSelection: () => {
      gameState = clearSelection(gameState);
    },
    isUnitSelected: (unitId: number) => {
      return gameState.selectedUnits.has(unitId);
    },
    queueUnitTask: (unitId: number, taskType: string, targetId: string) => {
      const db = client().db();
      if (db) {
        gameState = queueUnitTask(gameState, db, unitId, taskType, targetId);
      }
    },
    queueGroupTask: (taskType: string, targetId: string) => {
      const db = client().db();
      if (db) {
        gameState = queueGroupTask(gameState, db, taskType, targetId);
      }
    },
    cancelUnitTask: (taskId: number) => {
      const db = client().db();
      if (db) {
        gameState = cancelUnitTask(gameState, db, taskId);
      }
    },
    moveUnit: (unitId: number, targetPosition: { x: number; y: number }) => {
      const db = client().db();
      if (db) {
        gameState = moveUnit(gameState, db, unitId, targetPosition);
      }
    },
    moveGroup: (targetPosition: { x: number; y: number }) => {
      const db = client().db();
      if (db) {
        gameState = moveGroup(gameState, db, targetPosition);
      }
    },
    gatherResource: (unitId: number, resourceId: string) => {
      const db = client().db();
      if (db) {
        gameState = queueUnitTask(gameState, db, unitId, "gather", resourceId);
      }
    },
    gatherGroupResource: (resourceId: string) => {
      const db = client().db();
      if (db) {
        gameState.selectedUnits.forEach(unitId => {
          gameState = queueUnitTask(gameState, db, unitId, "gather", resourceId);
        });
      }
    },
    getCombatEffect: (unitId: number) => {
      return gameState.combatEffects.get(unitId);
    },
    getGatherEffect: (unitId: number) => {
      return gameState.gatherEffects.get(unitId);
    },
    tick: () => {
      const db = client().db();
      if (db) {
        gameState = tick(gameState, db);
      }
    }
  };
} 