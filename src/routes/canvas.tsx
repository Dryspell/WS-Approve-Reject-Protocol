import { Accessor, createSignal, onMount, Setter } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";

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

    setGameObjects("players", [0, gameObjects.players.length - 1], player => {
      return {
        ...player,
        pos: player.pos.map((coord, i) => {
          if (
            coord + player.velocity[i] > canvasSize[i] - player.dims[i] ||
            coord + player.velocity[i] < 0
          ) {
            player.velocity[i] = -player.velocity[i];
          }
          return coord + player.velocity[i];
        }) as Player["pos"],
      };
    });

    gameObjects.players.forEach(player => createRect(ctx, ...player.pos, ...player.dims));

    requestAnimationFrame(dvdBounceGameLoop);
  };

  dvdBounceGameLoop();
};

const getPagePosition = (canvas: HTMLCanvasElement | undefined, posX: number, posY: number) => {
  if (!canvas) {
    return [0, 0] as [x: number, y: number];
  }

  const canvasRect = canvas.getBoundingClientRect();
  const x = posX - canvasRect.left;
  const y = posY - canvasRect.top;
  return [x, y] as [x: number, y: number];
};

const FollowingUI = (props: {
  gameCanvas: Accessor<HTMLCanvasElement | undefined>;
  player: Player;
}) => {
  const pos = () => getPagePosition(props.gameCanvas(), ...props.player.pos);
  return (
    <div style={{ position: "absolute", left: `${pos()[0]}px`, top: `${pos()[1]}px` }}>
      <Button>{props.player.id}</Button>
      <Progress
        value={props.player.hp}
        minValue={0}
        maxValue={props.player.maxHp}
        style={{
          width: `${props.player.dims[0]}px`,
        }}
        color="bg-red-500"
      />
    </div>
  );
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const DEFAULT_OBJECTS = {
  players: [
    {
      type: "player",
      id: "player1",
      color: "red",
      pos: [150, 300],
      dims: [100, 100],
      velocity: [1, 1],
      hp: 80,
      maxHp: 100,
    },
    {
      type: "player",
      id: "player2",
      color: "blue",
      pos: [650, 300],
      dims: [100, 100],
      velocity: [1, 1],
      hp: 80,
      maxHp: 100,
    },
  ] as Player[],
} as const;

type Player = {
  id: string;
  type: "player";
  color: string;
  pos: [x: number, y: number];
  dims: [width: number, height: number];
  velocity: [dx: number, dy: number];
  hp: number;
  maxHp: number;
};

type Enemy = {
  type: "enemy";
  color: string;
  pos: [x: number, y: number];
  dims: [width: number, height: number];
  hp: number;
  maxHp: number;
};

type GameObject = Player | Enemy;

export default function Game() {
  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  const [gameObjects, setGameObjects] = createStore(DEFAULT_OBJECTS);

  onMount(() => {
    gameCanvas() && initializeGame(gameCanvas(), gameObjects, setGameObjects);
    // console.log(gameObjects.players);
  });

  return (
    <main class="relative mx-auto p-4 text-gray-700">
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
    </main>
  );
}
