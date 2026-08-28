import { Component, createMemo, Show, For, createSignal } from "solid-js";
import type { Unit, UnitStats, UnitInventory, UnitTaskQueue, Resource } from "~/module_bindings/types";
import type { TeamColor } from "./ColonyViewport";
import {
  CAMP_COST,
  CRAFT_RECIPES,
  REFINE_RECIPES,
  doubleChancePercent,
  skillLevelForResource,
} from "~/lib/skills";

interface UnitContextPanelProps {
  unit: Unit;
  stats?: UnitStats;
  inventory?: UnitInventory;
  tasks?: UnitTaskQueue[];
  resources?: Resource[];
  onClose: () => void;
  canSeeVoteColor?: boolean;
  onSetVoteColor?: (color: string) => void;
  onQueueTask?: (taskType: string, targetId: string) => void;
  onHarvestKind?: (resourceType: string) => void;
  onFoundCamp?: () => void;
  onRefine?: (rawType: string) => void;
  onCraft?: (recipe: string) => void;
  onSendHome?: () => void;
  hasCamp?: boolean;
  onCancelTask?: (taskId: number) => void;
}

const ACTIONS_PER_ROUND = 3;
const FEATURED_HARVEST: Array<{ type: string; label: string }> = [
  { type: "wood", label: "Wood" },
  { type: "stone", label: "Stone" },
  { type: "metal_ore", label: "Ore" },
];

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

const STAT_ICONS: Record<string, string> = {
  health: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  attack: "M13 10V3L4 14h7v7l9-11h-7z",
  defense: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  speed: "M13 10V3L4 14h7v7l9-11h-7z",
  gatherRate: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  craftRate: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
};

const TASK_LABELS: Record<string, string> = {
  move: "Moving",
  gather: "Gathering",
  craft: "Crafting",
  upgrade: "Upgrading",
  pending: "Queued",
  in_progress: "Active",
  completed: "Done",
  failed: "Failed",
};

const RESOURCE_ICONS: Record<string, string> = {
  wood: "🪵",
  stone: "🪨",
  metal_ore: "⛏️",
  coal: "🖤",
  gems: "💎",
  fiber: "🌿",
  hide: "🦌",
  sand: "🏖️",
  food: "🍎",
};

