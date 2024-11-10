import { createSignal, onMount } from "solid-js";

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

const initializeGame = (gameCanvas: HTMLCanvasElement) => {
  const ctx = gameCanvas.getContext("2d");
  if (!ctx) {
    console.error("Failed to get 2d context from canvas");
    return;
  }

  const [rect, setRect] = createSignal([10, 10, 100, 100] as [
    x: number,
    y: number,
    width: number,
    height: number,
  ]);
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

export default function Game() {
  let gameCanvas: HTMLCanvasElement | undefined = undefined;

  onMount(() => {
    gameCanvas && initializeGame(gameCanvas);
  });

  return (
    <main class="mx-auto p-4 text-gray-700">
      <canvas
        ref={gameCanvas}
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
