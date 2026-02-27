import { createSignal, For, Show, onMount, onCleanup, createEffect } from "solid-js";
import { Button } from "~/components/ui/button";
import type { BattleArena, BattleUnit } from "~/module_bindings/types";

export interface BattleArenaViewportProps {
  arena: BattleArena;
  battleUnits: BattleUnit[];
  onProcessTurn: (arenaId: number) => void;
  onClose: () => void;
}

const TEAM_COLORS = {
  red: {
    bg: "bg-red-600",
    border: "border-red-500",
    text: "text-red-400",
    glow: "shadow-red-500/50",
  },
  blue: {
    bg: "bg-blue-600",
    border: "border-blue-500",
    text: "text-blue-400",
    glow: "shadow-blue-500/50",
  },
} as const;

const AUTO_TURN_INTERVAL_MS = 1200; // 1.2 s between turns for visibility

export default function BattleArenaViewport(props: BattleArenaViewportProps) {
  const [combatLog, setCombatLog] = createSignal<string[]>([]);
  const [autoRunning, setAutoRunning] = createSignal(false);
  let autoIntervalRef: ReturnType<typeof setInterval> | undefined;

  const redUnits = () =>
    props.battleUnits.filter((u) => u.team === "red" && u.isAlive);
  const blueUnits = () =>
    props.battleUnits.filter((u) => u.team === "blue" && u.isAlive);

  const isBattleActive = () =>
    props.arena.status === "in_progress" && !props.arena.winnerTeam;

  const stopAutoLoop = () => {
    if (autoIntervalRef !== undefined) {
      clearInterval(autoIntervalRef);
      autoIntervalRef = undefined;
    }
    setAutoRunning(false);
  };

  const startAutoLoop = () => {
    if (autoIntervalRef !== undefined) return; // already running
    setAutoRunning(true);
    autoIntervalRef = setInterval(() => {
      if (!isBattleActive()) {
        stopAutoLoop();
        return;
      }
      props.onProcessTurn(props.arena.id);
      setCombatLog((prev) => {
        const entry = `Turn ${props.arena.turnNumber + 1}: ⚔️ Red ${redUnits().length} vs Blue ${blueUnits().length}`;
        return [entry, ...prev].slice(0, 8);
      });
    }, AUTO_TURN_INTERVAL_MS);
  };

  // Auto-stop when battle completes
  createEffect(() => {
    if (!isBattleActive() && autoRunning()) {
      stopAutoLoop();
      if (props.arena.winnerTeam) {
        setCombatLog((prev) => [`🏆 ${props.arena.winnerTeam!.toUpperCase()} wins!`, ...prev].slice(0, 8));
      }
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") props.onClose();
  };
  onMount(() => document.addEventListener("keydown", handleKeyDown));
  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
    stopAutoLoop();
  });

  const unitPosition = (index: number, team: "red" | "blue") => {
    const teamUnits = team === "red" ? redUnits().length : blueUnits().length;
    const cols = Math.max(1, Math.ceil(Math.sqrt(teamUnits)));
    const row = Math.floor(index / cols);
    const col = index % cols;
    const xBase = team === "red" ? 20 : 80;
    const xOffset = (col - (cols - 1) / 2) * 8;
    const yOffset = (row - (teamUnits - 1) / (cols * 2)) * 12;
    return {
      left: `${xBase + xOffset}%`,
      top: `${40 + yOffset}%`,
    };
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Battle Arena">
      <div class="flex h-[85vh] max-h-[700px] w-[95vw] max-w-[900px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div class="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-semibold text-white">
              Battle Arena — Round {props.arena.roundNumber}
            </h2>
            <span class="rounded-full border border-white/20 bg-white/5 px-3 py-0.5 text-sm text-white/80">
              Turn {props.arena.turnNumber}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onClose}
            class="text-white/70 hover:bg-white/10 hover:text-white"
          >
            Close
          </Button>
        </div>

        {/* Arena */}
        <div class="relative flex flex-1 overflow-hidden">
          {/* Center line */}
          <div class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

          {/* Red team zone */}
          <div class="absolute left-0 top-0 h-full w-1/2 border-r border-white/10">
            <div class="absolute inset-0 bg-red-950/20" />
          </div>
          {/* Blue team zone */}
          <div class="absolute left-1/2 top-0 h-full w-1/2">
            <div class="absolute inset-0 bg-blue-950/20" />
          </div>

          {/* Units */}
          <For each={redUnits()}>
            {(unit, i) => {
              const pos = () => unitPosition(i(), "red");
              return (
                <div
                  class="absolute flex flex-col items-center transition-all duration-300 ease-out"
                  style={{ left: pos().left, top: pos().top, transform: "translate(-50%, -50%)" }}
                  title={`ATK ${unit.attack} DEF ${unit.defense} SPD ${unit.speed}`}
                >
                  <div class={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${TEAM_COLORS.red.bg} ${TEAM_COLORS.red.border} text-xs font-bold text-white shadow-lg`}>
                    {unit.attack}
                  </div>
                  <div class="mt-1.5 h-1.5 w-14 overflow-hidden rounded-full bg-black/60" role="progressbar" aria-valuenow={unit.currentHealth} aria-valuemax={unit.maxHealth}>
                    <div class="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${Math.max(0, (unit.currentHealth / unit.maxHealth) * 100)}%` }} />
                  </div>
                  <span class="text-[9px] text-white/50 mt-0.5">{unit.currentHealth}/{unit.maxHealth}</span>
                </div>
              );
            }}
          </For>
          <For each={blueUnits()}>
            {(unit, i) => {
              const pos = () => unitPosition(i(), "blue");
              return (
                <div
                  class="absolute flex flex-col items-center transition-all duration-300 ease-out"
                  style={{ left: pos().left, top: pos().top, transform: "translate(-50%, -50%)" }}
                  title={`ATK ${unit.attack} DEF ${unit.defense} SPD ${unit.speed}`}
                >
                  <div class={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${TEAM_COLORS.blue.bg} ${TEAM_COLORS.blue.border} text-xs font-bold text-white shadow-lg`}>
                    {unit.attack}
                  </div>
                  <div class="mt-1.5 h-1.5 w-14 overflow-hidden rounded-full bg-black/60" role="progressbar" aria-valuenow={unit.currentHealth} aria-valuemax={unit.maxHealth}>
                    <div class="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.max(0, (unit.currentHealth / unit.maxHealth) * 100)}%` }} />
                  </div>
                  <span class="text-[9px] text-white/50 mt-0.5">{unit.currentHealth}/{unit.maxHealth}</span>
                </div>
              );
            }}
          </For>
        </div>

        {/* Combat log */}
        <div class="shrink-0 border-t border-white/10 px-6 py-3 max-h-28 overflow-y-auto space-y-0.5">
          <Show
            when={combatLog().length > 0}
            fallback={<p class="text-center text-xs text-white/30">Press Start Battle to begin auto-chess combat</p>}
          >
            <For each={combatLog()}>
              {(line) => <p class="text-xs text-white/60">{line}</p>}
            </For>
          </Show>
        </div>

        {/* Footer controls */}
        <div class="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 bg-white/5 px-6 py-4">
          <div class="flex gap-4 text-sm">
            <span class={TEAM_COLORS.red.text}>Red: {redUnits().length} alive</span>
            <span class={TEAM_COLORS.blue.text}>Blue: {blueUnits().length} alive</span>
            <span class="text-white/30 text-xs">Turn {props.arena.turnNumber}</span>
          </div>
          <div class="flex gap-3">
            <Show when={isBattleActive()}>
              <Show
                when={autoRunning()}
                fallback={
                  <Button
                    onClick={startAutoLoop}
                    class="bg-emerald-600/90 hover:bg-emerald-500 text-white"
                  >
                    ▶ Start Battle
                  </Button>
                }
              >
                <Button
                  onClick={stopAutoLoop}
                  class="bg-amber-600/90 hover:bg-amber-500 text-white"
                >
                  ⏸ Pause
                </Button>
              </Show>
              <Button
                onClick={() => props.onProcessTurn(props.arena.id)}
                variant="ghost"
                class="text-white/50 hover:text-white text-xs"
              >
                Step
              </Button>
            </Show>
            <Show when={props.arena.winnerTeam}>
              <div
                class={`flex items-center gap-2 rounded-lg border px-4 py-2 ${
                  props.arena.winnerTeam === "red"
                    ? "border-red-500/50 bg-red-950/40"
                    : "border-blue-500/50 bg-blue-950/40"
                }`}
              >
                <span class="font-semibold text-white">
                  🏆 {props.arena.winnerTeam?.toUpperCase()} wins!
                </span>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
