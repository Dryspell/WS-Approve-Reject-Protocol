import { applyTerrain } from "./grids";

type Point = {
  x: number;
  y: number;
};

type Node = {
  position: Point;
  gCost: number; // Cost from start to this node
  hCost: number; // Heuristic cost from this node to the target
  fCost: number; // gCost + hCost
  parent?: Node; // Parent node for path tracing
};

// Utility functions for the A* algorithm
const heuristic = (a: Point, b: Point, minMovementCost = 1) => {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const D = minMovementCost; // Cost for orthogonal moves
  const D2 = minMovementCost * 1.414; // Cost for diagonal moves
  return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
};

const isInBounds = (point: Point, cols: number, rows: number) =>
  point.x >= 0 && point.y >= 0 && point.x < cols && point.y < rows;

const getNeighbors = (node: Node, cols: number, rows: number): Node[] => {
  // Include diagonal directions
  const neighbors: Point[] = [
    { x: node.position.x + 1, y: node.position.y }, // Right
    { x: node.position.x - 1, y: node.position.y }, // Left
    { x: node.position.x, y: node.position.y + 1 }, // Down
    { x: node.position.x, y: node.position.y - 1 }, // Up
    { x: node.position.x + 1, y: node.position.y + 1 }, // Down-Right
    { x: node.position.x - 1, y: node.position.y + 1 }, // Down-Left
    { x: node.position.x + 1, y: node.position.y - 1 }, // Up-Right
    { x: node.position.x - 1, y: node.position.y - 1 }, // Up-Left
  ];

  return neighbors
    .filter(n => isInBounds(n, cols, rows))
    .map(position => ({
      position,
      gCost: 0,
      hCost: 0,
      fCost: 0,
    }));
};

