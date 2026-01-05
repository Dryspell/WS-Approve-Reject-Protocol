import { Component, Show, For } from "solid-js";
import type { Unit } from "~/module_bindings/unit_type";
import type { UnitInventory } from "~/module_bindings/unit_inventory_type";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  CRAFTING_RECIPES,
  canCraftRecipe,
  getCraftingCost,
  type CraftingRecipe,
} from "~/lib/crafting";

interface CraftingPanelProps {
  unit: Unit | undefined;
  inventory: UnitInventory | undefined;
  onStartCrafting: (recipeId: string) => void;
}

const CraftingPanel: Component<CraftingPanelProps> = (props) => {
  const getRecipeStatus = (recipe: CraftingRecipe): "available" | "locked" | "missing-building" => {
    if (!props.inventory) return "locked";
    
    // Check if required building exists
    if (recipe.requiredBuilding && !props.unit?.isStorage) {
      return "missing-building";
    }
    
    return canCraftRecipe(props.inventory as any, recipe) ? "available" : "locked";
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "available":
        return "default";
      case "missing-building":
        return "outline";
      case "locked":
      default:
        return "secondary";
    }
  };

  const getBadgeText = (status: string) => {
    switch (status) {
      case "available":
        return "✓ Available";
      case "missing-building":
        return "🏭 Needs Building";
      case "locked":
      default:
        return "🔒 Insufficient Materials";
    }
  };

  // Group recipes by tier
  const getRecipesByTier = (tier: number) => {
    return CRAFTING_RECIPES.filter((recipe) => recipe.tier === tier);
  };

  const RecipeCard: Component<{ recipe: CraftingRecipe }> = (recipeProps) => {
    const status = () => getRecipeStatus(recipeProps.recipe);
    const canCraft = () => status() === "available";

    return (
      <div class="rounded-lg border p-3 transition-all hover:border-blue-300 hover:shadow-sm">
        <div class="mb-2 flex items-start justify-between">
          <div class="flex-1">
            <h5 class="font-medium">{recipeProps.recipe.name}</h5>
            <p class="text-xs text-gray-600">{recipeProps.recipe.description}</p>
          </div>
          <Badge variant={getBadgeVariant(status())} class="ml-2 text-xs">
            Tier {recipeProps.recipe.tier}
          </Badge>
        </div>

        {/* Requirements */}
        <div class="mb-3 space-y-1 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Cost:</span>
            <span class="font-medium">{getCraftingCost(recipeProps.recipe)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-600">Time:</span>
            <span class="font-medium">{recipeProps.recipe.craftTime}s</span>
          </div>
          <Show when={recipeProps.recipe.requiredBuilding}>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Building:</span>
              <span class="font-medium capitalize">
                {recipeProps.recipe.requiredBuilding}
              </span>
            </div>
          </Show>
        </div>

        {/* Output Info */}
        <div class="mb-3 rounded bg-gray-50 p-2 text-xs">
          <div class="font-medium text-gray-700">Produces:</div>
          <div class="mt-1 flex flex-wrap gap-1">
            <Badge variant="outline" class="text-xs">
              {recipeProps.recipe.output.quality}
            </Badge>
            <Badge variant="outline" class="text-xs">
              {recipeProps.recipe.output.surface}
            </Badge>
            {recipeProps.recipe.output.modifiers.map((mod) => (
              <Badge variant="outline" class="text-xs">
                {mod}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status Badge */}
        <div class="mb-2">
          <Badge
            variant={getBadgeVariant(status())}
            class="w-full justify-center text-xs"
          >
            {getBadgeText(status())}
          </Badge>
        </div>

        {/* Craft Button */}
        <Button
          size="sm"
          onClick={() => props.onStartCrafting(recipeProps.recipe.id)}
          disabled={!canCraft()}
          class="w-full"
        >
          Craft
        </Button>
      </div>
    );
  };

  return (
    <Show when={props.unit}>
      <Card class="mt-4">
        <CardHeader>
          <CardTitle>Crafting</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tier-1">
            <TabsList class="grid w-full grid-cols-4">
              <TabsTrigger value="tier-1">Tier 1</TabsTrigger>
              <TabsTrigger value="tier-2">Tier 2</TabsTrigger>
              <TabsTrigger value="tier-3">Tier 3</TabsTrigger>
              <TabsTrigger value="tier-4">Tier 4</TabsTrigger>
            </TabsList>

            <TabsContent value="tier-1" class="space-y-3">
              <For
                each={getRecipesByTier(1)}
                fallback={
                  <div class="rounded border border-dashed p-4 text-center text-sm text-gray-500">
                    No Tier 1 recipes available
                  </div>
                }
              >
                {(recipe) => <RecipeCard recipe={recipe} />}
              </For>
            </TabsContent>

            <TabsContent value="tier-2" class="space-y-3">
              <For
                each={getRecipesByTier(2)}
                fallback={
                  <div class="rounded border border-dashed p-4 text-center text-sm text-gray-500">
                    No Tier 2 recipes available
                  </div>
                }
              >
                {(recipe) => <RecipeCard recipe={recipe} />}
              </For>
            </TabsContent>

            <TabsContent value="tier-3" class="space-y-3">
              <For
                each={getRecipesByTier(3)}
                fallback={
                  <div class="rounded border border-dashed p-4 text-center text-sm text-gray-500">
                    No Tier 3 recipes available
                  </div>
                }
              >
                {(recipe) => <RecipeCard recipe={recipe} />}
              </For>
            </TabsContent>

            <TabsContent value="tier-4" class="space-y-3">
              <For
                each={getRecipesByTier(4)}
                fallback={
                  <div class="rounded border border-dashed p-4 text-center text-sm text-gray-500">
                    No Tier 4 recipes available
                  </div>
                }
              >
                {(recipe) => <RecipeCard recipe={recipe} />}
              </For>
            </TabsContent>
          </Tabs>

          {/* Help Text */}
          <div class="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
            <p class="font-semibold">💡 Crafting Tips</p>
            <ul class="ml-4 mt-1 list-disc space-y-1">
              <li>Higher tier recipes require specialized buildings</li>
              <li>Gather resources to unlock more recipes</li>
              <li>Quality and modifiers affect item power</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </Show>
  );
};

export default CraftingPanel;

