import { applyTerrain } from "../grids";
import { aStar, octileHeuristic, Point } from "./astar";

export const findPathToClosestTarget = (
  start: Point,
  targets: Point[],
  terrain: ReturnType<typeof applyTerrain>,
) => {
  if (!targets.length) {
    return {
      target: undefined,
      distanceToTarget: 0,
      path: [],
    };
  }
  
  const closestTargetByHeuristic = targets.reduce(
    (closest, target) => {
      const distance = octileHeuristic(start, target);
      return distance < closest.distanceToTarget ? { target, distanceToTarget: distance } : closest;
    },
    { target: targets[0], distanceToTarget: octileHeuristic(start, targets[0]) },
  );

  return {
    ...closestTargetByHeuristic,
    path: aStar(terrain, start, closestTargetByHeuristic.target),
  };
};

export const isAdjacentTo = (a: Point, b: Point) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 1;
