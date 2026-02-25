import { Component, createSignal, For, Show, onMount } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { resolvePlayerName } from "~/lib/game-utils";
import type { User, Transaction } from "~/module_bindings/types";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
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
  const { conn, identity, connected } = useSpacetimeDB();
  const [user, setUser] = createSignal<User | null>(null);
  const [stats, setStats] = createSignal<PlayerStats>({
    totalGames: 0,
    gamesWon: 0,
    gamesLost: 0,
    winRate: 0,
    totalProfit: 0,
    bestWin: 0,
    worstLoss: 0,
    votesSold: 0,
    votesBought: 0,
    guaranteesSold: 0,
    guaranteesBought: 0,
    averageProfitPerGame: 0,
  });
  const [achievements, setAchievements] = createSignal<Achievement[]>([]);
  const [isEditingName, setIsEditingName] = createSignal(false);
  const [newName, setNewName] = createSignal('');

  onMount(() => {
    loadProfile();
    loadAchievements();
  });

  const loadProfile = () => {
    const connection = conn();
    if (!connection) return;

    // Get user - use provided userId or current identity
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
    const transactions = Array.from(connection.db.transaction.iter());

    // Calculate wins (pot distributions)
    const wins = transactions.filter(
      t => t.transactionType === 'pot_distribution' && t.toPlayer === userId
    );

    // Estimate games (rough calculation)
    const totalGames = Math.max(1, Math.floor(Math.abs(userData.totalProfitLoss) / 10) + wins.length);
    const gamesWon = wins.length;
    const gamesLost = totalGames - gamesWon;

    // Vote transactions
    const votesSold = transactions.filter(
      t => t.transactionType === 'vote_sale' && t.fromPlayer === userId
    ).length;
    
    const votesBought = transactions.filter(
      t => t.transactionType === 'vote_sale' && t.toPlayer === userId
    ).length;

    // Guarantee transactions
    const guaranteesSold = transactions.filter(
      t => t.transactionType === 'guarantee_purchase' && t.fromPlayer === userId
    ).length;
    
    const guaranteesBought = transactions.filter(
      t => t.transactionType === 'guarantee_purchase' && t.toPlayer === userId
    ).length;

    // Best/worst
    const winAmounts = wins.map(w => w.amount);
    const bestWin = winAmounts.length > 0 ? Math.max(...winAmounts) : 0;
    
    // Losses are represented as negative profit
    const losses = transactions.filter(
      t => t.fromPlayer === userId && t.amount > 0
    );
    const worstLoss = losses.length > 0 
      ? Math.min(...losses.map(l => -l.amount)) 
      : 0;

    setStats({
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
      averageProfitPerGame: userData.totalProfitLoss / totalGames,
    });
  };

  const loadAchievements = () => {
    // Sample achievements - in a real app, these would be calculated from actual data
    const allAchievements: Achievement[] = [
      {
        id: 'first-win',
        name: 'First Victory',
        description: 'Win your first game',
        icon: '🥇',
        unlocked: stats().gamesWon > 0,
      },
      {
        id: 'master-trader',
        name: 'Master Trader',
        description: 'Buy and sell 50 votes',
        icon: '📈',
        unlocked: (stats().votesBought + stats().votesSold) >= 50,
      },
      {
        id: 'guarantee-guru',
        name: 'Guarantee Guru',
        description: 'Sell 10 guarantees',
        icon: '🛡️',
        unlocked: stats().guaranteesSold >= 10,
      },
      {
        id: 'profit-maker',
        name: 'Profit Maker',
        description: 'Earn $100 total profit',
        icon: '💰',
        unlocked: stats().totalProfit >= 100,
      },
      {
        id: 'high-roller',
        name: 'High Roller',
        description: 'Win a pot worth $50 or more',
        icon: '🎰',
        unlocked: stats().bestWin >= 50,
      },
      {
        id: 'survivor',
        name: 'Survivor',
        description: 'Play 10 games',
        icon: '🏆',
        unlocked: stats().totalGames >= 10,
      },
    ];

    setAchievements(allAchievements);
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

  return (
    <div class="space-y-4">
      {/* Profile Header */}
      <Card>
        <CardContent class="p-6">
          <div class="flex items-start gap-4">
            {/* Avatar */}
            <div class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-3xl text-white">
              {user()?.name?.[0]?.toUpperCase() || '?'}
            </div>

            {/* Info */}
            <div class="flex-1">
              <Show when={!isEditingName()}>
                <div class="flex items-center gap-2">
                  <h2 class="text-2xl font-bold">
                    {user()?.name || 'Anonymous'}
                  </h2>
                  {props.isOwnProfile && (
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingName(true)}>
                      ✏️
                    </Button>
                  )}
                  {user()?.online && (
                    <Badge variant="default">🟢 Online</Badge>
                  )}
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

              <div class="mt-1 text-sm text-gray-500">
                ID: {user() ? resolvePlayerName(user()!.identity.toHexString(), conn()) : ""}
              </div>

              {/* Quick Stats */}
              <div class="mt-4 flex gap-6">
                <div>
                  <div class="text-2xl font-bold" classList={{
                    'text-green-600': stats().totalProfit > 0,
                    'text-red-600': stats().totalProfit < 0,
                    'text-gray-600': stats().totalProfit === 0,
                  }}>
                    {stats().totalProfit >= 0 ? '+' : ''}${stats().totalProfit.toFixed(2)}
                  </div>
                  <div class="text-xs text-gray-500">Total P/L</div>
                </div>
                <div>
                  <div class="text-2xl font-bold">{stats().winRate.toFixed(1)}%</div>
                  <div class="text-xs text-gray-500">Win Rate</div>
                </div>
                <div>
                  <div class="text-2xl font-bold">{stats().totalGames}</div>
                  <div class="text-xs text-gray-500">Games</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stats and Achievements */}
      <Tabs defaultValue="stats">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="stats">📊 Statistics</TabsTrigger>
          <TabsTrigger value="achievements">🏆 Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <Card>
            <CardContent class="p-6">
              <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div class="rounded border p-3">
                  <div class="text-sm text-gray-500">Games Won</div>
                  <div class="text-xl font-bold text-green-600">{stats().gamesWon}</div>
                </div>
                <div class="rounded border p-3">
                  <div class="text-sm text-gray-500">Games Lost</div>
                  <div class="text-xl font-bold text-red-600">{stats().gamesLost}</div>
                </div>
                <div class="rounded border p-3">
                  <div class="text-sm text-gray-500">Avg P/L per Game</div>
                  <div class="text-xl font-bold">${stats().averageProfitPerGame.toFixed(2)}</div>
                </div>
                <div class="rounded border p-3">
                  <div class="text-sm text-gray-500">Best Win</div>
                  <div class="text-xl font-bold text-green-600">${stats().bestWin.toFixed(2)}</div>
                </div>
                <div class="rounded border p-3">
                  <div class="text-sm text-gray-500">Worst Loss</div>
                  <div class="text-xl font-bold text-red-600">${stats().worstLoss.toFixed(2)}</div>
                </div>
                <div class="rounded border p-3">
                  <div class="text-sm text-gray-500">Votes Traded</div>
                  <div class="text-xl font-bold">{stats().votesBought + stats().votesSold}</div>
                </div>
                <div class="rounded border p-3">
                  <div class="text-sm text-gray-500">Votes Bought</div>
                  <div class="text-xl font-bold">{stats().votesBought}</div>
                </div>
                <div class="rounded border p-3">
                  <div class="text-sm text-gray-500">Votes Sold</div>
                  <div class="text-xl font-bold">{stats().votesSold}</div>
                </div>
                <div class="rounded border p-3">
                  <div class="text-sm text-gray-500">Guarantees</div>
                  <div class="text-xl font-bold">
                    {stats().guaranteesSold} / {stats().guaranteesBought}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card>
            <CardContent class="p-6">
              <ScrollArea class="h-[400px]">
                <div class="grid grid-cols-1 gap-3 pr-2 md:grid-cols-2">
                  <For each={achievements()}>
                    {(achievement) => (
                      <Card classList={{
                        'border-2 border-yellow-400 bg-yellow-50': achievement.unlocked,
                        'opacity-50': !achievement.unlocked,
                      }}>
                        <CardContent class="p-4">
                          <div class="flex items-start gap-3">
                            <div class="text-3xl">{achievement.icon}</div>
                            <div class="flex-1">
                              <div class="flex items-center gap-2">
                                <h4 class="font-semibold">{achievement.name}</h4>
                                {achievement.unlocked && (
                                  <Badge variant="default" class="text-xs">
                                    Unlocked
                                  </Badge>
                                )}
                              </div>
                              <p class="mt-1 text-xs text-gray-600">
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

