import { Component, onMount, createSignal, Show } from "solid-js";
import type { Unit, Resource, UnitInventory, UnitTaskQueue, UnitStats, GameRoom } from "~/module_bindings/types";
import { useVoteStore } from "~/stores/voteStore";
import { showToast } from "../ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { ToastHelper } from "~/lib/toast-helpers";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { Resizable, ResizableHandle, ResizablePanel } from "~/components/ui/resizable";
import { circle, rect } from "~/lib/canvas/shapes";
import { getMousePosition } from "~/lib/canvas/utils";
import { withinCircle } from "../../lib/canvas/spatial";
import { type CraftingRecipe } from "~/lib/crafting";
import { ParticleSystem, TrailSystem } from "~/lib/canvas/particles";
import UnitDetailsPanel from "./UnitDetailsPanel";
import ResourcePanel from "./ResourcePanel";
import InventoryPanel from "./InventoryPanel";
import CraftingPanel from "./CraftingPanel";

// Resource types (moved from game-tick.ts)
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

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

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
  const [taskQueues, setTaskQueues] = createSignal<Record<number, UnitTaskQueue[]>>({});
  const [scale, setScale] = createSignal(1);
  const [offsetX, setOffsetX] = createSignal(0);
  const [offsetY, setOffsetY] = createSignal(0);
  const [inventories, setInventories] = createSignal<Record<number, UnitInventory>>({});
  
  // Client-side UI state (not game state - server is source of truth)
  const [selectedUnits, setSelectedUnits] = createSignal<Set<number>>(new Set());
  const [waypoints, setWaypoints] = createSignal<Record<number, { x: number; y: number }>>({});
  
  // Visual effects systems
  let particleSystem: ParticleSystem | undefined;
  let trailSystem: TrailSystem | undefined;

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
    });

    connection.db.unit.onUpdate((_ctx, _oldUnit: Unit, newUnit: Unit) => {
      if (!newUnit) return;
      setUnits(prev => ({
        ...prev,
        [newUnit.id]: newUnit
      }));
    });

    connection.db.unit.onDelete((_ctx, unit: Unit) => {
      if (!unit) return;
      setUnits(prev => {
        const { [unit.id]: _, ...rest } = prev;
        return rest;
      });
    });

    // Subscribe to resource updates
    connection.db.resource.onInsert((_ctx, resource: Resource) => {
      if (!resource) return;
      setResources(prev => ({
        ...prev,
        [resource.id]: resource
      }));
    });

    connection.db.resource.onUpdate((_ctx, _oldResource: Resource, newResource: Resource) => {
      if (!newResource) return;
      setResources(prev => ({
        ...prev,
        [newResource.id]: newResource
      }));
    });

    connection.db.resource.onDelete((_ctx, resource: Resource) => {
      if (!resource) return;
      setResources(prev => {
        const { [resource.id]: _, ...rest } = prev;
        return rest;
      });
    });

    // Subscribe to task queue updates
    connection.db.unit_task_queue.onInsert((_ctx, task: UnitTaskQueue) => {
      if (!task) return;
      setTaskQueues(prev => {
        const unitTasks = [...(prev[task.unitId] || [])];
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
    });

    connection.db.unit_task_queue.onUpdate((_ctx, _oldTask: UnitTaskQueue, newTask: UnitTaskQueue) => {
      if (!newTask) return;
      setTaskQueues(prev => {
        const unitTasks = [...(prev[newTask.unitId] || [])];
        const existingIndex = unitTasks.findIndex(t => t.id === newTask.id);
        
        if (existingIndex >= 0) {
          unitTasks[existingIndex] = newTask;
        } else {
          unitTasks.push(newTask);
        }
        
        return {
          ...prev,
          [newTask.unitId]: unitTasks
        };
      });
    });

    connection.db.unit_task_queue.onDelete((_ctx, task: UnitTaskQueue) => {
      if (!task) return;
      setTaskQueues(prev => {
        const unitTasks = (prev[task.unitId] || []).filter(t => t.id !== task.id);
        return {
          ...prev,
          [task.unitId]: unitTasks
        };
      });
    });

    // Subscribe to inventory updates
    connection.db.unit_inventory.onInsert((_ctx, inventory: UnitInventory) => {
      if (!inventory) return;
      setInventories(prev => ({
        ...prev,
        [inventory.unitId]: inventory
      }));
    });

    connection.db.unit_inventory.onUpdate((_ctx, _oldInventory: UnitInventory, newInventory: UnitInventory) => {
      if (!newInventory) return;
      setInventories(prev => ({
        ...prev,
        [newInventory.unitId]: newInventory
      }));
    });

    connection.db.unit_inventory.onDelete((_ctx, inventory: UnitInventory) => {
      if (!inventory) return;
      setInventories(prev => {
        const { [inventory.unitId]: _, ...rest } = prev;
        return rest;
      });
    });

    // Initialize canvas
    const canvas = gameCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize visual effects systems
    particleSystem = new ParticleSystem();
    trailSystem = new TrailSystem();

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
          setSelectedUnits(prev => new Set([...prev, clickedUnit.id]));
        } else {
          // New selection
          setSelectedUnits(new Set([clickedUnit.id]));
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
        const unitsInBox = Object.values(units()).filter(unit =>
          unit.position.x >= Math.min(startX, endX) &&
          unit.position.x <= Math.max(startX, endX) &&
          unit.position.y >= Math.min(startY, endY) &&
          unit.position.y <= Math.max(startY, endY)
        );
        setSelectedUnits(new Set(unitsInBox.map(u => u.id)));
        
        setIsDragging(false);
      } else if (e.button === 2) { // Right click
        // Move selected units
        const [mouseX, mouseY] = getMousePosition(canvas, e);
        const connection = conn();
        if (connection && selectedUnits().size > 0) {
          // Set waypoints for visual feedback
          const newWaypoints: Record<number, { x: number; y: number }> = {};
          selectedUnits().forEach(unitId => {
            newWaypoints[unitId] = { x: mouseX, y: mouseY };
            connection.reducers.queueUnitTask({ unitId, taskType: "move", targetId: JSON.stringify({ x: mouseX, y: mouseY }) });
          });
          setWaypoints(prev => ({ ...prev, ...newWaypoints }));
          
          // Clear waypoints after 3 seconds (visual feedback timeout)
          setTimeout(() => {
            setWaypoints(prev => {
              const updated = { ...prev };
              selectedUnits().forEach(unitId => {
                delete updated[unitId];
              });
              return updated;
            });
          }, 3000);
        }
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
        // Add trail points for moving units
        const activeTasks = taskQueues()[unit.id] || [];
        const moveTask = activeTasks.find(t => t.taskType === "move" && t.status === "in_progress");
        if (moveTask && trailSystem) {
          trailSystem.addPoint(unit.id, unit.position.x, unit.position.y);
          // Render trail
          trailSystem.renderTrail(ctx, unit.id, unit.voteColor || "#888");
        }
        
        // Draw unit circle
        circle(ctx, unit.position.x, unit.position.y, 20, {
          fillStyle: unit.voteColor || "#ccc",
          strokeStyle: hoveredUnit()?.id === unit.id ? "#00ff00" : "#000",
          lineWidth: hoveredUnit()?.id === unit.id ? 3 : 1,
        });

        // Draw selection indicator
        if (selectedUnits().has(unit.id)) {
          ctx.strokeStyle = "#00ff00";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(unit.position.x, unit.position.y, 25, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Visual effects are driven by task queue status
        // Draw task indicator if unit has active tasks
        const activeTasks = taskQueues()[unit.id] || [];
        const activeTask = activeTasks.find(t => t.status === "in_progress");
        if (activeTask) {
          ctx.strokeStyle = activeTask.taskType === "gather" ? "#00ff00" : "#ffaa00";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(unit.position.x, unit.position.y, 30, 0, Math.PI * 2);
          ctx.stroke();
          
          // Draw line to target and create particles if gathering
          if (activeTask.taskType === "gather") {
            const resource = resources()[activeTask.targetId];
            if (resource) {
              ctx.beginPath();
              ctx.moveTo(unit.position.x, unit.position.y);
              ctx.lineTo(resource.position.x, resource.position.y);
              ctx.stroke();
              
              // Create gathering particles occasionally
              if (particleSystem && Math.random() < 0.1) {
                const resourceColor = RESOURCE_COLORS[resource.resourceType.toLowerCase()] || "#888";
                particleSystem.createGatherParticles(
                  resource.position.x,
                  resource.position.y,
                  unit.position.x,
                  unit.position.y,
                  resourceColor,
                  3
                );
              }
            }
          }
          
          // Create crafting particles for crafting tasks
          if (activeTask.taskType === "craft" && particleSystem && Math.random() < 0.15) {
            particleSystem.createCraftingParticles(unit.position.x, unit.position.y, 3);
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

        // Draw waypoint indicator and movement path
        const waypoint = waypoints()[unit.id];
        if (waypoint) {
          // Draw movement path line
          ctx.beginPath();
          ctx.moveTo(unit.position.x, unit.position.y);
          ctx.lineTo(waypoint.x, waypoint.y);
          ctx.strokeStyle = "#00aaff";
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 5]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw waypoint marker (flag icon)
          const flagX = waypoint.x;
          const flagY = waypoint.y;
          
          // Flag pole
          ctx.beginPath();
          ctx.moveTo(flagX, flagY);
          ctx.lineTo(flagX, flagY - 15);
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Flag
          ctx.beginPath();
          ctx.moveTo(flagX, flagY - 15);
          ctx.lineTo(flagX + 10, flagY - 10);
          ctx.lineTo(flagX, flagY - 5);
          ctx.closePath();
          ctx.fillStyle = "#00aaff";
          ctx.fill();
          ctx.strokeStyle = "#0088cc";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Waypoint circle (pulsing effect)
          const pulseRadius = 8 + Math.sin(Date.now() / 200) * 2;
          ctx.beginPath();
          ctx.arc(flagX, flagY, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0, 170, 255, 0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();
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

      // Update and render particle effects
      if (particleSystem) {
        particleSystem.update();
        particleSystem.render(ctx);
      }

      // Update trail system
      if (trailSystem) {
        trailSystem.update();
      }

      requestAnimationFrame(gameLoop);
    };

    gameLoop();
  });

  const handleVoteColorChange = async (unitId: number, color: string) => {
    try {
      await setUnitVoteColor(unitId, color);
      ToastHelper.voteColorChanged(unitId, color);
    } catch (error) {
      // Error is already handled by withSpacetimeDBErrorHandling
    }
  };

  const handleVoteTrade = async (unitId: number, price: number) => {
    try {
      await tradeUnitVote(unitId, props.user.id, price);
      const unit = units()[unitId];
      if (unit?.votePrice === null) {
        ToastHelper.voteSold(unitId, price);
      } else {
        ToastHelper.votePurchased(unitId, price);
      }
    } catch (error) {
      // Error is already handled by withSpacetimeDBErrorHandling
    }
  };

  // Add resource gathering functions
  const handleGather = (resource: Resource) => {
    if (!hoveredUnit()) return;
    const connection = conn();
    if (connection) {
      connection.reducers.harvestKind({ unitId: hoveredUnit()!.id, resourceType: resource.resourceType });
    }
  };

  const handleGroupGather = (resource: Resource) => {
    const connection = conn();
    if (connection && selectedUnits().size > 0) {
      selectedUnits().forEach(unitId => {
        connection.reducers.harvestKind({ unitId, resourceType: resource.resourceType });
      });
    }
  };

  // Add storage-related functions
  const handleCreateStorage = (position: { x: number; y: number }) => {
    const connection = conn();
    if (!connection || !connected()) {
      ToastHelper.disconnected();
      return;
    }

    try {
      // Fire-and-forget reducer call
      connection.reducers.createStorageBuilding({ roomId: props.room.id, position, capacity: DEFAULT_STORAGE_CAPACITY });
      ToastHelper.buildingCreated("Storage Building");
    } catch (error) {
      console.error("Failed to create storage:", error);
      ToastHelper.error(error instanceof Error ? error.message : "Failed to create storage");
    }
  };

  const handleTransferResources = (
    sourceId: number,
    resourceType: string,
    amount: number
  ) => {
    const connection = conn();
    if (!connection || !connected()) {
      ToastHelper.disconnected();
      return;
    }

    // Find target storage
    const targetStorage = Object.values(units()).find(u => u.isStorage);
    if (!targetStorage) {
      ToastHelper.error("No storage building found");
      return;
    }

    try {
      // Fire-and-forget reducer call
      connection.reducers.transferResources({ sourceId, targetId: targetStorage.id, resourceType, amount });
      ToastHelper.resourceTransferred(resourceType, amount);
    } catch (error) {
      console.error("Failed to transfer resources:", error);
      ToastHelper.error(error instanceof Error ? error.message : "Failed to transfer resources");
    }
  };

  // Add crafting functions
  const handleStartCrafting = (recipeId: string) => {
    const connection = conn();
    if (!connection || !connected() || !hoveredUnit()) return;

    try {
      // Fire-and-forget reducer call - server will handle crafting progress
      connection.reducers.queueUnitTask({ unitId: hoveredUnit()!.id, taskType: "craft", targetId: recipeId });
      ToastHelper.craftingStarted(recipeId, 10); // Would need actual recipe time
    } catch (error) {
      console.error("Failed to start crafting:", error);
      ToastHelper.craftingFailed(error instanceof Error ? error.message : "Failed to start crafting");
    }
  };

  const handleCancelTask = (taskId: number) => {
    const connection = conn();
    if (connection) {
      connection.reducers.cancelUnitTask({ taskId });
      ToastHelper.info("Task Cancelled", "Task removed from queue");
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
          <div class="space-y-4 p-4">
            <h3 class="text-lg font-semibold">Details</h3>
            
            {/* Unit Details Panel */}
            <UnitDetailsPanel
              unit={hoveredUnit()}
              taskQueues={taskQueues()}
              onVoteColorChange={handleVoteColorChange}
              onVoteTrade={handleVoteTrade}
              onCancelTask={handleCancelTask}
            />

            {/* Resource Panel */}
            <ResourcePanel
              resource={hoveredResource()}
              selectedUnitsCount={selectedUnits().size}
              onGather={handleGather}
              onGroupGather={handleGroupGather}
            />

            {/* Inventory Panel */}
            <InventoryPanel
              unit={hoveredUnit()}
              inventory={hoveredUnit() ? inventories()[hoveredUnit()!.id] : undefined}
              storageExists={Object.values(units()).some(u => u.isStorage)}
              onTransferResources={handleTransferResources}
            />

            {/* Crafting Panel */}
            <CraftingPanel
              unit={hoveredUnit()}
              inventory={hoveredUnit() ? inventories()[hoveredUnit()!.id] : undefined}
              onStartCrafting={handleStartCrafting}
            />
          </div>
        </ResizablePanel>
      </Resizable>
    </main>
  );
};

export default Game;
