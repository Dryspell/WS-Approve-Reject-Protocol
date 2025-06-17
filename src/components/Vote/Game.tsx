import { Component, onMount, createSignal, Show } from "solid-js";
import type { Unit } from "~/module_bindings/unit_type";
import type { Resource } from "~/module_bindings/resource_type";
import type { UnitInventory } from "~/module_bindings/unit_inventory_type";
import type { UnitTaskQueue } from "~/module_bindings/unit_task_queue_type";
import type { UnitStats } from "~/module_bindings/unit_stats_type";
import type { GameRoom } from "~/module_bindings/game_room_type";
import { useVoteStore } from "~/stores/voteStore";
import { showToast } from "../ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { Resizable, ResizableHandle, ResizablePanel } from "~/components/ui/resizable";
import { circle, rect } from "~/lib/canvas/shapes";
import { getMousePosition } from "~/lib/canvas/utils";
import { withinCircle } from "../../lib/canvas/spatial";
import { getGameTickSystem, RESOURCE_TYPES } from "~/lib/game-tick";
import { CRAFTING_RECIPES, canCraftRecipe, getCraftingCost, getCraftingTime, type CraftingRecipe } from "~/lib/crafting";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Add combat-related constants
const COMBAT_EFFECT_DURATION = 500; // ms
const COMBAT_EFFECT_COLOR = "#ff0000";

// Resource colors
const RESOURCE_COLORS: Record<string, string> = {
  wood: "#8B4513",
  stone: "#808080",
  gold: "#FFD700",
  coal: "#36454F",
  gems: "#FF00FF",
  fiber: "#90EE90",
  hide: "#DEB887",
  sand: "#F4A460",
  food: "#FFA500"
} as const;

const RESOURCE_DEPLETION_COLOR = "#4A4A4A";
const RESOURCE_REGENERATION_COLOR = "#90EE90";
const RESOURCE_RADIUS = 15;
const RESOURCE_DEPLETION_RADIUS = 10;
const RESOURCE_REGENERATION_RADIUS = 12;

// Add storage-related constants
const STORAGE_BUILDING_COLOR = "#808080";
const STORAGE_BUILDING_SIZE = 40;
const DEFAULT_STORAGE_CAPACITY = 1000;

interface Props {
  room: GameRoom;
  user: {
    id: string;
    name: string;
  };
}

