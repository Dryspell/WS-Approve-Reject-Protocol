import { Component, onMount, createSignal, Show } from "solid-js";
import type { GameRoom, Unit } from "~/module_bindings";
import type { UnitTaskQueue } from "~/types/spacetime-client";
import { useVoteStore } from "~/stores/voteStore";
import { showToast } from "../ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { Resizable, ResizableHandle, ResizablePanel } from "~/components/ui/resizable";
import { circle, rect } from "~/lib/canvas/shapes";
import { getMousePosition } from "~/lib/canvas/utils";
import { withinCircle } from "~/lib/canvas/spatial";
import { getGameTickSystem } from "~/lib/game-tick";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

interface Props {
  room: GameRoom;
  user: {
    id: string;
    name: string;
  };
}

const Game: Component<Props> = (props) => {
  const { voteState, subscribeToVotes, setUnitVoteColor, tradeUnitVote } = useVoteStore();
  const { db, connected } = useSpacetimeDB();
  const [units, setUnits] = createSignal<Record<number, Unit>>({});
  const [hoveredUnit, setHoveredUnit] = createSignal<Unit | undefined>();
  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>();
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragStart, setDragStart] = createSignal<[number, number]>([0, 0]);
  const [dragEnd, setDragEnd] = createSignal<[number, number]>([0, 0]);
  const [tickInterval, setTickInterval] = createSignal<NodeJS.Timeout | undefined>();
  const [taskQueues, setTaskQueues] = createSignal<Record<number, UnitTaskQueue[]>>({});
  const gameTickSystem = getGameTickSystem(db);

  onMount(() => {
    subscribeToVotes();
    
    // Subscribe to unit updates
    const client = db();
    if (!client || !connected()) return;

    // Subscribe to unit updates
    client.subscribe("unit", "*", (unit: Unit) => {
      if (!unit) return;
      setUnits(prev => ({
        ...prev,
        [unit.id]: unit
      }));
      gameTickSystem.updateUnits(units());
    });

    // Subscribe to task queue updates
    client.subscribe("unit_task_queue", "*", (task: UnitTaskQueue) => {
      if (!task) return;
      setTaskQueues(prev => {
        const unitTasks = prev[task.unit_id] || [];
        const existingIndex = unitTasks.findIndex(t => t.id === task.id);
        
        if (existingIndex >= 0) {
          unitTasks[existingIndex] = task;
        } else {
          unitTasks.push(task);
        }
        
        return {
          ...prev,
          [task.unit_id]: unitTasks
        };
      });
      gameTickSystem.updateTaskQueues(Object.values(taskQueues()).flat());
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

    // Game loop for rendering only
    const gameLoop = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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
            <h3 class="mb-4 text-lg font-semibold">Unit Details</h3>
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
                            <div class="font-medium">{task.task_type}</div>
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
          </div>
        </ResizablePanel>
      </Resizable>
    </main>
  );
};

export default Game;
