import { Component, createSignal, For, Show } from "solid-js";

interface SideBetPanelProps {
  roomId: number;
  roundNumber: number;
  sideBets: any[];
  players: any[];
  currentUserId: string;
  onPlaceBet: (betType: string, betTarget: string, amount: number) => void;
}

const COLOR_MULTIPLIER = 1.8;
const PLAYER_MULTIPLIER = 2.5;

const SideBetPanel: Component<SideBetPanelProps> = (props) => {
  const [betType, setBetType] = createSignal<"color" | "player">("color");
  const [colorTarget, setColorTarget] = createSignal<"red" | "blue">("red");
  const [playerTarget, setPlayerTarget] = createSignal<string>("");
  const [amount, setAmount] = createSignal("");
  const [placing, setPlacing] = createSignal(false);

  const activePlayers = () =>
    props.players.filter((p) => (p.identity?.toHexString?.() ?? p.id ?? p) !== props.currentUserId);

  const playerId = (p: any) => p.identity?.toHexString?.() ?? p.id ?? String(p);

  const handlePlaceBet = () => {
    const amt = parseFloat(amount());
    if (isNaN(amt) || amt <= 0) return;

    const target =
      betType() === "color" ? colorTarget() : playerTarget();
    if (!target) return;

    setPlacing(true);
    try {
      props.onPlaceBet(betType(), target, amt);
      setAmount("");
      setPlayerTarget("");
    } finally {
      setPlacing(false);
    }
  };

  const multiplier = () =>
    betType() === "color" ? COLOR_MULTIPLIER : PLAYER_MULTIPLIER;

  const canPlace =
    () =>
    amount() &&
    parseFloat(amount()) > 0 &&
    (betType() === "color" || playerTarget());

  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "won":
        return "text-emerald-400";
      case "lost":
        return "text-red-400";
      default:
        return "text-amber-400";
    }
  };

  return (
    <div class="rounded-xl border border-white/10 bg-black/60 p-4 text-white shadow-xl backdrop-blur-xl">
      <div class="mb-3 border-b border-white/10 pb-2">
        <h3 class="text-sm font-semibold text-white/90">Side Bets</h3>
        <p class="mt-1 text-xs text-white/50">
          Round {props.roundNumber} · {props.sideBets.filter(b => b.playerId !== props.currentUserId).length} global bet{props.sideBets.filter(b => b.playerId !== props.currentUserId).length !== 1 ? "s" : ""} · Your bets: {props.sideBets.filter(b => b.playerId === props.currentUserId).length}
        </p>
      </div>

      {/* Bet type selector */}
      <div class="mb-3 space-y-2">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Bet Type
        </p>
        <div class="flex gap-2">
          <button
            class="flex-1 rounded-lg border py-2 text-xs font-medium transition-all"
            classList={{
              "border-red-400/50 bg-red-500/20 text-red-200":
                betType() === "color",
              "border-white/10 bg-white/5 text-white/60 hover:bg-white/10":
                betType() !== "color",
            }}
            onClick={() => setBetType("color")}
          >
            Which color wins?
          </button>
          <button
            class="flex-1 rounded-lg border py-2 text-xs font-medium transition-all"
            classList={{
              "border-amber-400/50 bg-amber-500/20 text-amber-200":
                betType() === "player",
              "border-white/10 bg-white/5 text-white/60 hover:bg-white/10":
                betType() !== "player",
            }}
            onClick={() => setBetType("player")}
          >
            Who gets eliminated?
          </button>
        </div>
      </div>

      {/* Color target */}
      <Show when={betType() === "color"}>
        <div class="mb-3 space-y-2">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Pick color
          </p>
          <div class="flex gap-2">
            <button
              class="flex-1 rounded-lg border py-2 text-xs font-medium transition-all"
              classList={{
                "border-red-400/60 bg-red-500/30 text-red-200":
                  colorTarget() === "red",
                "border-white/10 bg-white/5 text-white/60": colorTarget() !== "red",
              }}
              onClick={() => setColorTarget("red")}
            >
              Red
            </button>
            <button
              class="flex-1 rounded-lg border py-2 text-xs font-medium transition-all"
              classList={{
                "border-blue-400/60 bg-blue-500/30 text-blue-200":
                  colorTarget() === "blue",
                "border-white/10 bg-white/5 text-white/60":
                  colorTarget() !== "blue",
              }}
              onClick={() => setColorTarget("blue")}
            >
              Blue
            </button>
          </div>
        </div>
      </Show>

      {/* Player target */}
      <Show when={betType() === "player"}>
        <div class="mb-3 space-y-2">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Pick player
          </p>
          <select
            value={playerTarget()}
            onChange={(e) => setPlayerTarget(e.currentTarget.value)}
            class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-white/30 focus:outline-none"
          >
            <option value="">Select player...</option>
            <For each={activePlayers()}>
              {(p) => (
                <option value={playerId(p)}>
                  {p.name ?? playerId(p).slice(0, 8)}
                </option>
              )}
            </For>
          </select>
        </div>
      </Show>

      {/* Amount and multiplier */}
      <div class="mb-3 space-y-2">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Bet amount
        </p>
        <div class="flex gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount()}
            onInput={(e) => setAmount(e.currentTarget.value)}
            class="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          />
          <div
            class="flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-emerald-400/90 cursor-help"
            title={`Payout multiplier: a winning bet returns ${multiplier()}× your stake. E.g. $10 bet → $${(10 * multiplier()).toFixed(2)} back.`}
          >
            {multiplier()}x ℹ
          </div>
        </div>
      </div>

      {/* Place bet */}
      <button
        class="w-full rounded-lg bg-emerald-600/80 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500/90 disabled:opacity-50"
        disabled={!canPlace() || placing()}
        onClick={handlePlaceBet}
      >
        {placing() ? "Placing..." : "Place Bet"}
      </button>

      {/* Active bets list */}
      <div class="mt-4 border-t border-white/10 pt-3">
        <p class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Your Bets
        </p>
        <Show
          when={props.sideBets.length > 0}
          fallback={
            <p class="text-xs text-white/40">No active side bets</p>
          }
        >
          <div class="max-h-32 space-y-2 overflow-y-auto">
            <For each={props.sideBets}>
              {(bet: any) => (
                <div class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-[11px] font-medium text-white/90">
                      {bet.betType === "color"
                        ? `${bet.betTarget} wins`
                        : `Elim: ${bet.betTarget?.slice(0, 6) ?? "?"}`}
                    </p>
                    <p class="text-[10px] text-white/50">
                      ${Number(bet.amount ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <span
                    class={`shrink-0 text-[10px] font-medium ${statusColor(
                      bet.status ?? "pending"
                    )}`}
                  >
                    {bet.status ?? "pending"}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default SideBetPanel;
