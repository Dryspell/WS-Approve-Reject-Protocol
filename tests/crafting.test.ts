import { describe, it, expect } from 'vitest';
import {
  canCraftRecipe,
  getCraftingCost,
  getCraftingTime,
  CRAFTING_RECIPES,
  ItemQuality,
  SurfaceQuality,
} from '../src/lib/crafting';
import type { UnitInventory } from '../src/module_bindings/unit_inventory_type';
import type { UnitStats } from '../src/module_bindings/unit_stats_type';

describe('crafting', () => {
  describe('canCraftRecipe', () => {
    it('should return true when inventory has enough resources', () => {
      const inventory: UnitInventory = {
        unitId: 1,
        wood: 10,
        stone: 5,
        metalOre: 3,
        coal: 2,
        food: 0,
        water: 0,
        woodenPole: 0,
        lumber: 0,
        metalIngot: 0,
        storageCapacity: 100,
      };

      const recipe = CRAFTING_RECIPES.find(r => r.id === 'wooden_pole')!;
      expect(canCraftRecipe(inventory, recipe)).toBe(true);
    });

    it('should return false when inventory lacks resources', () => {
      const inventory: UnitInventory = {
        unitId: 1,
        wood: 1, // Need 2 for wooden pole
        stone: 0,
        metalOre: 0,
        coal: 0,
        food: 0,
        water: 0,
        woodenPole: 0,
        lumber: 0,
        metalIngot: 0,
        storageCapacity: 100,
      };

      const recipe = CRAFTING_RECIPES.find(r => r.id === 'wooden_pole')!;
      expect(canCraftRecipe(inventory, recipe)).toBe(false);
    });
  });

  describe('getCraftingCost', () => {
    it('should return a formatted string of resource requirements', () => {
      const recipe = CRAFTING_RECIPES.find(r => r.id === 'wooden_pole')!;
      const cost = getCraftingCost(recipe);

      expect(cost).toBe('2 wood');
    });

    it('should return multiple resource requirements formatted', () => {
      const recipe = CRAFTING_RECIPES.find(r => r.id === 'metal_ingot')!;
      const cost = getCraftingCost(recipe);

      expect(cost).toContain('metal ore');
      expect(cost).toContain('coal');
    });

    it('should handle recipes with no requirements', () => {
      const mockRecipe = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        tier: 1,
        requirements: {},
        output: {
          item: 'test',
          quality: ItemQuality.Normal,
          surface: SurfaceQuality.Rough,
          modifiers: [],
        },
        craftTime: 1,
      };

      const cost = getCraftingCost(mockRecipe);
      expect(cost).toBe('');
    });
  });

  describe('getCraftingTime', () => {
    it('should return the crafting time adjusted by craft rate', () => {
      const recipe = CRAFTING_RECIPES.find(r => r.id === 'wooden_pole')!;
      const stats: UnitStats = {
        unitId: 1,
        health: 100,
        maxHealth: 100,
        speed: 1.0,
        gatherRate: 1.0,
        craftRate: 1.0,
        voteWeight: 1,
      };
      const time = getCraftingTime(recipe, stats);

      expect(time).toBe(5); // 5 seconds with 1.0 craft rate
    });

    it('should reduce time with higher craft rate', () => {
      const recipe = CRAFTING_RECIPES.find(r => r.id === 'lumber')!;
      const stats: UnitStats = {
        unitId: 1,
        health: 100,
        maxHealth: 100,
        speed: 1.0,
        gatherRate: 1.0,
        craftRate: 2.0, // 2x faster
        voteWeight: 1,
      };
      const time = getCraftingTime(recipe, stats);

      expect(time).toBe(4); // 8 / 2 = 4 seconds
    });

    it('should increase time with lower craft rate', () => {
      const recipe = CRAFTING_RECIPES.find(r => r.id === 'wooden_pole')!;
      const stats: UnitStats = {
        unitId: 1,
        health: 100,
        maxHealth: 100,
        speed: 1.0,
        gatherRate: 1.0,
        craftRate: 0.5, // 2x slower
        voteWeight: 1,
      };
      const time = getCraftingTime(recipe, stats);

      expect(time).toBe(10); // 5 / 0.5 = 10 seconds
    });
  });

  describe('CRAFTING_RECIPES', () => {
    it('should have at least one recipe', () => {
      expect(CRAFTING_RECIPES.length).toBeGreaterThan(0);
    });

    it('should have unique recipe IDs', () => {
      const ids = CRAFTING_RECIPES.map(r => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid tier numbers', () => {
      CRAFTING_RECIPES.forEach(recipe => {
        expect(recipe.tier).toBeGreaterThan(0);
        expect(recipe.tier).toBeLessThanOrEqual(4);
      });
    });

    it('should have positive craft times', () => {
      CRAFTING_RECIPES.forEach(recipe => {
        expect(recipe.craftTime).toBeGreaterThan(0);
      });
    });

    it('should have at least one requirement for each recipe', () => {
      CRAFTING_RECIPES.forEach(recipe => {
        const requirementKeys = Object.keys(recipe.requirements);
        expect(requirementKeys.length).toBeGreaterThan(0);
      });
    });

    it('should have valid output properties', () => {
      CRAFTING_RECIPES.forEach(recipe => {
        expect(recipe.output.item).toBeTruthy();
        expect(recipe.output.quality).toBeTruthy();
        expect(recipe.output.surface).toBeTruthy();
        expect(Array.isArray(recipe.output.modifiers)).toBe(true);
      });
    });
  });
});

