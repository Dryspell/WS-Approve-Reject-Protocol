/**
 * Check if a point is within a circle
 */
export function withinCircle(
  point: [number, number],
  center: { x: number; y: number },
  radius: number
): boolean {
  const [x, y] = point;
  const dx = x - center.x;
  const dy = y - center.y;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Check if a point is within a rectangle
 */
export function withinRect(
  point: [number, number],
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  const [x, y] = point;
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

/**
 * Calculate squared distance between two points
 */
export function distance2(
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return dx * dx + dy * dy;
} 