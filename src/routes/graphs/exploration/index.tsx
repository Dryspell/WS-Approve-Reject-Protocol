import Graph from "graphology";
import { createSignal, onMount } from "solid-js";
import { applyLayout } from "./layout";
import {
  assignIndependentCoordinates,
  createAdjacencyMatrix,
  createCoordinateMatrix,
  createIncidenceMatrix,
} from "./matrixUtils";
import MatrixTable from "./MatrixTable";
import ThreeJSGraph from "./ThreeJSGraph";

const createGraph = (): Graph => {
  const graph = new Graph();
  graph.addNode("1", { label: "Node 1", size: 10, color: "blue" });
  graph.addNode("2", { label: "Node 2", size: 20, color: "red" });
  graph.addNode("3", { label: "Node 3", size: 15, color: "green" });
  graph.addEdge("1", "2", { size: 5, color: "purple" });
  graph.addEdge("2", "3", { size: 5, color: "orange" });
  graph.addEdge("1", "3", { size: 5, color: "grey" });

  applyLayout(graph);
  assignIndependentCoordinates(graph); // Assign independent coordinates for each node
  return graph;
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function GraphPage() {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  const graph = createGraph();
  const { matrix: adjacencyMatrix, labels: adjacencyLabels } = createAdjacencyMatrix(graph);
  const {
    matrix: incidenceMatrix,
    rowLabels: incidenceRowLabels,
    colLabels: incidenceColLabels,
  } = createIncidenceMatrix(graph);
  const { matrix: coordinateMatrix, labels: coordinateLabels } = createCoordinateMatrix(graph);

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
        <ThreeJSGraph graph={graph} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
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
        <MatrixTable
          title="Coordinate Matrix"
          rowLabels={coordinateLabels}
          colLabels={coordinateMatrix[0].map((_, i) => `D${i + 1}`)}
          matrix={coordinateMatrix}
        />
      </div>
    </main>
  );
}
