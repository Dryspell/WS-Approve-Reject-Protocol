import { applyTerrain, averageGrid, staticGrid } from "~/lib/canvas/grids";
import { perlinGrid } from "~/lib/canvas/perlin";
import { findPathToClosestTarget } from "~/lib/canvas/pathfinding/utils";
import {
  _hasCombatData,
  _hasIdentificationData,
  _hasPos,
  _hasRenderData,
  Unit,
} from "../combat/types";
import { createId } from "@paralleldrive/cuid2";
import { randAnimal } from "@ngneat/falso";

export const defaultCombatData = () => ({
  hp: 80,
  maxHp: 100,
  mana: 50,
  maxMana: 100,
  stamina: 30,
  maxStamina: 100,
  attack: 10,
  defense: 5,
  speed: 10,
  accuracy: 90,
  blockChance: 10,
  evasion: 10,
  critChance: 10,
  critMultiplier: 2,
});

export const [minionCount, enemyCount] = [5, 5];

export function generateTerrain(
  canvasWidth: number,
  canvasHeight: number,
  cellWidth: number,
  cellHeight: number,
) {
  const sg = staticGrid(canvasWidth, canvasHeight, cellWidth, cellHeight);
  const pg = perlinGrid(sg);
  const terrain = applyTerrain(averageGrid(pg));
  return terrain;
}

export function generateMinionsAndTargets(
  cellWidth: number,
  cellHeight: number,
  terrain: {
    type: "water" | "plain" | "hill" | "mountain";
    movementCost: 1 | 255 | 8 | undefined;
    x: number;
    y: number;
    w: number;
  }[][],
): [Unit[], Unit[]] {
  const walkableTerrain = terrain.map(row => row.filter(cell => cell.movementCost !== 255)).flat();

  const [minions, targets] = [[], []] as [Unit[], Unit[]];

  for (let i = 0; i < minionCount; i++) {
    const terrainIndex = Math.floor(Math.random() * walkableTerrain.length);
    const { x, y } = walkableTerrain[terrainIndex];
    walkableTerrain.splice(terrainIndex, 1);

    minions.push({
      id: createId(),
      name: randAnimal(),
      type: "minion",
      pos: [x, y],
      dims: [cellWidth / 2 - 1, cellHeight / 2 - 1],
      fillStyle: "cyan",
      lineWidth: 1,
      strokeStyle: "black",
      ...defaultCombatData(),
    });
  }

  for (let i = 0; i < enemyCount; i++) {
    const terrainIndex = Math.floor(Math.random() * walkableTerrain.length);
    const { x, y } = walkableTerrain[terrainIndex];
    walkableTerrain.splice(terrainIndex, 1);

    targets.push({
      id: createId(),
      name: randAnimal(),
      type: "enemy",
      pos: [x, y],
      dims: [cellWidth / 2 - 1, cellHeight / 2 - 1],
      fillStyle: "red",
      lineWidth: 1,
      strokeStyle: "blue",
      ...defaultCombatData(),
    });
  }

  for (let i = 0; i < minions.length; i++) {
    minions[i].movementData = findPathToClosestTarget(minions[i], targets, terrain);
  }
  for (let i = 0; i < targets.length; i++) {
    targets[i].movementData = findPathToClosestTarget(targets[i], minions, terrain);
  }

  return [minions, targets];
}