const UnitContextPanel: Component<UnitContextPanelProps> = (props) => {
  const teamColor = () =>
    (props.canSeeVoteColor === false ? "unset" : props.unit.voteColor || "unset") as TeamColor;
  const [harvestExpanded, setHarvestExpanded] = createSignal(false);

  const healthRatio = createMemo(() => {
    if (!props.stats) return 1;
    return Math.max(0, props.stats.health / Math.max(props.stats.maxHealth, 1));
  });

  const inventoryItems = createMemo(() => {
    if (!props.inventory) return [];
    const items: { key: string; label: string; amount: number }[] = [];
    for (const [key, label] of Object.entries(RESOURCE_LABELS)) {
      const amount = (props.inventory as any)[key] as number;
      if (amount > 0) {
        items.push({ key, label, amount });
      }
    }
    return items;
  });

  const totalInventory = createMemo(() => {
    if (!props.inventory) return 0;
    return inventoryItems().reduce((sum, item) => sum + item.amount, 0);
  });

  const activeTasks = createMemo(() =>
    (props.tasks || []).filter((t) => t.status !== "completed" && t.status !== "failed"),
  );

  const actionsLeft = () => props.stats?.actionsRemaining ?? 0;

  const resourceStock = createMemo(() => {
    const stock = new Map<string, number>();
    for (const resource of props.resources || []) {
      if (resource.amount <= 0) continue;
      stock.set(resource.resourceType, (stock.get(resource.resourceType) ?? 0) + resource.amount);
    }
    return stock;
  });

  const otherHarvestTypes = createMemo(() =>
    [...resourceStock().keys()]
      .filter((kind) => !FEATURED_HARVEST.some((f) => f.type === kind))
      .sort(),
  );

  const bagCount = (kind: string) => {
    const inv = props.inventory;
    if (!inv) return 0;
    switch (kind) {
      case "wood": return inv.wood;
      case "stone": return inv.stone;
      case "metal_ore": return inv.metalOre;
      case "lumber": return inv.lumber;
      case "cut_stone": return inv.cutStone;
      case "metal_ingot": return inv.metalIngot;
      default: return 0;
    }
  };

  const canSendHome = () =>
    actionsLeft() > 0 && !props.unit.voteColor && !props.unit.voteGuarantee;

  const harvestDoublePct = (kind: string) => {
    if (!props.stats) return 0;
    return doubleChancePercent(skillLevelForResource(kind, props.stats));
  };

  const craftDoublePct = () => doubleChancePercent(props.stats?.craftingLevel ?? 1);

  return (
    <div class="pointer-events-auto w-72 rounded-xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div class="flex items-center gap-2">
          <div
            class="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
            classList={{
              "bg-red-600/20 text-red-400": teamColor() === "red",
              "bg-blue-600/20 text-blue-400": teamColor() === "blue",
              "bg-white/10 text-white/50": teamColor() === "unset",
            }}
          >
            {props.unit.unitType === "minion" ? "M" : props.unit.unitType.charAt(0).toUpperCase()}
          </div>
          <div>
            <div class="text-sm font-semibold text-white/90">
              Unit #{props.unit.id}
            </div>
            <div class="text-[10px] text-white/40 capitalize">{props.unit.unitType}</div>
          </div>
        </div>
        <button
          class="rounded p-1 text-white/30 hover:bg-white/10 hover:text-white/60"
          onClick={props.onClose}
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Health bar */}
      <Show when={props.stats}>
        <div class="px-4 pt-3">
          <div class="mb-1 flex items-center justify-between text-[10px]">
            <span class="text-white/40">Health</span>
            <span class="text-white/60">
              {props.stats!.health} / {props.stats!.maxHealth}
            </span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full rounded-full transition-all duration-500"
              classList={{
                "bg-emerald-400": healthRatio() > 0.5,
                "bg-amber-400": healthRatio() > 0.25 && healthRatio() <= 0.5,
                "bg-red-400": healthRatio() <= 0.25,
              }}
              style={{ width: `${healthRatio() * 100}%` }}
            />
          </div>
        </div>
      </Show>

      <Show when={props.stats && props.unit.unitType === "minion"}>
        <div class="px-4 pt-3">
          <div class="mb-1 flex items-center justify-between text-[10px]">
            <span class="text-white/40">Actions this round</span>
            <span class="text-white/60">
              {actionsLeft()} / {ACTIONS_PER_ROUND}
            </span>
          </div>
          <div class="flex gap-1">
            {Array.from({ length: ACTIONS_PER_ROUND }, (_, i) => (
              <div
                class="h-1.5 flex-1 rounded-full"
                classList={{
                  "bg-emerald-400": i < actionsLeft(),
                  "bg-white/10": i >= actionsLeft(),
                }}
              />
            ))}
          </div>
          <div class="mt-2 grid grid-cols-3 gap-1 text-center">
            <div class="rounded bg-white/[0.03] px-1 py-1">
              <div class="text-[9px] text-white/30">Wood</div>
              <div class="text-[10px] text-amber-200/80">
                L{props.stats!.woodcuttingLevel} · {doubleChancePercent(props.stats!.woodcuttingLevel)}%
              </div>
            </div>
            <div class="rounded bg-white/[0.03] px-1 py-1">
              <div class="text-[9px] text-white/30">Mine</div>
              <div class="text-[10px] text-amber-200/80">
                L{props.stats!.miningLevel} · {doubleChancePercent(props.stats!.miningLevel)}%
              </div>
            </div>
            <div class="rounded bg-white/[0.03] px-1 py-1">
              <div class="text-[9px] text-white/30">Craft</div>
              <div class="text-[10px] text-amber-200/80">
                L{props.stats!.craftingLevel} · {doubleChancePercent(props.stats!.craftingLevel)}%
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Stats grid */}
      <Show when={props.stats}>
        <div class="grid grid-cols-3 gap-1.5 px-4 py-3">
          {[
            { label: "ATK", value: props.stats!.attack },
            { label: "DEF", value: props.stats!.defense },
            { label: "SPD", value: props.stats!.speed },
            { label: "Gather", value: props.stats!.gatherRate },
            { label: "Craft", value: props.stats!.craftRate },
          ].map((stat) => (
            <div class="rounded-lg bg-white/[0.03] px-2 py-1.5 text-center">
              <div class="text-xs font-semibold text-white/70">{stat.value}</div>
              <div class="text-[9px] text-white/30">{stat.label}</div>
            </div>
          ))}
        </div>
      </Show>

      {/* Vote assignment — this minion *is* a vote ticket */}
      <div class="border-t border-white/5 px-4 py-3">
        <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
          This unit is a vote
        </div>
        <p class="mb-2 text-[10px] leading-snug text-white/40">
          {props.canSeeVoteColor === false
            ? "This player's vote is hidden until the round ends."
            : "Cast it Red or Blue. Minority color lives; majority is eliminated."}
        </p>
        <Show
          when={props.canSeeVoteColor !== false}
          fallback={
            <div class="rounded-lg border border-dashed border-white/10 bg-white/5 py-2 text-center text-[11px] text-white/35">
              Color hidden
            </div>
          }
        >
        <div class="flex gap-2">
          <button
            class="flex-1 rounded-lg py-1.5 text-xs font-medium transition-all"
            classList={{
              "bg-red-600 text-white shadow-md shadow-red-600/25": teamColor() === "red",
              "bg-red-600/20 text-red-400 hover:bg-red-600/30": teamColor() !== "red",
            }}
            onClick={() => props.onSetVoteColor?.("red")}
          >
            Red
          </button>
          <button
            class="flex-1 rounded-lg py-1.5 text-xs font-medium transition-all"
            classList={{
              "bg-blue-600 text-white shadow-md shadow-blue-600/25": teamColor() === "blue",
              "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30": teamColor() !== "blue",
            }}
            onClick={() => props.onSetVoteColor?.("blue")}
          >
            Blue
          </button>
        </div>
        </Show>
      </div>

      {/* Inventory */}
      <Show when={props.inventory}>
        <div class="border-t border-white/5 px-4 py-3">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Inventory
            </span>
            <span class="text-[10px] text-white/20">
              {totalInventory()} / {props.inventory!.maxCapacity}
            </span>
          </div>
          <Show
            when={inventoryItems().length > 0}
            fallback={
              <p class="text-[11px] text-white/20">Empty</p>
            }
          >
            <div class="grid grid-cols-2 gap-1">
              <For each={inventoryItems()}>
                {(item) => (
                  <div class="flex items-center gap-1.5 rounded bg-white/[0.03] px-2 py-1">
                    <span class="text-[11px] text-white/50">{item.amount}</span>
                    <span class="text-[10px] text-white/30">{item.label}</span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      {/* Instant harvest — 1 action, 1 resource, no travel */}
      <Show when={props.unit.unitType === "minion"}>
        <div class="border-t border-white/5 px-4 py-3">
          <div class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            Harvest (1 action)
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <For each={FEATURED_HARVEST}>
              {(kind) => (
                  <button
                    class="rounded-lg border px-2 py-1.5 text-center transition-all disabled:cursor-not-allowed disabled:opacity-35"
                    classList={{
                      "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20":
                        actionsLeft() > 0 && (resourceStock().get(kind.type) ?? 0) > 0,
                      "border-white/5 bg-white/[0.03]":
                        actionsLeft() <= 0 || (resourceStock().get(kind.type) ?? 0) <= 0,
                    }}
                    disabled={actionsLeft() <= 0 || (resourceStock().get(kind.type) ?? 0) <= 0}
                    onClick={() => props.onHarvestKind?.(kind.type)}
                  >
                    <div class="text-sm">{RESOURCE_ICONS[kind.type] ?? "📦"}</div>
                    <div class="text-[10px] font-medium text-white/70">{kind.label}</div>
                    <div class="text-[9px] text-white/30">{resourceStock().get(kind.type) ?? 0} left</div>
                    <div class="text-[9px] text-amber-300/70">{harvestDoublePct(kind.type)}% 2×</div>
                  </button>
                )}
            </For>
          </div>
          <Show when={otherHarvestTypes().length > 0}>
            <button
              class="mt-2 flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-white/30 hover:text-white/50 transition-colors"
              onClick={() => setHarvestExpanded((v) => !v)}
            >
              <span>Other resources</span>
              <span>{harvestExpanded() ? "▲" : "▼"}</span>
            </button>
            <Show when={harvestExpanded()}>
              <div class="mt-1 space-y-1 max-h-32 overflow-y-auto">
                <For each={otherHarvestTypes()}>
                  {(kind) => (
                      <button
                        class="flex w-full items-center justify-between rounded bg-white/[0.03] px-2 py-1.5 text-left border border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-35 hover:bg-emerald-500/10 hover:border-emerald-500/20"
                        disabled={actionsLeft() <= 0 || (resourceStock().get(kind) ?? 0) <= 0}
                        onClick={() => props.onHarvestKind?.(kind)}
                      >
                        <span class="flex items-center gap-1.5">
                          <span>{RESOURCE_ICONS[kind] ?? "📦"}</span>
                          <span class="text-[11px] text-white/60 capitalize">{kind.replace("_", " ")}</span>
                        </span>
                        <span class="text-[10px] text-white/30">{resourceStock().get(kind) ?? 0} left</span>
                      </button>
                    )}
                </For>
              </div>
            </Show>
          </Show>
        </div>
      </Show>

      <Show when={props.unit.unitType === "minion"}>
        <div class="border-t border-white/5 px-4 py-3 space-y-2">
          <div class="text-[10px] font-semibold uppercase tracking-wider text-white/30">
            Camp
          </div>
          <Show
            when={props.hasCamp}
            fallback={
              <button
                class="w-full rounded-lg border px-2 py-1.5 text-[11px] transition-all disabled:cursor-not-allowed disabled:opacity-35"
                classList={{
                  "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20":
                    actionsLeft() > 0 && bagCount("wood") >= CAMP_COST.wood && bagCount("stone") >= CAMP_COST.stone,
                  "border-white/5 bg-white/[0.03] text-white/40":
                    actionsLeft() <= 0 || bagCount("wood") < CAMP_COST.wood || bagCount("stone") < CAMP_COST.stone,
                }}
                disabled={actionsLeft() <= 0 || bagCount("wood") < CAMP_COST.wood || bagCount("stone") < CAMP_COST.stone}
                onClick={() => props.onFoundCamp?.()}
              >
                Found camp · 3 wood + 2 stone
              </button>
            }
          >
            <p class="text-[11px] text-emerald-400/80">Camp is up. Refine and craft unlocked.</p>
            <div class="mb-1 text-[10px] text-white/30">
              Refine (1 action + 2 raw) · craft {craftDoublePct()}% 2×
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <For each={[...REFINE_RECIPES]}>
                {(recipe) => (
                  <button
                    class="rounded-lg border border-white/5 bg-white/[0.03] px-1.5 py-1.5 text-center text-[10px] text-white/70 disabled:opacity-35 hover:bg-sky-500/10"
                    disabled={actionsLeft() <= 0 || bagCount(recipe.raw) < recipe.rawAmount}
                    onClick={() => props.onRefine?.(recipe.raw)}
                  >
                    {recipe.label}
                    <div class="text-[9px] text-white/30">{bagCount(recipe.raw)} raw</div>
                  </button>
                )}
              </For>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
              <For each={[...CRAFT_RECIPES]}>
                {(recipe) => {
                  const canCraft =
                    actionsLeft() > 0 &&
                    bagCount("lumber") >= recipe.lumber &&
                    bagCount("cut_stone") >= recipe.cutStone &&
                    bagCount("metal_ingot") >= recipe.metalIngot;
                  return (
                    <button
                      class="rounded-lg border border-white/5 bg-white/[0.03] px-1.5 py-1.5 text-center text-[10px] text-white/70 disabled:opacity-35 hover:bg-violet-500/10"
                      disabled={!canCraft}
                      onClick={() => props.onCraft?.(recipe.id)}
                    >
                      {recipe.label}
                      <div class="text-[9px] text-white/30">{recipe.costLabel}</div>
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>
          <button
            class="w-full rounded-lg border px-2 py-1.5 text-[11px] transition-all disabled:cursor-not-allowed disabled:opacity-35"
            classList={{
              "border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20": canSendHome(),
              "border-white/5 bg-white/[0.03] text-white/40": !canSendHome(),
            }}
            disabled={!canSendHome()}
            onClick={() => props.onSendHome?.()}
          >
            Send home · keep bag, void this vote — next lobby only
          </button>
          <Show when={props.unit.voteColor || props.unit.voteGuarantee}>
            <p class="text-[10px] text-white/30">
              Uncolor and drop any guarantee before sending home.
            </p>
          </Show>
        </div>
      </Show>

      {/* Active tasks */}
      <Show when={activeTasks().length > 0}>
        <div class="border-t border-white/5 px-4 py-3">
          <div class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            Tasks ({activeTasks().length})
          </div>
          <div class="space-y-1">
            <For each={activeTasks()}>
              {(task) => (
                <div class="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1.5">
                  <div>
                    <div class="text-[11px] text-white/60">
                      {TASK_LABELS[task.taskType] || task.taskType}
                    </div>
                    <div class="text-[9px] text-white/25">
                      {TASK_LABELS[task.status] || task.status}
                    </div>
                  </div>
                  <Show when={task.status !== "completed"}>
                    <button
                      class="rounded p-0.5 text-white/20 hover:bg-white/10 hover:text-red-400"
                      onClick={() => props.onCancelTask?.(task.id)}
                    >
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Current task indicator */}
      <Show when={props.unit.taskType}>
        <div class="border-t border-white/5 px-4 py-2">
          <div class="flex items-center gap-2">
            <div class="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            <span class="text-[11px] text-amber-400/80">
              {TASK_LABELS[props.unit.taskType!] || props.unit.taskType}
            </span>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default UnitContextPanel;
