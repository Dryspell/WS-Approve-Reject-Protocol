import { circle } from "~/lib/canvas/shapes";
import {
  _hasCombatData,
  _hasIdentificationData,
  _hasPos,
  _hasRenderData,
  Unit,
} from "../combat/types";

export const drawUnit = (
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  cellWidth: number,
  cellHeight: number,
) => {
  const [x, y] = [(unit.pos[0] + 0.5) * cellWidth, (unit.pos[1] + 0.5) * cellHeight] as [
    x: number,
    y: number,
  ];
  circle(ctx, x, y, cellWidth / 2 - 1, {
    fillStyle: unit.fillStyle,
    lineWidth: unit.lineWidth,
    strokeStyle: unit.strokeStyle,
  });
};
