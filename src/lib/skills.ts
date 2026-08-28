/** Mirrors server `skill_double_chance_pct`: 0 / 10 / 20 / 30 / 40 at levels 1–5. */
export const SKILL_MAX_LEVEL = 5;
export const SKILL_XP_PER_ACTION = 40;
export const SKILL_LEVEL_THRESHOLDS = [100, 300, 700, 1500] as const;

export function doubleChancePercent(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(40, (Math.floor(level) - 1) * 10));
}

export function skillLevelForResource(kind: string, stats: {
  woodcuttingLevel: number;
  miningLevel: number;
  foragingLevel: number;
}): number {
  switch (kind) {
    case "wood":
      return stats.woodcuttingLevel;
    case "stone":
    case "metal_ore":
    case "coal":
    case "gems":
    case "sand":
      return stats.miningLevel;
    default:
      return stats.foragingLevel;
  }
}

export const CAMP_COST = { wood: 3, stone: 2 } as const;

export const REFINE_RECIPES = [
  { raw: "wood", rawAmount: 2, output: "lumber", label: "Planks" },
  { raw: "stone", rawAmount: 2, output: "cut_stone", label: "Blocks" },
  { raw: "metal_ore", rawAmount: 2, output: "metal_ingot", label: "Ingots" },
] as const;

export const CRAFT_RECIPES = [
  { id: "tool", label: "Hatchet", costLabel: "2 planks", lumber: 2, cutStone: 0, metalIngot: 0 },
  { id: "weapon", label: "Spear", costLabel: "2 ingots", lumber: 0, cutStone: 0, metalIngot: 2 },
  { id: "armor", label: "Vest", costLabel: "2 blocks", lumber: 0, cutStone: 2, metalIngot: 0 },
] as const;
