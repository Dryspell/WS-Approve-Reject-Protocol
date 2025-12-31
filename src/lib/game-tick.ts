import type { Unit } from "~/module_bindings/unit_type";
import type { GameEvent } from "~/module_bindings/game_event_type";
import type { Resource } from "~/module_bindings/resource_type";
import type { UnitTaskQueue } from "~/module_bindings/unit_task_queue_type";
import type { UnitInventory } from "~/module_bindings/unit_inventory_type";
import type { RemoteReducers } from "~/module_bindings/index";
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
function queueUnitTask(state: GameState, client: RemoteReducers, unitId: number, taskType: string, targetId: string): GameState {
  client.queueUnitTask(unitId, taskType, targetId);
  return state;
}

function queueGroupTask(state: GameState, client: RemoteReducers, taskType: string, targetId: string): GameState {
  state.selectedUnits.forEach(unitId => {
    queueUnitTask(state, client, unitId, taskType, targetId);
  });
  return state;
}

function cancelUnitTask(state: GameState, client: RemoteReducers, taskId: number): GameState {
  client.cancelUnitTask(taskId);
  return state;
}

// Movement functions
function moveUnit(state: GameState, client: RemoteReducers, unitId: number, targetPosition: { x: number; y: number }): GameState {
  return queueUnitTask(state, client, unitId, "move", JSON.stringify(targetPosition));
}

function moveGroup(state: GameState, client: RemoteReducers, targetPosition: { x: number; y: number }): GameState {
  state.selectedUnits.forEach(unitId => {
    moveUnit(state, client, unitId, targetPosition);
  });
  return state;
}

// Combat functions
function processCombat(state: GameState, client: RemoteReducers, unit: Unit, target: Unit): GameState {
  const dist = distance(unit.position, target.position);
  
  if (dist <= COMBAT_RANGE) {
    const newCombatEffects = new Map(state.combatEffects);
    newCombatEffects.set(unit.id, {
      targetId: target.id,
      startTime: Date.now()
    });
    
    client.createGameEvent(
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
function processGathering(state: GameState, client: RemoteReducers, unit: Unit, resource: Resource): GameState {
  const dist = distance(unit.position, resource.position);
  
  if (dist <= RESOURCE_GATHER_RANGE) {
    const newGatherEffects = new Map(state.gatherEffects);
    newGatherEffects.set(unit.id, {
      resourceId: Number(resource.id),
      startTime: Date.now()
    });
    
    client.createGameEvent(
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
function processCrafting(state: GameState, client: RemoteReducers, unit: Unit, task: UnitTaskQueue): GameState {
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
    if (recipe.requirements.metalOre) {
      updatedInventory.metalOre -= recipe.requirements.metalOre;
    }
    state.inventories.set(unit.id, updatedInventory);

    // Create crafting event
    client.createGameEvent(
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
function tick(state: GameState, client: RemoteReducers): GameState {
  let newState = { ...state };
  
  // Update unit positions based on tasks
  newState.units.forEach(unit => {
    const tasks = newState.taskQueues.get(unit.id);
    if (!tasks || tasks.length === 0) return;

    const currentTask = tasks[0]; // Assume one task at a time for now
    
    switch (currentTask.taskType) {
      case "move": {
        try {
          const targetPosition = JSON.parse(currentTask.targetId);
          const currentPosition = unit.position;
          
          if (distance(currentPosition, targetPosition) > MOVEMENT_THRESHOLD) {
            const newPosition = moveTowards(currentPosition, targetPosition, MOVEMENT_SPEED);
            const updatedUnit = { ...unit, position: newPosition };
            newState.units.set(unit.id, updatedUnit);
          } else {
            // Reached destination, server will remove task
          }
        } catch (error) {
          console.error("Failed to parse move target:", error);
          cancelUnitTask(newState, client, currentTask.id);
        }
        break;
      }
      case "combat": {
        const target = newState.units.get(Number(currentTask.targetId));
        if (target) {
          newState = processCombat(newState, client, unit, target);
        }
        break;
      }
      case "gather": {
        const resource = newState.resources.get(Number(currentTask.targetId));
        if (resource) {
          newState = processGathering(newState, client, unit, resource);
        }
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
  const connection = client().conn();
  if (connection) {
    connection.db.unit.onInsert((_, unit) => updateGameState(updateUnits(gameState, { ...Object.fromEntries(gameState.units), [unit.id]: unit })));
    connection.db.unit.onUpdate((_, __, unit) => updateGameState(updateUnits(gameState, { ...Object.fromEntries(gameState.units), [unit.id]: unit })));
    connection.db.resource.onInsert((_, resource) => updateGameState(updateResources(gameState, { ...Object.fromEntries(gameState.resources), [resource.id]: resource })));
    connection.db.unitTaskQueue.onInsert((_, task) => updateGameState(updateTaskQueues(gameState, [...Object.values(gameState.taskQueues).flat(), task])));
    connection.db.unitTaskQueue.onDelete((_, task) => {
      const tasks = gameState.taskQueues.get(task.unitId) || [];
      const updatedTasks = tasks.filter(t => t.id !== task.id);
      const newTaskQueues = new Map(gameState.taskQueues);
      newTaskQueues.set(task.unitId, updatedTasks);
      updateGameState({ ...gameState, taskQueues: newTaskQueues });
    });
    // Add other subscriptions...
  }

  const system = {
    tick: () => {
      const connection = client().conn();
      if (!connection) return;
      const newState = tick(gameState, connection.reducers);
      updateGameState(newState);
    },
    getCombatEffect: (unitId: number) => gameState.combatEffects.get(unitId),
    getGatherEffect: (unitId: number) => gameState.gatherEffects.get(unitId),
    isUnitSelected: (unitId: number) => gameState.selectedUnits.has(unitId),
    selectUnit: (unitId: number) => updateGameState(selectUnit(gameState, unitId)),
    deselectUnit: (unitId: number) => updateGameState(deselectUnit(gameState, unitId)),
    clearSelection: () => updateGameState(clearSelection(gameState)),
    moveGroup: (targetPosition: { x: number; y: number }) => {
      const connection = client().conn();
      if (!connection) return;
      updateGameState(moveGroup(gameState, connection.reducers, targetPosition));
    },
    gatherResource: (unitId: number, resourceId: number) => {
      const connection = client().conn();
      if (!connection) return;
      updateGameState(queueUnitTask(gameState, connection.reducers, unitId, "gather", resourceId.toString()));
    },
    gatherGroupResource: (resourceId: number) => {
      const connection = client().conn();
      if (!connection) return;
      updateGameState(queueGroupTask(gameState, connection.reducers, "gather", resourceId.toString()));
    },
    cancelUnitTask: (taskId: number) => {
      const connection = client().conn();
      if (!connection) return;
      updateGameState(cancelUnitTask(gameState, connection.reducers, taskId));
    },
    updateUnits: (units: Record<number, Unit>) => updateGameState(updateUnits(gameState, units)),
    updateResources: (resources: Record<string, Resource>) => updateGameState(updateResources(gameState, resources)),
    updateTaskQueues: (tasks: UnitTaskQueue[]) => updateGameState(updateTaskQueues(gameState, tasks)),
    getGameState: () => gameState,
  };

  // Set up interval for ticking
  setInterval(system.tick, 50); // Tick every 50ms (20 FPS)

  return system;
} 