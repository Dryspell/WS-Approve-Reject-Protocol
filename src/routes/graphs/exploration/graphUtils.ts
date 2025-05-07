import Graph from "graphology";
import { applyLayout } from "./layout";
import { assignIndependentCoordinates } from "./matrixUtils";

export const createK3Graph = (): Graph<{
  label: string;
  size: number;
  color: string;
  coordinates: [number, number, number];
  x: number;
  y: number;
}> => {
  const graph = new Graph<{
    label: string;
    size: number;
    color: string;
    coordinates?: [number, number, number];
    x?: number;
    y?: number;
  }>();
  graph.addNode("1", { label: "Node 1", size: 10, color: "blue" });
  graph.addNode("2", { label: "Node 2", size: 20, color: "red" });
  graph.addNode("3", { label: "Node 3", size: 15, color: "green" });
  graph.addEdge("1", "2", { size: 5, color: "purple" });
  graph.addEdge("2", "3", { size: 5, color: "orange" });
  graph.addEdge("1", "3", { size: 5, color: "grey" });

  applyLayout(graph);
  assignIndependentCoordinates(graph); // Assign independent coordinates for each node
  //@ts-expect-error - Annoying dealing with the types, but applyLayout and AssignIndependentCoordinates are mutating the graph
  return graph;
};

export const createVGraph = (): Graph<{
  label: string;
  size: number;
  color: string;
  coordinates: [number, number, number];
  x: number;
  y: number;
}> => {
  const graph = new Graph<{
    label: string;
    size: number;
    color: string;
    coordinates?: [number, number, number];
    x?: number;
    y?: number;
  }>();
  graph.addNode("1", { label: "Node 1", size: 10, color: "blue" });
  graph.addNode("2", { label: "Node 2", size: 20, color: "red" });
  graph.addNode("3", { label: "Node 3", size: 15, color: "green" });
  graph.addEdge("1", "2", { size: 5, color: "purple" });
  graph.addEdge("2", "3", { size: 5, color: "orange" });

  applyLayout(graph);
  assignIndependentCoordinates(graph); // Assign independent coordinates for each node
  //@ts-expect-error - Annoying dealing with the types, but applyLayout and AssignIndependentCoordinates are mutating the graph
  return graph;
};