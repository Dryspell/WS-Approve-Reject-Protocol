import { Accessor, For, Show, createSignal, createMemo } from "solid-js";
type Identity = import("spacetimedb").Identity;
import type { DbConnection } from "~/module_bindings/index";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { characterForIndex, type CharacterClass } from "~/lib/asset-loader";

interface MinionData {
  id: number;
  name: string;
  characterClass: CharacterClass;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  gatherRate: number;
  selected: boolean;
}

const CLASS_ICONS: Record<CharacterClass, string> = {
  knight: "⚔️",
  barbarian: "🪓",
  mage: "🔮",
  rogue: "🗡️",
  ranger: "🏹",
  rogue_hooded: "🗡️",
};

const EQUIPMENT_SLOTS = ["Weapon", "Armor", "Accessory"];

function generateDefaultMinions(count: number): MinionData[] {
  return Array.from({ length: count }, (_, i) => {
    const cls = characterForIndex(i);
    return {
      id: i + 1,
      name: `${cls.charAt(0).toUpperCase() + cls.slice(1)} ${i + 1}`,
      characterClass: cls,
      health: 100,
      maxHealth: 100,
      attack: 8 + Math.floor(Math.random() * 5),
      defense: 5 + Math.floor(Math.random() * 4),
      speed: 6 + Math.floor(Math.random() * 3),
      gatherRate: 3 + Math.floor(Math.random() * 3),
      selected: true,
    };
  });
}

export default function MinionManagementPanel(props: {
  conn: Accessor<DbConnection | null>;
  identity: Accessor<Identity | undefined>;
  roomId: string;
  votesPerPlayer: number;
  onClose: () => void;
}) {
  const [minions, setMinions] = createSignal<MinionData[]>(
    generateDefaultMinions(props.votesPerPlayer)
  );
  const [selectedMinionId, setSelectedMinionId] = createSignal<number | null>(null);

  const selectedCount = createMemo(() => minions().filter(m => m.selected).length);
  const selectedMinion = createMemo(() => {
    const id = selectedMinionId();
    return id != null ? minions().find(m => m.id === id) : null;
  });

  const toggleMinionSelection = (id: number) => {
    setMinions(prev => prev.map(m =>
      m.id === id ? { ...m, selected: !m.selected } : m
    ));
  };

  return (
    <div class="absolute inset-0 z-20 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" onClick={props.onClose} />
      <div class="relative rounded-xl border border-white/10 bg-[#0f172a]/95 backdrop-blur-md shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h3 class="text-lg font-bold text-white">Barracks - Minion Management</h3>
            <p class="text-xs text-white/40 mt-0.5">
              Select up to {props.votesPerPlayer} minions for the next game
            </p>
          </div>
          <div class="flex items-center gap-3">
            <Badge
              variant="outline"
              class="text-xs"
              classList={{
                "border-green-500/50 text-green-400": selectedCount() === props.votesPerPlayer,
                "border-amber-500/50 text-amber-400": selectedCount() !== props.votesPerPlayer,
              }}
            >
              {selectedCount()}/{props.votesPerPlayer} selected
            </Badge>
            <Button variant="ghost" size="sm" onClick={props.onClose} class="text-white/50 hover:text-white">
              Close <span class="text-white/30 ml-1 text-xs">[Esc]</span>
            </Button>
          </div>
        </div>

        <div class="flex flex-1 overflow-hidden">
          {/* Minion list */}
          <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <For each={minions()}>
              {(minion) => (
                <div
                  class="flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all"
                  classList={{
                    "border-blue-500/50 bg-blue-500/10": selectedMinionId() === minion.id,
                    "border-green-500/30 bg-green-500/5": minion.selected && selectedMinionId() !== minion.id,
                    "border-white/5 bg-white/[0.02]": !minion.selected && selectedMinionId() !== minion.id,
                  }}
                  onClick={() => setSelectedMinionId(minion.id)}
                >
                  {/* Class icon */}
                  <div class="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg flex-shrink-0">
                    {CLASS_ICONS[minion.characterClass] || "⚔️"}
                  </div>

                  {/* Name and class */}
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-white truncate">{minion.name}</div>
                    <div class="text-[10px] text-white/40 capitalize">{minion.characterClass}</div>
                  </div>

                  {/* Quick stats */}
                  <div class="flex gap-3 text-[10px] text-white/40 flex-shrink-0">
                    <span title="Attack">⚔ {minion.attack}</span>
                    <span title="Defense">🛡 {minion.defense}</span>
                    <span title="Speed">💨 {minion.speed}</span>
                  </div>

                  {/* Selection toggle */}
                  <button
                    class="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                    classList={{
                      "bg-green-600 text-white": minion.selected,
                      "bg-white/5 text-white/30 hover:bg-white/10": !minion.selected,
                    }}
                    onClick={(e) => { e.stopPropagation(); toggleMinionSelection(minion.id); }}
                  >
                    {minion.selected ? "✓" : "○"}
                  </button>
                </div>
              )}
            </For>
          </div>

          {/* Detail panel */}
          <div class="w-64 border-l border-white/10 p-4 flex flex-col overflow-y-auto">
            <Show
              when={selectedMinion()}
              fallback={
                <div class="flex-1 flex items-center justify-center text-white/20 text-sm text-center px-4">
                  Select a minion to view details
                </div>
              }
            >
              {(minion) => (
                <div class="space-y-4">
                  {/* Header */}
                  <div class="text-center">
                    <div class="w-14 h-14 mx-auto rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-2">
                      {CLASS_ICONS[minion().characterClass] || "⚔️"}
                    </div>
                    <div class="text-sm font-bold text-white">{minion().name}</div>
                    <div class="text-xs text-white/40 capitalize">{minion().characterClass}</div>
                  </div>

                  {/* Stats */}
                  <div class="space-y-2">
                    <div class="text-[10px] font-semibold uppercase tracking-wider text-white/30">Stats</div>
                    <StatBar label="Health" value={minion().health} max={minion().maxHealth} color="bg-green-500" />
                    <StatBar label="Attack" value={minion().attack} max={20} color="bg-red-500" />
                    <StatBar label="Defense" value={minion().defense} max={15} color="bg-blue-500" />
                    <StatBar label="Speed" value={minion().speed} max={12} color="bg-yellow-500" />
                    <StatBar label="Gather" value={minion().gatherRate} max={10} color="bg-emerald-500" />
                  </div>

                  {/* Equipment slots */}
                  <div class="space-y-2">
                    <div class="text-[10px] font-semibold uppercase tracking-wider text-white/30">Equipment</div>
                    <For each={EQUIPMENT_SLOTS}>
                      {(slot) => (
                        <div class="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 cursor-not-allowed group">
                          <div class="w-7 h-7 rounded bg-white/5 flex items-center justify-center text-white/10 text-xs">?</div>
                          <div class="flex-1">
                            <div class="text-xs text-white/20">{slot}</div>
                            <div class="text-[10px] text-white/10">Coming soon</div>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBar(props: { label: string; value: number; max: number; color: string }) {
  const pct = () => Math.min(100, (props.value / props.max) * 100);
  return (
    <div>
      <div class="flex justify-between text-[10px] text-white/40 mb-0.5">
        <span>{props.label}</span>
        <span>{props.value}</span>
      </div>
      <div class="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div class={`h-full rounded-full transition-all ${props.color}`} style={{ width: `${pct()}%` }} />
      </div>
    </div>
  );
}
