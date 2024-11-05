import { Accessor, createSignal, For, onMount, Setter } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress, ProgressLabel, ProgressValueLabel } from "~/components/ui/progress";
import { GameChatMessage, GameEvent, Player } from "./types";
import { generateCombatEvent, processCombatEvents } from "./combatEvents";

const createRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: CanvasRenderingContext2D["fillStyle"] = "red",
) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
};

const initializeGame = (
  gameCanvas: HTMLCanvasElement | undefined,
  gameObjects: typeof DEFAULT_OBJECTS,
  setGameObjects: SetStoreFunction<typeof DEFAULT_OBJECTS>,
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

    gameObjects.players.forEach(player =>
      createRect(ctx, ...player.pos, ...player.dims, player.color),
    );

    requestAnimationFrame(dvdBounceGameLoop);
  };

  dvdBounceGameLoop();
};

const getPagePosition = (canvas: HTMLCanvasElement | undefined, posX: number, posY: number) => {
  if (!canvas) {
    return [0, 0] as [x: number, y: number];
  }

  const canvasRect = canvas.getBoundingClientRect();
  const x = posX - canvasRect.x / canvasRect.left + canvas.offsetLeft;
  const y = posY - canvasRect.y / canvasRect.top + canvas.offsetTop;
  return [x, y] as [x: number, y: number];
};

const FollowingUI = (props: {
  gameCanvas: Accessor<HTMLCanvasElement | undefined>;
  player: Player;
}) => {
  const pos = () => getPagePosition(props.gameCanvas(), ...props.player.pos);
  const progressScaleFactor = 1.5;

  return (
    <div style={{ position: "absolute", left: `${pos()[0]}px`, top: `${pos()[1] - 150}px` }}>
      <Badge>{props.player.name}</Badge>
      <Progress
        value={props.player.hp}
        minValue={0}
        maxValue={props.player.maxHp}
        getValueLabel={({ value, max }) => `${value} / ${max}`}
        class="my-2 w-[300px] space-y-1"
        style={{
          width: `${props.player.dims[0] * progressScaleFactor}px`,
        }}
        color="bg-red-500"
      >
        <div class="flex justify-between">
          <ProgressLabel>Health:</ProgressLabel>
          <ProgressValueLabel />
        </div>
      </Progress>
      <Progress
        value={props.player.mana}
        minValue={0}
        maxValue={props.player.maxMana}
        getValueLabel={({ value, max }) => `${value} / ${max}`}
        class="my-2 w-[300px] space-y-1"
        style={{
          width: `${props.player.dims[0] * progressScaleFactor}px`,
        }}
        color="bg-blue-500"
      >
        <div class="flex justify-between">
          <ProgressLabel>Mana:</ProgressLabel>
          <ProgressValueLabel />
        </div>
      </Progress>
      <Progress
        value={props.player.stamina}
        minValue={0}
        maxValue={props.player.maxStamina}
        getValueLabel={({ value, max }) => `${value} / ${max}`}
        class="my-2 w-[300px] space-y-1"
        style={{
          width: `${props.player.dims[0] * progressScaleFactor}px`,
        }}
        color="bg-yellow-500"
      >
        <div class="flex justify-between">
          <ProgressLabel>Stamina:</ProgressLabel>
          <ProgressValueLabel />
        </div>
      </Progress>
    </div>
  );
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export const defaultCombatData = () => ({
  hp: 80,
  maxHp: 100,
  mana: 50,
  maxMana: 100,
  stamina: 30,
  maxStamina: 100,
  attack: 10,
  defense: 5,
  speed: 10,
  accuracy: 90,
  blockChance: 10,
  evasion: 10,
  critChance: 10,
  critMultiplier: 2,
});

const DEFAULT_OBJECTS = {
  players: [
    {
      type: "player",
      id: "player1",
      name: "Player 1",
      color: "maroon",
      pos: [150, 300],
      dims: [100, 100],
      velocity: [1, 1],
      ...defaultCombatData(),
    },
    {
      type: "player",
      id: "player2",
      name: "Player 2",
      color: "navy",
      pos: [550, 300],
      dims: [100, 100],
      velocity: [1, 1],
      ...defaultCombatData(),
    },
  ] as Player[],
} as const;

const gameTick = (
  gameObjects: typeof DEFAULT_OBJECTS,
  setGameObjects: SetStoreFunction<typeof DEFAULT_OBJECTS>,
  gameChat: GameChatMessage[],
  setGameChat: SetStoreFunction<GameChatMessage[]>,
  gameEvents: GameEvent[],
  setGameEvents: SetStoreFunction<GameEvent[]>,
) => {
  const attackers = gameObjects.players;
  const defenders = gameObjects.players;

  const newAttackEvents = attackers.map(attacker => {
    const defender = defenders.find(p => p.id !== attacker.id);
    if (!defender) {
      throw new Error("No defender found");
    }
    return generateCombatEvent(attacker, defender);
  });

  processCombatEvents(newAttackEvents, attackers, defenders, setGameChat, gameChat, setGameObjects);

  setGameEvents([...gameEvents, ...newAttackEvents]);
};

export default function Game() {
  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);

  const [gameObjects, setGameObjects] = createStore(DEFAULT_OBJECTS);

  const [chatBoxRef, setChatBoxRef] = createSignal<HTMLDivElement | undefined>(undefined);
  const [gameChat, setGameChat] = createStore([] as GameChatMessage[]);
  const [gameEvents, setGameEvents] = createStore([] as GameEvent[]);

  onMount(() => {
    gameCanvas() && initializeGame(gameCanvas(), gameObjects, setGameObjects);
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
            gameTick(gameObjects, setGameObjects, gameChat, setGameChat, gameEvents, setGameEvents);
            const chatBox = chatBoxRef();
            if (chatBox) {
              chatBox.scrollTop = chatBox.scrollHeight;
            }
          }}
        >
          Tick
        </Button>

        {gameObjects.players.map((player: Player) => (
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
