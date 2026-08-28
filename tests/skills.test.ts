import { describe, expect, it } from "vitest";
import { doubleChancePercent, skillLevelForResource } from "../src/lib/skills";

describe("doubleChancePercent", () => {
  it("is 0% at level 1 and +10% per level after", () => {
    expect(doubleChancePercent(1)).toBe(0);
    expect(doubleChancePercent(2)).toBe(10);
    expect(doubleChancePercent(3)).toBe(20);
    expect(doubleChancePercent(4)).toBe(30);
    expect(doubleChancePercent(5)).toBe(40);
  });

  it("clamps below 1 and above 5", () => {
    expect(doubleChancePercent(0)).toBe(0);
    expect(doubleChancePercent(9)).toBe(40);
  });
});

describe("skillLevelForResource", () => {
  const stats = { woodcuttingLevel: 3, miningLevel: 4, foragingLevel: 2 };

  it("maps wood / stone-ore / other to the matching skill", () => {
    expect(skillLevelForResource("wood", stats)).toBe(3);
    expect(skillLevelForResource("stone", stats)).toBe(4);
    expect(skillLevelForResource("metal_ore", stats)).toBe(4);
    expect(skillLevelForResource("fiber", stats)).toBe(2);
  });
});
