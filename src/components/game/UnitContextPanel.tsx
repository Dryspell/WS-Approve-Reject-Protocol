import { Component, createMemo, Show, For } from "solid-js";
import type { Unit, UnitStats, UnitInventory, UnitTaskQueue } from "~/module_bindings/types";
import type { TeamColor } from "./ColonyViewport";

interface UnitContextPanelProps {
  unit: Unit;
  stats?: UnitStats;
  inventory?: UnitInventory;
  tasks?: UnitTaskQueue[];
  onClose: () => void;
  onSetVoteColor?: (color: string) => void;
  onQueueTask?: (taskType: string, targetId: string) => void;
  onCancelTask?: (taskId: number) => void;
}

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

const UnitContextPanel: Component<UnitContextPanelProps> = (props) => {
  const teamColor = () => (props.unit.voteColor || "unset") as TeamColor;

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

      {/* Vote assignment */}
      <div class="border-t border-white/5 px-4 py-3">
        <div class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
          Vote Color
        </div>
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
