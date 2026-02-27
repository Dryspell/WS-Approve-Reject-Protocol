import { Accessor, For, Show, createSignal, createMemo } from "solid-js";
import type { Identity } from "spacetimedb";
import type { DbConnection } from "~/module_bindings/index";
import type { Unit, UnitStats } from "~/module_bindings/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/toast";

// XP thresholds to reach levels 2-5
const LEVEL_THRESHOLDS = [100, 300, 700, 1500];

function xpForNextLevel(level: number): number {
  return LEVEL_THRESHOLDS[level - 1] ?? 9999999;
}

function levelProgress(xp: number, level: number): number {
  if (level >= 5) return 100;
  const needed = xpForNextLevel(level);
  const prev = level > 1 ? LEVEL_THRESHOLDS[level - 2] : 0;
  return Math.min(100, ((xp - prev) / (needed - prev)) * 100);
}

interface SkillRow {
  label: string;
  xp: number;
  level: number;
  color: string;
}

function getSkillRows(stats: UnitStats): SkillRow[] {
  return [
    { label: "Woodcutting", xp: stats.woodcuttingXp, level: stats.woodcuttingLevel, color: "bg-amber-500" },
    { label: "Mining",      xp: stats.miningXp,      level: stats.miningLevel,      color: "bg-slate-400" },
    { label: "Foraging",    xp: stats.foragingXp,    level: stats.foragingLevel,    color: "bg-emerald-500" },
    { label: "Crafting",    xp: stats.craftingXp,    level: stats.craftingLevel,    color: "bg-violet-500" },
  ];
}

