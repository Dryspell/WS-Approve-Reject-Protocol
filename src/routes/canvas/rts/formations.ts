import { _hasPos } from "../combat/types";
import { centroid } from "./spatial";

type Point = [number, number];

interface FormationOptions {
  cellWidth?: number; // Spacing between columns
  cellHeight?: number; // Spacing between rows
  allowOverflow?: boolean; // Allow units beyond j x k grid
}

/**
 * Arranges units into a j x k rectangle formation centered at (cx, cy), facing away from (perp_x, perp_y).
 * @param n - Total number of units to arrange.
 * @param j - Number of rows in the rectangle.
 * @param k - Number of columns in the rectangle.
 * @param center - Center point [cx, cy] of the rectangle.
 * @param perp - Point [perp_x, perp_y] the formation faces away from.
 * @param options - Optional parameters for spacing and overflow handling.
 * @returns An array of points representing the arranged positions.
 */
export function createRectFormation(
  n: number,
  j: number,
  k: number,
  center: Point,
  perp: Point,
  options: FormationOptions = {},
): Point[] {
  const { cellWidth = 1, cellHeight = 1, allowOverflow = false } = options;

  if (!allowOverflow && j * k < n) {
    throw new Error(
      "The grid does not have enough space for all units. Increase j, k, or set allowOverflow to true.",
    );
  }

  const [cx, cy] = center;
  const [perp_x, perp_y] = perp;

  // Calculate the direction the rectangle should face
  const dx = cx - perp_x;
  const dy = cy - perp_y;
  const angle = Math.atan2(dy, dx) + Math.PI / 2; // Angle in radians

  // Create grid positions centered at (0, 0)
  const positions: Point[] = [];
  const xStart = -((k - 1) * cellWidth) / 2;
  const yStart = -((j - 1) * cellHeight) / 2;

  let count = 0;
  for (let row = 0; row < j; row++) {
    for (let col = 0; col < k; col++) {
      if (count >= n) break;
      const x = xStart + col * cellWidth;
      const y = yStart + row * cellHeight;
      positions.push([x, y]);
      count++;
    }
    if (count >= n) break;
  }

  // Handle overflow: Add remaining units to a new row/column or ignore.
  if (allowOverflow && count < n) {
    const extraUnits = n - count;
    for (let i = 0; i < extraUnits; i++) {
      const x = xStart + ((count % k) * cellWidth);
      const y = yStart + (Math.floor(count / k) * cellHeight);
      positions.push([x, y]);
      count++;
    }
  }

  // Rotate and translate the grid positions
  const rotatedAndTranslated = positions.map(([x, y]) => {
    const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
    const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);
    return [rotatedX + cx, rotatedY + cy] as Point;
  });

  return rotatedAndTranslated;
}

export function createConcentratedCircularFormation(
  center: Point,
  radius: number,
  spacing: number,
): Point[] {
  const [cx, cy] = center;
  const radiusWithBuffer = radius + 5;

  const circumference = 2 * Math.PI * radiusWithBuffer;
  const maxPositions = Math.floor(circumference / spacing);

  const allPositions: Point[] = [];
  for (let i = 0; i < maxPositions; i++) {
    const angle = (i / maxPositions) * 2 * Math.PI;
    const pos = [
      cx + radiusWithBuffer * Math.cos(angle),
      cy + radiusWithBuffer * Math.sin(angle),
    ] as [number, number];
    allPositions.push(pos);
  }

  return allPositions;

  // // Step 3: Calculate the centroid angle
  // const centroidAngle = Math.atan2(centroidY - cy, centroidX - cx) + Math.PI;

  // // Step 4: Rank positions by angular proximity to centroidAngle
  // allPositions.sort((a, b) => {
  //   const angularDistanceA = Math.abs(a.angle - centroidAngle);
  //   const angularDistanceB = Math.abs(b.angle - centroidAngle);
  //   return angularDistanceA - angularDistanceB;
  // });

  // // Step 5: Select the closest `n` positions
  // const selectedPositions = allPositions.slice(0, units.length);

  // // Return the selected positions as [x, y] pairs
  // return selectedPositions.map((pos) => [pos.x, pos.y] as [number, number]);
}
