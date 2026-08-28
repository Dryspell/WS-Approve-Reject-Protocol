import { type Component, createSignal, createMemo, For, Show } from "solid-js";
import type { Equipment } from "~/module_bindings/types";

interface EquipmentPanelProps {
  selectedUnitId: number | null;
  equipment: Equipment[];
  onEquip: (equipmentId: number, unitId: number) => void;
  onUnequip: (equipmentId: number) => void;
}

const SLOTS = [
  { key: "main_hand", label: "Main Hand" },
  { key: "body", label: "Body" },
];

const TIER_COLORS: Record<number, string> = {
  1: "text-gray-300",
  2: "text-green-300",
  3: "text-blue-300",
  4: "text-purple-300",
  5: "text-amber-300",
};

const EquipmentPanel: Component<EquipmentPanelProps> = (props) => {
  const [selectedItem, setSelectedItem] = createSignal<Equipment | null>(null);

  const equippedItems = createMemo(() => {
    if (props.selectedUnitId == null) return {};
    const map: Record<string, Equipment> = {};
    for (const eq of props.equipment) {
      if (eq.equippedToUnitId === props.selectedUnitId) {
        map[eq.slot] = eq;
      }
    }
    return map;
  });

  const unequippedItems = createMemo(() =>
    props.equipment.filter((e) => !e.equippedToUnitId)
  );

  const totalBonuses = createMemo(() => {
    const equipped = Object.values(equippedItems());
    return {
      attack: equipped.reduce((s, e) => s + (e.attackBonus || 0), 0),
      defense: equipped.reduce((s, e) => s + (e.defenseBonus || 0), 0),
      speed: equipped.reduce((s, e) => s + (e.speedBonus || 0), 0),
      health: equipped.reduce((s, e) => s + (e.healthBonus || 0), 0),
    };
  });

  return (
    <div class="p-3 text-white rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl">
      <h3 class="text-sm font-bold text-white/90 mb-3">Equipment</h3>

      <Show when={props.selectedUnitId == null}>
        <p class="text-xs text-white/40">Select a unit to view equipment</p>
      </Show>

      <Show when={props.selectedUnitId != null}>
        {/* Equipment Slots */}
        <div class="grid grid-cols-2 gap-1 mb-3">
          <For each={SLOTS}>
            {(slot) => {
              const item = () => equippedItems()[slot.key];
              return (
                <button
                  class="flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] transition-all"
                  classList={{
                    "border-white/20 bg-white/5 hover:bg-white/10": !item(),
                    "border-amber-500/40 bg-amber-500/10": !!item(),
                  }}
                  onClick={() => {
                    if (item()) {
                      props.onUnequip(item()!.id);
                    }
                  }}
                  title={item() ? `${item()!.itemName} - Click to unequip` : `${slot.label} - Empty`}
                >
                  <span class="text-white/40 w-14 truncate">{slot.label}</span>
                  <Show when={item()} fallback={<span class="text-white/20">Empty</span>}>
                    <span class={TIER_COLORS[item()?.tier || 1]}>{item()?.itemName}</span>
                  </Show>
                </button>
              );
            }}
          </For>
        </div>

        {/* Total Bonuses */}
        <div class="flex gap-2 text-[10px] text-white/50 mb-3 px-1">
          <span class="text-red-300">+{totalBonuses().attack} ATK</span>
          <span class="text-blue-300">+{totalBonuses().defense} DEF</span>
          <span class="text-green-300">+{totalBonuses().speed} SPD</span>
          <span class="text-pink-300">+{totalBonuses().health} HP</span>
        </div>

        {/* Inventory */}
        <div class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Inventory ({unequippedItems().length})
        </div>
        <div class="max-h-32 overflow-auto space-y-0.5 mb-3">
          <For each={unequippedItems()}>
            {(item) => (
              <button
                class="w-full flex items-center gap-2 rounded px-2 py-1 text-[10px] hover:bg-white/10 transition-all border border-transparent"
                classList={{
                  "border-amber-400/30 bg-amber-500/10": selectedItem()?.id === item.id,
                }}
                onClick={() => setSelectedItem(item)}
              >
                <span class={`font-medium ${TIER_COLORS[item.tier || 1]}`}>{item.itemName}</span>
                <span class="ml-auto text-white/30">T{item.tier}</span>
                <span class="text-white/20">{item.durability}/{item.maxDurability}</span>
              </button>
            )}
          </For>
          <Show when={unequippedItems().length === 0}>
            <p class="text-[10px] text-white/20 px-2 py-1">No unequipped items</p>
          </Show>
        </div>

        {/* Item Details + Equip button */}
        <Show when={selectedItem()}>
          <div class="rounded-lg bg-white/5 border border-white/10 p-2 mb-3">
            <div class="text-xs font-semibold text-white/80 mb-1">{selectedItem()?.itemName}</div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-white/50">
              <span>Tier: <span class={TIER_COLORS[selectedItem()?.tier || 1]}>{selectedItem()?.tier}</span></span>
              <span>Material: {selectedItem()?.material}</span>
              <span>Quality: {selectedItem()?.quality}</span>
              <span>Surface: {selectedItem()?.surface}</span>
              <Show when={selectedItem()?.enchantment}>
                <span class="text-purple-300 col-span-2">Enchant: {selectedItem()?.enchantment}</span>
              </Show>
              <span>ATK: +{selectedItem()?.attackBonus}</span>
              <span>DEF: +{selectedItem()?.defenseBonus}</span>
              <span>SPD: +{selectedItem()?.speedBonus}</span>
              <span>HP: +{selectedItem()?.healthBonus}</span>
            </div>
            <Show when={props.selectedUnitId != null}>
              <button
                class="mt-2 w-full rounded bg-amber-500/30 border border-amber-500/40 px-2 py-1.5 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/40 transition-all"
                onClick={() => {
                  const item = selectedItem();
                  if (item && props.selectedUnitId != null) {
                    props.onEquip(item.id, props.selectedUnitId);
                    setSelectedItem(null);
                  }
                }}
              >
                Equip to Unit
              </button>
            </Show>
          </div>
        </Show>
      </Show>
      <p class="mt-2 text-[10px] text-white/30">
        Craft a hatchet, spear, or vest from the selected minion. This panel only swaps what they already wear.
      </p>
    </div>
  );
};

export default EquipmentPanel;
