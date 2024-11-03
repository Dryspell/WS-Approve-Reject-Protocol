import { createSignal, onMount } from "solid-js";
import { Button } from "~/components/ui/button";
import { aStar, Point } from "~/lib/canvas/pathfinding/astar";
import { applyTerrain, averageGrid, renderGrid, staticGrid } from "~/lib/canvas/grids";
import { perlinGrid } from "~/lib/canvas/perlin";
import { circle, line, text } from "~/lib/canvas/shapes";
import {
  RiMediaPauseLine,
  RiMediaPlayFill,
  RiMediaRewindFill,
  RiMediaSpeedFill,
} from "solid-icons/ri";
import { findPathToClosestTarget } from "~/lib/canvas/pathfinding/utils";

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
  type: "minion" | "enemy";
  x: number;
  y: number;
  fillStyle: CanvasRenderingContext2D["fillStyle"];
  lineWidth: number;
  strokeStyle: CanvasRenderingContext2D["strokeStyle"];
  movementData?: ReturnType<typeof findPathToClosestTarget>;
};

const drawUnit = (
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  cellWidth: number,
  cellHeight: number,
) => {
  const [x, y] = [(unit.x + 0.5) * cellWidth, (unit.y + 0.5) * cellHeight] as [
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

  gameCanvas.addEventListener("mousemove", event => {
    getMousePosition(gameCanvas, event, (x, y) => {
      console.log(
        `(${Math.floor(x / cellWidth)}, ${Math.floor(y / cellHeight)}): ${terrain[Math.floor(x / cellWidth)][Math.floor(y / cellHeight)].type} (${terrain[Math.floor(x / cellWidth)][Math.floor(y / cellHeight)].movementCost})`,
      );
    });
  });

  const sg = staticGrid(canvasWidth, canvasHeight, cellWidth, cellHeight);
  const pg = perlinGrid(sg);
  const terrain = applyTerrain(averageGrid(pg));

  const walkableTerrain = terrain.map(row => row.filter(cell => cell.movementCost !== 255)).flat();

  const [minionCount, enemyCount] = [1, 10];
  const [minions, targets] = [[], []] as [Unit[], Unit[]];

  for (let i = 0; i < minionCount; i++) {
    const terrainIndex = Math.floor(Math.random() * walkableTerrain.length);
    const { x, y } = walkableTerrain[terrainIndex];
    walkableTerrain.splice(terrainIndex, 1);

    minions.push({
      type: "minion",
      x,
      y,
      fillStyle: "cyan",
      lineWidth: 1,
      strokeStyle: "black",
    });
  }

  for (let i = 0; i < enemyCount; i++) {
    const terrainIndex = Math.floor(Math.random() * walkableTerrain.length);
    const { x, y } = walkableTerrain[terrainIndex];
    walkableTerrain.splice(terrainIndex, 1);

    targets.push({
      type: "enemy",
      x,
      y,
      fillStyle: "red",
      lineWidth: 1,
      strokeStyle: "blue",
    });
  }

  for (let i = 0; i < minions.length; i++) {
    minions[i] = { ...minions[i], ...findPathToClosestTarget(minions[i], targets, terrain) };
  }
  for (let i = 0; i < targets.length; i++) {
    targets[i] = { ...targets[i], ...findPathToClosestTarget(targets[i], minions, terrain) };
  }

  const renderGame = () => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    renderGrid(ctx, terrain, canvasWidth, canvasHeight, cellWidth, cellHeight);

    for (const unit of [...minions, ...targets]) {
      drawUnit(ctx, unit, cellWidth, cellHeight);
      if (unit.movementData?.path) {
        for (let i = 0; i < unit.movementData.path.length; i++) {
          unit.movementData.path[i + 1] &&
            line(
              ctx,
              (unit.movementData.path[i].x + 0.5) * cellWidth,
              (unit.movementData.path[i].y + 0.5) * cellHeight,
              (unit.movementData.path[i + 1].x + 0.5) * cellWidth,
              (unit.movementData.path[i + 1].y + 0.5) * cellHeight,
              {
                strokeStyle: "green",
                lineWidth: 1,
              },
            );
        }
      }
    }

    // requestAnimationFrame(gameLoop);
  };

  renderGame();
  console.log("Game initialized");

  const tick = () => {
    console.log("Ticked");
    for (let unit of minions) {
      unit = handleUnitMovement(unit, targets, minions, terrain);
    }
    for (let unit of targets) {
      unit = handleUnitMovement(unit, targets, minions, terrain);
    }

    renderGame();
  };

  return tick;
};

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;

function handleUnitMovement(
  unit: Unit,
  targets: Unit[],
  minions: Unit[],
  terrain: ReturnType<typeof applyTerrain>,
) {
  // Handle no targets
  if (!targets.length) {
    unit.movementData = undefined;

    return unit;
  }

  // Handle no path or target
  if (!unit.movementData?.path || !unit.movementData?.target) {
    unit.movementData = findPathToClosestTarget(
      unit,
      unit.type === "minion" ? targets : minions,
      terrain,
    );
  }

  if (!unit.movementData.path?.length) {
    return unit;
  }

  // Move unit
  unit.movementData.path?.shift();
  unit.x = unit.movementData.path?.[0].x ?? unit.x;
  unit.y = unit.movementData.path?.[0].y ?? unit.y;

  // Handle reaching target
  if (
    unit.movementData?.target &&
    unit.x === unit.movementData?.target.x &&
    unit.y === unit.movementData?.target.y
  ) {
    targets.splice(
      targets.findIndex(
        t => t.x === unit.movementData?.target!.x && t.y === unit.movementData?.target!.y,
      ),
      1,
    );
    minions.forEach(minion => {
      if (
        minion.movementData &&
        unit.movementData &&
        minion.movementData.target?.x === unit.movementData.target!.x &&
        minion.movementData.target?.y === unit.movementData.target!.y
      ) {
        minion.movementData = undefined;
      }
    });

    unit.movementData = findPathToClosestTarget(
      unit,
      unit.type === "minion" ? targets : minions,
      terrain,
    );
  }

  // Update with new path to target
  else if (unit.movementData?.target) {
    unit.movementData.path = aStar(terrain, unit, unit.movementData.target);
  }

  return unit;
}

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
