import { UnitInventory } from '~/module_bindings/unit_inventory_type';
import { UnitStats } from '~/module_bindings/unit_stats_type';

// Item quality tiers
export enum ItemQuality {
  Poor = 'poor',
  Normal = 'normal',
  Good = 'good',
  Excellent = 'excellent',
  Masterwork = 'masterwork'
}

// Item surface quality
export enum SurfaceQuality {
  Rough = 'rough',
  Smooth = 'smooth',
  Polished = 'polished',
  Refined = 'refined',
  Perfect = 'perfect'
}

// Item modifiers
export enum ItemModifier {
  Sharp = 'sharp',
  Durable = 'durable',
  Light = 'light',
  Heavy = 'heavy',
  Balanced = 'balanced'
}

// Structure modifiers
export enum StructureModifier {
  Sturdy = 'sturdy',
  Flexible = 'flexible',
  Compact = 'compact',
  Spacious = 'spacious',
  Efficient = 'efficient'
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  tier: number;
  requiredBuilding?: string;
  requirements: {
    [key: string]: number;
  };
  output: {
    item: string;
    quality: ItemQuality;
    surface: SurfaceQuality;
    modifiers: ItemModifier[];
  };
  craftTime: number;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'wooden_pole',
    name: 'Wooden Pole',
    description: 'A basic wooden pole used in construction',
    tier: 1,
    requirements: {
      wood: 2
    },
    output: {
      item: 'woodenPole',
      quality: ItemQuality.Normal,
      surface: SurfaceQuality.Rough,
      modifiers: []
    },
    craftTime: 5
  },
  {
    id: 'lumber',
    name: 'Lumber',
    description: 'Processed wooden planks',
    tier: 1,
    requirements: {
      wood: 3
    },
    output: {
      item: 'lumber',
      quality: ItemQuality.Normal,
      surface: SurfaceQuality.Smooth,
      modifiers: []
    },
    craftTime: 8
  },
  {
    id: 'metal_ingot',
    name: 'Metal Ingot',
    description: 'Refined metal ingot',
    tier: 2,
    requiredBuilding: 'forge',
    requirements: {
      metalOre: 2,
      coal: 1
    },
    output: {
      item: 'metalIngot',
      quality: ItemQuality.Good,
      surface: SurfaceQuality.Polished,
      modifiers: []
    },
    craftTime: 15
  },
  {
    id: 'reinforced_sword',
    name: 'Reinforced Sword',
    description: 'A sturdy sword with metal reinforcement',
    tier: 3,
    requiredBuilding: 'forge',
    requirements: {
      lumber: 2,
      metalIngot: 3,
      rope: 1
    },
    output: {
      item: 'sword',
      quality: ItemQuality.Excellent,
      surface: SurfaceQuality.Refined,
      modifiers: [ItemModifier.Durable, ItemModifier.Balanced]
    },
    craftTime: 30
  },
  {
    id: 'jeweled_armor',
    name: 'Jeweled Armor',
    description: 'Decorative armor with gem inlays',
    tier: 4,
    requiredBuilding: 'forge',
    requirements: {
      metalIngot: 5,
      gems: 3,
      leather: 2
    },
    output: {
      item: 'armor',
      quality: ItemQuality.Masterwork,
      surface: SurfaceQuality.Perfect,
      modifiers: [ItemModifier.Durable, ItemModifier.Light]
    },
    craftTime: 45
  }
];

export function canCraftRecipe(inventory: UnitInventory, recipe: CraftingRecipe): boolean {
  return Object.entries(recipe.requirements).every(([resource, amount]) => {
    const inventoryAmount = inventory[resource as keyof UnitInventory] as number;
    return inventoryAmount >= amount;
  });
}

export function getCraftingCost(recipe: CraftingRecipe): string {
  return Object.entries(recipe.requirements)
    .map(([resource, amount]) => `${amount} ${resource.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
    .join(', ');
}

export function getCraftingTime(recipe: CraftingRecipe, stats: UnitStats): number {
  return Math.ceil(recipe.craftTime / stats.craftRate);
}

export function getItemPower(item: CraftingRecipe['output']): number {
  const qualityMultiplier = {
    [ItemQuality.Poor]: 0.5,
    [ItemQuality.Normal]: 1,
    [ItemQuality.Good]: 1.5,
    [ItemQuality.Excellent]: 2,
    [ItemQuality.Masterwork]: 3
  };

  const surfaceMultiplier = {
    [SurfaceQuality.Rough]: 0.5,
    [SurfaceQuality.Smooth]: 1,
    [SurfaceQuality.Polished]: 1.5,
    [SurfaceQuality.Refined]: 2,
    [SurfaceQuality.Perfect]: 3
  };

  const modifierMultiplier = item.modifiers.length * 0.2;

  return qualityMultiplier[item.quality] * surfaceMultiplier[item.surface] * (1 + modifierMultiplier);
} 