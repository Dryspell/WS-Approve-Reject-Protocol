import { Component, createSignal, For, Show, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { useTheme } from "~/app";
import { resolvePlayerName } from "~/lib/game-utils";
import type { User, Transaction } from "~/module_bindings/types";

interface PlayerStats {
  user: User;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalProfit: number;
  averageProfit: number;
  rank: number;
}

export const Leaderboard: Component = () => {
  const { conn, connected } = useSpacetimeDB();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [players, setPlayers] = createSignal<PlayerStats[]>([]);
  const [transactions, setTransactions] = createSignal<Transaction[]>([]);
  const [timeframe, setTimeframe] = createSignal<'all-time' | 'season' | 'weekly'>('all-time');
  const [loading, setLoading] = createSignal(false);

  // Load once connected, and re-load when timeframe changes
  createEffect(() => {
    if (!connected() || !conn()) return;
    timeframe();
    loadLeaderboardData();
  });

  const getTimeframeCutoff = (tf: 'all-time' | 'season' | 'weekly'): number => {
    const now = Date.now();
    switch (tf) {
      case 'weekly':
        return now - 7 * 24 * 60 * 60 * 1000;
      case 'season':
        return now - 90 * 24 * 60 * 60 * 1000;
      case 'all-time':
      default:
        return 0;
    }
  };

  const loadLeaderboardData = () => {
    const connection = conn();
    if (!connection) return;

    setLoading(true);
    const allUsers = Array.from(connection.db.user.iter());
    const allTransactions = Array.from(connection.db.transaction.iter());
    setTransactions(allTransactions);

    const cutoff = getTimeframeCutoff(timeframe());

    const filteredTransactions = cutoff > 0
      ? allTransactions.filter((t) => {
          const ts = Number(t.timestamp.seconds ?? t.timestamp) * 1000;
          return ts >= cutoff;
        })
      : allTransactions;

    const playerStats = allUsers.map((user) => {
      const userId = user.identity.toHexString();

      // Games won = unique rooms where this user received a pot_distribution
      const wins = filteredTransactions.filter(
        (t) => t.transactionType === 'pot_distribution' && t.toPlayer === userId
      );

      // Games played = unique rooms where this user paid a buy-in
      const buyInRooms = new Set(
        filteredTransactions
          .filter((t) => t.transactionType === 'buy_in' && t.fromPlayer === userId)
          .map((t) => t.roomId)
      );
      const gamesPlayed = Math.max(buyInRooms.size, wins.length);

      const potWinnings = wins.reduce((sum, t) => sum + t.amount, 0);
      const buyIns = filteredTransactions.filter(
        (t) => (t.transactionType === 'rebuy' || t.transactionType === 'buy_in') && t.fromPlayer === userId
      );
      const totalSpent = buyIns.reduce((sum, t) => sum + t.amount, 0);

      const profit = timeframe() === 'all-time'
        ? user.totalProfitLoss
        : potWinnings - totalSpent;

      const gamesWon = wins.length;
      const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

      return {
        user,
        gamesPlayed,
        gamesWon,
        winRate,
        totalProfit: profit,
        averageProfit: gamesPlayed > 0 ? profit / gamesPlayed : 0,
        rank: 0,
      };
    });

    const sorted = playerStats
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }));

    setPlayers(sorted);
    setLoading(false);
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400 font-bold';
      case 2: return 'text-slate-300 font-bold';
      case 3: return 'text-orange-400 font-bold';
      default: return 'text-white/40';
    }
  };

  const cardBg = () => dark() ? "w-full border-white/10 bg-slate-900/80" : "w-full border-gray-200 bg-white";
  const muted = () => dark() ? "text-white/40" : "text-gray-400";
  const heading = () => dark() ? "text-white" : "text-gray-900";
  const rowBg = () => dark() ? "border bg-white/5 transition-colors hover:bg-white/10" : "border bg-gray-50 transition-colors hover:bg-gray-100";
  const rowBorder = (rank: number) => rank === 1 ? "border-yellow-400/60" : rank === 2 ? "border-slate-400/40" : rank === 3 ? "border-orange-400/40" : dark() ? "border-white/10" : "border-gray-200";
  const divider = () => dark() ? "border-white/10" : "border-gray-200";

  const emptyMessage = () => {
    switch (timeframe()) {
      case "weekly": return { icon: "📅", title: "No games this week", body: "Jump in and claim the top spot!" };
      case "season": return { icon: "🌱", title: "No games this season yet", body: "The season just started — be the first on the board!" };
      default: return { icon: "🏆", title: "No games recorded yet", body: "Be the first on the leaderboard!" };
    }
  };

  return (
    <Card class={cardBg()}>
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle class={`flex items-center gap-2 ${heading()}`}>
            🏆 Leaderboard
          </CardTitle>
          <Button size="sm" variant="outline" class={dark() ? "border-white/20 text-white/70 hover:bg-white/10" : "border-gray-300 text-gray-600 hover:bg-gray-50"} onClick={loadLeaderboardData}>
            🔄 Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Show when={!connected()} fallback={null}>
          <div class={`py-8 text-center text-sm ${muted()}`}>
            Not connected — waiting for SpacetimeDB…
          </div>
        </Show>

        <Show when={connected()}>
          <Tabs value={timeframe()} onChange={setTimeframe}>
            <TabsList class="grid w-full grid-cols-3" classList={{ "bg-white/5": dark(), "bg-gray-100": !dark() }}>
              <TabsTrigger value="all-time">All Time</TabsTrigger>
              <TabsTrigger value="season">This Season</TabsTrigger>
              <TabsTrigger value="weekly">This Week</TabsTrigger>
            </TabsList>

            <TabsContent value={timeframe()}>
              <ScrollArea class="h-[600px]">
                <Show when={loading()}>
                  <div class={`py-8 text-center text-sm ${muted()} animate-pulse`}>Loading…</div>
                </Show>
                <div class="space-y-2 pr-2">
                  <For each={players()} fallback={
                    <div class="flex flex-col items-center py-12 text-center">
                      <span class="mb-2 text-4xl">{emptyMessage().icon}</span>
                      <p class={`text-sm font-medium ${heading()}`}>{emptyMessage().title}</p>
                      <p class={`mt-1 text-xs ${muted()}`}>{emptyMessage().body}</p>
                      <Button
                        class="mt-4"
                        size="sm"
                        onClick={() => navigate("/vote")}
                      >
                        Play Now
                      </Button>
                    </div>
                  }>
                    {(player) => (
                      <Card class={`${rowBg()} ${rowBorder(player.rank)}`}>
                        <CardContent class="p-4">
                          <div class="flex items-center gap-4">
                            {/* Rank */}
                            <div class={`text-3xl ${getRankColor(player.rank)}`}>
                              {getRankEmoji(player.rank)}
                            </div>

                            {/* Player Info */}
                            <div class="flex-1">
                              <div class="flex items-center gap-2">
                                <span class={`font-semibold ${heading()}`}>
                                  {player.user.name || 'Anonymous'}
                                </span>
                                <Show when={player.user.online}>
                                  <Badge variant="default" class="text-xs">
                                    🟢 Online
                                  </Badge>
                                </Show>
                              </div>
                              <div class={`text-xs ${muted()}`}>
                                {resolvePlayerName(player.user.identity.toHexString(), conn())}
                              </div>
                            </div>

                            {/* Stats */}
                            <div class="text-right">
                              <div class="text-lg font-bold" classList={{
                                'text-emerald-400': player.totalProfit > 0,
                                'text-red-400': player.totalProfit < 0,
                                'text-gray-400': player.totalProfit === 0 && !dark(),
                                'text-white/40': player.totalProfit === 0 && dark(),
                              }}>
                                {player.totalProfit >= 0 ? '+' : ''}
                                ${player.totalProfit.toFixed(2)}
                              </div>
                              <div class={`text-xs ${muted()}`}>
                                {player.gamesWon}W / {Math.max(0, player.gamesPlayed - player.gamesWon)}L
                              </div>
                            </div>
                          </div>

                          {/* Expanded Stats */}
                          <div class={`mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs ${divider()}`}>
                            <div>
                              <div class={muted()}>Win Rate</div>
                              <div class={`font-semibold ${heading()}`}>
                                {player.winRate.toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <div class={muted()}>Games</div>
                              <div class={`font-semibold ${heading()}`}>
                                {player.gamesPlayed}
                              </div>
                            </div>
                            <div>
                              <div class={muted()}>Avg P/L</div>
                              <div class="font-semibold" classList={{
                                'text-emerald-400': player.averageProfit > 0,
                                'text-red-400': player.averageProfit < 0,
                                'text-gray-400': player.averageProfit === 0 && !dark(),
                                'text-white/40': player.averageProfit === 0 && dark(),
                              }}>
                                ${player.averageProfit.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </For>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Legend */}
          <div class="mt-4 rounded border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-300">
            <p class="font-semibold">📊 Stats Explained:</p>
            <ul class="ml-4 mt-1 list-disc space-y-1 text-blue-300/80">
              <li><strong>Total P/L:</strong> Lifetime profit/loss across all games</li>
              <li><strong>Win Rate:</strong> Percentage of games won (derived from transactions)</li>
              <li><strong>Avg P/L:</strong> Average profit/loss per game played</li>
              <li><strong>Rankings:</strong> Based on total profit/loss</li>
            </ul>
          </div>
        </Show>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
