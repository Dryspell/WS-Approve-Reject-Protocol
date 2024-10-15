import { Accessor, createSignal, onMount, Setter } from "solid-js";
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
  rect: Accessor<Rect>,
  setRect: Setter<Rect>,
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

  const [velocity, setVelocity] = createSignal([1, 1] as [dx: number, dy: number]);
  const canvasSize = [gameCanvas.width, gameCanvas.height] as [width: number, height: number];

  const gameLoop = () => {
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    setRect(
      rect().map((coord, i) => {
        if ([0, 1].includes(i)) {
          if (coord + velocity()[i] > canvasSize[i] - rect()[2 + i] || coord + velocity()[i] < 0) {
            setVelocity(velocity().map((v, j) => (i === j ? -v : v)) as [number, number]);
          }
          return coord + velocity()[i];
        } else {
          return coord;
        }
      }) as [number, number, number, number],
    );

    createRect(ctx, ...rect());

    requestAnimationFrame(gameLoop);
  };

  gameLoop();
};

type Rect = [x: number, y: number, width: number, height: number];

const getPagePosition = (canvas: HTMLCanvasElement | undefined, posX: number, posY: number) => {
  if (!canvas) {
    return [0, 0] as [x: number, y: number];
  }

  const canvasRect = canvas.getBoundingClientRect();
  const x = posX - canvasRect.left;
  const y = posY - canvasRect.top;
  return [x, y] as [x: number, y: number];
};

const FollowingUI = (props: { pos: [x: number, y: number] }) => {
  return (
    <div style={{ position: "absolute", left: `${props.pos[0]}px`, top: `${props.pos[1]}px` }}>
      <Button>Click</Button>
      <Progress
        value={80}
        minValue={0}
        maxValue={100}
        style={{
          width: `${100}px`,
        }}
        color="bg-red-500"
      />
    </div>
  );
};

export default function Game() {
  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  const [rect, setRect] = createSignal([10, 10, 100, 100] as Rect);
  const pos = () => getPagePosition(gameCanvas(), rect()[0], rect()[1]);

  onMount(() => {
    gameCanvas() && initializeGame(gameCanvas(), rect, setRect);
  });

  return (
    <main class="relative mx-auto p-4 text-gray-700">
      <FollowingUI pos={pos()} />
      <canvas
        ref={setGameCanvas}
        width={800}
        height={600}
        style={{
          "justify-content": "center",
          "align-items": "center",
          position: "relative",
          width: "800",
          height: "600",
          border: "1px solid black",
        }}
      />
    </main>
  );
}
