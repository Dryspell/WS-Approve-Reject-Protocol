import { staticGrid } from "./grids";
import { createNoise2D } from "simplex-noise";

export function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

// Smoothstep function to fade values smoothly
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Function to calculate the dot product between our "gradient" (weight) and the distance vector
function dotCellGradient(
  ix: number,
  iy: number,
  x: number,
  y: number,
  sg: ReturnType<typeof staticGrid>,
): number {
  try {
    const dx = x - ix;
    const dy = y - iy;
    const weight = sg[iy][ix].w;

    // Convert weight to a gradient vector (angle derived from weight for diversity)
    const angle = weight * Math.PI * 2;
    const gradient = { x: Math.cos(angle), y: Math.sin(angle) };
    return dx * gradient.x + dy * gradient.y;
  } catch (e) {
    console.log({ e, ix, iy, x, y, sg });
  }
  return 0;
}

export const perlinGrid = (sg: ReturnType<typeof staticGrid>) => {
  const noise = createNoise2D();
  return sg.map(row =>
    row.map(cell => {
      // The final Perlin value for each cell
      return {
        ...cell,
        w: (noise(cell.x, cell.y) + 1) / 2,
      };
    }),
  );
};
