import Graph from "graphology";
import * as THREE from "three";

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
export const assignIndependentCoordinates1 = (graph: Graph) => {
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

// Function to assign independent dimensional coordinates to nodes
export const assignIndependentCoordinates = (graph: Graph) => {
  const nodes = graph.nodes();
  const dimensions = Math.max(1, nodes.length - 1) as 1 | 2 | 3;

  nodes.forEach((node, index) => {
    // Create a temporary array and cast it to the tuple type at the end
    const tempCoordinates = Array(dimensions).fill(0) as Array<0 | 1>;
    if (index === 0) {
      tempCoordinates.fill(0); // First node gets all ones
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

// Function to update coordinates matrix with the latest node positions
export function updateCoordinates(
  graph: Graph,
  nodeMeshMap: { [nodeId: string]: THREE.Mesh },
): { [key: string]: [number, number, number] } {
  const newCoordinates: { [key: string]: [number, number, number] } = {};
  graph.forEachNode((nodeId, attr) => {
    const nodeMesh = nodeMeshMap[nodeId];
    newCoordinates[attr.label] = [nodeMesh.position.x, nodeMesh.position.y, nodeMesh.position.z];
  });

  // console.log("New coordinates", newCoordinates);
  return newCoordinates;
}

function describeTransformation(matrix: THREE.Matrix4): string {
  // Check for rotation around specific axes by comparing with identity rotation matrices
  if (matrix.equals(new THREE.Matrix4().makeRotationY(Math.PI / 4))) {
    return "Rotate by 45 degrees around the Y-axis.";
  }
  if (matrix.equals(new THREE.Matrix4().makeRotationZ(Math.PI / 4))) {
    return "Rotate by 45 degrees around the Z-axis.";
  }

  // Check for scaling by comparing with identity scale matrix with specific factors
  const scalingFactor = new THREE.Vector3();
  matrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), scalingFactor);
  if (scalingFactor.equals(new THREE.Vector3(1.5, 1.5, 1.5))) {
    return "Scale by a factor of 1.5 along all axes.";
  }

  // Check for translation by extracting the position component
  const position = new THREE.Vector3();
  matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
  if (!position.equals(new THREE.Vector3(0, 0, 0))) {
    return `Translate by (${position.x}, ${position.y}, ${position.z}).`;
  }

  // Default case if the transformation type isn't recognized
  return "Unknown transformation";
}

// Example of describing a set of transformations
// const transformations = [
//   new THREE.Matrix4().makeRotationY(Math.PI / 4),
//   new THREE.Matrix4().makeScale(1.5, 1.5, 1.5),
//   new THREE.Matrix4().makeRotationZ(Math.PI / 4),
//   new THREE.Matrix4().makeTranslation(1, 0, 0),
// ];

// // Generate descriptions
// const transformationDescriptions = transformations.map(matrix => describeTransformation(matrix));