export default function MinionManagementPanel(props: {
  conn: Accessor<DbConnection | null>;
  identity: Accessor<Identity | undefined>;
  roomId: string;
  votesPerPlayer: number;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [selectedUnitId, setSelectedUnitId] = createSignal<number | null>(null);

  const localId = createMemo(() => props.identity()?.toHexString());

  // Real units from SpacetimeDB
  const myMinions = createMemo<Array<{ unit: Unit; stats: UnitStats | undefined }>>(() => {
    const c = props.conn();
    if (!c) return [];
    const id = localId();
    if (!id) return [];
    const roomIdNum = parseInt(props.roomId);
    return Array.from(c.db.unit.iter())
      .filter((u) => u.unitType === "minion" && u.ownerId === id && u.roomId === roomIdNum)
      .map((unit) => ({
        unit,
        stats: c.db.unitStats.unitId.find(unit.id),
      }));
  });

  const selectedEntry = createMemo(() => {
    const id = selectedUnitId();
    return id != null ? myMinions().find((e) => e.unit.id === id) : undefined;
  });

  const isSendHomeSafe = (unit: Unit) =>
    unit.voteColor == null && unit.voteGuarantee == null;

  const handleSendHome = async (unitId: number) => {
    const c = props.conn();
    if (!c) return;
    try {
      await c.reducers.transferLaborerToParent({ unitId, parentServerId: 0 });
      if (selectedUnitId() === unitId) setSelectedUnitId(null);
      showToast({ title: "Minion sent home", description: "They escaped safely.", variant: "success", duration: 3000 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast({ title: "Cannot send home", description: msg, variant: "error", duration: 4000 });
    }
  };

  return (
    <div class="absolute inset-0 z-20 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" onClick={props.onClose} />
      <div class="relative rounded-xl border border-white/10 bg-[#0f172a]/95 backdrop-blur-md shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h3 class="text-lg font-bold text-white">Barracks — Minion Management</h3>
            <p class="text-xs text-white/40 mt-0.5">
              Your minions for this game · {myMinions().length} active
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={props.onClose} class="text-white/50 hover:text-white">
            Close <span class="text-white/30 ml-1 text-xs">[Esc]</span>
          </Button>
        </div>

        <div class="flex flex-1 overflow-hidden">
          {/* Minion list */}
          <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <Show
              when={myMinions().length > 0}
              fallback={
                <div class="flex flex-col items-center py-12 text-center text-white/30 text-sm">
                  <div class="text-3xl mb-3">⚔️</div>
                  <p>No minions yet.</p>
                  <p class="text-xs mt-1 text-white/20">Spawn laborers to build your army.</p>
                </div>
              }
            >
              <For each={myMinions()}>
                {({ unit, stats }) => {
                  const safe = isSendHomeSafe(unit);
                  const maxSkillLevel = () =>
                    stats
                      ? Math.max(stats.woodcuttingLevel, stats.miningLevel, stats.foragingLevel, stats.craftingLevel)
                      : 1;

                  return (
                    <div
                      class="flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all"
                      classList={{
                        "border-blue-500/50 bg-blue-500/10": selectedUnitId() === unit.id,
                        "border-white/5 bg-white/[0.02]": selectedUnitId() !== unit.id,
                      }}
                      onClick={() => setSelectedUnitId(unit.id)}
                    >
                      {/* Unit icon */}
                      <div class="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg flex-shrink-0">
                        ⚔️
                      </div>

                      {/* Name + vote status */}
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5">
                          <span class="text-sm font-medium text-white truncate">Minion #{unit.id}</span>
                          <Show when={maxSkillLevel() >= 5}>
                            <Badge class="text-[9px] px-1 py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">MAX</Badge>
                          </Show>
                          <Show when={maxSkillLevel() > 1 && maxSkillLevel() < 5}>
                            <Badge class="text-[9px] px-1 py-0 bg-white/10 text-white/40 border-white/10">Lv {maxSkillLevel()}</Badge>
                          </Show>
                        </div>
                        <div class="text-[10px] text-white/40 mt-0.5">
                          {unit.voteColor
                            ? <span class="capitalize" style={{ color: unit.voteColor === "red" ? "#f87171" : "#60a5fa" }}>Voted {unit.voteColor}</span>
                            : unit.voteGuarantee
                            ? <span class="text-amber-400">Guaranteed {unit.voteGuarantee}</span>
                            : <span>Unassigned</span>
                          }
                        </div>
                      </div>

                      {/* Quick stats */}
                      <Show when={stats}>
                        <div class="flex gap-3 text-[10px] text-white/40 flex-shrink-0">
                          <span title="Attack">⚔ {stats!.attack}</span>
                          <span title="Defense">🛡 {stats!.defense}</span>
                          <span title="Speed">💨 {stats!.speed}</span>
                        </div>
                      </Show>

                      {/* Send Home button */}
                      <button
                        class="flex-shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-all"
                        classList={{
                          "bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/20": safe,
                          "bg-white/5 text-white/20 cursor-not-allowed border border-white/5": !safe,
                        }}
                        title={
                          !safe
                            ? unit.voteColor
                              ? "Cannot send home: vote already cast"
                              : "Cannot send home: promised as guarantee"
                            : "Send this minion home to keep them safe"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          if (safe) handleSendHome(unit.id);
                        }}
                        disabled={!safe}
                      >
                        🏠 Home
                      </button>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>

          {/* Detail panel */}
          <div class="w-68 border-l border-white/10 p-4 flex flex-col overflow-y-auto" style={{ "min-width": "17rem" }}>
            <Show
              when={selectedEntry()}
              fallback={
                <div class="flex-1 flex items-center justify-center text-white/20 text-sm text-center px-4">
                  Select a minion to view details
                </div>
              }
            >
              {(entry) => {
                const { unit, stats } = entry();
                return (
                  <div class="space-y-4">
                    {/* Header */}
                    <div class="text-center">
                      <div class="w-14 h-14 mx-auto rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-2">⚔️</div>
                      <div class="text-sm font-bold text-white">Minion #{unit.id}</div>
                      <div class="text-xs text-white/40 mt-0.5 capitalize">
                        {unit.voteColor ? `Voted ${unit.voteColor}` : "Unassigned"}
                      </div>
                    </div>

                    {/* Combat Stats */}
                    <Show when={stats}>
                      <div class="space-y-2">
                        <div class="text-[10px] font-semibold uppercase tracking-wider text-white/30">Combat Stats</div>
                        <StatBar label="Health" value={stats!.health} max={stats!.maxHealth} color="bg-green-500" />
                        <StatBar label="Attack" value={stats!.attack} max={30} color="bg-red-500" />
                        <StatBar label="Defense" value={stats!.defense} max={20} color="bg-blue-500" />
                        <StatBar label="Speed" value={stats!.speed} max={15} color="bg-yellow-500" />
                        <StatBar label="Gather" value={stats!.gatherRate} max={15} color="bg-emerald-500" />
                        <StatBar label="Craft" value={stats!.craftRate} max={12} color="bg-violet-500" />
                      </div>
                    </Show>

                    {/* Skills */}
                    <Show when={stats}>
                      <div class="space-y-2">
                        <div class="text-[10px] font-semibold uppercase tracking-wider text-white/30">Skills</div>
                        <For each={getSkillRows(stats!)}>
                          {(skill) => (
                            <div>
                              <div class="flex justify-between text-[10px] text-white/50 mb-0.5">
                                <span>{skill.label}</span>
                                <span class="flex items-center gap-1">
                                  <span class={skill.level >= 5 ? "text-yellow-400 font-bold" : ""}>Lv {skill.level}</span>
                                  <Show when={skill.level < 5}>
                                    <span class="text-white/25">· {skill.xp}/{xpForNextLevel(skill.level)} XP</span>
                                  </Show>
                                  <Show when={skill.level >= 5}>
                                    <span class="text-yellow-400 text-[9px]">MAX</span>
                                  </Show>
                                </span>
                              </div>
                              <div class="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  class={`h-full rounded-full transition-all ${skill.color}`}
                                  style={{ width: `${levelProgress(skill.xp, skill.level)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>

                    {/* Send Home action */}
                    <div class="pt-1">
                      <button
                        class="w-full rounded-lg px-3 py-2 text-xs font-medium transition-all border"
                        classList={{
                          "bg-green-600/20 text-green-400 hover:bg-green-600/30 border-green-600/20": isSendHomeSafe(unit),
                          "bg-white/5 text-white/20 cursor-not-allowed border-white/5": !isSendHomeSafe(unit),
                        }}
                        disabled={!isSendHomeSafe(unit)}
                        onClick={() => isSendHomeSafe(unit) && handleSendHome(unit.id)}
                      >
                        🏠 Send Home
                      </button>
                      <p class="text-[9px] text-white/20 text-center mt-1">
                        {isSendHomeSafe(unit)
                          ? "Removes minion from game — safe from combat death"
                          : unit.voteColor
                          ? "Vote already cast — cannot send home"
                          : "Promised as guarantee — cannot send home"}
                      </p>
                    </div>
                  </div>
                );
              }}
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
