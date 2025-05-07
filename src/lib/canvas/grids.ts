import { lerp, perlinGrid } from "./perlin";
import { line, rect, text } from "./shapes";
import { rgbToHex, scaleWeightToColor } from "./utils";

export const staticGrid = (
  canvasWidth: number,
  canvasHeight: number,
  cellWidth: number,
  cellHeight: number,
) =>
  Array.from({ length: Math.round(canvasWidth / cellWidth) }, (_, x) =>
    Array.from({ length: Math.round(canvasHeight / cellHeight) }, (__, y) => {
      return {
        x,
        y,
        w: Math.random(),
      };
    }),
  );

const averageWeightByCellCorners = (
  sg: ReturnType<typeof staticGrid>,
  cell: ReturnType<typeof staticGrid>[number][number],
) =>
  [
    sg[Math.max(0, cell.x - 1)][Math.max(0, cell.y - 1)],
    sg[Math.max(0, cell.x - 1)][Math.max(0, cell.y)],
    sg[Math.max(0, cell.x)][Math.max(0, cell.y - 1)],
    sg[Math.max(0, cell.x)][Math.max(0, cell.y)],
  ].reduce((acc, cell) => acc + cell.w, 0) / 4;

export const averageGrid = (sg: ReturnType<typeof staticGrid>) =>
  sg.map(row => row.map(cell => ({ ...cell, w: averageWeightByCellCorners(sg, cell) })));

const TERRAIN_CONFIGS = [
  { type: "water", cutoffMin: -1, cutoffMax: 0.3, colors: [0, 0, 255], movementCost: 255 },
  { type: "plain", cutoffMin: 0.3, cutoffMax: 0.6, colors: [0, 255, 0], movementCost: 1 },
  { type: "hill", cutoffMin: 0.6, cutoffMax: 0.7, colors: [192, 128, 0], movementCost: 8 },
  { type: "mountain", cutoffMin: 0.7, cutoffMax: 1, colors: [255, 255, 255], movementCost: 255 },
] as const;

export const applyTerrain = (
  g: ReturnType<typeof staticGrid>,
  options?: { terrainConfigs: typeof TERRAIN_CONFIGS },
) => {
  const { terrainConfigs } = { terrainConfigs: TERRAIN_CONFIGS, ...options };

  return g.map(row =>
    row.map(cell => {
      const terrainType = terrainConfigs?.find(
        tc => cell.w >= tc.cutoffMin && cell.w <= tc.cutoffMax,
      );

      return {
        ...cell,
        type: terrainType?.type ?? "mountain",
        movementCost: terrainType?.movementCost,
      };
    }),
  );
};

const getTerrainColorsByCell = (cell: ReturnType<typeof applyTerrain>[number][number]) => {
  const terrain =
    TERRAIN_CONFIGS.find(ter => cell.w >= ter.cutoffMin && cell.w <= ter.cutoffMax) ??
    TERRAIN_CONFIGS[0];

  const [r, g, b] = terrain.colors.map(c =>
    Math.floor(c * 0.5 + (cell.w / terrain.cutoffMax) * 0.5 * c),
  );
  return [r, g, b] as const;
};

const distance = (x0: number, y0: number, x1: number, y1: number) =>
  Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);

export const renderGrid = (
  ctx: CanvasRenderingContext2D,
  g: ReturnType<typeof applyTerrain>,
  canvasWidth: number,
  canvasHeight: number,
  cellWidth: number,
  cellHeight: number,
  options?: {
    gridLines?: boolean;
    cellText?: boolean;
    cellWeights?: boolean;
    useSubdivisions?: boolean;
  },
) => {
  const { gridLines, cellText, cellWeights, useSubdivisions } = {
    gridLines: false,
    cellText: false,
    cellWeights: true,
    useSubdivisions: false,
    ...options,
  };

  if (gridLines) {
    g.forEach(row => {
      line(ctx, row[0].x * cellWidth, 0, row[0].x * cellWidth, canvasHeight);
    });
    g[0].forEach(cell => {
      line(ctx, 0, cell.y * cellHeight, canvasWidth, cell.y * cellHeight);
    });
  }

  if (cellText) {
    g.forEach(row =>
      row.forEach(cell =>
        text(
          ctx,
          cell.x * cellWidth + cellWidth / 4,
          cell.y * cellHeight + cellHeight / 2,
          `(${cell.x},${cell.y}): ${cell.w}`,
          { fillStyle: "black" },
        ),
      ),
    );
  }

  if (cellWeights) {
    g.forEach((row, ix) =>
      row.forEach((cell, iy) => {
        const cellColor = getTerrainColorsByCell(cell);
        // const cellColor = [255, 255, 255].map(c => scaleWeightToColor(cell.w));

        if (useSubdivisions) {
          const subDivisionCount = 5;
          const subdivisionWidth = cellWidth / subDivisionCount;
          const subdivisionHeight = cellHeight / subDivisionCount;

          const corners = [
            [ix, iy],
            [ix + 1 < row.length ? ix + 1 : ix, iy],
            [ix, iy + 1 < g.length ? iy + 1 : iy],
            [ix + 1 < row.length ? ix + 1 : ix, iy + 1 < g.length ? iy + 1 : iy],
          ] as const;

          const cornerColors = corners.map(([x, y]) => {
            return [
              x,
              y,
              distance(cell.x + 0.5, cell.y + 0.5, x, y),
              getTerrainColorsByCell(g[y][x]),
            ] as const;
          });

          const subdividedCells = Array.from({ length: subDivisionCount }, (_, i) =>
            Array.from({ length: subDivisionCount }, (_, j) => {
              const sdx = i / subDivisionCount;
              const sdy = j / subDivisionCount;

              const midX = cell.x + sdx + 1 / (2 * subDivisionCount);
              const midY = cell.y + sdy + 1 / (2 * subDivisionCount);

              // Interpolate the weights of the corners
              const subdivisionColor = cornerColors
                .map(([cornerX, cornerY, cornerDistance, cornerColors]) => {
                  const cornerRelativeDistance = Math.min(
                    distance(cornerX, cornerY, midX, midY),
                    1,
                  ); // / cornerDistance;

                  // console.log({
                  //   cornerX,
                  //   cornerY,
                  //   midX,
                  //   midY,
                  //   cornerDistance,
                  //   cornerRelativeDistance,
                  // });

                  return cornerColors.map((color, i) =>
                    lerp(cornerRelativeDistance, color, cellColor[i]),
                  );
                })
                .reduce((acc, color) => color.map((c, i) => acc[i] + c), [0, 0, 0] as const)
                .map(c => Math.floor(c / corners.length)) as [number, number, number];

              return {
                x: cell.x * cellWidth + sdx * cellWidth,
                y: cell.y * cellHeight + sdy * cellHeight,
                color: subdivisionColor,
              };
            }),
          );

          subdividedCells.forEach(row =>
            row.forEach(sdCell =>
              rect(ctx, sdCell.x, sdCell.y, subdivisionWidth, subdivisionHeight, {
                fillStyle: rgbToHex(sdCell.color[0], sdCell.color[1], sdCell.color[2]),
              }),
            ),
          );
        } else {
          rect(ctx, cell.x * cellWidth, cell.y * cellHeight, cellWidth, cellHeight, {
            fillStyle: rgbToHex(cellColor[0], cellColor[1], cellColor[2]),
          });
        }
      }),
    );
  }
};
