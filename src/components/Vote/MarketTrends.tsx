import { Component, createMemo, onMount, createEffect, on } from "solid-js";
import type { Transaction } from "~/module_bindings/types";

interface MarketTrendsProps {
  roomId: number;
  currentRound: number;
  transactions: Transaction[];
}

interface RoundStats {
  round: number;
  avgPrice: number;
  tradeCount: number;
  guaranteeCount: number;
  volume: number;
}

const MarketTrends: Component<MarketTrendsProps> = (props) => {
  let priceCanvas!: HTMLCanvasElement;
  let volumeCanvas!: HTMLCanvasElement;

  const roundStats = createMemo(() => {
    const statsMap = new Map<number, { prices: number[]; trades: number; guarantees: number; volume: number }>();

    for (let r = 1; r <= props.currentRound; r++) {
      statsMap.set(r, { prices: [], trades: 0, guarantees: 0, volume: 0 });
    }

    for (const t of props.transactions) {
      if (t.roomId !== props.roomId) continue;
      const round = t.roundNumber ?? 1;
      let entry = statsMap.get(round);
      if (!entry) {
        entry = { prices: [], trades: 0, guarantees: 0, volume: 0 };
        statsMap.set(round, entry);
      }

      if (t.transactionType === "vote_sale") {
        entry.prices.push(t.amount);
        entry.trades++;
        entry.volume += t.amount;
      } else if (t.transactionType === "guarantee_purchase") {
        entry.guarantees++;
        entry.volume += t.amount;
      }
    }

    const result: RoundStats[] = [];
    for (const [round, data] of statsMap) {
      const avgPrice = data.prices.length > 0 ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length : 0;
      result.push({ round, avgPrice, tradeCount: data.trades, guaranteeCount: data.guarantees, volume: data.volume });
    }
    return result.sort((a, b) => a.round - b.round);
  });

  const drawChart = (canvas: HTMLCanvasElement, type: "price" | "volume") => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 12, bottom: 24, left: 36 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const stats = roundStats();
    if (stats.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No data yet", w / 2, h / 2);
      return;
    }

    const values = stats.map((s) => (type === "price" ? s.avgPrice : s.volume));
    const counts = stats.map((s) => (type === "price" ? s.tradeCount : s.guaranteeCount));
    const maxVal = Math.max(...values, 1);
    const maxCount = Math.max(...counts, 1);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      const val = maxVal * (1 - i / 4);
      ctx.fillText(`$${val.toFixed(1)}`, padding.left - 4, y);
    }

    // X-axis labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const barWidth = Math.max(chartW / Math.max(stats.length, 1) - 2, 4);

    for (let i = 0; i < stats.length; i++) {
      const x = padding.left + (i / Math.max(stats.length - 1, 1)) * chartW;
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillText(`R${stats[i].round}`, x, h - padding.bottom + 4);
    }

    if (type === "volume") {
      // Bar chart for volume
      for (let i = 0; i < stats.length; i++) {
        const x = padding.left + (i / Math.max(stats.length - 1, 1)) * chartW - barWidth / 2;
        const barH = (values[i] / maxVal) * chartH;
        const y = padding.top + chartH - barH;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
        gradient.addColorStop(0, "rgba(168, 85, 247, 0.6)");
        gradient.addColorStop(1, "rgba(168, 85, 247, 0.15)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 2);
        ctx.fill();

        // Guarantee overlay
        if (counts[i] > 0) {
          const gBarH = (counts[i] / maxCount) * chartH * 0.3;
          ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
          ctx.beginPath();
          ctx.roundRect(x + barWidth + 1, padding.top + chartH - gBarH, barWidth * 0.5, gBarH, 2);
          ctx.fill();
        }
      }
    } else {
      // Line chart for price
      if (stats.length > 1) {
        ctx.strokeStyle = "rgba(234, 179, 8, 0.6)";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (let i = 0; i < stats.length; i++) {
          const x = padding.left + (i / Math.max(stats.length - 1, 1)) * chartW;
          const y = padding.top + chartH - (values[i] / maxVal) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Area fill
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, "rgba(234, 179, 8, 0.15)");
        gradient.addColorStop(1, "rgba(234, 179, 8, 0.01)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        for (let i = 0; i < stats.length; i++) {
          const x = padding.left + (i / Math.max(stats.length - 1, 1)) * chartW;
          const y = padding.top + chartH - (values[i] / maxVal) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(padding.left + chartW, padding.top + chartH);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.closePath();
        ctx.fill();
      }

      // Dots + trade count bars
      for (let i = 0; i < stats.length; i++) {
        const x = padding.left + (i / Math.max(stats.length - 1, 1)) * chartW;
        const y = padding.top + chartH - (values[i] / maxVal) * chartH;

        ctx.fillStyle = "rgba(234, 179, 8, 0.9)";
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Trade count bar below
        if (counts[i] > 0) {
          const countBarH = (counts[i] / maxCount) * 10;
          ctx.fillStyle = "rgba(234, 179, 8, 0.25)";
          ctx.fillRect(x - 2, padding.top + chartH - countBarH, 4, countBarH);
        }
      }
    }
  };

  onMount(() => {
    drawChart(priceCanvas, "price");
    drawChart(volumeCanvas, "volume");
  });

  createEffect(on(() => [roundStats()], () => {
    drawChart(priceCanvas, "price");
    drawChart(volumeCanvas, "volume");
  }));

  const totalVolume = createMemo(() => roundStats().reduce((sum, s) => sum + s.volume, 0));
  const totalTrades = createMemo(() => roundStats().reduce((sum, s) => sum + s.tradeCount, 0));
  const totalGuarantees = createMemo(() => roundStats().reduce((sum, s) => sum + s.guaranteeCount, 0));

  return (
    <div class="space-y-3 text-white/90">
      {/* Summary stats */}
      <div class="grid grid-cols-3 gap-1.5">
        <div class="rounded-lg border border-white/10 bg-white/5 p-2 text-center">
          <div class="text-sm font-bold text-amber-300">${totalVolume().toFixed(1)}</div>
          <div class="text-[9px] text-white/30">Volume</div>
        </div>
        <div class="rounded-lg border border-white/10 bg-white/5 p-2 text-center">
          <div class="text-sm font-bold text-white/80">{totalTrades()}</div>
          <div class="text-[9px] text-white/30">Trades</div>
        </div>
        <div class="rounded-lg border border-white/10 bg-white/5 p-2 text-center">
          <div class="text-sm font-bold text-purple-300">{totalGuarantees()}</div>
          <div class="text-[9px] text-white/30">Guarantees</div>
        </div>
      </div>

      {/* Price chart */}
      <div class="space-y-1">
        <p class="text-[10px] font-semibold text-white/50">Avg. Vote Price per Round</p>
        <div class="rounded-lg border border-white/10 bg-white/[0.02] p-1">
          <canvas
            ref={priceCanvas}
            class="h-28 w-full"
            style={{ "image-rendering": "auto" }}
          />
        </div>
      </div>

      {/* Volume chart */}
      <div class="space-y-1">
        <p class="text-[10px] font-semibold text-white/50">Trading Volume per Round</p>
        <div class="rounded-lg border border-white/10 bg-white/[0.02] p-1">
          <canvas
            ref={volumeCanvas}
            class="h-28 w-full"
            style={{ "image-rendering": "auto" }}
          />
        </div>
      </div>

      {/* Legend */}
      <div class="flex flex-wrap gap-3 text-[9px] text-white/30">
        <span class="flex items-center gap-1">
          <div class="h-0.5 w-3 bg-amber-500/60" /> Avg. Price
        </span>
        <span class="flex items-center gap-1">
          <div class="h-2 w-2 rounded-sm bg-purple-500/40" /> Volume
        </span>
        <span class="flex items-center gap-1">
          <div class="h-2 w-2 rounded-sm bg-blue-500/40" /> Guarantees
        </span>
      </div>
    </div>
  );
};

export default MarketTrends;
