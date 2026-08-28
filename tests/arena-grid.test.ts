import { describe, it, expect } from "vitest";
import {
  HEX_RADIUS,
  clusterCells,
  groupCenters,
  hexDist,
  hexesOnRing,
  inBoard,
  stepToward,
} from "../src/lib/arena-grid";

describe("hex arena", () => {
  it("places two groups on opposite sides of the ring", () => {
    const [a, b] = groupCenters(2);
    expect(hexDist(a[0], a[1], b[0], b[1])).toBeGreaterThanOrEqual(5);
  });

  it("spaces three groups around the center", () => {
    const centers = groupCenters(3);
    expect(centers).toHaveLength(3);
    const unique = new Set(centers.map(([q, r]) => `${q},${r}`));
    expect(unique.size).toBe(3);
    for (const [q, r] of centers) {
      expect(hexDist(0, 0, q, r)).toBe(3);
    }
  });

  it("packs a player's minions in a cluster around their seat", () => {
    const [origin] = groupCenters(2);
    const cells = clusterCells(origin, 4, new Set());
    expect(cells).toHaveLength(4);
    expect(cells[0]).toEqual(origin);
    for (const [q, r] of cells) {
      expect(inBoard(q, r)).toBe(true);
      expect(hexDist(origin[0], origin[1], q, r)).toBeLessThanOrEqual(2);
    }
  });

  it("does not seat two groups on the same hex", () => {
    const centers = groupCenters(4);
    const taken = new Set<string>();
    for (const center of centers) {
      const cells = clusterCells(center, 3, taken);
      for (const [q, r] of cells) {
        const key = `${q},${r}`;
        expect(taken.has(key)).toBe(false);
        taken.add(key);
      }
    }
  });

  it("steps to a neighboring hex that is closer to the target", () => {
    expect(stepToward(-3, 0, 3, 0, new Set())).toEqual([-2, 0]);
  });

  it("holds when every closer hex is occupied", () => {
    expect(stepToward(0, 0, 2, 0, new Set(["1,0", "1,-1", "0,-1", "-1,0", "-1,1", "0,1"]))).toBeNull();
  });

  it("keeps a ring-1 walk on the board", () => {
    expect(hexesOnRing(1)).toHaveLength(6);
    expect(hexDist(0, 0, HEX_RADIUS, 0)).toBe(HEX_RADIUS);
  });
});
