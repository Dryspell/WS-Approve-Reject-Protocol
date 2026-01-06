import { Component, createSignal, Show, For } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { GameRoom } from "~/module_bindings/game_room_type";
import type { User } from "~/module_bindings/user_type";
import type { Vote } from "~/module_bindings/vote_type";

interface DebugPanelProps {
  room?: GameRoom;
  user?: User;
  votes?: Vote[];
  players?: User[];
}

export const DebugPanel: Component<DebugPanelProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<'state' | 'network' | 'logs'>('state');
  const [logs, setLogs] = createSignal<Array<{ time: string; level: string; message: string }>>([]);

  // Intercept console logs
  if (typeof window !== 'undefined') {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      setLogs(prev => [...prev, { 
        time: new Date().toLocaleTimeString(), 
        level: 'log', 
        message: args.join(' ') 
      }].slice(-100)); // Keep last 100 logs
    };

    console.error = (...args) => {
      originalError(...args);
      setLogs(prev => [...prev, { 
        time: new Date().toLocaleTimeString(), 
        level: 'error', 
        message: args.join(' ') 
      }].slice(-100));
    };

    console.warn = (...args) => {
      originalWarn(...args);
      setLogs(prev => [...prev, { 
        time: new Date().toLocaleTimeString(), 
        level: 'warn', 
        message: args.join(' ') 
      }].slice(-100));
    };
  }

  return (
    <>
      {/* Toggle Button */}
      <Button
        class="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full p-0 shadow-lg"
        onClick={() => setIsOpen(!isOpen())}
        title="Toggle Debug Panel"
      >
        🐛
      </Button>

      {/* Debug Panel */}
      <Show when={isOpen()}>
        <div class="fixed bottom-20 right-4 z-50 w-96 animate-slide-up">
          <Card>
            <CardHeader class="pb-3">
              <div class="flex items-center justify-between">
                <CardTitle class="text-lg">🐛 Debug Panel</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  class="h-6 w-6 p-0"
                >
                  ✕
                </Button>
              </div>
              
              {/* Tabs */}
              <div class="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant={activeTab() === 'state' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('state')}
                >
                  State
                </Button>
                <Button
                  size="sm"
                  variant={activeTab() === 'network' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('network')}
                >
                  Network
                </Button>
                <Button
                  size="sm"
                  variant={activeTab() === 'logs' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('logs')}
                >
                  Logs
                </Button>
              </div>
            </CardHeader>

            <CardContent class="pt-0">
              <ScrollArea class="h-96">
                {/* State Tab */}
                <Show when={activeTab() === 'state'}>
                  <div class="space-y-3 text-xs">
                    {/* Room Info */}
                    <Show when={props.room}>
                      <div>
                        <p class="font-semibold mb-1">Room:</p>
                        <div class="rounded bg-gray-100 p-2 font-mono">
                          <div>ID: {props.room!.id}</div>
                          <div>Name: {props.room!.name}</div>
                          <div>Status: <Badge variant="default">{props.room!.gameStatus}</Badge></div>
                          <div>Round: {props.room!.currentRound}</div>
                          <div>Pot: ${props.room!.potSize.toFixed(2)}</div>
                          <div>Players: {props.room!.memberIds.length}</div>
                          <div>Eliminated: {props.room!.eliminatedPlayers.length}</div>
                        </div>
                      </div>
                    </Show>

                    {/* User Info */}
                    <Show when={props.user}>
                      <div>
                        <p class="font-semibold mb-1">Current User:</p>
                        <div class="rounded bg-gray-100 p-2 font-mono">
                          <div>Name: {props.user!.name || 'Anonymous'}</div>
                          <div>Wallet: ${props.user!.walletBalance.toFixed(2)}</div>
                          <div>P/L: ${props.user!.totalProfitLoss.toFixed(2)}</div>
                          <div>Online: {props.user!.online ? '✅' : '❌'}</div>
                        </div>
                      </div>
                    </Show>

                    {/* Votes */}
                    <Show when={props.votes && props.votes.length > 0}>
                      <div>
                        <p class="font-semibold mb-1">Votes ({props.votes!.length}):</p>
                        <div class="space-y-1">
                          <For each={props.votes}>
                            {(vote) => (
                              <div class="rounded bg-gray-100 p-2 font-mono">
                                <div class="flex items-center justify-between">
                                  <span>#{vote.id}</span>
                                  <Badge variant={
                                    vote.color === 'red' ? 'destructive' : 
                                    vote.color === 'blue' ? 'default' : 
                                    'outline'
                                  }>
                                    {vote.color || 'unset'}
                                  </Badge>
                                </div>
                                <div class="text-xs text-gray-600">
                                  Owner: {vote.playerId.slice(0, 8)}...
                                </div>
                                {vote.isForSale && (
                                  <div class="text-xs text-green-600">
                                    For sale: ${vote.salePrice}
                                  </div>
                                )}
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    </Show>

                    {/* Players */}
                    <Show when={props.players && props.players.length > 0}>
                      <div>
                        <p class="font-semibold mb-1">Players ({props.players!.length}):</p>
                        <div class="space-y-1">
                          <For each={props.players}>
                            {(player) => (
                              <div class="rounded bg-gray-100 p-2 font-mono">
                                <div class="flex items-center justify-between">
                                  <span>{player.name || 'Anonymous'}</span>
                                  <Badge>${player.walletBalance.toFixed(0)}</Badge>
                                </div>
                                <div class="text-xs text-gray-600">
                                  {player.identity.toHexString().slice(0, 12)}...
                                </div>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    </Show>
                  </div>
                </Show>

                {/* Network Tab */}
                <Show when={activeTab() === 'network'}>
                  <div class="space-y-2 text-xs">
                    <div class="rounded bg-green-50 border border-green-200 p-2">
                      <div class="font-semibold text-green-900">SpacetimeDB</div>
                      <div class="text-green-700">Connected ✅</div>
                      <div class="text-green-600 text-xs mt-1">
                        Real-time sync active
                      </div>
                    </div>
                    
                    <div class="rounded bg-gray-100 p-2">
                      <div class="font-semibold">WebSocket</div>
                      <div class="text-xs text-gray-600">
                        Status: Open
                      </div>
                    </div>
                  </div>
                </Show>

                {/* Logs Tab */}
                <Show when={activeTab() === 'logs'}>
                  <div class="space-y-1 text-xs font-mono">
                    <div class="flex justify-between mb-2">
                      <span class="font-semibold">Console Logs</span>
                      <Button size="sm" variant="ghost" onClick={() => setLogs([])}>
                        Clear
                      </Button>
                    </div>
                    <For each={logs().slice().reverse()}>
                      {(log) => (
                        <div
                          class={`rounded p-1 ${
                            log.level === 'error' ? 'bg-red-100 text-red-900' :
                            log.level === 'warn' ? 'bg-yellow-100 text-yellow-900' :
                            'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <span class="text-gray-500">{log.time}</span> {log.message}
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </Show>
    </>
  );
};

export default DebugPanel;

