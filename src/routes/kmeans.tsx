import { createSignal, onMount } from "solid-js";
import { Button } from "~/components/ui/button";
import { kmeans } from "~/lib/spatial-utils";

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

const createCircle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strokeStyle: CanvasRenderingContext2D["strokeStyle"] = "black",
  lineWidth: number = 1,
  fillStyle?: CanvasRenderingContext2D["fillStyle"],
) => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.stroke();
};

const initializeGame = (gameCanvas: HTMLCanvasElement | undefined) => {
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

  const dataPoints = Array.from({ length: 100 }, () => ({
    x: Math.floor(Math.random() * canvasSize[0]),
    y: Math.floor(Math.random() * canvasSize[1]),
  }));

  console.log(dataPoints);

  const k = 8;
  const { clusters, centroids } = kmeans(k, dataPoints);

  console.log(
    `Points in Clusters: ${clusters.reduce((acc, cluster) => acc + cluster.length, 0)}, Clusters generated: ${clusters.length}/${k} `,
  ); // Should be 100

  if (clusters.length !== k) {
    console.log("Clusters generated are not equal to k");
    console.log({ clusters, centroids });
  }

  const randomColors = Array.from(
    { length: clusters.length },
    () => `#${Math.floor(Math.random() * 16777215).toString(16)}`,
  );

  const gameLoop = () => {
    ctx.clearRect(0, 0, ...canvasSize);

    // dataPoints.forEach(({ x, y }) => {
    //   createCircle(ctx, x, y, 5);
    // });

    randomColors.forEach((color, i) => {
      clusters[i].forEach(({ x, y }) => {
        createCircle(ctx, x, y, 5, "black", 1, color);
      });

      createRect(ctx, centroids[i].x, centroids[i].y, 10, 10, color);
    });

    // requestAnimationFrame(gameLoop);
  };

  gameLoop();
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function Game() {
  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  const [chatBoxRef, setChatBoxRef] = createSignal<HTMLDivElement | undefined>(undefined);

  onMount(() => {
    gameCanvas() && initializeGame(gameCanvas());
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
            const chatBox = chatBoxRef();
            if (chatBox) {
              chatBox.scrollTop = chatBox.scrollHeight;
            }
          }}
        >
          Tick
        </Button> */}

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
        {/* <For each={gameChat}>
          {message => (
            <div class="my-2 rounded-lg bg-gray-200 p-2">
              <span class="text-sm font-semibold">{`${message.sender}: `}</span>
              <span class="text-sm">{message.message}</span>
            </div>
          )}
        </For> */}
      </div>
    </main>
  );
}
