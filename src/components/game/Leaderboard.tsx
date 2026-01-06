import { Component, createSignal, For, Show, onMount } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import type { User } from "~/module_bindings/user_type";
import type { Transaction } from "~/module_bindings/transaction_type";

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
  const [players, setPlayers] = createSignal<PlayerStats[]>([]);
  const [transactions, setTransactions] = createSignal<Transaction[]>([]);
  const [timeframe, setTimeframe] = createSignal<'all-time' | 'season' | 'weekly'>('all-time');

  onMount(() => {
    loadLeaderboardData();
  });

  const loadLeaderboardData = () => {
    const connection = conn();
    if (!connection) return;

    // Load all users
    const allUsers = Array.from(connection.db.user.iter());
    
    // Load all transactions for game analysis
    const allTransactions = Array.from(connection.db.transaction.iter());
    setTransactions(allTransactions);

    // Calculate stats for each player
    const playerStats = allUsers.map((user) => {
      const userId = user.identity.toHexString();
      
      // Find pot distribution transactions (wins)
      const wins = allTransactions.filter(
        (t) => t.transactionType === 'pot_distribution' && t.toPlayer === userId
      );

      // Estimate games played (very rough - would need better tracking)
      const gamesPlayed = Math.max(1, Math.floor(Math.abs(user.totalProfitLoss) / 10) + wins.length);
      const gamesWon = wins.length;
      const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

      return {
        user,
        gamesPlayed,
        gamesWon,
        winRate,
        totalProfit: user.totalProfitLoss,
        averageProfit: user.totalProfitLoss / gamesPlayed,
        rank: 0, // Will be calculated after sorting
      };
    });

    // Sort by total profit and assign ranks
    const sorted = playerStats
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }));

    setPlayers(sorted);
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
      case 1: return 'text-yellow-600 font-bold';
      case 2: return 'text-gray-400 font-bold';
      case 3: return 'text-orange-600 font-bold';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card class="w-full">
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle class="flex items-center gap-2">
            🏆 Leaderboard
          </CardTitle>
          <Button size="sm" variant="outline" onClick={loadLeaderboardData}>
            🔄 Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={timeframe()} onChange={setTimeframe}>
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="all-time">All Time</TabsTrigger>
            <TabsTrigger value="season">This Season</TabsTrigger>
            <TabsTrigger value="weekly">This Week</TabsTrigger>
          </TabsList>

          <TabsContent value={timeframe()}>
            <ScrollArea class="h-[600px]">
              <div class="space-y-2 pr-2">
                <For each={players()} fallback={
                  <div class="py-8 text-center text-sm text-gray-500">
                    No players yet. Start playing to appear on the leaderboard!
                  </div>
                }>
                  {(player) => (
                    <Card class={player.rank <= 3 ? 'border-2' : ''} classList={{
                      'border-yellow-400': player.rank === 1,
                      'border-gray-400': player.rank === 2,
                      'border-orange-400': player.rank === 3,
                    }}>
                      <CardContent class="p-4">
                        <div class="flex items-center gap-4">
                          {/* Rank */}
                          <div class={`text-3xl ${getRankColor(player.rank)}`}>
                            {getRankEmoji(player.rank)}
                          </div>

                          {/* Player Info */}
                          <div class="flex-1">
                            <div class="flex items-center gap-2">
                              <span class="font-semibold">
                                {player.user.name || 'Anonymous'}
                              </span>
                              {player.user.online && (
                                <Badge variant="default" class="text-xs">
                                  🟢 Online
                                </Badge>
                              )}
                            </div>
                            <div class="text-xs text-gray-500">
                              {player.user.identity.toHexString().slice(0, 12)}...
                            </div>
                          </div>

                          {/* Stats */}
                          <div class="text-right">
                            <div class="text-lg font-bold" classList={{
                              'text-green-600': player.totalProfit > 0,
                              'text-red-600': player.totalProfit < 0,
                              'text-gray-600': player.totalProfit === 0,
                            }}>
                              {player.totalProfit >= 0 ? '+' : ''}
                              ${player.totalProfit.toFixed(2)}
                            </div>
                            <div class="text-xs text-gray-500">
                              {player.gamesWon}W / {player.gamesPlayed - player.gamesWon}L
                            </div>
                          </div>
                        </div>

                        {/* Expanded Stats */}
                        <div class="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                          <div>
                            <div class="text-gray-500">Win Rate</div>
                            <div class="font-semibold">
                              {player.winRate.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div class="text-gray-500">Games</div>
                            <div class="font-semibold">
                              {player.gamesPlayed}
                            </div>
                          </div>
                          <div>
                            <div class="text-gray-500">Avg P/L</div>
                            <div class="font-semibold" classList={{
                              'text-green-600': player.averageProfit > 0,
                              'text-red-600': player.averageProfit < 0,
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
        <div class="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          <p class="font-semibold">📊 Stats Explained:</p>
          <ul class="ml-4 mt-1 list-disc space-y-1">
            <li><strong>Total P/L:</strong> Lifetime profit/loss across all games</li>
            <li><strong>Win Rate:</strong> Percentage of games won</li>
            <li><strong>Avg P/L:</strong> Average profit/loss per game</li>
            <li><strong>Rankings:</strong> Based on total profit/loss</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;

