import { createSignal, createMemo, For, Show, onMount, onCleanup, createEffect } from "solid-js";
import { Button } from "~/components/ui/button";
import type { BattleArena, BattleUnit, BattleCombatEvent } from "~/module_bindings/types";
import { allBoardHexes, eventAction, hexToPixel, paletteFor } from "~/lib/arena-grid";

export type ArenaPlaybackSpeed = 0.5 | 1 | 2;

export interface BattleArenaViewportProps {
  arena: BattleArena;
  battleUnits: BattleUnit[];
  events: BattleCombatEvent[];
  ownerLabel?: (ownerId: string) => string;
  onClose: () => void;
  onWatchingDone?: () => void;
}

const HEX_SIZE = 22;

const SPEED_MS: Record<ArenaPlaybackSpeed, number> = {
  0.5: 800,
  1: 400,
  2: 200,
};

const SPEED_STORAGE_KEY = "nashfall.arenaPlaybackSpeed";

function readStoredSpeed(): ArenaPlaybackSpeed {
  if (typeof localStorage === "undefined") return 1;
  const raw = localStorage.getItem(SPEED_STORAGE_KEY);
  if (raw === "0.5" || raw === "1" || raw === "2") return Number(raw) as ArenaPlaybackSpeed;
  return 1;
}

function entryHealth(unit: BattleUnit, events: BattleCombatEvent[]): number {
  const dealt = events
    .filter((event) => event.targetId === unit.id)
    .reduce((sum, event) => sum + event.damage, 0);
  return unit.currentHealth + dealt;
}

