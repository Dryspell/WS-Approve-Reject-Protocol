import { createSignal, onMount } from "solid-js";
import { Button } from "~/components/ui/button";
import { aStar, aStarIterable } from "~/lib/canvas/pathfinding/astar";
import { applyTerrain, averageGrid, renderGrid, staticGrid } from "~/lib/canvas/grids";
import { perlinGrid } from "~/lib/canvas/perlin";
import { circle, line, text } from "~/lib/canvas/shapes";
import {
  RiMediaPauseLine,
  RiMediaPlayFill,
  RiMediaRewindFill,
  RiMediaSpeedFill,
} from "solid-icons/ri";
import { perf } from "~/lib/perf";
import { _hasPos } from "../combat/types";

function getMousePosition(
  canvas: HTMLCanvasElement,
  event: MouseEvent,
  setRenderValue?: (x: number, y: number) => void,
) {
  let rect = canvas.getBoundingClientRect();
  let x = event.clientX - rect.left;
  let y = event.clientY - rect.top;
  setRenderValue ? setRenderValue(x, y) : console.log("Coordinate x: " + x, "Coordinate y: " + y);
}

type Unit = {
  fillStyle: CanvasRenderingContext2D["fillStyle"];
  lineWidth: number;
  strokeStyle: CanvasRenderingContext2D["strokeStyle"];
} & _hasPos;

const drawUnit = (
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  cellWidth: number,
  cellHeight: number,
) => {
  const [x, y] = [(unit.pos[0] + 0.5) * cellWidth, (unit.pos[1] + 0.5) * cellHeight] as [
    x: number,
    y: number,
  ];
  circle(ctx, x, y, cellWidth / 2 - 1, {
    fillStyle: unit.fillStyle,
    lineWidth: unit.lineWidth,
    strokeStyle: unit.strokeStyle,
  });
};

const initializeGame = (gameCanvas: HTMLCanvasElement | undefined) => {
  if (!gameCanvas) {
    console.error("Canvas element is not defined");
    return () => {};
  }
  const ctx = gameCanvas.getContext("2d");
  if (!ctx) {
    console.error("Failed to get 2d context from canvas");
    return () => {};
  }
  const [canvasWidth, canvasHeight] = [gameCanvas.width, gameCanvas.height] as [
    width: number,
    height: number,
  ];

  const cellWidth = 25;
  const cellHeight = 25;

  const sg = staticGrid(canvasWidth, canvasHeight, cellWidth, cellHeight);
  const pg = perlinGrid(sg);
  const terrain = applyTerrain(averageGrid(pg));

  gameCanvas.addEventListener("mousemove", event => {
    getMousePosition(gameCanvas, event, (x, y) => {
      console.log(
        `(${Math.floor(x / cellWidth)}, ${Math.floor(y / cellHeight)}): ${terrain[Math.floor(x / cellWidth)][Math.floor(y / cellHeight)].type} (${terrain[Math.floor(x / cellWidth)][Math.floor(y / cellHeight)].movementCost})`,
      );
    });
  });

  const minion: Unit = {
    pos: [Math.floor(Math.random() * sg.length), Math.floor(Math.random() * sg[0].length)] as [
      number,
      number,
    ],
    fillStyle: "cyan",
    lineWidth: 1,
    strokeStyle: "black",
  };

  const generateTarget = () => ({
    pos: [Math.floor(Math.random() * sg.length), Math.floor(Math.random() * sg[0].length)] as [
      number,
      number,
    ],
    fillStyle: "red",
    lineWidth: 1,
    strokeStyle: "blue",
  });

  let target: Unit = generateTarget();

  console.log({ minion, target });

  let path = perf(() => aStar(terrain, minion, target));

  const gameLoop = () => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    renderGrid(ctx, terrain, canvasWidth, canvasHeight, cellWidth, cellHeight);

    drawUnit(ctx, minion, cellWidth, cellHeight);
    drawUnit(ctx, target, cellWidth, cellHeight);

    if (path) {
      for (let i = 0; i < path.length; i++) {
        path[i + 1] &&
          line(
            ctx,
            (path[i].pos[0] + 0.5) * cellWidth,
            (path[i].pos[1] + 0.5) * cellHeight,
            (path[i + 1].pos[0] + 0.5) * cellWidth,
            (path[i + 1].pos[1] + 0.5) * cellHeight,
            {
              strokeStyle: "magenta",
              lineWidth: 1,
            },
          );
      }
    }
    // requestAnimationFrame(gameLoop);
  };

  const tick = () => {
    console.log("Ticked");
    path?.shift();
    minion.pos[0] = path?.[0].pos[0] ?? minion.pos[0];
    minion.pos[1] = path?.[0].pos[1] ?? minion.pos[1];

    if (minion.pos[0] === target.pos[0] && minion.pos[1] === target.pos[1]) {
      target = generateTarget();
      path = perf(() => aStar(terrain, minion, target));
    }

    gameLoop();
  };

  gameLoop();
  console.log("Game initialized");
  return tick;
};

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;

export default function Game() {
  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  const [tickRate, setTickRate] = createSignal(1000);
  const [tickInterval, setTickInterval] = createSignal<NodeJS.Timeout | undefined>(undefined);

  let tick = () => {};

  onMount(() => {
    if (gameCanvas()) {
      console.log("Initializing game...");
      tick = initializeGame(gameCanvas());
    }
    // console.log(gameObjects.players);
  });

  return (
    <main class="relative mx-auto p-4 text-gray-700">
      <div class="relative" style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}>
        <div
          style={{
            position: "absolute",
            top: "1%",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "1rem", // Adds space between buttons
            "align-items": "center", // Aligns items vertically
            "z-index": 1,
          }}
        >
          <Button
            style={{}}
            onClick={() => {
              setTickRate(tickRate() + 250);
              clearInterval(tickInterval());
              setTickInterval(setInterval(tick, tickRate()));
            }}
          >
            <RiMediaRewindFill />
          </Button>
          <Button
            style={{}}
            onClick={() => {
              console.log("Ticking game...", tick.toString());
              tick();
            }}
          >
            Tick
          </Button>
          <Button
            style={{}}
            onClick={() => {
              if (tickInterval()) {
                clearInterval(tickInterval());
                setTickInterval(undefined);
              } else {
                setTickInterval(setInterval(tick, tickRate()));
              }
            }}
          >
            {tickInterval() ? <RiMediaPauseLine /> : <RiMediaPlayFill />}
          </Button>
          <Button
            style={{}}
            onClick={() => {
              setTickRate(Math.max(tickRate() - 250, 0));
              clearInterval(tickInterval());
              setTickInterval(setInterval(tick, tickRate()));
            }}
          >
            <RiMediaSpeedFill />
          </Button>
        </div>

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
    </main>
  );
}
