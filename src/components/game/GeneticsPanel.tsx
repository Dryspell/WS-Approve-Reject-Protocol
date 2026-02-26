import { Component, createMemo, createSignal, Show, For } from "solid-js";
import type { LaborerGenetics } from "~/module_bindings/types";

type GeneticsIvKey = "combatIv" | "gatheringIv" | "craftingIv" | "speedIv" | "healthIv" | "staminaIv";

interface GeneticsPanelProps {
  selectedUnitId: number | null;
  selectedUnitIdB?: number | null;
  genetics: LaborerGenetics[];
  units: { id: number; ownerId: string }[];
  onBreed: (parentAId: number, parentBId: number, buildingId: number) => void;
  breedingBuildings: { id: number }[];
}

const IV_LABELS: { key: GeneticsIvKey; label: string }[] = [
  { key: "combatIv", label: "Combat" },
  { key: "gatheringIv", label: "Gathering" },
  { key: "craftingIv", label: "Crafting" },
  { key: "speedIv", label: "Speed" },
  { key: "healthIv", label: "Health" },
  { key: "staminaIv", label: "Stamina" },
];

const MAX_IV = 31;

function ivBarColor(iv: number): string {
  if (iv <= 10) return "bg-red-500";
  if (iv <= 20) return "bg-amber-500";
  return "bg-emerald-500";
}

function ivTextColor(iv: number): string {
  if (iv <= 10) return "text-red-400";
  if (iv <= 20) return "text-amber-400";
  return "text-emerald-400";
}

function IvBar(props: { label: string; value: number }) {
  const pct = () => (props.value / MAX_IV) * 100;
  return (
    <div>
      <div class="mb-0.5 flex items-center justify-between text-[10px]">
        <span class="text-white/60">{props.label}</span>
        <span class={ivTextColor(props.value)}>{props.value}</span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          class={`h-full rounded-full transition-all ${ivBarColor(props.value)}`}
          style={{ width: `${pct()}%` }}
        />
      </div>
    </div>
  );
}

const GeneticsPanel: Component<GeneticsPanelProps> = (props) => {
  const [showBreedBuildingPicker, setShowBreedBuildingPicker] = createSignal(false);

  const selectedGenetics = createMemo(() => {
    const id = props.selectedUnitId;
    if (id == null) return null;
    return props.genetics.find((g) => g.unitId === id);
  });

  const parentLineage = createMemo(() => {
    const g = selectedGenetics();
    if (!g || g.parentAId == null || g.parentBId == null) return null;
    return { parentA: g.parentAId, parentB: g.parentBId };
  });

  const canBreed = createMemo(() => {
    const a = props.selectedUnitId;
    const b = props.selectedUnitIdB;
    return (
      a != null &&
      b != null &&
      a !== b &&
      props.breedingBuildings.length > 0
    );
  });

  const handleBreed = (bid: number) => {
    const a = props.selectedUnitId;
    const b = props.selectedUnitIdB;
    if (a != null && b != null) {
      props.onBreed(a, b, bid);
      setShowBreedBuildingPicker(false);
    }
  };

  return (
    <div class="rounded-xl border border-white/10 bg-black/60 p-4 text-white backdrop-blur-xl">
      <h3 class="mb-3 border-b border-white/10 pb-2 text-sm font-semibold text-amber-400">
        Laborer Genetics
      </h3>

      <Show
        when={props.selectedUnitId != null}
        fallback={
          <p class="text-xs text-white/40">Select a unit to view genetics</p>
        }
      >
        <Show
          when={selectedGenetics()}
          fallback={
            <p class="text-xs text-white/40">No genetics data for this unit</p>
          }
        >
          {(gen) => (
            <div class="space-y-3">
              {/* IV bars */}
              <div class="space-y-2">
                <div class="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  IV Stats (0–31)
                </div>
                <For each={IV_LABELS}>
                  {(item) => (
                    <IvBar
                      label={item.label}
                      value={(gen() as Record<string, number>)[item.key] ?? 0}
                    />
                  )}
                </For>
              </div>

              {/* Generation & lineage */}
              <div class="space-y-1 border-t border-white/10 pt-2">
                <div class="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Lineage
                </div>
                <div class="text-xs text-white/70">
                  Generation {gen().generation ?? 0}
                </div>
                <Show when={parentLineage()}>
                  {(lineage) => (
                    <div class="text-[11px] text-white/50">
                      Parents: #{lineage().parentA} × #{lineage().parentB}
                    </div>
                  )}
                </Show>
                <Show when={!parentLineage() && (gen().generation ?? 0) <= 1}>
                  <div class="text-[11px] text-white/30">Founder / no parents</div>
                </Show>
              </div>

              {/* Breed button - when two units selected */}
              <Show when={canBreed()}>
                <div class="border-t border-white/10 pt-3">
                  <Show when={props.breedingBuildings.length === 1}>
                    <button
                      class="w-full rounded-lg bg-amber-600/80 py-2 text-xs font-medium text-white hover:bg-amber-500/90"
                      onClick={() => handleBreed(props.breedingBuildings[0].id)}
                    >
                      Breed
                    </button>
                  </Show>
                  <Show when={props.breedingBuildings.length > 1}>
                    <button
                      class="w-full rounded-lg bg-amber-600/80 py-2 text-xs font-medium text-white hover:bg-amber-500/90"
                      onClick={() => setShowBreedBuildingPicker(true)}
                    >
                      Breed
                    </button>
                    <Show when={showBreedBuildingPicker()}>
                      <div class="mt-2 space-y-2">
                        <div class="text-[10px] text-white/50">
                          Select breeding building:
                        </div>
                        <For each={props.breedingBuildings}>
                          {(b) => (
                            <button
                              class="block w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/10"
                              onClick={() => handleBreed(b.id)}
                            >
                              Building #{b.id}
                            </button>
                          )}
                        </For>
                        <button
                          class="w-full rounded border border-white/10 py-1 text-[11px] text-white/50 hover:bg-white/5"
                          onClick={() => setShowBreedBuildingPicker(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </Show>
                  </Show>
                </div>
              </Show>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
};

export default GeneticsPanel;
