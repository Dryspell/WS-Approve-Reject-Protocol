import { Accessor, createMemo, createSignal, onMount } from "solid-js";
import {
  createAdjacencyMatrix,
  createIncidenceMatrix,
} from "./matrixUtils";
import MatrixTable from "./MatrixTable";
import ThreeJSGraph from "./ThreeJSGraph";
import { createK3Graph, createVGraph } from "./graphUtils";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function CoordinateMatrix(props: {
  coordinates: Accessor<{ [key: string]: [number, number, number] }>;
}) {
  const cm = createMemo(() =>
    Object.entries(props.coordinates()).reduce(
      ({ matrix, labels }, [node, coords]) => ({
        matrix: [...matrix, coords],
        labels: [...labels, node],
      }),
      { matrix: [] as [number, number, number][], labels: [] as string[] },
    ),
  );

  return (
    <MatrixTable
      title="Coordinate Matrix"
      rowLabels={cm().labels}
      colLabels={(cm().matrix?.[0] ?? []).map((_, i) => `D${i + 1}`)}
      matrix={cm().matrix}
      rounding={2}
    />
  );
}

export default function GraphPage() {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  const graph = createVGraph();
  const { matrix: adjacencyMatrix, labels: adjacencyLabels } = createAdjacencyMatrix(graph);
  const {
    matrix: incidenceMatrix,
    rowLabels: incidenceRowLabels,
    colLabels: incidenceColLabels,
  } = createIncidenceMatrix(graph);
  const [coordinates, setCoordinates] = createSignal<{ [key: string]: [number, number, number] }>(
    {},
  );

  // const { matrix: coordinateMatrix, labels: coordinateLabels } = createCoordinateMatrix(graph);

  onMount(() => {
    const canvasContext = canvas()?.getContext("2d");
    if (!canvasContext) {
      console.error("Failed to get 2d context from canvas");
      return;
    }

    // Render edges
    graph.forEachEdge((edge, attr, source, target) => {
      const sourceAttr = graph.getNodeAttributes(source);
      const targetAttr = graph.getNodeAttributes(target);
      canvasContext.strokeStyle = attr.color;
      canvasContext.lineWidth = attr.size || 1;
      canvasContext.beginPath();
      canvasContext.moveTo(sourceAttr.x * CANVAS_WIDTH, sourceAttr.y * CANVAS_HEIGHT);
      canvasContext.lineTo(targetAttr.x * CANVAS_WIDTH, targetAttr.y * CANVAS_HEIGHT);
      canvasContext.stroke();
    });

    // Render nodes and labels
    graph.forEachNode((node, attr) => {
      canvasContext.fillStyle = attr.color;
      canvasContext.beginPath();
      canvasContext.arc(attr.x * CANVAS_WIDTH, attr.y * CANVAS_HEIGHT, attr.size, 0, 2 * Math.PI);
      canvasContext.fill();

      // Render labels with coordinates next to each node
      const coordinatesText = `(${attr.coordinates.join(", ")})`;
      canvasContext.fillStyle = "black";
      canvasContext.font = "12px Arial";
      canvasContext.fillText(
        `${attr.label} ${coordinatesText}`,
        attr.x * CANVAS_WIDTH + attr.size + 5,
        attr.y * CANVAS_HEIGHT,
      );
    });
  });

  return (
    <main class="mx-auto p-4 text-gray-700">
      <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="relative" style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}>
          <canvas
            ref={setCanvas}
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

        {/* ThreeJS Graph */}
        <ThreeJSGraph
          graph={graph}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          setCoordinates={setCoordinates}
        />
      </div>

      {/* Matrix Tables */}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MatrixTable
          title="Adjacency Matrix"
          rowLabels={adjacencyLabels}
          colLabels={adjacencyLabels}
          matrix={adjacencyMatrix}
        />
        <MatrixTable
          title="Incidence Matrix"
          rowLabels={incidenceRowLabels}
          colLabels={incidenceColLabels}
          matrix={incidenceMatrix}
        />
        <CoordinateMatrix coordinates={coordinates} />
      </div>
    </main>
  );
}
