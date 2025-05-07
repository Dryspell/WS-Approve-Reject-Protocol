import Graph from "graphology";

// Basic layout positioning function
export const applyLayout = (graph: Graph) => {
  const radius = 0.4;
  const centerX = 0.5;
  const centerY = 0.5;
  const nodes = Array.from(graph.nodes());

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    graph.mergeNodeAttributes(node, { x, y });
  });
};
