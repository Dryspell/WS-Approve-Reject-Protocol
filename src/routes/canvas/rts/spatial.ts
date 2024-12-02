import { _hasPos } from "../combat/types";
import { Resource } from "./types";
type Point = [x: number, y: number];

export const withinBounds = (num: number, [b1, b2]: Point) =>
  (num >= b1 && num <= b2) || (num >= b2 && num <= b1);

export const withinRect = (
  pos: Point,
  corner1: Point,
  corner2: Point,
) =>
  withinBounds(pos[0], [corner1[0], corner2[0]]) &&
  withinBounds(pos[1], [corner1[1], corner2[1]]);

export const withinCircle = (
  pos: Point,
  center: Point,
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

export const determinant = (a: Point, b: Point, c: Point): number =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

export function doLineSegmentsIntersect(
  p1: Point,
  p2: Point,
  q1: Point,
  q2: Point,
): boolean {
  const o1 = determinant(p1, p2, q1);
  const o2 = determinant(p1, p2, q2);
  const o3 = determinant(q1, q2, p1);
  const o4 = determinant(q1, q2, p2);

  // General case: segments straddle each other
  if (o1 * o2 < 0 && o3 * o4 < 0) {
    return true;
  }

  // Special case: check collinear and overlapping segments
  function onSegment(a: Point, b: Point, c: Point): boolean {
    return Math.min(a[0], c[0]) <= b[0] && b[0] <= Math.max(a[0], c[0]) &&
      Math.min(a[1], c[1]) <= b[1] && b[1] <= Math.max(a[1], c[1]);
  }

  return (o1 === 0 && onSegment(p1, q1, p2)) ||
    (o2 === 0 && onSegment(p1, q2, p2)) ||
    (o3 === 0 && onSegment(q1, p1, q2)) ||
    (o4 === 0 && onSegment(q1, p2, q2));
}

type Rectangle = { corner1: Point; corner2: Point };

export function doesLineIntersectRectangle(
  lineStart: Point,
  lineEnd: Point,
  rect: Rectangle,
): boolean {
  const { corner1, corner2 } = rect;

  // Extract coordinates
  const [x1, y1] = corner1;
  const [x2, y2] = corner2;

  // Calculate the other two corners of the rectangle
  const topLeft: Point = [Math.min(x1, x2), Math.min(y1, y2)];
  const bottomRight: Point = [Math.max(x1, x2), Math.max(y1, y2)];
  const topRight: Point = [bottomRight[0], topLeft[1]];
  const bottomLeft: Point = [topLeft[0], bottomRight[1]];

  // Check if the line segment intersects any of the rectangle's edges
  return (
    doLineSegmentsIntersect(lineStart, lineEnd, topLeft, topRight) ||
    doLineSegmentsIntersect(lineStart, lineEnd, topRight, bottomRight) ||
    doLineSegmentsIntersect(lineStart, lineEnd, bottomRight, bottomLeft) ||
    doLineSegmentsIntersect(lineStart, lineEnd, bottomLeft, topLeft)
  );
}

type Circle = { center: Point; radius: number };

export function doesLineIntersectCircle(
  lineStart: Point,
  lineEnd: Point,
  circle: Circle,
): boolean {
  const { center, radius } = circle;

  // Unpack center coordinates
  const [cx, cy] = center;

  // Vector from lineStart to lineEnd
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];

  // Vector from lineStart to circle center
  const fx = lineStart[0] - cx;
  const fy = lineStart[1] - cy;

  // Quadratic coefficients
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  // Discriminant
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    // No intersection
    return false;
  }

  // Compute t values to check intersection points
  const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

  // Check if t is within the range [0, 1], indicating intersection within the line segment
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

