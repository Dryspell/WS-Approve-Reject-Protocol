import { Unit } from "../combat/types";
import { circle, line } from "~/lib/canvas/shapes";
import {
  computePathSegments,
  normalizeV2,
  scaleV2,
  withinCircle,
} from "./spatial";

const COLLIDER_RADIUS = 2;

export function drawTargetsAndMove(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  units: Unit[],
) {
  const closeEnoughRadius = unit.dims[0]

  if (unit.movementData?.target) {
    if (withinCircle(unit.pos, unit.movementData.target.pos, closeEnoughRadius)) {
      unit.movementData = undefined;
      return;
    }

    circle(
      ctx,
      unit.movementData.target.pos[0],
      unit.movementData.target.pos[1],
      5,
      {
        fillStyle: undefined,
        strokeStyle: "gray",
      },
    );

    const nextStep = unit.movementData.path?.[0];
    if (!nextStep) {
      unit.movementData = undefined;
      return;
    }

    if (withinCircle(unit.pos, nextStep.pos, closeEnoughRadius)) {
      unit.movementData.path?.shift();
    }

    if (!unit.movementData.path) {
      unit.movementData = undefined;
      return;
    }

    computePathSegments(
      unit.pos,
      unit.movementData.path?.map(({ pos }) => pos),
    ).forEach(
      ([start, end]) => {
        line(
          ctx,
          ...start,
          ...end,
          {
            strokeStyle: "black",
            lineWidth: 1,
          },
        );
      },
    );

    unit.velocity = scaleV2(
      normalizeV2(unit.movementData.path[0].pos, unit.pos),
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
