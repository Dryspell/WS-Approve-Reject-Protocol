import { _hasPos } from "~/routes/canvas/combat/types";
import { applyTerrain } from "../grids";
import { aStar, octileHeuristic } from "./astar";

export const findPathToClosestTarget = <Ta extends _hasPos, Tb extends _hasPos>(
  start: Ta,
  targets: Tb[],
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

export const isAdjacentTo = <Ta extends _hasPos, Tb extends _hasPos>(a: Ta, bs: Tb[]) =>
  bs.find(b => Math.max(Math.abs(a.pos[0] - b.pos[0]), Math.abs(a.pos[1] - b.pos[1])) <= 1);
