import { Component, createSignal, For, Show, createEffect } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { useTheme } from "~/app";
import type { User, Transaction } from "~/module_bindings/types";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface PlayerStats {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  totalProfit: number;
  bestWin: number;
  worstLoss: number;
  votesSold: number;
  votesBought: number;
  guaranteesSold: number;
  guaranteesBought: number;
  averageProfitPerGame: number;
}

interface PlayerProfileProps {
  userId?: string;
  isOwnProfile?: boolean;
}

export const PlayerProfile: Component<PlayerProfileProps> = (props) => {
  const { conn, identity, connected, subscribed } = useSpacetimeDB();
  const { dark } = useTheme();
  const [user, setUser] = createSignal<User | null>(null);
  const [stats, setStats] = createSignal<PlayerStats>({
    totalGames: 0, gamesWon: 0, gamesLost: 0, winRate: 0,
    totalProfit: 0, bestWin: 0, worstLoss: 0,
    votesSold: 0, votesBought: 0, guaranteesSold: 0, guaranteesBought: 0,
    averageProfitPerGame: 0,
  });
  const [achievements, setAchievements] = createSignal<Achievement[]>([]);
  const [isEditingName, setIsEditingName] = createSignal(false);
  const [newName, setNewName] = createSignal('');
  const [idCopied, setIdCopied] = createSignal(false);

  // Load after connection AND subscription (db cache populated)
  createEffect(() => {
    if (!connected() || !conn() || !subscribed()) return;
    loadProfile();
  });

  const loadProfile = () => {
    const connection = conn();
    if (!connection) return;

    const targetId = props.userId || identity()?.toHexString();
    if (!targetId) return;

    const userData = Array.from(connection.db.user.iter()).find(
      u => u.identity.toHexString() === targetId
    );

    if (userData) {
      setUser(userData);
      setNewName(userData.name || '');
      calculateStats(userData, connection);
    }
  };

  const calculateStats = (userData: User, connection: any) => {
    const userId = userData.identity.toHexString();
    const transactions: any[] = Array.from(connection.db.transaction.iter());

    const wins = transactions.filter(
      t => t.transactionType === 'pot_distribution' && t.toPlayer === userId
    );
    const gamesWon = wins.length;

    // Games played = unique rooms where this user paid a buy-in
    const buyInRooms = new Set(
      transactions
        .filter((t) => t.transactionType === 'buy_in' && t.fromPlayer === userId)
        .map((t) => t.roomId)
    );
    const totalGames = Math.max(buyInRooms.size, gamesWon);
    const gamesLost = Math.max(0, totalGames - gamesWon);

    const votesSold = transactions.filter(
      t => t.transactionType === 'vote_sale' && t.fromPlayer === userId
    ).length;
    const votesBought = transactions.filter(
      t => t.transactionType === 'vote_sale' && t.toPlayer === userId
    ).length;
    const guaranteesSold = transactions.filter(
      t => t.transactionType === 'guarantee_purchase' && t.fromPlayer === userId
    ).length;
    const guaranteesBought = transactions.filter(
      t => t.transactionType === 'guarantee_purchase' && t.toPlayer === userId
    ).length;

    const winAmounts = wins.map((w: any) => w.amount);
    const bestWin = winAmounts.length > 0 ? Math.max(...winAmounts) : 0;

    const losses = transactions.filter(
      (t: any) => t.transactionType === 'buy_in' && t.fromPlayer === userId
    );
    const worstLoss = losses.length > 0 ? Math.max(...losses.map((l: any) => l.amount)) : 0;

    const currentStats: PlayerStats = {
      totalGames,
      gamesWon,
      gamesLost,
      winRate: totalGames > 0 ? (gamesWon / totalGames) * 100 : 0,
      totalProfit: userData.totalProfitLoss,
      bestWin,
      worstLoss,
      votesSold,
      votesBought,
      guaranteesSold,
      guaranteesBought,
      averageProfitPerGame: totalGames > 0 ? userData.totalProfitLoss / totalGames : 0,
    };
    setStats(currentStats);

    setAchievements([
      {
        id: 'first-win', name: 'First Victory', description: 'Win your first game', icon: '🥇',
        unlocked: gamesWon > 0,
      },
      {
        id: 'master-trader', name: 'Master Trader', description: 'Buy and sell 50 votes', icon: '📈',
        unlocked: (votesBought + votesSold) >= 50,
      },
      {
        id: 'guarantee-guru', name: 'Guarantee Guru', description: 'Sell 10 guarantees', icon: '🛡️',
        unlocked: guaranteesSold >= 10,
      },
      {
        id: 'profit-maker', name: 'Profit Maker', description: 'Earn $100 total profit', icon: '💰',
        unlocked: userData.totalProfitLoss >= 100,
      },
      {
        id: 'high-roller', name: 'High Roller', description: 'Win a pot worth $50+', icon: '🎰',
        unlocked: bestWin >= 50,
      },
      {
        id: 'survivor', name: 'Survivor', description: 'Play 10 games', icon: '🏆',
        unlocked: totalGames >= 10,
      },
    ]);
  };

  const saveName = async () => {
    const connection = conn();
    if (!connection || !newName().trim()) return;
    try {
      await connection.reducers.setName({ name: newName().trim() });
      setIsEditingName(false);
      loadProfile();
    } catch (error) {
      console.error('Failed to update name:', error);
    }
  };

  const copyId = () => {
    const id = user()?.identity.toHexString();
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 1500);
    });
  };

  const truncatedId = () => {
    const id = user()?.identity.toHexString();
    if (!id) return "—";
    return id.slice(0, 8) + "…" + id.slice(-4);
  };

  const cardClass = () => dark() ? "border-white/10 bg-slate-900/80" : "border-gray-200 bg-white";
  const textMuted = () => dark() ? "text-white/40" : "text-gray-400";
  const textSecondary = () => dark() ? "text-white/60" : "text-gray-500";
  const statCard = () => dark() ? "rounded border border-white/10 bg-white/5 p-3" : "rounded border border-gray-200 bg-gray-50 p-3";

  return (
    <div class="space-y-4">
      {/* Profile Header */}
      <Card class={cardClass()}>
        <CardContent class="p-6">
          <div class="flex items-start gap-4">
            {/* Avatar — deterministic color from identity hash */}
            {(() => {
              const idHex = user()?.identity.toHexString() ?? identity()?.toHexString() ?? "";
              const hue = idHex ? parseInt(idHex.slice(0, 6), 16) % 360 : 240;
              const initial = (user()?.name ?? "")[0]?.toUpperCase() ?? "?";
              return (
                <div
                  class="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white shadow-lg"
                  style={{ background: `hsl(${hue},65%,45%)` }}
                >
                  {initial}
                </div>
              );
            })()}

            {/* Info */}
            <div class="flex-1">
              <Show when={!subscribed()}>
                <p class="text-sm text-white/40">Connecting…</p>
              </Show>
              <Show when={subscribed() && !isEditingName()}>
                <div class="flex items-center gap-2">
                  <h2 class="text-2xl font-bold text-white">
                    {user()?.name || 'Anonymous'}
                  </h2>
                  <Show when={props.isOwnProfile}>
                    <Button size="sm" variant="ghost" class="text-white/50 hover:text-white" onClick={() => setIsEditingName(true)}>
                      ✏️
                    </Button>
                  </Show>
                  <Show when={user()?.online}>
                    <Badge variant="default">🟢 Online</Badge>
                  </Show>
                </div>
              </Show>

              <Show when={isEditingName()}>
                <div class="flex gap-2">
                  <TextField class="flex-1">
                    <TextFieldInput
                      value={newName()}
                      onInput={(e) => setNewName(e.currentTarget.value)}
                      placeholder="Enter your name"
                    />
                  </TextField>
                  <Button size="sm" onClick={saveName}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingName(false)}>
                    Cancel
                  </Button>
                </div>
              </Show>

              {/* Identity hex with copy button */}
              <div class="mt-1 flex items-center gap-1.5">
                <span class={`text-xs ${textMuted()}`}>ID:</span>
                <code class={`text-xs font-mono ${textSecondary()}`}>{truncatedId()}</code>
                <button
                  class="rounded px-1.5 py-0.5 text-[10px] transition-colors"
                  classList={{
                    "text-white/30 hover:bg-white/10 hover:text-white/60": dark(),
                    "text-gray-400 hover:bg-gray-100 hover:text-gray-600": !dark(),
                  }}
                  onClick={copyId}
                  title="Copy full identity"
                >
                  {idCopied() ? "✓ Copied" : "copy"}
                </button>
              </div>

              {/* Quick Stats */}
              <div class="mt-4 flex gap-6 flex-wrap">
                <div>
                  <div class="text-2xl font-bold text-amber-400">
                    ${(user()?.walletBalance ?? 0).toFixed(2)}
                  </div>
                  <div class={`text-xs ${textMuted()}`}>Wallet</div>
                </div>
                <div>
                  <div class="text-2xl font-bold" classList={{
                    'text-emerald-400': stats().totalProfit > 0,
                    'text-red-400': stats().totalProfit < 0,
                    'text-gray-400': stats().totalProfit === 0 && !dark(),
                    'text-white/40': stats().totalProfit === 0 && dark(),
                  }}>
                    {stats().totalProfit >= 0 ? '+' : ''}${stats().totalProfit.toFixed(2)}
                  </div>
                  <div class={`text-xs ${textMuted()}`}>Total P/L</div>
                </div>
                <div>
                  <div class={`text-2xl font-bold ${dark() ? "text-white" : "text-gray-900"}`}>{stats().winRate.toFixed(1)}%</div>
                  <div class={`text-xs ${textMuted()}`}>Win Rate</div>
                </div>
                <div>
                  <div class={`text-2xl font-bold ${dark() ? "text-white" : "text-gray-900"}`}>{stats().totalGames}</div>
                  <div class={`text-xs ${textMuted()}`}>Games</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stats and Achievements */}
      <Tabs defaultValue="stats">
        <TabsList class="grid w-full grid-cols-2" classList={{ "bg-white/5": dark(), "bg-gray-100": !dark() }}>
          <TabsTrigger value="stats">📊 Statistics</TabsTrigger>
          <TabsTrigger value="achievements">🏆 Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <Card class={cardClass()}>
            <CardContent class="p-6">
              <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
                {[
                  { label: "Games Won", value: stats().gamesWon, color: "text-emerald-400" },
                  { label: "Games Lost", value: stats().gamesLost, color: "text-red-400" },
                  { label: "Avg P/L", value: `$${stats().averageProfitPerGame.toFixed(2)}`, color: stats().averageProfitPerGame >= 0 ? "text-emerald-400" : "text-red-400" },
                  { label: "Best Win", value: `$${stats().bestWin.toFixed(2)}`, color: "text-emerald-400" },
                  { label: "Largest Buy-in", value: `$${stats().worstLoss.toFixed(2)}`, color: dark() ? "text-white" : "text-gray-900" },
                  { label: "Votes Traded", value: stats().votesBought + stats().votesSold, color: dark() ? "text-white" : "text-gray-900" },
                  { label: "Votes Bought", value: stats().votesBought, color: dark() ? "text-white" : "text-gray-900" },
                  { label: "Votes Sold", value: stats().votesSold, color: dark() ? "text-white" : "text-gray-900" },
                  { label: "Guarantees Sold", value: stats().guaranteesSold, color: dark() ? "text-white" : "text-gray-900" },
                  { label: "Guarantees Bought", value: stats().guaranteesBought, color: dark() ? "text-white" : "text-gray-900" },
                ].map(item => (
                  <div class={statCard()}>
                    <div class={`text-xs ${textMuted()}`}>{item.label}</div>
                    <div class={`text-xl font-bold ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
              <p class={`mt-3 text-xs ${textMuted()}`}>Stats are derived from transaction history.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card class={cardClass()}>
            <CardContent class="p-6">
              <ScrollArea class="h-[400px]">
                <Show when={achievements().length === 0}>
                  <div class="flex flex-col items-center justify-center py-12 text-center text-white/40">
                    <span class="mb-2 text-4xl">🏆</span>
                    <p class="text-sm">No achievements yet.</p>
                    <p class="mt-1 text-xs">Play games to start earning them!</p>
                  </div>
                </Show>
                <div class="grid grid-cols-1 gap-3 pr-2 md:grid-cols-2">
                  <For each={achievements()}>
                    {(achievement) => (
                      <Card class="border transition-all" classList={{
                        'border-yellow-400/60 bg-yellow-400/5': achievement.unlocked,
                        'border-white/10 bg-white/5 opacity-40': !achievement.unlocked,
                      }}>
                        <CardContent class="p-4">
                          <div class="flex items-start gap-3">
                            <div class="text-3xl" classList={{ "grayscale": !achievement.unlocked }}>
                              {achievement.icon}
                            </div>
                            <div class="flex-1">
                              <div class="flex items-center gap-2">
                                <h4 class="font-semibold text-white">{achievement.name}</h4>
                                <Show when={achievement.unlocked}>
                                  <Badge variant="default" class="text-xs">Unlocked</Badge>
                                </Show>
                                <Show when={!achievement.unlocked}>
                                  <Badge variant="outline" class="text-xs text-white/30 border-white/10">Locked</Badge>
                                </Show>
                              </div>
                              <p class="mt-1 text-xs text-white/50">
                                {achievement.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </For>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlayerProfile;
