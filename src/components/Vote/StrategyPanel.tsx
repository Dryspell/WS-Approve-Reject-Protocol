import { Component, createSignal, createMemo, For, Show, onMount } from "solid-js";
import type { User, Vote, Transaction, TradeOffer, Guarantee } from "~/module_bindings/types";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";

type Prediction = "red" | "blue" | "uncertain" | null;

interface PlayerAnnotation {
  prediction: Prediction;
  note: string;
}

interface StrategyPanelProps {
  roomId: number;
  roundNumber: number;
  currentUserId: string;
  players: User[];
  votes: Vote[];
  transactions: Transaction[];
  votesRevealed?: boolean;
}

function loadAnnotations(roomId: number): Record<string, PlayerAnnotation> {
  try {
    const raw = localStorage.getItem(`strategy_${roomId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAnnotations(roomId: number, data: Record<string, PlayerAnnotation>) {
  localStorage.setItem(`strategy_${roomId}`, JSON.stringify(data));
}

const StrategyPanel: Component<StrategyPanelProps> = (props) => {
  const { conn } = useSpacetimeDB();
  const [annotations, setAnnotations] = createSignal<Record<string, PlayerAnnotation>>({});
  const [selectedPlayer, setSelectedPlayer] = createSignal<string | null>(null);
  const [noteInput, setNoteInput] = createSignal("");

  onMount(() => {
    setAnnotations(loadAnnotations(props.roomId));
  });

  const playerVoteData = createMemo(() => {
    const data: Record<string, { total: number; red: number; blue: number; unset: number; forSale: number }> = {};
    for (const p of props.players) {
      const pid = p.identity.toHexString();
      data[pid] = { total: 0, red: 0, blue: 0, unset: 0, forSale: 0 };
    }
    for (const v of props.votes) {
      if (v.roomId !== props.roomId) continue;
      const d = data[v.playerId];
      if (!d) continue;
      d.total++;
      const mine = v.playerId === props.currentUserId;
      const color = props.votesRevealed || mine ? v.color : null;
      if (color === "red") d.red++;
      else if (color === "blue") d.blue++;
      else d.unset++;
      if (v.isForSale) d.forSale++;
    }
    return data;
  });

  const tradeRelationships = createMemo(() => {
    const links: { from: string; to: string; amount: number; type: string }[] = [];
    const seen = new Set<string>();
    for (const t of props.transactions) {
      if (t.roomId !== props.roomId) continue;
      const key = `${t.fromPlayer}-${t.toPlayer}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ from: t.fromPlayer, to: t.toPlayer, amount: t.amount, type: t.transactionType });
    }
    return links;
  });

  const updateAnnotation = (playerId: string, update: Partial<PlayerAnnotation>) => {
    setAnnotations((prev) => {
      const current = prev[playerId] || { prediction: null, note: "" };
      const next = { ...prev, [playerId]: { ...current, ...update } };
      saveAnnotations(props.roomId, next);
      return next;
    });
  };

  const predictionColor = (p: Prediction) => {
    switch (p) {
      case "red": return "border-red-500/50 bg-red-500/10";
      case "blue": return "border-blue-500/50 bg-blue-500/10";
      case "uncertain": return "border-amber-500/50 bg-amber-500/10";
      default: return "border-white/10 bg-white/5";
    }
  };

  const predictionIcon = (p: Prediction) => {
    switch (p) {
      case "red": return "🔴";
      case "blue": return "🔵";
      case "uncertain": return "❓";
      default: return "";
    }
  };

  const playerPositions = createMemo(() => {
    const count = props.players.length;
    if (count === 0) return [];
    const cx = 50;
    const cy = 50;
    const radius = Math.min(38, 20 + count * 2);
    return props.players.map((p, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      return {
        player: p,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        pid: p.identity.toHexString(),
      };
    });
  });

  const getPlayerPos = (pid: string) => {
    return playerPositions().find((pp) => pp.pid === pid);
  };

  return (
    <div class="space-y-3 text-white/90">
      {/* Circle layout */}
      <div class="relative" style={{ "padding-bottom": "100%" }}>
        <svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          {/* Trade relationship lines */}
          <For each={tradeRelationships()}>
            {(link) => {
              const fromPos = getPlayerPos(link.from);
              const toPos = getPlayerPos(link.to);
              if (!fromPos || !toPos) return null;
              return (
                <line
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={link.type === "vote_sale" ? "rgba(234,179,8,0.3)" : "rgba(168,85,247,0.3)"}
                  stroke-width="0.4"
                  stroke-dasharray="1,1"
                />
              );
            }}
          </For>
        </svg>

        {/* Player nodes */}
        <For each={playerPositions()}>
          {(pp) => {
            const vd = () => playerVoteData()[pp.pid] || { total: 0, red: 0, blue: 0, unset: 0, forSale: 0 };
            const ann = () => annotations()[pp.pid];
            const isMe = () => pp.pid === props.currentUserId;
            const isSelected = () => selectedPlayer() === pp.pid;

            return (
              <button
                class="absolute flex flex-col items-center transition-transform hover:scale-110"
                classList={{
                  "z-20": isSelected(),
                  "z-10": !isSelected(),
                }}
                style={{
                  left: `${pp.x}%`,
                  top: `${pp.y}%`,
                  transform: `translate(-50%, -50%)${isSelected() ? " scale(1.15)" : ""}`,
                }}
                onClick={() => setSelectedPlayer(isSelected() ? null : pp.pid)}
              >
                <div
                  class="relative rounded-full border-2 p-1.5 transition-all"
                  classList={{
                    [predictionColor(ann()?.prediction ?? null)]: true,
                    "ring-2 ring-amber-400/60": isSelected(),
                    "ring-2 ring-green-400/40": isMe() && !isSelected(),
                  }}
                >
                  <div class="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold">
                    {vd().total}
                  </div>
                  <Show when={ann()?.prediction}>
                    <div class="absolute -right-1 -top-1 text-[8px]">{predictionIcon(ann()!.prediction)}</div>
                  </Show>
                  <Show when={vd().forSale > 0}>
                    <div class="absolute -bottom-1 -right-1 rounded-full bg-amber-500 px-0.5 text-[7px] font-bold text-white">
                      ${vd().forSale}
                    </div>
                  </Show>
                </div>
                <div class="mt-0.5 max-w-[60px] truncate text-center text-[8px] text-white/50">
                  {isMe() ? "You" : pp.player.name || pp.pid.slice(0, 6)}
                </div>
                {/* Vote breakdown dots */}
                <div class="mt-0.5 flex gap-px">
                  <For each={Array(vd().red).fill("r")}>{() => <div class="h-1.5 w-1.5 rounded-full bg-red-500" />}</For>
                  <For each={Array(vd().blue).fill("b")}>{() => <div class="h-1.5 w-1.5 rounded-full bg-blue-500" />}</For>
                  <For each={Array(vd().unset).fill("u")}>{() => <div class="h-1.5 w-1.5 rounded-full bg-white/30" />}</For>
                </div>
              </button>
            );
          }}
        </For>
      </div>

      {/* Annotation popover */}
      <Show when={selectedPlayer()}>
        {(pid) => {
          const ann = () => annotations()[pid()] || { prediction: null, note: "" };
          const player = () => props.players.find((p) => p.identity.toHexString() === pid());
          const vd = () => playerVoteData()[pid()] || { total: 0, red: 0, blue: 0, unset: 0, forSale: 0 };

          return (
            <div class="rounded-lg border border-white/15 bg-white/5 p-3 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold">{player()?.name || pid().slice(0, 8)}</span>
                <button
                  class="text-[10px] text-white/30 hover:text-white/60"
                  onClick={() => setSelectedPlayer(null)}
                >
                  ✕
                </button>
              </div>

              {/* Stats */}
              <div class="flex gap-2 text-[10px] text-white/50">
                <span>{vd().total} votes</span>
                <span class="text-red-400">{vd().red}R</span>
                <span class="text-blue-400">{vd().blue}B</span>
                <span>{vd().unset}?</span>
                <Show when={vd().forSale > 0}>
                  <span class="text-amber-300">{vd().forSale} for sale</span>
                </Show>
              </div>

              {/* Prediction buttons */}
              <div class="space-y-1">
                <p class="text-[10px] text-white/40">Your prediction:</p>
                <div class="grid grid-cols-4 gap-1">
                  {(["red", "blue", "uncertain", null] as Prediction[]).map((pred) => (
                    <button
                      class="rounded border py-1 text-[10px] font-medium transition-all"
                      classList={{
                        "border-red-400/50 bg-red-500/20 text-red-300": pred === "red" && ann().prediction === pred,
                        "border-blue-400/50 bg-blue-500/20 text-blue-300": pred === "blue" && ann().prediction === pred,
                        "border-amber-400/50 bg-amber-500/20 text-amber-300": pred === "uncertain" && ann().prediction === pred,
                        "border-white/20 bg-white/10 text-white/60": pred === null && ann().prediction === pred,
                        "border-white/5 bg-white/[0.02] text-white/30 hover:bg-white/5": ann().prediction !== pred,
                      }}
                      onClick={() => updateAnnotation(pid(), { prediction: pred })}
                    >
                      {pred === "red" ? "🔴" : pred === "blue" ? "🔵" : pred === "uncertain" ? "❓" : "Clear"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div class="space-y-1">
                <p class="text-[10px] text-white/40">Note:</p>
                <div class="flex gap-1">
                  <input
                    type="text"
                    placeholder="Add a note..."
                    value={ann().note || noteInput()}
                    onInput={(e) => setNoteInput(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateAnnotation(pid(), { note: noteInput() || e.currentTarget.value });
                        setNoteInput("");
                      }
                    }}
                    class="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70 outline-none placeholder:text-white/20 focus:border-white/20"
                  />
                  <button
                    class="rounded bg-white/10 px-2 py-1 text-[10px] text-white/50 hover:bg-white/15"
                    onClick={() => {
                      updateAnnotation(pid(), { note: noteInput() });
                      setNoteInput("");
                    }}
                  >
                    Save
                  </button>
                </div>
                <Show when={ann().note}>
                  <p class="text-[9px] italic text-white/30">"{ann().note}"</p>
                </Show>
              </div>
            </div>
          );
        }}
      </Show>

      {/* Legend */}
      <div class="flex flex-wrap gap-2 text-[9px] text-white/30">
        <span class="flex items-center gap-1">
          <div class="h-2 w-4 border border-dashed" style={{ "border-color": "rgba(234,179,8,0.3)" }} /> Trade link
        </span>
        <span class="flex items-center gap-1">
          <div class="h-2 w-4 border border-dashed" style={{ "border-color": "rgba(168,85,247,0.3)" }} /> Guarantee
        </span>
        <span class="flex items-center gap-1">
          <div class="h-2 w-2 rounded-full bg-green-400/40" /> You
        </span>
      </div>
    </div>
  );
};

export default StrategyPanel;
