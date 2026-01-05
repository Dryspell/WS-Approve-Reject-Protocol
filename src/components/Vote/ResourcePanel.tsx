import { Component, Show } from "solid-js";
import type { Resource } from "~/module_bindings/resource_type";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";

interface ResourcePanelProps {
  resource: Resource | undefined;
  selectedUnitsCount: number;
  onGather: (resource: Resource) => void;
  onGroupGather: (resource: Resource) => void;
}

// Resource colors matching Game.tsx
const RESOURCE_COLORS: Record<string, string> = {
  wood: "#8B4513",
  stone: "#808080",
  gold: "#FFD700",
  coal: "#36454F",
  gems: "#FF00FF",
  fiber: "#90EE90",
  hide: "#DEB887",
  sand: "#F4A460",
  food: "#FFA500"
} as const;

const ResourcePanel: Component<ResourcePanelProps> = (props) => {
  return (
    <Show when={props.resource}>
      {(resource) => (
        <Card class="mt-4">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <div
                class="h-4 w-4 rounded-full border border-gray-300"
                style={{
                  "background-color":
                    RESOURCE_COLORS[resource().resourceType.toLowerCase()] || "#ccc",
                }}
              />
              <span class="capitalize">{resource().resourceType}</span>
              {resource().amount <= resource().depletionThreshold && (
                <Badge variant="destructive">Depleted</Badge>
              )}
              {resource().regenerationTimer > 0 && (
                <Badge variant="outline">Regenerating</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            {/* Resource Stats */}
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600">Available:</span>
                <span class="font-semibold">{resource().amount}</span>
              </div>
              
              {/* Resource capacity progress bar */}
              <Show when={resource().maxAmount > 0}>
                <div>
                  <div class="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Capacity</span>
                    <span>{resource().amount} / {resource().maxAmount}</span>
                  </div>
                  <Progress
                    value={(resource().amount / resource().maxAmount) * 100}
                    class="h-2"
                  />
                </div>
              </Show>

              {/* Regeneration progress */}
              <Show when={resource().regenerationTimer > 0}>
                <div>
                  <div class="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Regenerating</span>
                    <span>{resource().regenerationTimer}s</span>
                  </div>
                  <Progress
                    value={(resource().regenerationTimer / 10) * 100}
                    class="h-2"
                  />
                </div>
              </Show>

              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600">Depletion Threshold:</span>
                <span class="font-medium">{resource().depletionThreshold}</span>
              </div>
            </div>

            {/* Gather Actions */}
            <div class="space-y-2">
              <Button
                size="sm"
                onClick={() => props.onGather(resource())}
                class="w-full bg-green-500 hover:bg-green-600"
                disabled={resource().amount <= 0}
              >
                Gather (Single Unit)
              </Button>
              
              <Show when={props.selectedUnitsCount > 0}>
                <Button
                  size="sm"
                  onClick={() => props.onGroupGather(resource())}
                  class="w-full bg-green-700 hover:bg-green-800"
                  disabled={resource().amount <= 0}
                >
                  Group Gather ({props.selectedUnitsCount} units)
                </Button>
              </Show>
            </div>

            {/* Resource Status Warning */}
            <Show when={resource().amount <= resource().depletionThreshold}>
              <div class="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                ⚠️ This resource is depleted and needs time to regenerate.
              </div>
            </Show>
          </CardContent>
        </Card>
      )}
    </Show>
  );
};

export default ResourcePanel;