export function aStar(
  terrain: ReturnType<typeof applyTerrain>,
  start: Point,
  end: Point,
  openSet: Node[] = [
    {
      position: start,
      gCost: 0,
      hCost: heuristic(start, end),
      fCost: heuristic(start, end),
    },
  ],
  closedSet: Set<string> = new Set(),
  current?: Node,
) {
  const rows = terrain.length;
  const cols = terrain[0].length;

  const key = (point: Point) => `${point.x},${point.y}`;

  while (openSet.length > 0) {
    // Sort openSet by fCost and pop the node with the lowest fCost
    openSet.sort((a, b) => a.fCost - b.fCost);
    const current = openSet.shift()!;

    // Check if we reached the end
    if (current.position.x === end.x && current.position.y === end.y) {
      const path: Node[] = [];
      let node: Node | undefined = current;
      while (node) {
        path.push(node);
        node = node.parent;
      }
      return path.reverse();
    }

    closedSet.add(key(current.position));

    for (const neighbor of getNeighbors(current, cols, rows)) {
      if (closedSet.has(key(neighbor.position))) continue;

      const movementCost = terrain[neighbor.position.x][neighbor.position.y].movementCost ?? 1;

      const isDiagonal =
        current.position.x !== neighbor.position.x && current.position.y !== neighbor.position.y;
      const diagonalCost = isDiagonal ? 1.414 : 1; // Approximate cost for diagonal movement
      const gCost = current.gCost + movementCost * diagonalCost;

      const existingNode = openSet.find(
        node => node.position.x === neighbor.position.x && node.position.y === neighbor.position.y,
      );

      if (!existingNode || gCost < existingNode.gCost) {
        neighbor.gCost = gCost;
        neighbor.hCost = heuristic(neighbor.position, end);
        neighbor.fCost = neighbor.gCost + neighbor.hCost;
        neighbor.parent = current;

        if (!existingNode) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return null; // No path found
}

export function aStarIterable(
  terrain: ReturnType<typeof applyTerrain>,
  start: Point,
  end: Point,
  openSet: Node[] = [
    {
      position: start,
      gCost: 0,
      hCost: heuristic(start, end),
      fCost: heuristic(start, end),
    },
  ],
  closedSet: Set<string> = new Set(),
  current?: Node,
  unProcessedNeighbors: ReturnType<typeof getNeighbors> = [],
  processingNeighbor: Node | undefined = undefined,
): {
  terrain: ReturnType<typeof applyTerrain>;
  start: Point;
  end: Point;
  openSet: Node[];
  closedSet: Set<string>;
  current?: Node;
  unProcessedNeighbors: ReturnType<typeof getNeighbors>;
  processingNeighbor: Node | undefined;
  path: Node[];
  done: boolean;
} {
  const rows = terrain.length;
  const cols = terrain[0].length;

  console.log("iterating");

  const key = (point: Point) => `${point.x},${point.y}`;

  const constructPath = () => {
    const path: Node[] = [];
    let node: Node | undefined = current;
    while (node) {
      path.push(node);
      node = node.parent;
    }
    return path.reverse();
  };

  if (openSet.length === 0) {
    // No path found,
    return {
      terrain,
      start,
      end,
      openSet,
      closedSet,
      current,
      unProcessedNeighbors,
      processingNeighbor,
      path: constructPath(),
      done: true,
    };
  }

  // Sort openSet by fCost and pop the node with the lowest fCost
  if (!current) {
    openSet.sort((a, b) => a.fCost - b.fCost);
    current = openSet.shift()!;
  }

  // Check if we reached the end
  if (current.position.x === end.x && current.position.y === end.y) {
    return {
      terrain,
      start,
      end,
      openSet,
      closedSet,
      current,
      unProcessedNeighbors,
      processingNeighbor,
      path: constructPath(),
      done: true,
    };
  }

  closedSet.add(key(current.position));

  if (!unProcessedNeighbors.length) {
    unProcessedNeighbors = getNeighbors(current, cols, rows).filter(
      neighbor => !closedSet.has(key(neighbor.position)),
    );
    // return {
    //   terrain,
    //   start,
    //   end,
    //   openSet,
    //   closedSet,
    //   current,
    //   unProcessedNeighbors,
    //   processingNeighbor,
    //   path: constructPath(),
    //   done: false,
    // };
  }

  if (!processingNeighbor) {
    processingNeighbor = unProcessedNeighbors.shift();
    // return {
    //   terrain,
    //   start,
    //   end,
    //   openSet,
    //   closedSet,
    //   current,
    //   unProcessedNeighbors,
    //   processingNeighbor,
    //   path: constructPath(),
    //   done: false,
    // };
  }

  const processNeighbor = (neighbor: ReturnType<typeof getNeighbors>[0], current: Node) => {
    const neighborTerrain = terrain[neighbor.position.x][neighbor.position.y].type;

    console.log(
      `Processing neighbor at ${neighbor.position.x},${neighbor.position.y} (${neighborTerrain})`,
    );

    const movementCost = terrain[neighbor.position.x][neighbor.position.y].movementCost ?? 1;

    const isDiagonal =
      current.position.x !== neighbor.position.x && current.position.y !== neighbor.position.y;
    const diagonalCost = isDiagonal ? 1.414 : 1; // Approximate cost for diagonal movement

    movementCost > 1 && console.log({ movementCost, diagonalCost });

    const gCost = current.gCost + movementCost * diagonalCost;

    const existingNode = openSet.find(
      node => node.position.x === neighbor.position.x && node.position.y === neighbor.position.y,
    );

    if (!existingNode || gCost < existingNode.gCost) {
      neighbor.gCost = gCost;
      neighbor.hCost = heuristic(neighbor.position, end);
      neighbor.fCost = neighbor.gCost + neighbor.hCost;
      neighbor.parent = current;

      if (!existingNode) {
        openSet.push(neighbor);
      }
    }
  };

  processNeighbor(processingNeighbor!, current);
  return {
    terrain,
    start,
    end,
    openSet,
    closedSet,
    current: unProcessedNeighbors.length ? current : undefined,
    unProcessedNeighbors,
    processingNeighbor: undefined,
    path: constructPath(),
    done: false,
  };
}
