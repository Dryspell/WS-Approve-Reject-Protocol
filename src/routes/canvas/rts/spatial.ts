import { _hasPos } from "../combat/types";

export const withinBounds = (num: number, [b1, b2]: [number, number]) =>
  (num >= b1 && num <= b2) || (num >= b2 && num <= b1);

export const withinRect = (
  pos: [number, number],
  corner1: [number, number],
  corner2: [number, number],
) =>
  withinBounds(pos[0], [corner1[0], corner2[0]]) &&
  withinBounds(pos[1], [corner1[1], corner2[1]]);

export const withinCircle = (
  pos: [number, number],
  center: [number, number],
  radius: number,
) => {
  const [x, y] = pos;
  const [cx, cy] = center;
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
};

export function fastInvSqrt(x: number) {
  let y = x;
  let i = new Float32Array([y]);
  let j = new Int32Array(i.buffer);

  j[0] = 0x5f3759df - (j[0] >> 1);
  y = i[0];
  y = y * (1.5 - 0.5 * x * y * y);

  return y;
}

/**
 *  Normalize a vector starting from vStart to vEnd
 *
 * @param vEnd
 * @param vStart
 * @returns normalized vector
 */
export const normalizeV2 = (
  vEnd: [number, number],
  vStart = [0, 0] as [number, number],
) => {
  const [x, y] = [vEnd[0] - vStart[0], vEnd[1] - vStart[1]];

  const invMag = fastInvSqrt(x ** 2 + y ** 2);
  return [x * invMag, y * invMag] as [number, number];
};

export const scaleV2 = (v: [number, number], scalar: number) =>
  v.map((coord) => coord * scalar) as [number, number];

export const centroid = <TPoint extends _hasPos>(points: TPoint[]) => {
  const x = points.reduce((acc, point) => acc + point.pos[0], 0) /
    points.length;
  const y = points.reduce((acc, point) => acc + point.pos[1], 0) /
    points.length;

  return [x, y] as [number, number];
};

export const distance2 = <TA extends _hasPos, TB extends _hasPos>(
  a: TA,
  b: TB,
) => (a.pos[0] - b.pos[0]) ** 2 + (a.pos[1] - b.pos[1]) ** 2;
