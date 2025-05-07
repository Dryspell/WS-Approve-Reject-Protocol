import { createSignal, For, onMount } from "solid-js";
import { createMutable, createStore, SetStoreFunction } from "solid-js/store";
import { Button } from "~/components/ui/button";
import { GameChatMessage, GameEvent, Unit } from "./types";
import { generateCombatEvent, processCombatEvents } from "./combatEvents";
import { defaultCombatData } from "../armies/init";
import { FollowingUI } from "./FollowingUI";
import { rect } from "~/lib/canvas/shapes";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const DEFAULT_OBJECTS = {
  units: [
    {
      type: "player",
      id: "player1",
      name: "Player 1",
      fillStyle: "maroon",
      pos: [150, 300],
      dims: [100, 100],
      velocity: [1, 1],
      ...defaultCombatData(),
    },
    {
      type: "player",
      id: "player2",
      name: "Player 2",
      fillStyle: "navy",
      pos: [550, 300],
      dims: [100, 100],
      velocity: [1, 1],
      ...defaultCombatData(),
    },
  ] as Unit[],
} as const;

const initializeGame = (
  gameCanvas: HTMLCanvasElement | undefined,
  units: typeof DEFAULT_OBJECTS.units,
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

  const dvdBounceGameLoop = () => {
    ctx.clearRect(0, 0, ...canvasSize);

    // setGameObjects("players", [0, gameObjects.players.length - 1], player => {
    //   return {
    //     ...player,
    //     pos: player.pos.map((coord, i) => {
    //       if (
    //         coord + player.velocity[i] > canvasSize[i] - player.dims[i] ||
    //         coord + player.velocity[i] < 0
    //       ) {
    //         player.velocity[i] = -player.velocity[i];
    //       }
    //       return coord + player.velocity[i];
    //     }) as Player["pos"],
    //   };
    // });

    units.forEach(player =>
      rect(ctx, ...player.pos, ...player.dims, { fillStyle: player.fillStyle }),
    );

    requestAnimationFrame(dvdBounceGameLoop);
  };

  dvdBounceGameLoop();
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

  const units = createMutable(DEFAULT_OBJECTS.units);

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
        <Button
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
        </Button>

        {units.map((player: Unit) => (
          <FollowingUI player={player} gameCanvas={gameCanvas} />
        ))}
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
