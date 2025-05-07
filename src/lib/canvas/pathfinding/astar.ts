import { _hasPos } from "~/routes/canvas/combat/types";
import { applyTerrain } from "../grids";

type Node = _hasPos & {
  gCost: number; // Cost from start to this node
  hCost: number; // Heuristic cost from this node to the target
  fCost: number; // gCost + hCost
  parent?: Node; // Parent node for path tracing
};

// Utility functions for the A* algorithm
export const octileHeuristic = (a: _hasPos, b: _hasPos, minMovementCost = 1) => {
  const dx = Math.abs(a.pos[0] - b.pos[0]);
  const dy = Math.abs(a.pos[1] - b.pos[1]);
  const D = minMovementCost; // Cost for orthogonal moves
  const D2 = minMovementCost * 1.414; // Cost for diagonal moves
  return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
};

const isInBounds = (point: _hasPos, cols: number, rows: number) =>
  point.pos[0] >= 0 && point.pos[1] >= 0 && point.pos[0] < cols && point.pos[1] < rows;

const getNeighbors = (node: Node, cols: number, rows: number): Node[] => {
  // Include diagonal directions
  const neighbors: _hasPos[] = [
    { pos: [node.pos[0] + 1, node.pos[1]] }, // Right
    { pos: [node.pos[0] - 1, node.pos[1]] }, // Left
    { pos: [node.pos[0], node.pos[1] + 1] }, // Down
    { pos: [node.pos[0], node.pos[1] - 1] }, // Up
    { pos: [node.pos[0] + 1, node.pos[1] + 1] }, // Down-Right
    { pos: [node.pos[0] - 1, node.pos[1] + 1] }, // Down-Left
    { pos: [node.pos[0] + 1, node.pos[1] - 1] }, // Up-Right
    { pos: [node.pos[0] - 1, node.pos[1] - 1] }, // Up-Left
  ];

  return neighbors
    .filter(n => isInBounds(n, cols, rows))
    .map(position => ({
      ...position,
      gCost: 0,
      hCost: 0,
      fCost: 0,
    }));
};

export function aStar(
  terrain: ReturnType<typeof applyTerrain>,
  start: _hasPos,
  end: _hasPos,
  openSet: Node[] = [
    {
      ...start,
      gCost: 0,
      hCost: octileHeuristic(start, end),
      fCost: octileHeuristic(start, end),
    },
  ],
  closedSet: Set<string> = new Set(),
  current?: Node,
) {
  const rows = terrain.length;
  const cols = terrain[0].length;

  const key = (point: _hasPos) => `${point.pos[0]},${point.pos[1]}`;

  while (openSet.length > 0) {
    // Sort openSet by fCost and pop the node with the lowest fCost
    openSet.sort((a, b) => a.fCost - b.fCost);
    const current = openSet.shift()!;

    // Check if we reached the end
    if (current.pos[0] === end.pos[0] && current.pos[1] === end.pos[1]) {
      const path: _hasPos[] = [];
      let node: Node | undefined = current;
      while (node) {
        path.push(node);
        node = node.parent;
      }
      return path.reverse();
    }

    closedSet.add(key(current));

    for (const neighbor of getNeighbors(current, cols, rows)) {
      if (closedSet.has(key(neighbor))) continue;

      const movementCost = terrain[neighbor.pos[0]][neighbor.pos[1]].movementCost ?? 1;

      const isDiagonal = current.pos[0] !== neighbor.pos[0] && current.pos[1] !== neighbor.pos[1];
      const diagonalCost = isDiagonal ? 1.414 : 1; // Approximate cost for diagonal movement
      const gCost = current.gCost + movementCost * diagonalCost;

      const existingNode = openSet.find(
        node => node.pos[0] === neighbor.pos[0] && node.pos[1] === neighbor.pos[1],
      );

      if (!existingNode || gCost < existingNode.gCost) {
        neighbor.gCost = gCost;
        neighbor.hCost = octileHeuristic(neighbor, end);
        neighbor.fCost = neighbor.gCost + neighbor.hCost;
        neighbor.parent = current;

        if (!existingNode) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return undefined; // No path found
}

export function aStarIterable(
  terrain: ReturnType<typeof applyTerrain>,
  start: _hasPos,
  end: _hasPos,
  openSet: Node[] = [
    {
      ...start,
      gCost: 0,
      hCost: octileHeuristic(start, end),
      fCost: octileHeuristic(start, end),
    },
  ],
  closedSet: Set<string> = new Set(),
  current?: Node,
  unProcessedNeighbors: ReturnType<typeof getNeighbors> = [],
  processingNeighbor: Node | undefined = undefined,
): {
  terrain: ReturnType<typeof applyTerrain>;
  start: _hasPos;
  end: _hasPos;
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

  const key = (point: _hasPos) => `${point.pos[0]},${point.pos[1]}`;

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
  if (current.pos[0] === end.pos[0] && current.pos[1] === end.pos[1]) {
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

  closedSet.add(key(current));

  if (!unProcessedNeighbors.length) {
    unProcessedNeighbors = getNeighbors(current, cols, rows).filter(
      neighbor => !closedSet.has(key(neighbor)),
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
    const neighborTerrain = terrain[neighbor.pos[0]][neighbor.pos[1]].type;

    console.log(
      `Processing neighbor at ${neighbor.pos[0]},${neighbor.pos[1]} (${neighborTerrain})`,
    );

    const movementCost = terrain[neighbor.pos[0]][neighbor.pos[1]].movementCost ?? 1;

    const isDiagonal = current.pos[0] !== neighbor.pos[0] && current.pos[1] !== neighbor.pos[1];
    const diagonalCost = isDiagonal ? 1.414 : 1; // Approximate cost for diagonal movement

    movementCost > 1 && console.log({ movementCost, diagonalCost });

    const gCost = current.gCost + movementCost * diagonalCost;

    const existingNode = openSet.find(
      node => node.pos[0] === neighbor.pos[0] && node.pos[1] === neighbor.pos[1],
    );

    if (!existingNode || gCost < existingNode.gCost) {
      neighbor.gCost = gCost;
      neighbor.hCost = octileHeuristic(neighbor, end);
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
