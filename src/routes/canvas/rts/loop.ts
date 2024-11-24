import { Unit } from "../combat/types";
import { line } from "~/lib/canvas/shapes";
import { normalizeV2, scaleV2, withinCircle } from "./distances";

const COLLIDER_RADIUS = 2;

export function moveUnitTowardsTarget(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  units: Unit[],
) {
  if (unit.movementData?.target) {
    if (withinCircle(unit.pos, unit.movementData.target.pos, 1)) {
      unit.movementData = undefined;
      return;
    }

    line(
      ctx,
      unit.pos[0],
      unit.pos[1],
      unit.movementData.target.pos[0],
      unit.movementData.target.pos[1],
      {
        strokeStyle: "black",
        lineWidth: 1,
      },
    );

    unit.velocity = scaleV2(
      normalizeV2(unit.movementData.target.pos, unit.pos),
      1,
    );

    const { velocity } = unit;
    if (velocity) {
      const newPos = unit.pos.map((coord, i) =>
        coord + velocity[i]
      ) as Unit["pos"];

      //check collision
      const collision = units.find(
        (u) =>
          u.id !== unit.id &&
          withinCircle(newPos, u.pos, unit.dims[0] * 2 + COLLIDER_RADIUS),
      );
      if (collision) {
        return;
      }

      unit.pos = newPos;
    }
  }
}
