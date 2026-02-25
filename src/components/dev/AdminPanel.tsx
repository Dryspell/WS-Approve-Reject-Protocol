import { Component, createSignal, For, Show } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { resolvePlayerName } from "~/lib/game-utils";
import type { GameRoom, User } from "~/module_bindings/types";
import { showToast } from "~/components/ui/toast";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";

export const AdminPanel: Component = () => {
  const { conn, connected, identity } = useSpacetimeDB();
  const [isOpen, setIsOpen] = createSignal(false);
  const [rooms, setRooms] = createSignal<GameRoom[]>([]);
  const [users, setUsers] = createSignal<User[]>([]);
  
  // Admin actions
  const [walletAmount, setWalletAmount] = createSignal(100);
  const [selectedUserId, setSelectedUserId] = createSignal('');

  // Load data
  const loadData = () => {
    const connection = conn();
    if (!connection) return;

    const allRooms = Array.from(connection.db.game_room.iter());
    setRooms(allRooms);

    const allUsers = Array.from(connection.db.user.iter());
    setUsers(allUsers);
  };

  // Force end round
  const forceEndRound = (roomId: number, roundNumber: number) => {
    const connection = conn();
    if (!connection) return;

    try {
      connection.reducers.processRoundVotes({ roomId, roundNumber });
      showToast({
        title: "Round Forced",
        description: `Processing votes for room ${roomId}`,
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end round",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  // Add money to wallet (admin cheat)
  const addMoney = () => {
    // This would require an admin reducer on the backend
    showToast({
      title: "Admin Action",
      description: `Would add $${walletAmount()} to wallet (requires admin reducer)`,
      duration: DEFAULT_TOAST_DURATION,
    });
  };

  // Reset game
  const resetGame = (roomId: number) => {
    showToast({
      title: "Admin Action",
      description: `Would reset room ${roomId} (requires admin reducer)`,
      variant: "warning",
      duration: DEFAULT_TOAST_DURATION,
    });
  };

  return (
    <>
      {/* Toggle Button - Only show if admin */}
      <Show when={typeof window !== 'undefined' && window.location.hostname === 'localhost'}>
        <Button
          class="fixed top-4 right-4 z-50 shadow-lg"
          variant="outline"
          size="sm"
          onClick={() => {
            setIsOpen(!isOpen());
            if (!isOpen()) loadData();
          }}
          title="Admin Panel"
        >
          ⚙️ Admin
        </Button>
      </Show>

      {/* Admin Panel */}
      <Show when={isOpen()}>
        <div class="fixed inset-y-0 right-0 z-50 w-[500px] animate-slide-in-right bg-white shadow-2xl">
          <Card class="h-full">
            <CardHeader>
              <div class="flex items-center justify-between">
                <CardTitle>⚙️ Admin Panel</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  ✕
                </Button>
              </div>
              <div class="text-xs text-red-600">
                ⚠️ Admin mode - localhost only
              </div>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="rooms">
                <TabsList class="grid w-full grid-cols-3">
                  <TabsTrigger value="rooms">Rooms</TabsTrigger>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>

                {/* Rooms Tab */}
                <TabsContent value="rooms">
                  <div class="space-y-2">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-sm font-semibold">
                        All Rooms ({rooms().length})
                      </span>
                      <Button size="sm" onClick={loadData}>
                        🔄 Refresh
                      </Button>
                    </div>
                    
                    <ScrollArea class="h-[600px]">
                      <div class="space-y-2 pr-2">
                        <For each={rooms()} fallback={<p class="text-sm text-gray-500">No rooms</p>}>
                          {(room) => (
                            <Card>
                              <CardContent class="p-3 space-y-2">
                                <div class="flex items-center justify-between">
                                  <div>
                                    <div class="font-semibold">{room.name}</div>
                                    <div class="text-xs text-gray-500">ID: {room.id}</div>
                                  </div>
                                  <Badge variant={
                                    room.gameStatus === 'active' ? 'default' :
                                    room.gameStatus === 'completed' ? 'secondary' :
                                    'outline'
                                  }>
                                    {room.gameStatus}
                                  </Badge>
                                </div>

                                <div class="grid grid-cols-2 gap-2 text-xs">
                                  <div>Round: {room.currentRound}</div>
                                  <div>Players: {room.memberIds.length}</div>
                                  <div>Pot: ${room.potSize.toFixed(2)}</div>
                                  <div>Buy-in: ${room.buyinAmount.toFixed(2)}</div>
                                </div>

                                <Show when={room.gameStatus === 'active'}>
                                  <div class="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      class="flex-1 text-xs"
                                      onClick={() => forceEndRound(room.id, room.currentRound)}
                                    >
                                      Force End Round
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      class="flex-1 text-xs"
                                      onClick={() => resetGame(room.id)}
                                    >
                                      Reset Game
                                    </Button>
                                  </div>
                                </Show>
                              </CardContent>
                            </Card>
                          )}
                        </For>
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users">
                  <div class="space-y-2">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-sm font-semibold">
                        All Users ({users().length})
                      </span>
                      <Button size="sm" onClick={loadData}>
                        🔄 Refresh
                      </Button>
                    </div>

                    <ScrollArea class="h-[600px]">
                      <div class="space-y-2 pr-2">
                        <For each={users()} fallback={<p class="text-sm text-gray-500">No users</p>}>
                          {(user) => (
                            <Card>
                              <CardContent class="p-3 space-y-2">
                                <div class="flex items-center justify-between">
                                  <div>
                                    <div class="font-semibold">
                                      {user.name || 'Anonymous'}
                                    </div>
                                    <div class="text-xs text-gray-500 font-mono">
                                      {resolvePlayerName(user.identity.toHexString(), conn())}
                                    </div>
                                  </div>
                                  <Badge variant={user.online ? 'default' : 'secondary'}>
                                    {user.online ? '🟢 Online' : '⚫ Offline'}
                                  </Badge>
                                </div>

                                <div class="grid grid-cols-2 gap-2 text-xs">
                                  <div>Wallet: ${user.walletBalance.toFixed(2)}</div>
                                  <div>Bank: ${user.bankAccount.toFixed(2)}</div>
                                  <div
                                    class={user.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}
                                  >
                                    P/L: ${user.totalProfitLoss.toFixed(2)}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </For>
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                {/* Actions Tab */}
                <TabsContent value="actions">
                  <div class="space-y-4">
                    <div class="rounded border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
                      ⚠️ <strong>Warning:</strong> These actions require admin reducers on the backend
                    </div>

                    {/* Add Money */}
                    <Card>
                      <CardHeader>
                        <CardTitle class="text-sm">💰 Add Money</CardTitle>
                      </CardHeader>
                      <CardContent class="space-y-3">
                        <TextField>
                          <TextFieldLabel class="text-xs">Amount ($)</TextFieldLabel>
                          <TextFieldInput
                            type="number"
                            value={walletAmount()}
                            onInput={(e) => setWalletAmount(parseFloat(e.currentTarget.value))}
                          />
                        </TextField>
                        <TextField>
                          <TextFieldLabel class="text-xs">User ID (optional)</TextFieldLabel>
                          <TextFieldInput
                            type="text"
                            placeholder="Leave empty for self"
                            value={selectedUserId()}
                            onInput={(e) => setSelectedUserId(e.currentTarget.value)}
                          />
                        </TextField>
                        <Button onClick={addMoney} class="w-full" size="sm">
                          Add ${walletAmount().toFixed(2)}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle class="text-sm">⚡ Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent class="space-y-2">
                        <Button variant="outline" class="w-full" size="sm">
                          Clear All Transactions
                        </Button>
                        <Button variant="outline" class="w-full" size="sm">
                          Reset All Wallets
                        </Button>
                        <Button variant="destructive" class="w-full" size="sm">
                          End All Games
                        </Button>
                      </CardContent>
                    </Card>

                    {/* System Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle class="text-sm">📊 System Info</CardTitle>
                      </CardHeader>
                      <CardContent class="space-y-1 text-xs">
                        <div class="flex justify-between">
                          <span>Connection:</span>
                          <Badge variant={connected() ? 'default' : 'destructive'}>
                            {connected() ? 'Connected' : 'Disconnected'}
                          </Badge>
                        </div>
                        <div class="flex justify-between">
                          <span>Identity:</span>
                          <span class="font-mono text-xs">
                            {identity() ? resolvePlayerName(identity()!.toHexString(), conn()) : ""}
                          </span>
                        </div>
                        <div class="flex justify-between">
                          <span>Total Rooms:</span>
                          <span>{rooms().length}</span>
                        </div>
                        <div class="flex justify-between">
                          <span>Total Users:</span>
                          <span>{users().length}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </Show>
    </>
  );
};

export default AdminPanel;

