import { createSignal, For, onMount } from "solid-js";
import { createMutable, createStore, SetStoreFunction } from "solid-js/store";
import { Button } from "~/components/ui/button";
import { GameChatMessage, GameEvent, Unit } from "../combat/types";
import { generateCombatEvent, processCombatEvents } from "../combat/combatEvents";
import { circle, rect } from "~/lib/canvas/shapes";
import { getMousePosition } from "../utils";
import { withinRect } from "./distances";
import { moveUnitTowardsTarget } from "./loop";
import { CANVAS_HEIGHT, CANVAS_WIDTH, generateUnits } from "./constants";

const initializeGame = (
  gameCanvas: HTMLCanvasElement | undefined,
  units: Unit[],
) => {
  if (!gameCanvas) {
    console.error("Canvas element is not defined");
    return;
  }
  const ctx = gameCanvas.getContext("2d");
  if (!ctx) {
    console.error("Failed to get 2d context from canvas");
    return;
  }
  const canvasSize = [gameCanvas.width, gameCanvas.height] as [width: number, height: number];

  let isDragging = false;
  let dragStart: [number, number] = [0, 0];
  let dragEnd: [number, number] = [0, 0];

  const selectedUnits = new Set<Unit>();

  gameCanvas.addEventListener("mousedown", e => {
    if (!isDragging && e.button === 0) {
      getMousePosition(gameCanvas, e, (x, y) => {
        dragStart = [x, y];
      });
      isDragging = true;
    }
  });

  gameCanvas.addEventListener("mousemove", e => {
    if (isDragging && e.button === 0) {
      getMousePosition(gameCanvas, e, (x, y) => {
        dragEnd = [x, y];
      });

      for (const unit of units) {
        if (withinRect(unit.pos, dragStart, dragEnd)) {
          selectedUnits.add(unit);
        } else {
          selectedUnits.delete(unit);
        }
      }
    }
  });

  gameCanvas.addEventListener("mouseup", e => {
    if (isDragging && e.button === 0) {
      isDragging = false;
    }
  });

  gameCanvas.addEventListener("contextmenu", e => {
    e.preventDefault();
    if (selectedUnits.size) {
      getMousePosition(gameCanvas, e, (x, y) => {
        selectedUnits.forEach(unit => {
          unit.movementData = { target: { pos: [x, y] }, path: undefined, distanceToTarget: 0 };
        });
      });
    }
  });

  const gameLoop = () => {
    ctx.clearRect(0, 0, ...canvasSize);

    if (isDragging) {
      rect(ctx, dragStart[0], dragStart[1], dragEnd[0] - dragStart[0], dragEnd[1] - dragStart[1], {
        fillStyle: "rgba(0, 0, 0, 0.2)",
      });
    }

    units.forEach(unit => {
      circle(ctx, ...unit.pos, unit.dims[0], {
        fillStyle: unit.fillStyle,
        ...(selectedUnits.has(unit) ? { strokeStyle: "green", lineWidth: 2 } : {}),
      });
      moveUnitTowardsTarget(ctx, unit, units);
    });

    requestAnimationFrame(gameLoop);
  };

  gameLoop();
};

const gameTick = (
  units: Unit[],
  gameChat: GameChatMessage[],
  setGameChat: SetStoreFunction<GameChatMessage[]>,
  gameEvents: GameEvent[],
  setGameEvents: SetStoreFunction<GameEvent[]>,
) => {
  const attackers = units;
  const defenders = units;

  const newAttackEvents = attackers.map(attacker => {
    const defender = defenders.find(p => p.id !== attacker.id);
    if (!defender) {
      throw new Error("No defender found");
    }
    return generateCombatEvent(attacker, defender);
  });

  processCombatEvents(newAttackEvents, units, setGameChat, gameChat);

  setGameEvents([...gameEvents, ...newAttackEvents]);
};

export default function Game() {
  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);

  const units = createMutable(generateUnits(5));

  const [chatBoxRef, setChatBoxRef] = createSignal<HTMLDivElement | undefined>(undefined);
  const [gameChat, setGameChat] = createStore([] as GameChatMessage[]);
  const [gameEvents, setGameEvents] = createStore([] as GameEvent[]);

  onMount(() => {
    gameCanvas() && initializeGame(gameCanvas(), units);
    // console.log(gameObjects.players);
  });

  return (
    <main class="relative mx-auto p-4 text-gray-700">
      <div class="relative" style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}>
        {/* <Button
          style={{
            position: "absolute",
            top: "1%", // Align to the top
            left: "50%", // Move to the center
            transform: "translateX(-50%)", // Center the button
            "z-index": 1,
          }}
          onClick={() => {
            console.log("Ticking game...");
            gameTick(units, gameChat, setGameChat, gameEvents, setGameEvents);
            const chatBox = chatBoxRef();
            if (chatBox) {
              chatBox.scrollTop = chatBox.scrollHeight;
            }
          }}
        >
          Tick
        </Button> */}

        {/* {units.map((player: Unit) => (
          <FollowingUI player={player} gameCanvas={gameCanvas} />
        ))} */}
        <canvas
          ref={setGameCanvas}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            "justify-content": "center",
            "align-items": "center",
            position: "relative",
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            border: "1px solid black",
          }}
        />
      </div>
      <div
        ref={setChatBoxRef}
        style={{
          "max-height": "200px",
          "overflow-y": "scroll",
          "border-top": "1px solid black",
          "border-bottom": "1px solid black",
          "margin-top": "1rem",
        }}
      >
        <For each={gameChat}>
          {message => (
            <div class="my-2 rounded-lg bg-gray-200 p-2">
              <span class="text-sm font-semibold">{`${message.sender}: `}</span>
              <span class="text-sm">{message.message}</span>
            </div>
          )}
        </For>
      </div>
    </main>
  );
}