export default function BattleArenaViewport(props: BattleArenaViewportProps) {
  const [paused, setPaused] = createSignal(false);
  const [speed, setSpeed] = createSignal<ArenaPlaybackSpeed>(readStoredSpeed());
  const [cursor, setCursor] = createSignal(0);
  let autoClosed = false;
  let logList: HTMLDivElement | undefined;

  const sortedEvents = createMemo(() =>
    [...props.events].filter((event) => event.arenaId === props.arena.id).sort((a, b) => a.seq - b.seq),
  );

  const currentEvent = createMemo(() => {
    const events = sortedEvents();
    const index = cursor() - 1;
    return index >= 0 ? events[index] : undefined;
  });

  const displayed = createMemo(() => {
    const events = sortedEvents().slice(0, cursor());
    return props.battleUnits
      .filter((unit) => unit.arenaId === props.arena.id)
      .map((unit) => {
        const start = entryHealth(unit, sortedEvents());
        const lost = events
          .filter((event) => event.targetId === unit.id)
          .reduce((sum, event) => sum + event.damage, 0);
        const health = Math.max(0, start - lost);
        let cellX = unit.spawnX ?? unit.positionX;
        let cellY = unit.spawnY ?? unit.positionY;
        for (const event of events) {
          if (event.attackerId === unit.id && eventAction(event) === "move") {
            cellX = event.destX;
            cellY = event.destY;
          }
        }
        return { ...unit, displayHealth: health, displayAlive: health > 0, cellX, cellY };
      });
  });

  const teams = createMemo(() =>
    [...new Set(displayed().map((unit) => unit.team))].sort(),
  );
  const teamLabel = (team: string) => props.ownerLabel?.(team) ?? team.slice(0, 6);
  const livingByTeam = () =>
    teams().map((team) => ({
      team,
      alive: displayed().filter((unit) => unit.team === team && unit.displayAlive).length,
      color: paletteFor(team, teams()),
    }));

  const fightOver = () => props.arena.status === "completed" && cursor() >= sortedEvents().length;
  const waitingOnServer = () =>
    props.arena.status === "in_progress" && cursor() >= sortedEvents().length;

  const logEntries = createMemo(() => {
    const events = sortedEvents();
    const units = props.battleUnits.filter((unit) => unit.arenaId === props.arena.id);
    return events.map((event, index) => {
      const applied = events.slice(0, index + 1);
      const target = units.find((unit) => unit.id === event.targetId);
      const attacker = units.find((unit) => unit.id === event.attackerId);
      const start = target ? entryHealth(target, events) : 0;
      const lost = applied
        .filter((item) => item.targetId === event.targetId)
        .reduce((sum, item) => sum + item.damage, 0);
      return {
        event,
        index,
        attackerTeam: attacker?.team ?? "",
        targetTeam: target?.team ?? "",
        healthAfter: Math.max(0, start - lost),
        action: eventAction(event),
      };
    });
  });

  const seekTo = (nextCursor: number) => {
    autoClosed = true;
    setPaused(true);
    setCursor(Math.max(0, Math.min(nextCursor, sortedEvents().length)));
  };

  const changeSpeed = (next: ArenaPlaybackSpeed) => {
    setPaused(false);
    setSpeed(next);
    if (typeof localStorage !== "undefined") localStorage.setItem(SPEED_STORAGE_KEY, String(next));
  };

  const skipToLive = () => {
    setCursor(sortedEvents().length);
  };

  createEffect(() => {
    const arenaId = props.arena.id;
    setCursor(0);
    autoClosed = false;
    void arenaId;
  });

  createEffect(() => {
    if (paused()) return;
    const intervalMs = SPEED_MS[speed()];
    const timer = setInterval(() => {
      const max = props.events.filter((event) => event.arenaId === props.arena.id).length;
      setCursor((prev) => Math.min(prev + 1, max));
    }, intervalMs);
    onCleanup(() => clearInterval(timer));
  });

  createEffect(() => {
    const seq = currentEvent()?.seq;
    const list = logList;
    if (seq == null || !list) return;
    list.querySelector(`[data-log-seq="${seq}"]`)?.scrollIntoView({ block: "nearest" });
  });

  createEffect(() => {
    if (!fightOver() || paused() || autoClosed || !props.onWatchingDone) return;
    const timer = setTimeout(() => {
      autoClosed = true;
      props.onWatchingDone?.();
    }, 2500);
    onCleanup(() => clearTimeout(timer));
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") props.onClose();
    if (e.key === " ") {
      e.preventDefault();
      setPaused((prev) => !prev);
    }
    if (e.key === "ArrowRight") skipToLive();
    if (e.key === "ArrowLeft") seekTo(cursor() - 1);
  };
  onMount(() => document.addEventListener("keydown", handleKeyDown));
  onCleanup(() => document.removeEventListener("keydown", handleKeyDown));

  const unitAt = (col: number, row: number) =>
    displayed()
      .filter((unit) => unit.cellX === col && unit.cellY === row)
      .sort((a, b) => Number(b.displayAlive) - Number(a.displayAlive))[0];

  const renderUnit = (unit: ReturnType<typeof displayed>[number]) => {
    const acting = () => currentEvent()?.attackerId === unit.id;
    const targeted = () => currentEvent()?.targetId === unit.id;
    const colors = paletteFor(unit.team, teams());
    return (
      <div
        class="flex h-full w-full flex-col items-center justify-center transition-all duration-300"
        classList={{ "opacity-35": !unit.displayAlive, "scale-105": acting() || targeted() }}
        title={`Minion #${unit.sourceUnitId} · ATK ${unit.attack} DEF ${unit.defense} SPD ${unit.speed}`}
      >
        <div
          class={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold text-white shadow-lg ${colors.bg} ${colors.border}`}
          classList={{
            [`ring-4 ${colors.ring}`]: acting(),
            "ring-4 ring-amber-200": targeted() && !acting(),
          }}
        >
          {unit.attack}
        </div>
        <div class="mt-1 h-1 w-10 overflow-hidden rounded-full bg-black/60" role="progressbar" aria-valuenow={unit.displayHealth} aria-valuemax={unit.maxHealth}>
          <div
            class="h-full rounded-full transition-all duration-300"
            classList={{ [colors.bg]: true }}
            style={{ width: `${Math.max(0, (unit.displayHealth / unit.maxHealth) * 100)}%` }}
          />
        </div>
        <span class="text-[9px] text-white/50">
          {unit.displayAlive ? `${unit.displayHealth}` : "down"}
        </span>
      </div>
    );
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Battle Arena">
      <div class="flex h-[85vh] max-h-[700px] w-[95vw] max-w-[1040px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl">
        <div class="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-semibold text-white">
              Majority melee — Round {props.arena.roundNumber}
            </h2>
            <span class="rounded-full border border-white/20 bg-white/5 px-3 py-0.5 text-sm text-white/80">
              Swing {cursor()}/{Math.max(sortedEvents().length, props.arena.turnNumber)}
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

        <div class="flex min-h-0 flex-1">
          <div class="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden p-4">
            {(() => {
              const cells = allBoardHexes();
              const pixels = cells.map(([q, r]) => hexToPixel(q, r, HEX_SIZE));
              const minX = Math.min(...pixels.map((p) => p.x)) - HEX_SIZE * Math.sqrt(3) / 2;
              const maxX = Math.max(...pixels.map((p) => p.x)) + HEX_SIZE * Math.sqrt(3) / 2;
              const minY = Math.min(...pixels.map((p) => p.y)) - HEX_SIZE;
              const maxY = Math.max(...pixels.map((p) => p.y)) + HEX_SIZE;
              const width = maxX - minX;
              const height = maxY - minY;
              return (
                <div class="relative" style={{ width: `${width}px`, height: `${height}px` }}>
                  <For each={cells}>
                    {([q, r]) => {
                      const pixel = hexToPixel(q, r, HEX_SIZE);
                      const unit = () => unitAt(q, r);
                      const actingHere = () => currentEvent()?.attackerId === unit()?.id;
                      const targetHere = () => currentEvent()?.targetId === unit()?.id;
                      return (
                        <div
                          class="absolute flex items-center justify-center border bg-black/25"
                          classList={{
                            "border-amber-300/80 bg-amber-400/15": actingHere(),
                            "border-white/50 bg-white/10": targetHere() && !actingHere(),
                            "border-white/10": !actingHere() && !targetHere(),
                          }}
                          style={{
                            left: `${pixel.x - minX - HEX_SIZE * Math.sqrt(3) / 2}px`,
                            top: `${pixel.y - minY - HEX_SIZE}px`,
                            width: `${HEX_SIZE * Math.sqrt(3)}px`,
                            height: `${HEX_SIZE * 2}px`,
                            "clip-path": "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                          }}
                        >
                          <Show when={unit()}>
                            {(occupant) => renderUnit(occupant())}
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              );
            })()}
          </div>

          <aside class="flex w-64 shrink-0 flex-col border-l border-white/10 bg-black/30">
            <div class="border-b border-white/10 px-3 py-2">
              <div class="text-[10px] font-semibold uppercase tracking-wide text-white/40">Combat log</div>
              <p class="text-[10px] text-white/30">Click a swing to jump there</p>
            </div>
            <div class="flex-1 overflow-y-auto px-2 py-2" data-testid="arena-combat-log" ref={(el) => { logList = el; }}>
              <Show
                when={logEntries().length > 0}
                fallback={<p class="px-1 text-center text-xs text-white/30">Waiting for the first swing</p>}
              >
                <For each={logEntries()}>
                  {(entry) => {
                    const isCurrent = () => cursor() === entry.index + 1;
                    const isFuture = () => cursor() < entry.index + 1;
                    return (
                      <button
                        type="button"
                        data-log-seq={entry.event.seq}
                        onClick={() => seekTo(entry.index + 1)}
                        class="mb-1 w-full rounded-md border px-2 py-1.5 text-left text-[11px] leading-snug transition-colors"
                        classList={{
                          "border-amber-300/50 bg-amber-400/15 text-white": isCurrent(),
                          "border-transparent text-white/35 hover:bg-white/5 hover:text-white/60": isFuture(),
                          "border-transparent text-white/70 hover:bg-white/5 hover:text-white": !isCurrent() && !isFuture(),
                        }}
                      >
                        <span class="mr-1.5 tabular-nums text-white/35">{entry.event.seq}</span>
                        <span class={paletteFor(entry.attackerTeam, teams()).text}>
                          #{entry.event.attackerSourceUnitId}
                        </span>
                        <span class="text-white/45">
                          {" "}
                          {entry.action === "move"
                            ? "stepped toward"
                            : entry.action === "wait"
                              ? "held vs"
                              : entry.event.targetKilled
                                ? "downed"
                                : "hit"}{" "}
                        </span>
                        <span class={paletteFor(entry.targetTeam, teams()).text}>
                          #{entry.event.targetSourceUnitId}
                        </span>
                        <Show when={entry.action === "attack"}>
                          <span class="float-right tabular-nums text-white/45">
                            −{entry.event.damage}
                            <Show when={!entry.event.targetKilled}>
                              <span class="ml-1 text-white/30">{entry.healthAfter}hp</span>
                            </Show>
                          </span>
                        </Show>
                      </button>
                    );
                  }}
                </For>
                <Show when={props.arena.winnerTeam}>
                  <button
                    type="button"
                    onClick={() => seekTo(sortedEvents().length)}
                    class="mt-1 w-full rounded-md border px-2 py-1.5 text-left text-[11px] font-medium transition-colors"
                    classList={{
                      "border-amber-300/50 bg-amber-400/15 text-white": fightOver(),
                      "border-transparent text-white/50 hover:bg-white/5 hover:text-white": !fightOver(),
                    }}
                  >
                    🏆 {teamLabel(props.arena.winnerTeam!)} wins
                  </button>
                </Show>
              </Show>
            </div>
          </aside>
        </div>

        <div class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/5 px-6 py-3">
          <div class="flex flex-wrap gap-3 text-sm">
            <For each={livingByTeam()}>
              {(row) => (
                <span class={row.color.text}>
                  {teamLabel(row.team)}: {row.alive}
                </span>
              )}
            </For>
            <Show when={waitingOnServer()}>
              <span class="text-white/30 text-xs self-center">Resolving next swing…</span>
            </Show>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPaused((prev) => !prev)}
              class="text-white/80 hover:bg-white/10"
            >
              {paused() ? "▶ Play" : "⏸ Pause"}
            </Button>
            <For each={[0.5, 1, 2] as ArenaPlaybackSpeed[]}>
              {(rate) => (
                <button
                  type="button"
                  onClick={() => changeSpeed(rate)}
                  class="rounded-md border px-2 py-1 text-xs font-medium transition-colors"
                  classList={{
                    "border-white/40 bg-white/15 text-white": speed() === rate && !paused(),
                    "border-white/10 bg-white/5 text-white/50 hover:text-white": speed() !== rate || paused(),
                  }}
                >
                  {rate}×
                </button>
              )}
            </For>
            <Button
              size="sm"
              variant="ghost"
              onClick={skipToLive}
              class="text-white/70 hover:bg-white/10 hover:text-white"
            >
              Skip
            </Button>
            <Show when={fightOver() && props.arena.winnerTeam}>
              <span class="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-sm font-semibold text-white">
                🏆 {teamLabel(props.arena.winnerTeam!)} wins
              </span>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
