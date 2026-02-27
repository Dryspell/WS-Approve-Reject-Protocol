import { Component, createSignal, For, Show, createEffect } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import type { GameRoom, GameEvent, Transaction } from "~/module_bindings/types";
import ReplayViewer from "./ReplayViewer";

interface RoomSummary {
  room: GameRoom;
  events: GameEvent[];
  transactions: Transaction[];
}

export const MatchHistory: Component = () => {
  const { conn, connected, subscribed } = useSpacetimeDB();
  const [pastRooms, setPastRooms] = createSignal<RoomSummary[]>([]);
  const [selectedRoomId, setSelectedRoomId] = createSignal<number | null>(null);

  createEffect(() => {
    if (!connected() || !conn() || !subscribed()) return;

    const connection = conn()!;
    const allRooms = Array.from(connection.db.game_room.iter()) as GameRoom[];
    const allEvents = Array.from(connection.db.game_event.iter()) as GameEvent[];
    const allTransactions = Array.from(connection.db.transaction.iter()) as Transaction[];

    const finished = allRooms
      .filter((r) => r.gameStatus === "finished")
      .sort((a, b) => {
        // Sort by pot size as a proxy for recency (larger pots = more activity = likely more recent)
        return b.potSize - a.potSize;
      })
      .map((room) => ({
        room,
        events: allEvents.filter((e) => e.roomId === room.id.toString()),
        transactions: allTransactions.filter((t) => t.roomId === room.id),
      }));

    setPastRooms(finished);
  });

  const selected = () => pastRooms().find((s) => s.room.id === selectedRoomId());

  const formatPot = (amount: number) => `$${amount.toFixed(2)}`;

  const winnerName = (summary: RoomSummary): string => {
    const winTx = summary.transactions.find((t) => t.transactionType === "pot_distribution");
    if (!winTx) return "Unknown";
    const connection = conn();
    if (!connection) return winTx.toPlayer.slice(0, 8);
    const winner = Array.from(connection.db.user.iter()).find(
      (u: any) => u.identity.toHexString() === winTx.toPlayer
    ) as any;
    return winner?.name || winTx.toPlayer.slice(0, 8);
  };

  return (
    <div class="space-y-4">
      <Show when={!connected()}>
        <Card class="border-white/10 bg-slate-900/80">
          <CardContent class="py-12 text-center text-sm text-white/40">
            Not connected — waiting for SpacetimeDB…
          </CardContent>
        </Card>
      </Show>

      <Show when={connected() && pastRooms().length === 0}>
        <Card class="border-white/10 bg-slate-900/80">
          <CardContent class="py-12 text-center">
            <p class="text-4xl mb-3">🎮</p>
            <p class="text-sm font-medium text-white/60">No completed games yet</p>
            <p class="text-xs text-white/30 mt-1">Finished games will appear here after they end</p>
          </CardContent>
        </Card>
      </Show>

      <Show when={pastRooms().length > 0 && !selectedRoomId()}>
        <Card class="border-white/10 bg-slate-900/80">
          <CardHeader>
            <CardTitle class="text-white">Past Games</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea class="h-[600px]">
              <div class="space-y-2 pr-2">
                <For each={pastRooms()}>
                  {(summary) => (
                    <Card
                      class="border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => setSelectedRoomId(summary.room.id)}
                    >
                      <CardContent class="p-4">
                        <div class="flex items-center justify-between">
                          <div>
                            <p class="font-semibold text-white">{summary.room.name}</p>
                            <p class="text-xs text-white/40 mt-0.5">
                              {summary.room.memberIds?.length ?? 0} players ·{" "}
                              {summary.room.currentRound} rounds ·{" "}
                              {summary.events.length} events
                            </p>
                          </div>
                          <div class="text-right">
                            <div class="text-lg font-bold text-amber-400">
                              {formatPot(summary.room.potSize)}
                            </div>
                            <div class="text-xs text-white/40">
                              Won by {winnerName(summary)}
                            </div>
                          </div>
                        </div>
                        <div class="mt-2 flex gap-2">
                          <Badge class="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Finished
                          </Badge>
                          <Badge variant="outline" class="text-[10px] border-white/20 text-white/40">
                            ${summary.room.buyinAmount.toFixed(2)} buy-in
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </For>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </Show>

      <Show when={selected()}>
        {(summary) => (
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                class="border-white/20 text-white/70 hover:bg-white/10"
                onClick={() => setSelectedRoomId(null)}
              >
                ← Back to list
              </Button>
              <h2 class="text-lg font-bold text-white">{summary().room.name}</h2>
              <Badge class="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                Finished
              </Badge>
            </div>
            <ReplayViewer
              roomId={summary().room.id}
              transactions={summary().transactions}
              gameEvents={summary().events}
            />
          </div>
        )}
      </Show>
    </div>
  );
};

export default MatchHistory;
