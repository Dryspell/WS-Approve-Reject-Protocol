import { Component, Show, createSignal } from "solid-js";
import type { Unit } from "~/module_bindings/unit_type";
import type { UnitInventory } from "~/module_bindings/unit_inventory_type";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldLabel, TextFieldInput } from "~/components/ui/text-field";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";

interface InventoryPanelProps {
  unit: Unit | undefined;
  inventory: UnitInventory | undefined;
  storageExists: boolean;
  onTransferResources: (
    sourceId: number,
    resourceType: string,
    amount: number
  ) => void;
}

// Resource type options
const RESOURCE_TYPES = [
  { value: "wood", label: "Wood", icon: "🪵" },
  { value: "stone", label: "Stone", icon: "🪨" },
  { value: "metalOre", label: "Metal Ore", icon: "⛏️" },
  { value: "coal", label: "Coal", icon: "⚫" },
  { value: "gems", label: "Gems", icon: "💎" },
  { value: "fiber", label: "Fiber", icon: "🌾" },
  { value: "hide", label: "Hide", icon: "🦌" },
  { value: "sand", label: "Sand", icon: "🏖️" },
  { value: "food", label: "Food", icon: "🍎" },
] as const;

const InventoryPanel: Component<InventoryPanelProps> = (props) => {
  const [transferResourceType, setTransferResourceType] = createSignal("wood");
  const [transferAmount, setTransferAmount] = createSignal(1);

  const currentInventory = () => props.inventory;
  
  const getTotalUsed = () => {
    const inv = currentInventory();
    if (!inv) return 0;
    
    return (
      (inv.wood || 0) +
      (inv.stone || 0) +
      (inv.metalOre || 0) +
      (inv.coal || 0) +
      (inv.gems || 0) +
      (inv.fiber || 0) +
      (inv.hide || 0) +
      (inv.sand || 0) +
      (inv.food || 0)
    );
  };

  const getResourceAmount = (resourceType: string) => {
    const inv = currentInventory();
    if (!inv) return 0;
    return (inv as any)[resourceType] || 0;
  };

  const maxCapacity = () => currentInventory()?.maxCapacity || 0;
  const capacityPercent = () => {
    const max = maxCapacity();
    if (max === 0) return 0;
    return (getTotalUsed() / max) * 100;
  };

  const canTransfer = () => {
    const amount = transferAmount();
    const available = getResourceAmount(transferResourceType());
    return (
      props.storageExists &&
      amount > 0 &&
      amount <= available &&
      !isNaN(amount)
    );
  };

  const handleTransfer = () => {
    if (canTransfer() && props.unit) {
      props.onTransferResources(
        props.unit.id,
        transferResourceType(),
        transferAmount()
      );
      setTransferAmount(1); // Reset after transfer
    }
  };

  const handleTransferAll = () => {
    if (props.unit) {
      const available = getResourceAmount(transferResourceType());
      if (available > 0) {
        props.onTransferResources(
          props.unit.id,
          transferResourceType(),
          available
        );
      }
    }
  };

  return (
    <Show when={props.unit && currentInventory()}>
      {(inventory) => (
        <Card class="mt-4">
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              <span>Inventory</span>
              {capacityPercent() >= 90 && (
                <Badge variant="destructive">Nearly Full</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            {/* Capacity Display */}
            <div>
              <div class="mb-2 flex justify-between text-sm">
                <span class="text-gray-600">Capacity</span>
                <span class="font-semibold">
                  {getTotalUsed()} / {maxCapacity()}
                </span>
              </div>
              <Progress
                value={capacityPercent()}
                class="h-2"
              />
            </div>

            {/* Resource Grid */}
            <div>
              <p class="mb-2 text-sm font-medium text-gray-700">Resources</p>
              <div class="grid grid-cols-2 gap-2 text-sm">
                {RESOURCE_TYPES.map((resource) => {
                  const amount = getResourceAmount(resource.value);
                  return (
                    <div
                      class="flex items-center justify-between rounded border p-2"
                      classList={{
                        "border-gray-200": amount === 0,
                        "border-green-300 bg-green-50": amount > 0,
                      }}
                    >
                      <span class="flex items-center gap-1">
                        <span>{resource.icon}</span>
                        <span>{resource.label}</span>
                      </span>
                      <span class="font-semibold">{amount}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Transfer Section - only for non-storage units */}
            <Show when={!props.unit?.isStorage}>
              <div class="space-y-3 border-t pt-3">
                <p class="text-sm font-medium text-gray-700">Transfer Resources</p>
                
                {/* Resource Type Selector */}
                <div>
                  <TextFieldLabel class="mb-1 text-xs">Resource Type</TextFieldLabel>
                  <select
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={transferResourceType()}
                    onChange={(e) => setTransferResourceType(e.currentTarget.value)}
                  >
                    {RESOURCE_TYPES.map((resource) => (
                      <option value={resource.value}>
                        {resource.icon} {resource.label} (Available: {getResourceAmount(resource.value)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount Input */}
                <TextField>
                  <TextFieldLabel class="text-xs">Amount</TextFieldLabel>
                  <TextFieldInput
                    type="number"
                    min="1"
                    max={getResourceAmount(transferResourceType())}
                    value={transferAmount()}
                    onInput={(e) => {
                      const val = parseInt(e.currentTarget.value, 10);
                      setTransferAmount(isNaN(val) ? 1 : val);
                    }}
                    placeholder="Enter amount"
                  />
                </TextField>

                {/* Transfer Buttons */}
                <div class="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleTransfer}
                    disabled={!canTransfer()}
                    class="flex-1"
                  >
                    Transfer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTransferAll}
                    disabled={!props.storageExists || getResourceAmount(transferResourceType()) === 0}
                  >
                    Transfer All
                  </Button>
                </div>

                {/* Warning Messages */}
                <Show when={!props.storageExists}>
                  <div class="rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-700">
                    ⚠️ No storage building available. Build one first!
                  </div>
                </Show>
                
                <Show when={getResourceAmount(transferResourceType()) === 0}>
                  <div class="rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
                    ℹ️ No {transferResourceType()} available to transfer.
                  </div>
                </Show>
              </div>
            </Show>

            {/* Storage Unit Info */}
            <Show when={props.unit?.isStorage}>
              <div class="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                <p class="font-semibold">📦 Storage Building</p>
                <p class="mt-1">
                  This is a central storage facility. Units can transfer resources here for safekeeping.
                </p>
              </div>
            </Show>
          </CardContent>
        </Card>
      )}
    </Show>
  );
};

export default InventoryPanel;

