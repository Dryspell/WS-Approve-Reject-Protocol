import { Component, For, Show, createMemo, createSignal } from "solid-js";

interface BuildingPanelProps {
  buildings: any[]; // Unit[] where building_type is set
  units: any[]; // Unit[] where unit_type is "minion"
  onConstruct: (buildingType: string, x: number, z: number) => void;
  onAssignUnit: (unitId: number, buildingId: number) => void;
  onContribute: (buildingId: number, resourceType: string, amount: number, sourceUnitId: number) => void;
  onSetTax: (buildingId: number, taxRate: number) => void;
  playerIdentity?: string; // If set, tax controls only show for buildings you contributed to
}

interface BuildingDef {
  type: string;
  label: string;
  requirements: { resource: string; amount: number }[];
}

const BUILDING_CATEGORIES: Record<string, BuildingDef[]> = {
  Extraction: [
    { type: "wood_cutting", label: "Wood Cutting", requirements: [{ resource: "wood", amount: 20 }, { resource: "woodenPole", amount: 4 }] },
    { type: "mining", label: "Mining", requirements: [{ resource: "stone", amount: 30 }, { resource: "wood", amount: 10 }] },
    { type: "quarry", label: "Quarry", requirements: [{ resource: "stone", amount: 50 }, { resource: "cutStone", amount: 10 }] },
    { type: "hunters_lodge", label: "Hunter's Lodge", requirements: [{ resource: "wood", amount: 25 }, { resource: "hide", amount: 8 }] },
    { type: "farm_fiber", label: "Farm/Fiber", requirements: [{ resource: "wood", amount: 15 }, { resource: "fiber", amount: 10 }] },
  ],
  Refinery: [
    { type: "carpenter", label: "Carpenter", requirements: [{ resource: "lumber", amount: 40 }, { resource: "cutStone", amount: 5 }] },
    { type: "forge", label: "Forge", requirements: [{ resource: "metalOre", amount: 30 }, { resource: "coal", amount: 20 }] },
    { type: "mason", label: "Mason", requirements: [{ resource: "cutStone", amount: 50 }, { resource: "lumber", amount: 15 }] },
    { type: "weaver", label: "Weaver", requirements: [{ resource: "fiber", amount: 40 }, { resource: "wood", amount: 10 }] },
    { type: "tanner", label: "Tanner", requirements: [{ resource: "hide", amount: 30 }, { resource: "wood", amount: 15 }] },
    { type: "kitchen", label: "Kitchen", requirements: [{ resource: "cutStone", amount: 20 }, { resource: "lumber", amount: 25 }] },
    { type: "glass_furnace", label: "Glass Furnace", requirements: [{ resource: "sand", amount: 40 }, { resource: "coal", amount: 20 }] },
  ],
  Manufacturing: [
    { type: "armorer", label: "Armorer", requirements: [{ resource: "metalIngot", amount: 50 }, { resource: "leather", amount: 20 }] },
    { type: "weaponsmith", label: "Weaponsmith", requirements: [{ resource: "metalIngot", amount: 60 }, { resource: "lumber", amount: 15 }] },
    { type: "toolsmith", label: "Toolsmith", requirements: [{ resource: "metalIngot", amount: 40 }, { resource: "lumber", amount: 25 }] },
    { type: "tailor", label: "Tailor", requirements: [{ resource: "cloth", amount: 45 }, { resource: "leather", amount: 10 }] },
    { type: "glass_blower", label: "Glass Blower", requirements: [{ resource: "glass", amount: 30 }, { resource: "lumber", amount: 10 }] },
    { type: "infuser", label: "Infuser", requirements: [{ resource: "gems", amount: 20 }, { resource: "metalIngot", amount: 30 }] },
  ],
  Housing: [
    { type: "dormitory", label: "Dormitory", requirements: [{ resource: "lumber", amount: 60 }, { resource: "cloth", amount: 30 }] },
    { type: "player_housing", label: "Player Housing", requirements: [{ resource: "cutStone", amount: 80 }, { resource: "lumber", amount: 50 }] },
  ],
  Other: [
    { type: "farm_food", label: "Farm (Food)", requirements: [{ resource: "wood", amount: 20 }, { resource: "fiber", amount: 15 }] },
    { type: "breeding", label: "Breeding", requirements: [{ resource: "wood", amount: 40 }, { resource: "hide", amount: 25 }] },
  ],
};

const RESOURCE_LABELS: Record<string, string> = {
  wood: "Wood",
  stone: "Stone",
  metalOre: "Metal Ore",
  coal: "Coal",
  gems: "Gems",
  fiber: "Fiber",
  hide: "Hide",
  sand: "Sand",
  food: "Food",
  woodenPole: "Wooden Pole",
  lumber: "Lumber",
  cutStone: "Cut Stone",
  metalIngot: "Metal Ingot",
  cloth: "Cloth",
  rope: "Rope",
  leather: "Leather",
  glass: "Glass",
};

