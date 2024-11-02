import { createSignal, onMount } from "solid-js";
import { Button } from "~/components/ui/button";
import { circle, rect } from "~/lib/canvas/shapes";
import { randomColors } from "~/lib/canvas/utils";
import { kmeans } from "~/lib/spatial-utils";

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

  const dataPoints = Array.from({ length: 1000 }, () => ({
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

  const colors = randomColors(clusters.length);

  const gameLoop = () => {
    ctx.clearRect(0, 0, ...canvasSize);

    // dataPoints.forEach(({ x, y }) => {
    //   createCircle(ctx, x, y, 5);
    // });

    colors.forEach((color, i) => {
      clusters[i].forEach(({ x, y }) => {
        circle(ctx, x, y, 5, { fillStyle: color });
      });

      const rectDims = { width: 20, height: 20 };
      rect(
        ctx,
        centroids[i].x - rectDims.width / 2,
        centroids[i].y - rectDims.height / 2,
        rectDims.width,
        rectDims.height,
        { fillStyle: color },
      );
    });

    // requestAnimationFrame(gameLoop);
  };

  gameLoop();
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function Game() {
  const [gameCanvas, setGameCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);

  onMount(() => {
    gameCanvas() && initializeGame(gameCanvas());
    // console.log(gameObjects.players);
  });

  console.log([0, 1, 2].slice(1));

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
    </main>
  );
}