// Function to calculate tangent points from an external point to a circle
function calculateTangents(
  circle: Circle,
  externalPoint: Point,
): [Point, Point] {
  const [cx, cy] = circle.center;
  const [px, py] = externalPoint;

  // Vector from the circle's center to the external point
  const dx = px - cx;
  const dy = py - cy;

  // Distance from the external point to the circle's center
  const dist = Math.sqrt(dx * dx + dy * dy);

  // If the point is inside or on the circle, project it onto the perimeter
  if (dist <= circle.radius) {
    // Closest point on the circle's perimeter
    const closestPoint: Point = [
      cx + (dx / dist) * circle.radius,
      cy + (dy / dist) * circle.radius,
    ];
    // If the point is on or inside, tangents collapse to the same point
    return [closestPoint, closestPoint];
  }

  // Angle from circle center to external point
  const angleToExternalPoint = Math.atan2(dy, dx);

  // Angle offset for the tangent points
  const angleOffset = Math.asin(circle.radius / dist);

  // Calculate the two tangent points
  const tangent1: Point = [
    cx + circle.radius * Math.cos(angleToExternalPoint - angleOffset),
    cy + circle.radius * Math.sin(angleToExternalPoint - angleOffset),
  ];
  const tangent2: Point = [
    cx + circle.radius * Math.cos(angleToExternalPoint + angleOffset),
    cy + circle.radius * Math.sin(angleToExternalPoint + angleOffset),
  ];

  return [tangent1, tangent2];
}

// Function to calculate the detour path
function calculateDetourPath(
  lineStart: Point,
  lineEnd: Point,
  circle: Circle,
): Point[] {
  const { center, radius } = circle;

  // Vector from lineStart to lineEnd
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];

  // Vector from lineStart to circle center
  const fx = lineStart[0] - center[0];
  const fy = lineStart[1] - center[1];

  // Quadratic coefficients
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  // Discriminant
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    // No intersection, return the original path
    return [lineStart, lineEnd];
  }

  // Compute intersection points (t values)
  const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

  // Intersection points
  const intersection1: Point = [
    lineStart[0] + t1 * dx,
    lineStart[1] + t1 * dy,
  ];
  const intersection2: Point = [
    lineStart[0] + t2 * dx,
    lineStart[1] + t2 * dy,
  ];

  // Step 1: Compute the midpoint of the intersection points
  const midpoint: Point = [
    (intersection1[0] + intersection2[0]) / 2,
    (intersection1[1] + intersection2[1]) / 2,
  ];

  // Step 2: Compute the perpendicular vector
  const tangentVector: Point = [
    intersection2[0] - intersection1[0],
    intersection2[1] - intersection1[1],
  ];
  const perpendicularVector: Point = [-tangentVector[1], tangentVector[0]];

  // Normalize the perpendicular vector and scale it by 1.5 times the radius
  const length = Math.sqrt(
    perpendicularVector[0] ** 2 + perpendicularVector[1] ** 2,
  );
  const scaledPerpendicular: Point = [
    (perpendicularVector[0] / length) * radius * 1.5,
    (perpendicularVector[1] / length) * radius * 1.5,
  ];

  // Step 3: Calculate the detour point
  const detourPoint: Point = [
    midpoint[0] + scaledPerpendicular[0],
    midpoint[1] + scaledPerpendicular[1],
  ];

  // Step 4: Construct the detour path
  return [lineStart, detourPoint, lineEnd];
}

export const computePath = (
  start: Point,
  path: Point[],
  resources: Resource[],
) => {
  const pathSegments = computePathSegments(start, path);

  pathSegments.forEach((pathSegment, i) => {
    const [lineStart, lineEnd] = pathSegment;

    // Check for intersections with resources
    for (const resource of resources) {
      const resourceCenter = [
        resource.pos[0] + resource.dims[0] / 2,
        resource.pos[1] + resource.dims[1] / 2,
      ] as Point;
      if (
        doesLineIntersectCircle(lineStart, lineEnd, {
          center: resourceCenter,
          radius: resource.dims[0] / 2,
        })
      ) {
        const detourPath = calculateDetourPath(lineStart, lineEnd, {
          center: resourceCenter,
          radius: resource.dims[0] / 2,
        });

        path.splice(i, 1);
        detourPath.forEach((point, j) => {
          path.splice(i + j, 0, point);
        });
      }
    }
  });

  return path[0][0] === start[0] && path[0][1] === start[1]
    ? path.slice(1)
    : path;
};
export function computePathSegments(start: Point, path: Point[]) {
  return [start, ...path].reduce((acc, point, i, arr) => {
    if (i === 0) {
      return acc;
    }

    const prevPoint = arr[i - 1];
    acc.push([prevPoint, point]);

    return acc;
  }, [] as [Point, Point][]);
}