const BuildingPanel: Component<BuildingPanelProps> = (props) => {
  const [expandedCategories, setExpandedCategories] = createSignal<Set<string>>(new Set(Object.keys(BUILDING_CATEGORIES)));
  const [selectedBuildingId, setSelectedBuildingId] = createSignal<number | null>(null);
  const [buildPosition, setBuildPosition] = createSignal<{ x: number; z: number } | null>(null);
  const [buildType, setBuildType] = createSignal<string | null>(null);
  const [taxInput, setTaxInput] = createSignal<Record<number, string>>({});

  const existingBuildings = createMemo(() =>
    props.buildings.filter((b) => b.buildingType != null)
  );

  const completedBuildings = createMemo(() =>
    existingBuildings().filter(
      (b) =>
        b.constructionProgress != null &&
        b.constructionMax != null &&
        b.constructionProgress >= b.constructionMax
    )
  );

  const buildingBuildings = createMemo(() =>
    existingBuildings().filter(
      (b) =>
        b.constructionProgress == null ||
        b.constructionMax == null ||
        b.constructionProgress < b.constructionMax
    )
  );

  const availableMinions = createMemo(() =>
    props.units.filter(
      (u) => u.unitType === "minion" && u.assignedUnitId == null
    )
  );

  const assignedToBuilding = (buildingId: number) =>
    props.units.filter((u) => u.unitType === "minion" && u.assignedUnitId === buildingId);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const openBuildModal = (buildingType: string) => {
    setBuildType(buildingType);
    setBuildPosition({ x: 0, z: 0 });
  };

  const confirmBuild = () => {
    const type = buildType();
    const pos = buildPosition();
    if (type && pos) {
      props.onConstruct(type, pos.x, pos.z);
      setBuildType(null);
      setBuildPosition(null);
    }
  };

  const handleSetTax = (buildingId: number) => {
    const val = taxInput()[buildingId];
    const pct = val != null ? parseFloat(val) : NaN;
    if (!isNaN(pct) && pct >= 0 && pct <= 100) {
      props.onSetTax(buildingId, pct / 100);
      setTaxInput((prev) => ({ ...prev, [buildingId]: "" }));
    }
  };

  return (
    <div class="flex h-full flex-col rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl text-white">
      {/* Header */}
      <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 class="text-lg font-semibold text-amber-400">Building Panel</h3>
      </div>

      <div class="flex flex-1 overflow-hidden">
        {/* Left: Buildable list */}
        <div class="flex-1 overflow-y-auto border-r border-white/10 p-3">
          <For each={Object.entries(BUILDING_CATEGORIES)}>
            {([category, defs]) => (
              <div class="mb-3">
                <button
                  class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-white/90 hover:bg-white/5"
                  onClick={() => toggleCategory(category)}
                >
                  <span>{category}</span>
                  <span class="text-white/40">
                    {expandedCategories().has(category) ? "▼" : "▶"}
                  </span>
                </button>
                <Show when={expandedCategories().has(category)}>
                  <div class="mt-1 space-y-2 pl-2">
                    <For each={defs}>
                      {(def) => (
                        <div class="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                          <div class="mb-2 text-sm font-medium text-white">{def.label}</div>
                          <div class="mb-2 space-y-1 text-[11px] text-white/50">
                            <For each={def.requirements}>
                              {(req) => (
                                <div class="flex justify-between">
                                  <span>{RESOURCE_LABELS[req.resource] ?? req.resource}</span>
                                  <span>{req.amount}</span>
                                </div>
                              )}
                            </For>
                          </div>
                          <button
                            class="w-full rounded-lg bg-amber-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500/90"
                            onClick={() => openBuildModal(def.type)}
                          >
                            Build
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>

        {/* Right: Existing buildings */}
        <div class="flex w-80 flex-col overflow-y-auto p-3">
          <div class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Existing Buildings
          </div>

          {/* Under construction */}
          <Show when={buildingBuildings().length > 0}>
            <div class="mb-3 text-[10px] text-amber-400/80">Under Construction</div>
            <div class="mb-4 space-y-2">
              <For each={buildingBuildings()}>
                {(b) => {
                  const progress = () => {
                    const p = b.constructionProgress ?? 0;
                    const m = b.constructionMax ?? 1;
                    return Math.min(100, (p / m) * 100);
                  };
                  return (
                    <div
                      class="cursor-pointer rounded-lg border p-2.5 transition-colors"
                      classList={{
                        "border-amber-500/40 bg-amber-500/5": selectedBuildingId() === b.id,
                        "border-white/10 bg-white/[0.02] hover:border-white/20": selectedBuildingId() !== b.id,
                      }}
                      onClick={() => setSelectedBuildingId(b.id)}
                    >
                      <div class="mb-1 text-xs font-medium text-white">
                        {BUILDING_CATEGORIES[Object.keys(BUILDING_CATEGORIES).find((k) =>
                          BUILDING_CATEGORIES[k].some((d) => d.type === b.buildingType)
                        )!]?.find((d) => d.type === b.buildingType)?.label ?? b.buildingType}
                      </div>
                      <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          class="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${progress()}%` }}
                        />
                      </div>
                      <div class="mt-1 text-[10px] text-white/40">
                        {b.constructionProgress ?? 0} / {b.constructionMax ?? 1}
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>

          {/* Completed buildings */}
          <div class="mb-2 text-[10px] text-emerald-400/80">Completed</div>
          <div class="space-y-2">
            <For each={completedBuildings()}>
              {(b) => (
                <div
                  class="cursor-pointer rounded-lg border p-2.5 transition-colors"
                  classList={{
                    "border-emerald-500/40 bg-emerald-500/5": selectedBuildingId() === b.id,
                    "border-white/10 bg-white/[0.02] hover:border-white/20": selectedBuildingId() !== b.id,
                  }}
                  onClick={() => setSelectedBuildingId(b.id)}
                >
                  <div class="mb-1 text-xs font-medium text-white">
                    {Object.values(BUILDING_CATEGORIES)
                      .flat()
                      .find((d) => d.type === b.buildingType)?.label ?? b.buildingType}
                  </div>
                  <div class="text-[10px] text-white/40">
                    Laborers: {assignedToBuilding(b.id).length}
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>

      {/* Detail panel for selected building */}
      <Show when={selectedBuildingId()}>
        {(_bid_val) => {
          const bid = selectedBuildingId()!;
          const building = () => props.buildings.find((b) => b.id === bid);
          const laborers = () => assignedToBuilding(bid);
          const isCompleted = () => {
            const b = building();
            return (
              b &&
              b.constructionProgress != null &&
              b.constructionMax != null &&
              b.constructionProgress >= b.constructionMax
            );
          };
          const isContributor = () => {
            const b = building();
            const contributors = b?.contributors;
            if (!contributors?.length) return false;
            if (props.playerIdentity) return contributors.includes(props.playerIdentity);
            return true;
          };

          return (
            <div class="border-t border-white/10 p-3">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-sm font-medium text-white">Building #{bid}</span>
                <button
                  class="rounded p-1 text-white/30 hover:bg-white/10 hover:text-white/60"
                  onClick={() => setSelectedBuildingId(null)}
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Assign laborers */}
              <Show when={isCompleted()}>
                <div class="mb-3">
                  <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Assigned Laborers ({laborers().length})
                  </div>
                  <div class="mb-2 space-y-1">
                    <For each={laborers()}>
                      {(u) => (
                        <div class="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1 text-xs text-white/70">
                          Minion #{u.id}
                        </div>
                      )}
                    </For>
                  </div>
                  <div class="space-y-1">
                    <For each={availableMinions()}>
                      {(minion) => (
                        <button
                          class="w-full rounded bg-white/5 px-2 py-1.5 text-left text-xs text-white/60 hover:bg-white/10 hover:text-white"
                          onClick={() => props.onAssignUnit(minion.id, bid)}
                        >
                          Assign Minion #{minion.id}
                        </button>
                      )}
                    </For>
                  </div>
                  <Show when={availableMinions().length === 0}>
                    <p class="text-[11px] text-white/30">No available minions</p>
                  </Show>
                </div>
              </Show>

              {/* Tax rate (for contributors) */}
              <Show when={isContributor()}>
                <div>
                  <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Tax Rate (0–100%)
                  </div>
                  <div class="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder={`${((building()?.taxRate ?? 0) * 100).toFixed(1)}`}
                      value={taxInput()[bid] ?? ""}
                      onInput={(e) =>
                        setTaxInput((prev) => ({ ...prev, [bid]: e.currentTarget.value }))
                      }
                      class="w-20 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/30"
                    />
                    <button
                      class="rounded bg-amber-600/80 px-2 py-1 text-xs text-white hover:bg-amber-500/90"
                      onClick={() => handleSetTax(bid)}
                    >
                      Set
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          );
        }}
      </Show>

      {/* Build modal */}
      <Show when={buildType() != null}>
        <div class="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div class="w-72 rounded-xl border border-white/10 bg-black/80 p-4">
            <h4 class="mb-3 text-sm font-semibold text-amber-400">Place Building</h4>
            <div class="mb-3 space-y-2">
              <div class="flex items-center gap-2">
                <label class="w-8 text-[11px] text-white/60">X</label>
                <input
                  type="number"
                  value={buildPosition()?.x ?? 0}
                  onInput={(e) =>
                    setBuildPosition((p) => (p ? { ...p, x: parseFloat(e.currentTarget.value) || 0 } : null))
                  }
                  class="flex-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                />
              </div>
              <div class="flex items-center gap-2">
                <label class="w-8 text-[11px] text-white/60">Z</label>
                <input
                  type="number"
                  value={buildPosition()?.z ?? 0}
                  onInput={(e) =>
                    setBuildPosition((p) => (p ? { ...p, z: parseFloat(e.currentTarget.value) || 0 } : null))
                  }
                  class="flex-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                />
              </div>
            </div>
            <div class="flex gap-2">
              <button
                class="flex-1 rounded-lg bg-amber-600/80 py-2 text-sm font-medium text-white hover:bg-amber-500/90"
                onClick={confirmBuild}
              >
                Construct
              </button>
              <button
                class="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 hover:bg-white/5"
                onClick={() => {
                  setBuildType(null);
                  setBuildPosition(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default BuildingPanel;
