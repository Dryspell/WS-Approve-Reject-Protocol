import { aStar } from "~/lib/canvas/pathfinding/astar";
import { applyTerrain } from "~/lib/canvas/grids";
import { findPathToClosestTarget } from "~/lib/canvas/pathfinding/utils";
import {
  _hasCombatData,
  _hasIdentificationData,
  _hasPos,
  _hasRenderData,
  Unit,
} from "../combat/types";

export function handleUnitMovement(
  unit: Unit,
  targets: Unit[],
  minions: Unit[],
  terrain: ReturnType<typeof applyTerrain>,
) {
  // Handle no targets
  if (!targets.length) {
    unit.movementData = undefined;

    return unit;
  }

  // Handle no path or target
  if (!unit.movementData?.path || !unit.movementData?.target) {
    unit.movementData = findPathToClosestTarget(
      unit,
      unit.type === "minion" ? targets : minions,
      terrain,
    );
  }

  if (!unit.movementData?.path?.length) {
    return unit;
  }

  // Move unit
  unit.movementData.path = unit.movementData.path.slice(1);
  unit.pos[0] = unit.movementData.path?.[0].pos[0] ?? unit.pos[0];
  unit.pos[1] = unit.movementData.path?.[0].pos[1] ?? unit.pos[1];

  // Handle reaching target
  if (
    unit.movementData?.target &&
    unit.pos[0] === unit.movementData?.target.pos[0] &&
    unit.pos[1] === unit.movementData?.target.pos[1]
  ) {
    targets.splice(
      targets.findIndex(
        t =>
          t.pos[0] === unit.movementData?.target!.pos[0] &&
          t.pos[1] === unit.movementData?.target!.pos[1],
      ),
      1,
    );
    minions.forEach(minion => {
      if (
        minion.movementData &&
        unit.movementData &&
        minion.movementData.target?.pos[0] === unit.movementData.target!.pos[0] &&
        minion.movementData.target?.pos[1] === unit.movementData.target!.pos[1]
      ) {
        minion.movementData = undefined;
      }
    });

    unit.movementData = findPathToClosestTarget(
      unit,
      unit.type === "minion" ? targets : minions,
      terrain,
    );
  }

  // Update with new path to target
  else if (unit.movementData?.target) {
    unit.movementData.path = aStar(terrain, unit, unit.movementData.target);
  }

  return unit;
}
