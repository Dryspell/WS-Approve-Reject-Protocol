import { createSignal, onMount, onCleanup } from "solid-js";
import { gameService } from "~/lib/game";
import { gameTickSystem } from "~/lib/game-tick";
import type { GameState } from "~/lib/game";
import type { GameRoom as SpacetimeGameRoom } from "~/spacetime/game.sd";
import { createPolled } from "@solid-primitives/timer";

export default function Game(props: {
  room: SpacetimeGameRoom;
  user: { id: string; name: string };
}) {
  const [gameState, setGameState] = createSignal<GameState>({
    room: null,
    units: [],
    events: [],
    readyState: null,
  });

  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  const [tickRate, setTickRate] = createSignal(1000);
  const [tickInterval, setTickInterval] = createSignal<NodeJS.Timeout | undefined>(undefined);
  const clock = createPolled(() => Date.now(), 1000);

  // Subscribe to game state updates
  const unsubscribe = gameService.subscribe(state => {
    setGameState(state);
  });

  onCleanup(() => {
    unsubscribe();
    if (tickInterval()) {
      clearInterval(tickInterval());
    }
  });

  // Initialize game when canvas is ready
  onMount(() => {
    const gc = gameCanvas();
    if (!gc) return;

    const ctx = gc.getContext("2d");
    if (!ctx) return;

    const renderGame = () => {
      const state = gameState();
      if (!state.room) return;

      // Clear canvas
      ctx.clearRect(0, 0, gc.width, gc.height);

      // Render units
      for (const unit of state.units) {
        ctx.fillStyle = unit.fillStyle;
        ctx.fillRect(
          unit.position[0],
          unit.position[1],
          unit.dimensions[0],
          unit.dimensions[1]
        );

        // Render unit task indicator
        if (unit.taskType) {
          ctx.strokeStyle = "yellow";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            unit.position[0],
            unit.position[1],
            unit.dimensions[0],
            unit.dimensions[1]
          );
        }
      }

      // Render game events
      for (const event of state.events) {
        const sourceUnit = state.units.find(u => u.id === event.sourceId);
        const targetUnit = state.units.find(u => u.id === event.targetId);
        
        if (sourceUnit && targetUnit) {
          // Draw event effect
          ctx.beginPath();
          ctx.moveTo(
            sourceUnit.position[0] + sourceUnit.dimensions[0] / 2,
            sourceUnit.position[1] + sourceUnit.dimensions[1] / 2
          );
          ctx.lineTo(
            targetUnit.position[0] + targetUnit.dimensions[0] / 2,
            targetUnit.position[1] + targetUnit.dimensions[1] / 2
          );
          
          switch (event.type) {
            case "combat":
              ctx.strokeStyle = "red";
              break;
            case "resource":
              ctx.strokeStyle = "green";
              break;
            case "craft":
              ctx.strokeStyle = "blue";
              break;
            case "upgrade":
              ctx.strokeStyle = "purple";
              break;
          }
          
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    };

    // Set up game loop
    const gameLoop = () => {
      renderGame();
      requestAnimationFrame(gameLoop);
    };
    gameLoop();

    // Set up mouse interaction
    gc.addEventListener("mousedown", e => {
      const rect = gc.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Find clicked unit
      const clickedUnit = gameState().units.find(unit => {
        return (
          x >= unit.position[0] &&
          x <= unit.position[0] + unit.dimensions[0] &&
          y >= unit.position[1] &&
          y <= unit.position[1] + unit.dimensions[1]
        );
      });

      if (clickedUnit) {
        // Handle unit selection
        console.log("Selected unit:", clickedUnit);
      }
    });

    gc.addEventListener("contextmenu", e => {
      e.preventDefault();
      const rect = gc.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Move selected units to clicked position
      // This is a simplified version - you'll want to add pathfinding
      for (const unit of gameState().units) {
        if (unit.ownerId === props.user.id) {
          gameService.moveUnit(unit.id, [x, y]);
        }
      }
    });
  });

  return (
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">{props.room.name}</h2>
        <div class="flex items-center gap-2">
          {props.room.startTime == null ? (
            <p>Waiting for players...</p>
          ) : props.room.startTime > clock() ? (
            <p>{`Game will start in ${Math.floor((props.room.startTime - clock()) / 1000)} seconds`}</p>
          ) : (
            <>
              <button
                class="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={() => {
                  if (tickInterval()) {
                    clearInterval(tickInterval());
                    setTickInterval(undefined);
                  } else {
                    setTickInterval(setInterval(() => {
                      gameTickSystem.tick();
                    }, tickRate()));
                  }
                }}
              >
                {tickInterval() ? "Pause" : "Play"}
              </button>
              <button
                class="px-4 py-2 bg-green-500 text-white rounded"
                onClick={() => gameService.toggleReady(props.room.id, props.user.id)}
              >
                {gameState().readyState?.readyUserIds.includes(props.user.id)
                  ? "Not Ready"
                  : "Ready"}
              </button>
            </>
          )}
        </div>
      </div>

      <canvas
        ref={setGameCanvas}
        width={800}
        height={600}
        class="border border-gray-300"
      />
    </div>
  );
}
