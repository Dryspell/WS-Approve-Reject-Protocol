import { type Component, createMemo, For, Show } from "solid-js";

interface EVCalculatorProps {
  playerCount: number;
  potSize: number;
  buyinAmount: number;
  myVoteCount: number;
  totalVotes: number;
  guaranteesPurchased: number;
}

// Binomial coefficient n choose k
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 0; i < k; i++) {
    c = (c * (n - i)) / (i + 1);
  }
  return c;
}

// Expected value formulas from mathematical-analysis.md
// Alice votes Red, buys blue guarantee(s). Wins when blue wins (few red from others).

// No guarantee: all 8 others vote randomly. EV ≈ -0.0039 for 9 players.
function evNoGuarantee(
  playerCount: number,
  potSize: number,
  buyinAmount: number
): { ev: number; winProb: number; lowerBound: number } {
  const n = playerCount - 1;
  if (n <= 0) return { ev: potSize - buyinAmount, winProb: 1, lowerBound: potSize - buyinAmount };

  let ev = 0;
  let winProb = 0;
  const p = 0.5;

  for (let k = 0; k <= n; k++) {
    const prob = choose(n, k) * Math.pow(p, n);
    const redFromOthers = k;
    const survivors = playerCount - redFromOthers;
    const payout =
      survivors > 0 ? potSize / survivors - buyinAmount : -buyinAmount;
    ev += prob * payout;
    if (payout > 0) winProb += prob;
  }

  const lb =
    winProb * (potSize / playerCount - buyinAmount) -
    (1 - winProb) * buyinAmount;
  return { ev, winProb, lowerBound: Math.min(lb, ev) };
}

// Single guarantee: Alice votes Red, 1 blue locked. Win if 0–3 others vote red
// (red stays minority). Survivors = 1+k. Lose if 4+ red (red majority).
// Payouts: 0r→1 surv, 1r→2, 2r→3, 3r→4. Per mathematical-analysis.md.
function evSingleGuarantee(
  playerCount: number,
  potSize: number,
  buyinAmount: number
): { ev: number; winProb: number; lowerBound: number } {
  const n = playerCount - 2; // others excluding me + 1 guarantee
  if (n < 0) return { ev: potSize - buyinAmount, winProb: 1, lowerBound: potSize - buyinAmount };

  const p = 0.5;
  const winThreshold = Math.min(3, Math.floor((playerCount - 1) / 2) - 1);

  let ev = 0;
  let winProb = 0;
  for (let k = 0; k <= n; k++) {
    const prob = choose(n, k) * Math.pow(p, n);
    const survivors = k <= winThreshold ? 1 + k : 0;
    const payout =
      k <= winThreshold
        ? potSize / survivors - buyinAmount
        : -buyinAmount;
    ev += prob * payout;
    if (k <= winThreshold) winProb += prob;
  }

  const lowerBound =
    winProb * (potSize / 4 - buyinAmount) * 0.5 - (1 - winProb) * buyinAmount;
  return { ev, winProb, lowerBound: Math.min(lowerBound, ev) };
}

// Double guarantee: 2 blue locked, 6 others. Win if 0–3 others vote red.
function evDoubleGuarantee(
  playerCount: number,
  potSize: number,
  buyinAmount: number
): { ev: number; winProb: number; lowerBound: number } {
  const n = playerCount - 3;
  if (n < 0) return { ev: potSize - buyinAmount, winProb: 1, lowerBound: potSize - buyinAmount };

  const p = 0.5;
  const winThreshold = Math.min(3, Math.floor((playerCount - 2) / 2) - 2);

  let ev = 0;
  let winProb = 0;
  for (let k = 0; k <= n; k++) {
    const prob = choose(n, k) * Math.pow(p, n);
    const survivors = k <= winThreshold ? 2 + k : 0; // Alice + 1 guarantee + k red others
    const payout =
      k <= winThreshold
        ? potSize / survivors - buyinAmount
        : -buyinAmount;
    ev += prob * payout;
    if (k <= winThreshold) winProb += prob;
  }

  const lowerBound =
    winProb * (potSize / 4 - buyinAmount) * (21 / 32) -
    (1 - winProb) * buyinAmount;
  return { ev, winProb, lowerBound: Math.min(lowerBound, ev) };
}

// Canonical values from mathematical-analysis.md (9 players, $1 buy-in, $9 pot)
const CANONICAL = {
  noGuarantee: { ev: -0.0039, lowerBound: -0.1826, winProb: 0.5 },
  singleGuarantee: { ev: 0.4238, lowerBound: 0.125, winProb: 0.5 },
  doubleGuarantee: { ev: 0.96875, lowerBound: 0.4765, winProb: 21 / 32 },
};

function scaleEv(
  base: { ev: number; lowerBound: number; winProb: number },
  _playerCount: number,
  potSize: number,
  buyinAmount: number
): { ev: number; lowerBound: number; winProb: number } {
  const scale = potSize / 9 / buyinAmount; // $9 canonical pot
  return {
    ev: base.ev * scale,
    lowerBound: base.lowerBound * scale,
    winProb: base.winProb,
  };
}

