import Graph from "graphology";

// Adjacency matrix function
export const createAdjacencyMatrix = (graph: Graph) => {
  const nodes = graph.nodes();
  const matrix = Array(nodes.length)
    .fill(null)
    .map(() => Array(nodes.length).fill(0));

  nodes.forEach((source, i) => {
    nodes.forEach((target, j) => {
      if (graph.hasEdge(source, target) || graph.hasEdge(target, source)) {
        matrix[i][j] = 1;
        matrix[j][i] = 1; // Ensure symmetry for undirected graphs
      }
    });
  });

  // Use node labels as row/column labels
  const labels = nodes.map(node => graph.getNodeAttribute(node, "label"));
  return { matrix, labels };
};

// Incidence matrix function
export const createIncidenceMatrix = (graph: Graph) => {
  const nodes = graph.nodes();
  const edges = graph.edges();
  const matrix = Array(nodes.length)
    .fill(null)
    .map(() => Array(edges.length).fill(0));

  edges.forEach((edge, edgeIndex) => {
    const [source, target] = graph.extremities(edge);
    const sourceIndex = nodes.indexOf(source);
    const targetIndex = nodes.indexOf(target);
    if (sourceIndex !== -1) matrix[sourceIndex][edgeIndex] = 1;
    if (targetIndex !== -1) matrix[targetIndex][edgeIndex] = 1;
  });

  // Use node labels as row labels and edge ids as column labels
  const rowLabels = nodes.map(node => graph.getNodeAttribute(node, "label"));
  const colLabels = edges;
  return { matrix, rowLabels, colLabels };
};

// A utility type that creates a tuple of `0 | 1` values of given length `N`
type ZeroOneTuple<N extends number, R extends Array<0 | 1> = []> = R["length"] extends N
  ? R
  : ZeroOneTuple<N, [...R, 0 | 1]>;

// Function to assign independent dimensional coordinates to nodes
export const assignIndependentCoordinates = (graph: Graph) => {
  const nodes = graph.nodes();
  const dimensions = Math.max(1, nodes.length - 1) as 1 | 2 | 3;

  nodes.forEach((node, index) => {
    // Create a temporary array and cast it to the tuple type at the end
    const tempCoordinates = Array(dimensions).fill(0) as Array<0 | 1>;
    if (index === 0) {
      tempCoordinates.fill(1); // First node gets all ones
    } else {
      tempCoordinates[index - 1] = 1; // Each subsequent node gets one '1' at a unique position
    }
    const coordinates = tempCoordinates as ZeroOneTuple<typeof dimensions>;
    graph.mergeNodeAttributes(node, { coordinates });
  });
};

export const createCoordinateMatrix = (graph: Graph) => {
  const nodes = graph.nodes();
  const labels = nodes.map(node => graph.getNodeAttribute(node, "label") as string);
  const matrix = nodes.map(node => graph.getNodeAttribute(node, "coordinates") as Array<0 | 1>);

  return { matrix, labels };
};
