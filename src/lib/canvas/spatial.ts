/**
 * Check if a point is within a circle
 */
export function withinCircle(
  point: [number, number],
  center: { x: number; y: number },
  radius: number
): boolean {
  const dx = point[0] - center.x;
  const dy = point[1] - center.y;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Check if a point is within a rectangle
 */
export function withinRect(
  point: [number, number],
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point[0] >= rect.x &&
    point[0] <= rect.x + rect.width &&
    point[1] >= rect.y &&
    point[1] <= rect.y + rect.height
  );
}

/**
 * Calculate squared distance between two points
 */
export function distance2(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy;
} 