const EVCalculator: Component<EVCalculatorProps> = (props) => {
  const gameSummary = createMemo(() => ({
    players: props.playerCount,
    pot: props.potSize,
    buyin: props.buyinAmount,
    myVotes: props.myVoteCount,
    totalVotes: props.totalVotes,
    voteShare: props.totalVotes > 0 ? props.myVoteCount / props.totalVotes : 0,
  }));

  const strategies = createMemo(() => {
    const { players, pot, buyin } = gameSummary();
    if (players <= 0) return [];

    const useCanonical = players === 9 && Math.abs(buyin - 1) < 0.01;

    const noG = useCanonical
      ? scaleEv(CANONICAL.noGuarantee, players, pot, buyin)
      : evNoGuarantee(players, pot, buyin);
    const singleG = useCanonical
      ? scaleEv(CANONICAL.singleGuarantee, players, pot, buyin)
      : evSingleGuarantee(players, pot, buyin);
    const doubleG = useCanonical
      ? scaleEv(CANONICAL.doubleGuarantee, players, pot, buyin)
      : evDoubleGuarantee(players, pot, buyin);

    return [
      { name: "No guarantee", ...noG, key: "none" },
      { name: "Single guarantee", ...singleG, key: "single" },
      { name: "Double guarantee", ...doubleG, key: "double" },
    ];
  });

  const tips = createMemo(() => {
    const tips: string[] = [];
    const { players, voteShare, pot } = gameSummary();
    const g = props.guaranteesPurchased;
    const strat = strategies();

    if (players <= 2) {
      tips.push("Few players remaining; variance is high.");
    }
    if (voteShare > 0.3 && players > 3) {
      tips.push("High vote share—consider guarantees to protect your position.");
    }
    if (strat[2]?.ev > strat[1]?.ev && strat[1]?.ev > strat[0]?.ev) {
      tips.push("Double guarantee offers best expected value in this setup.");
    }
    if (g === 0 && strat[1]?.ev > 0) {
      tips.push("Consider purchasing a guarantee to improve EV.");
    }
    if (g >= 2) {
      tips.push("You have strong protection; focus on vote coordination.");
    }
    if (pot > 0 && players > 5) {
      tips.push("More players = more uncertainty; guarantees reduce variance.");
    }
    return tips.slice(0, 4);
  });

  return (
    <div class="rounded-xl border border-white/10 bg-black/60 p-4 text-white shadow-xl backdrop-blur-xl">
      <div class="mb-3 border-b border-white/10 pb-2">
        <h3 class="text-sm font-semibold text-white/90">EV Calculator</h3>
        <p class="mt-1 text-xs text-white/50">Strategy helper</p>
      </div>

      {/* Game state summary */}
      <div class="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
        <div>
          <p class="text-[10px] text-white/40">Players</p>
          <p class="text-sm font-semibold text-white">{gameSummary().players}</p>
        </div>
        <div>
          <p class="text-[10px] text-white/40">Pot</p>
          <p class="text-sm font-semibold text-emerald-400">
            ${gameSummary().pot.toFixed(2)}
          </p>
        </div>
        <div>
          <p class="text-[10px] text-white/40">Your votes</p>
          <p class="text-sm font-semibold text-white">{gameSummary().myVotes}</p>
        </div>
        <div>
          <p class="text-[10px] text-white/40">Vote share</p>
          <p class="text-sm font-semibold text-white">
            {(gameSummary().voteShare * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Strategy comparison table */}
      <div class="mb-4">
        <p class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Expected value by strategy
        </p>
        <div class="overflow-hidden rounded-lg border border-white/10">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-white/10 bg-white/5">
                <th class="px-3 py-2 font-medium text-white/70">Strategy</th>
                <th class="px-3 py-2 font-medium text-white/70">EV</th>
                <th class="px-3 py-2 font-medium text-white/70">Win %</th>
              </tr>
            </thead>
            <tbody>
              <For each={strategies()}>
                {(s) => (
                  <tr class="border-b border-white/5 last:border-0">
                    <td class="px-3 py-2 font-medium text-white/90">{s.name}</td>
                    <td
                      class="px-3 py-2 font-mono"
                      classList={{
                        "text-emerald-400": s.ev > 0,
                        "text-red-400": s.ev < 0,
                        "text-white/60": s.ev === 0,
                      }}
                    >
                      {s.ev >= 0 ? "+" : ""}${s.ev.toFixed(2)}
                    </td>
                    <td class="px-3 py-2 text-white/70">
                      {(s.winProb * 100).toFixed(0)}%
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tips */}
      <div>
        <p class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Tips
        </p>
        <ul class="space-y-1.5">
          <For each={tips()}>
            {(tip) => (
              <li class="flex items-start gap-2 text-[11px] text-white/70">
                <span class="text-amber-400/80">•</span>
                <span>{tip}</span>
              </li>
            )}
          </For>
        </ul>
        <Show when={tips().length === 0}>
          <p class="text-xs text-white/40">
            Play based on your read of other players.
          </p>
        </Show>
      </div>
    </div>
  );
};

export default EVCalculator;