const Game: Component<Props> = (props) => {
  const { voteState, setUnitVoteColor, tradeUnitVote } = useVoteStore();
  const { conn, connected, identity } = useSpacetimeDB();
  const [units, setUnits] = createSignal<Record<number, Unit>>({});
  const [resources, setResources] = createSignal<Record<string, Resource>>({});
  const [hoveredUnit, setHoveredUnit] = createSignal<Unit | undefined>();
  const [hoveredResource, setHoveredResource] = createSignal<Resource | undefined>();
  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>();
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragStart, setDragStart] = createSignal<[number, number]>([0, 0]);
  const [dragEnd, setDragEnd] = createSignal<[number, number]>([0, 0]);
  const [tickInterval, setTickInterval] = createSignal<NodeJS.Timeout | undefined>();
  const [taskQueues, setTaskQueues] = createSignal<Record<number, UnitTaskQueue[]>>({});
  const gameTickSystem = getGameTickSystem(() => ({ conn, identity, connected }));
  const [scale, setScale] = createSignal(1);
  const [offsetX, setOffsetX] = createSignal(0);
  const [offsetY, setOffsetY] = createSignal(0);
  const [inventories, setInventories] = createSignal<Record<number, UnitInventory>>({});
  const [selectedRecipe, setSelectedRecipe] = createSignal<string | null>(null);
  const [craftingProgress, setCraftingProgress] = createSignal<number>(0);

  onMount(() => {
    const connection = conn();
    if (!connection || !connected()) return;

    // Subscribe to unit updates
    connection.db.unit.onInsert((_ctx, unit: Unit) => {
      if (!unit) return;
      setUnits(prev => ({
        ...prev,
        [unit.id]: unit
      }));
      // Convert Unit type to match module_bindings.Unit
      const convertedUnits = Object.fromEntries(
        Object.entries(units()).map(([id, unit]) => [
          id,
          {
            ...unit,
            taskType: unit.taskType || null,
            targetId: unit.targetId || null,
            voteColor: unit.voteColor || null,
            voteGuarantee: unit.voteGuarantee || null,
            votePrice: unit.votePrice || null,
            voteOwner: unit.voteOwner || null,
            storageCapacity: unit.storageCapacity || null
          }
        ])
      );
      gameTickSystem.updateUnits(convertedUnits);
    });

    // Subscribe to resource updates
    connection.db.resource.onInsert((_ctx, resource: Resource) => {
      if (!resource) return;
      setResources(prev => ({
        ...prev,
        [resource.id]: resource
      }));
      gameTickSystem.updateResources(resources());
    });

    // Subscribe to task queue updates
    connection.db.unitTaskQueue.onInsert((_ctx, task: UnitTaskQueue) => {
      if (!task) return;
      setTaskQueues(prev => {
        const unitTasks = prev[task.unitId] || [];
        const existingIndex = unitTasks.findIndex(t => t.id === task.id);
        
        if (existingIndex >= 0) {
          unitTasks[existingIndex] = task;
        } else {
          unitTasks.push(task);
        }
        
        return {
          ...prev,
          [task.unitId]: unitTasks
        };
      });
      gameTickSystem.updateTaskQueues(Object.values(taskQueues()).flat());
    });

    // Subscribe to inventory updates
    connection.db.unitInventory.onInsert((_ctx, inventory: UnitInventory) => {
      if (!inventory) return;
      setInventories(prev => ({
        ...prev,
        [inventory.unitId]: inventory
      }));
    });

    // Initialize canvas
    const canvas = gameCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up mouse interaction
    canvas.addEventListener("mousemove", (e) => {
      const [mouseX, mouseY] = getMousePosition(canvas, e);
      
      if (isDragging()) {
        setDragEnd([mouseX, mouseY]);
      } else {
        // Handle hover
        const hovered = Object.values(units()).find(unit => 
          withinCircle([mouseX, mouseY], unit.position, 20)
        );
        setHoveredUnit(hovered);

        const hoveredRes = Object.values(resources()).find(resource => 
          withinCircle([mouseX, mouseY], resource.position, 15)
        );
        setHoveredResource(hoveredRes);
      }
    });

    // Handle mouse down for selection
    canvas.addEventListener("mousedown", (e) => {
      const [mouseX, mouseY] = getMousePosition(canvas, e);
      const clickedUnit = Object.values(units()).find(unit => 
        withinCircle([mouseX, mouseY], unit.position, 20)
      );
      
      if (clickedUnit) {
        if (e.shiftKey) {
          // Add to selection
          gameTickSystem.selectUnit(clickedUnit.id);
        } else {
          // New selection
          gameTickSystem.clearSelection();
          gameTickSystem.selectUnit(clickedUnit.id);
        }
      } else {
        // Start box selection
        setIsDragging(true);
        setDragStart([mouseX, mouseY]);
        setDragEnd([mouseX, mouseY]);
      }
    });

    // Handle mouse up
    canvas.addEventListener("mouseup", (e) => {
      if (isDragging()) {
        const [startX, startY] = dragStart();
        const [endX, endY] = dragEnd();
        
        // Select units in box
        Object.values(units()).forEach(unit => {
          if (unit.position.x >= Math.min(startX, endX) &&
              unit.position.x <= Math.max(startX, endX) &&
              unit.position.y >= Math.min(startY, endY) &&
              unit.position.y <= Math.max(startY, endY)) {
            gameTickSystem.selectUnit(unit.id);
          }
        });
        
        setIsDragging(false);
      } else if (e.button === 2) { // Right click
        // Move selected units
        const [mouseX, mouseY] = getMousePosition(canvas, e);
        gameTickSystem.moveGroup({ x: mouseX, y: mouseY });
      }
    });

    // Prevent context menu on right click
    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    // Game loop for rendering
    const gameLoop = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw resources
      Object.values(resources()).forEach(resource => {
        const { x, y } = resource.position;
        const screenX = x * scale() + offsetX();
        const screenY = y * scale() + offsetY();

        // Draw resource node
        ctx.beginPath();
        ctx.arc(screenX, screenY, RESOURCE_RADIUS, 0, Math.PI * 2);
        
        // Determine resource color based on state
        let resourceColor = RESOURCE_COLORS[resource.resourceType.toLowerCase()];
        if (resource.amount <= resource.depletionThreshold) {
          resourceColor = RESOURCE_DEPLETION_COLOR;
        } else if (resource.regenerationTimer > 0) {
          resourceColor = RESOURCE_REGENERATION_COLOR;
        }
        
        ctx.fillStyle = resourceColor;
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw resource amount
        ctx.fillStyle = "#000";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(resource.amount.toString(), screenX, screenY);

        // Draw regeneration timer if active
        if (resource.regenerationTimer > 0) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, RESOURCE_REGENERATION_RADIUS, 0, (resource.regenerationTimer / 10) * Math.PI * 2);
          ctx.strokeStyle = RESOURCE_REGENERATION_COLOR;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Draw depletion effect if resource is depleted
        if (resource.amount <= resource.depletionThreshold) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, RESOURCE_DEPLETION_RADIUS, 0, Math.PI * 2);
          ctx.strokeStyle = RESOURCE_DEPLETION_COLOR;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw units
      Object.values(units()).forEach(unit => {
        // Draw unit circle
        circle(ctx, unit.position.x, unit.position.y, 20, {
          fillStyle: unit.voteColor || "#ccc",
          strokeStyle: hoveredUnit()?.id === unit.id ? "#00ff00" : "#000",
          lineWidth: hoveredUnit()?.id === unit.id ? 3 : 1,
        });

        // Draw selection indicator
        if (gameTickSystem.isUnitSelected(unit.id)) {
          ctx.strokeStyle = "#00ff00";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(unit.position.x, unit.position.y, 25, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw combat effects
        const combatEffect = gameTickSystem.getCombatEffect(unit.id);
        if (combatEffect) {
          const elapsed = Date.now() - combatEffect.startTime;
          if (elapsed < COMBAT_EFFECT_DURATION) {
            ctx.strokeStyle = COMBAT_EFFECT_COLOR;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(unit.position.x, unit.position.y, 30, 0, Math.PI * 2);
            ctx.stroke();

            const target = units()[combatEffect.targetId];
            if (target) {
              ctx.beginPath();
              ctx.moveTo(unit.position.x, unit.position.y);
              ctx.lineTo(target.position.x, target.position.y);
              ctx.stroke();
            }
          }
        }

        // Draw gathering effects
        const gatherEffect = gameTickSystem.getGatherEffect(unit.id);
        if (gatherEffect) {
          const elapsed = Date.now() - gatherEffect.startTime;
          if (elapsed < 500) {
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(unit.position.x, unit.position.y, 30, 0, Math.PI * 2);
            ctx.stroke();

            const resource = resources()[gatherEffect.resourceId];
            if (resource) {
              ctx.beginPath();
              ctx.moveTo(unit.position.x, unit.position.y);
              ctx.lineTo(resource.position.x, resource.position.y);
              ctx.stroke();
            }
          }
        }

        // Draw unit ID
        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(unit.id.toString(), unit.position.x, unit.position.y);

        // Draw vote price if unit is for sale
        if (unit.votePrice !== null) {
          ctx.fillStyle = "#000";
          ctx.font = "10px Arial";
          ctx.fillText(`$${unit.votePrice}`, unit.position.x, unit.position.y + 25);
        }

        // Draw task queue
        const unitTasks = taskQueues()[unit.id] || [];
        if (unitTasks.length > 0) {
          ctx.fillStyle = "#000";
          ctx.font = "10px Arial";
          ctx.fillText(`${unitTasks.length} tasks`, unit.position.x, unit.position.y - 25);
        }

        // Draw storage building
        if (unit.isStorage) {
          rect(ctx, unit.position.x - STORAGE_BUILDING_SIZE/2, unit.position.y - STORAGE_BUILDING_SIZE/2, 
            STORAGE_BUILDING_SIZE, STORAGE_BUILDING_SIZE, {
            fillStyle: STORAGE_BUILDING_COLOR,
            strokeStyle: hoveredUnit()?.id === unit.id ? "#00ff00" : "#000",
            lineWidth: hoveredUnit()?.id === unit.id ? 3 : 1,
          });

          // Draw storage icon
          ctx.fillStyle = "#fff";
          ctx.font = "20px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("S", unit.position.x, unit.position.y);
        }
      });

      // Draw selection box
      if (isDragging()) {
        const [startX, startY] = dragStart();
        const [endX, endY] = dragEnd();
        rect(ctx, startX, startY, endX - startX, endY - startY, {
          fillStyle: "rgba(0, 255, 0, 0.1)",
          strokeStyle: "#00ff00",
          lineWidth: 1,
        });
      }

      requestAnimationFrame(gameLoop);
    };

    gameLoop();
  });

  const handleVoteColorChange = async (unitId: number, color: string) => {
    try {
      await setUnitVoteColor(unitId, color);
      showToast({
        title: "Success",
        description: "Vote color updated",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      // Error is already handled by withSpacetimeDBErrorHandling
    }
  };

  const handleVoteTrade = async (unitId: number, price: number) => {
    try {
      await tradeUnitVote(unitId, props.user.id, price);
      showToast({
        title: "Success",
        description: "Vote trade completed",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      // Error is already handled by withSpacetimeDBErrorHandling
    }
  };

  // Add resource gathering functions
  const handleGather = (resource: Resource) => {
    if (!hoveredUnit()) return;
    gameTickSystem.gatherResource(hoveredUnit()!.id, resource.id);
  };

  const handleGroupGather = (resource: Resource) => {
    gameTickSystem.gatherGroupResource(resource.id);
  };

  // Add storage-related functions
  const handleCreateStorage = async (position: { x: number; y: number }) => {
    const connection = conn();
    if (!connection || !connected()) return;

    try {
      await connection.reducers.createStorageBuilding(props.room.id, position, DEFAULT_STORAGE_CAPACITY);
      showToast({
        title: "Success",
        description: "Storage building created",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      // Error is already handled by withSpacetimeDBErrorHandling
    }
  };

  const handleTransferResources = async (
    sourceId: number,
    targetId: number,
    resourceType: string,
    amount: number
  ) => {
    const connection = conn();
    if (!connection || !connected()) return;

    try {
      await connection.reducers.transferResources(sourceId, targetId, resourceType, amount);
      showToast({
        title: "Success",
        description: "Resources transferred",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      // Error is already handled by withSpacetimeDBErrorHandling
    }
  };

  // Add crafting functions
  const handleStartCrafting = async (recipeId: string) => {
    const connection = conn();
    if (!connection || !connected() || !hoveredUnit()) return;

    const recipe = CRAFTING_RECIPES[recipeId as keyof typeof CRAFTING_RECIPES] as CraftingRecipe;
    if (!recipe) return;

    const inventory = inventories()[hoveredUnit()!.id];
    if (!inventory || !canCraftRecipe(inventory as any, recipe)) {
      showToast({
        title: "Error",
        description: "Not enough resources to craft this item",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    try {
      // Queue crafting task
      await connection.reducers.queueUnitTask(hoveredUnit()!.id, "craft", recipeId);
      setSelectedRecipe(recipeId);
      
      // Start progress animation
      const craftTime = getCraftingTime(recipe, { craftRate: 1 } as UnitStats); // TODO: Get actual craft rate from unit stats
      const startTime = Date.now();
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / craftTime) * 100);
        setCraftingProgress(progress);
        
        if (progress < 100) {
          requestAnimationFrame(updateProgress);
        } else {
          setCraftingProgress(0);
          setSelectedRecipe(null);
        }
      };
      requestAnimationFrame(updateProgress);

      showToast({
        title: "Success",
        description: `Started crafting ${recipe.name}`,
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      // Error is already handled by withSpacetimeDBErrorHandling
    }
  };

  return (
    <main class="relative mx-auto p-4 text-gray-700">
      <Resizable orientation="horizontal" class="max-w-full rounded-lg border">
        <ResizablePanel initialSize={0.75} class="overflow-hidden">
          <div class="flex h-full flex-col gap-4 p-4">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold">{props.room.name}</h2>
              <div class="text-sm text-gray-500">
                Round {props.room.currentRound}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              {/* Canvas View */}
              <div class="rounded-lg border p-4">
                <h3 class="mb-4 text-lg font-semibold">Unit Visualization</h3>
                <div class="flex justify-center">
                  <canvas
                    ref={setGameCanvas}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    class="border border-gray-300"
                  />
                </div>
              </div>

              {/* Round History */}
              <div class="rounded-lg border p-4">
                <h3 class="mb-4 text-lg font-semibold">Round History</h3>
                <div class="space-y-2">
                  {Object.entries(voteState.roundVotes).map(([roundNumber, round]) => (
                    <div class="rounded border p-2">
                      <div class="mb-2 font-semibold">Round {roundNumber}</div>
                      <div class="space-y-1">
                        {round.votes.map((vote) => (
                          <div class="flex items-center gap-2 text-sm">
                            <div
                              class="h-3 w-3 rounded-full"
                              style={{ "background-color": vote.color }}
                            />
                            <span>Unit {vote.unitId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel initialSize={0.25} class="overflow-hidden">
          <div class="p-4">
            <h3 class="mb-4 text-lg font-semibold">Details</h3>
            <Show when={hoveredUnit()}>
              <div class="rounded-lg border p-4">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div
                      class="h-4 w-4 rounded-full"
                      style={{ "background-color": hoveredUnit()?.voteColor || "#ccc" }}
                    />
                    <span class="font-semibold">Unit {hoveredUnit()?.id}</span>
                  </div>
                  <div class="text-sm text-gray-600">
                    <div>Owner: {hoveredUnit()?.voteOwner || "None"}</div>
                    <div>Vote Color: {hoveredUnit()?.voteColor || "None"}</div>
                    <div>Vote Guarantee: {hoveredUnit()?.voteGuarantee || "None"}</div>
                    <div>Price: {hoveredUnit()?.votePrice || "Not for sale"}</div>
                  </div>
                  <div class="mt-4 flex gap-2">
                    <button
                      onClick={() => handleVoteColorChange(hoveredUnit()!.id, "red")}
                      class="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
                    >
                      Red
                    </button>
                    <button
                      onClick={() => handleVoteColorChange(hoveredUnit()!.id, "blue")}
                      class="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                    >
                      Blue
                    </button>
                    {hoveredUnit()?.votePrice === null ? (
                      <button
                        onClick={() => handleVoteTrade(hoveredUnit()!.id, 100)}
                        class="rounded bg-green-500 px-2 py-1 text-white hover:bg-green-600"
                      >
                        Sell
                      </button>
                    ) : (
                      <button
                        onClick={() => handleVoteTrade(hoveredUnit()!.id, hoveredUnit()!.votePrice!)}
                        class="rounded bg-yellow-500 px-2 py-1 text-white hover:bg-yellow-600"
                      >
                        Buy ({hoveredUnit()?.votePrice})
                      </button>
                    )}
                  </div>
                  
                  {/* Task Queue */}
                  <div class="mt-4">
                    <h4 class="mb-2 font-semibold">Task Queue</h4>
                    <div class="space-y-2">
                      {(taskQueues()[hoveredUnit()!.id] || []).map(task => (
                        <div class="flex items-center justify-between rounded border p-2">
                          <div>
                            <div class="font-medium">{task.taskType}</div>
                            <div class="text-sm text-gray-500">Status: {task.status}</div>
                          </div>
                          {task.status === "pending" && (
                            <button
                              onClick={() => gameTickSystem.cancelUnitTask(task.id)}
                              class="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Show>
            <Show when={hoveredResource()}>
              <div class="mt-4 rounded-lg border p-4">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div
                      class="h-4 w-4 rounded-full"
                      style={{ "background-color": RESOURCE_COLORS[hoveredResource()!.resourceType.toLowerCase()] || "#ccc" }}
                    />
                    <span class="font-semibold">{hoveredResource()!.resourceType}</span>
                  </div>
                  <div class="text-sm text-gray-600">
                    <div>Amount: {hoveredResource()!.amount}</div>
                  </div>
                  <div class="mt-4 flex gap-2">
                    <button
                      onClick={() => handleGather(hoveredResource()!)}
                      class="rounded bg-green-500 px-2 py-1 text-white hover:bg-green-600"
                    >
                      Gather
                    </button>
                    <button
                      onClick={() => handleGroupGather(hoveredResource()!)}
                      class="rounded bg-green-700 px-2 py-1 text-white hover:bg-green-800"
                    >
                      Group Gather
                    </button>
                  </div>
                </div>
              </div>
            </Show>
            <Show when={inventories()[hoveredUnit()!.id]}>
              <div class="mt-4 rounded-lg border p-4">
                <div class="space-y-2">
                  <h4 class="font-semibold">Inventory</h4>
                  <div class="grid grid-cols-2 gap-2">
                    <div>Wood: {inventories()[hoveredUnit()!.id]?.wood || 0}</div>
                    <div>Stone: {inventories()[hoveredUnit()!.id]?.stone || 0}</div>
                    <div>Metal Ore: {inventories()[hoveredUnit()!.id]?.metalOre || 0}</div>
                    <div>Capacity: {inventories()[hoveredUnit()!.id]?.maxCapacity || 0}</div>
                  </div>
                  
                  {!hoveredUnit()!.isStorage && (
                    <div class="mt-4">
                      <h4 class="font-semibold">Transfer Resources</h4>
                      <div class="space-y-2">
                        <select class="w-full rounded border p-1">
                          <option value="wood">Wood</option>
                          <option value="stone">Stone</option>
                          <option value="gold">Gold</option>
                        </select>
                        <input
                          type="number"
                          min="1"
                          max={inventories()[hoveredUnit()!.id]?.maxCapacity || 0}
                          class="w-full rounded border p-1"
                          placeholder="Amount"
                        />
                        <button
                          onClick={() => {
                            const targetStorage = Object.values(units()).find(u => u.isStorage);
                            if (targetStorage) {
                              handleTransferResources(
                                hoveredUnit()!.id,
                                targetStorage.id,
                                "wood", // Get from select
                                10 // Get from input
                              );
                            }
                          }}
                          class="w-full rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
                        >
                          Transfer to Storage
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Show>
            
            {/* Add Crafting Panel */}
            <Show when={hoveredUnit()}>
              <div class="mt-4 rounded-lg border p-4">
                <h4 class="mb-4 font-semibold">Crafting</h4>
                <div class="space-y-4">
                  {Object.values(CRAFTING_RECIPES).map(recipe => (
                    <div class="rounded border p-3">
                      <div class="mb-2">
                        <h5 class="font-medium">{recipe.name}</h5>
                        <p class="text-sm text-gray-600">{recipe.description}</p>
                      </div>
                      <div class="mb-2 text-sm">
                        <div class="text-gray-700">Cost: {getCraftingCost(recipe)}</div>
                        <div class="text-gray-700">Time: {recipe.craftTime / 1000}s</div>
                      </div>
                      <button
                        onClick={() => handleStartCrafting(recipe.id)}
                        disabled={!canCraftRecipe(inventories()[hoveredUnit()!.id] as any, recipe) || selectedRecipe() !== null}
                        class="w-full rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600 disabled:bg-gray-400"
                      >
                        {selectedRecipe() === recipe.id ? (
                          <div class="flex items-center justify-center">
                            <div class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Crafting... {Math.round(craftingProgress())}%
                          </div>
                        ) : (
                          "Craft"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Show>
          </div>
        </ResizablePanel>
      </Resizable>
    </main>
  );
};

export default Game;
