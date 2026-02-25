import { Component, createSignal, For, Show, onMount, onCleanup, createEffect, untrack } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { User, GameRoom, Vote, Transaction } from "~/module_bindings/types";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import RoundTimer from "./RoundTimer";
import VoteMarketPanel from "./VoteMarketPanel";
import EliminationModal from "./EliminationModal";
import ChatPanel from "../game/ChatPanel";
import ReplayViewer from "../game/ReplayViewer";
import { SoundToggle } from "~/components/ui/sound-toggle";
import { ErrorBoundary } from "~/components/ui/error-boundary";
import { DebugPanel } from "~/components/dev/DebugPanel";
import { AdminPanel } from "~/components/dev/AdminPanel";
import { ToastHelper } from "~/lib/toast-helpers";
import { sounds } from "~/lib/sounds";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

interface VotingInterfaceProps {
  room: GameRoom;
  currentUser: User;
}

const VotingInterface: Component<VotingInterfaceProps> = (props) => {
  const { conn, connected } = useSpacetimeDB();
  const [votes, setVotes] = createSignal<Vote[]>([]);
  const [allPlayers, setAllPlayers] = createSignal<User[]>([]);
  const [transactions, setTransactions] = createSignal<Transaction[]>([]);
  const [draggedVote, setDraggedVote] = createSignal<Vote | null>(null);
  const [roundProcessing, setRoundProcessing] = createSignal(false);
  const [showEliminationModal, setShowEliminationModal] = createSignal(false);
  const [lastProcessedRound, setLastProcessedRound] = createSignal(0);

  // Auto-process rounds when timer expires
  createEffect(() => {
    if (!props.room.startTime || props.room.gameStatus !== "active") return;

    const checkRoundEnd = setInterval(() => {
      untrack(() => {
        const now = Date.now();
        const roundStart = Number(props.room.startTime);
        const elapsed = Math.floor((now - roundStart) / 1000);
        const timeLeft = props.room.roundDuration - elapsed;

        // Trigger round processing when time is up (with 1 second buffer)
        if (timeLeft <= 0 && !roundProcessing()) {
          setRoundProcessing(true);
          processRound();
        }
      });
    }, 1000); // Check every second

    onCleanup(() => clearInterval(checkRoundEnd));
  });

  const processRound = async () => {
    const connection = conn();
    if (!connection) return;

    try {
      console.log("⏰ Round time expired - processing votes...");
      await connection.reducers.processRoundVotes({ roomId: props.room.id, roundNumber: props.room.currentRound });
      ToastHelper.info("Round Processing", "Tallying votes and determining results...");
    } catch (error) {
      console.error("Failed to process round:", error);
      ToastHelper.error("Failed to process round");
      setRoundProcessing(false);
    }
  };

  onMount(() => {
    const connection = conn();
    if (!connection || !connected()) return;

    // Subscribe to votes
    connection.db.vote.onInsert((ctx, vote) => {
      setVotes((prev) => [...prev, vote]);
    });

    connection.db.vote.onUpdate((ctx, oldVote, newVote) => {
      setVotes((prev) =>
        prev.map((v) => (v.id === newVote.id ? newVote : v))
      );
    });

    connection.db.vote.onDelete((ctx, vote) => {
      setVotes((prev) => prev.filter((v) => v.id !== vote.id));
    });

    // Subscribe to users
    connection.db.user.onInsert((ctx, user) => {
      setAllPlayers((prev) => [...prev, user]);
    });

    connection.db.user.onUpdate((ctx, oldUser, newUser) => {
      setAllPlayers((prev) =>
        prev.map((u) => (u.identity.isEqual(newUser.identity) ? newUser : u))
      );
    });

    // Subscribe to GameRoom updates to detect round changes
    connection.db.game_room.onUpdate((ctx, oldRoom, newRoom) => {
      // Check if a new round just started (round number increased)
      if (newRoom.id === props.room.id && newRoom.currentRound > lastProcessedRound()) {
        // Show elimination modal for the previous round
        if (lastProcessedRound() > 0) {
          setShowEliminationModal(true);
        }
        setLastProcessedRound(newRoom.currentRound);
        setRoundProcessing(false);
      }
    });

    // Subscribe to transactions for market history
    connection.db.transaction.onInsert((ctx, transaction) => {
      setTransactions((prev) => [...prev, transaction]);
    });

    // Initial load of all data
    const initialVotes = Array.from(connection.db.vote.iter());
    setVotes(initialVotes);

    const initialPlayers = Array.from(connection.db.user.iter());
    setAllPlayers(initialPlayers);

    const initialTransactions = Array.from(connection.db.transaction.iter());
    setTransactions(initialTransactions);

    // Set initial round tracking
    setLastProcessedRound(props.room.currentRound);
  });

  // Get player's votes
  const myVotes = () => {
    return votes().filter(
      (v) =>
        v.roomId === props.room.id &&
        v.playerId === props.currentUser.identity.toHexString()
    );
  };

  // Get votes by color
  const redVotes = () => myVotes().filter((v) => v.color === "red");
  const blueVotes = () => myVotes().filter((v) => v.color === "blue");
  const unsetVotes = () => myVotes().filter((v) => !v.color);

  // Get remaining players (not eliminated)
  const remainingPlayers = () => {
    return allPlayers().filter(
      (player) =>
        props.room.memberIds.includes(player.identity.toHexString()) &&
        !props.room.eliminatedPlayers.includes(player.identity.toHexString())
    );
  };

  const eliminatedPlayers = () => {
    return allPlayers().filter((player) =>
      props.room.eliminatedPlayers.includes(player.identity.toHexString())
    );
  };

  // Calculate vote totals for elimination modal
  const getVoteTotals = () => {
    const currentRoundVotes = votes().filter(
      (v) => v.roomId === props.room.id && v.roundNumber === props.room.currentRound
    );
    
    const red = currentRoundVotes.filter((v) => v.color === "red").length;
    const blue = currentRoundVotes.filter((v) => v.color === "blue").length;
    const minority = red < blue ? "red" : blue < red ? "blue" : "red"; // In case of tie, doesn't matter

    return { red, blue, minority: minority as "red" | "blue" };
  };

  // Handle vote color setting
  const handleSetVoteColor = async (voteId: number, color: string) => {
    const connection = conn();
    if (!connection) return;

    try {
      connection.reducers.setVoteColor({ voteId, color });
      ToastHelper.voteColorChanged(voteId, color);
      sounds.voteSet(color as 'red' | 'blue');
    } catch (error) {
      ToastHelper.error("Failed to set vote color");
      sounds.error();
    }
  };

  const handleLeaveRoom = async () => {
    const connection = conn();
    if (!connection) return;
    try {
      await connection.reducers.leaveRoom({ roomId: props.room.id });
      ToastHelper.success("Left Room", "You have left the room");
    } catch (error: any) {
      ToastHelper.error(error?.message || "Failed to leave room");
    }
  };

  // Drag and drop handlers
  const handleDragStart = (vote: Vote) => {
    setDraggedVote(vote);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (color: string) => {
    const vote = draggedVote();
    if (vote) {
      handleSetVoteColor(vote.id, color);
      setDraggedVote(null);
    }
  };

  const [chatOpen, setChatOpen] = createSignal(false);

  return (
    <ErrorBoundary>
      <div class="flex h-screen flex-col bg-gradient-to-b from-slate-50 to-slate-100">
        {/* Dev Tools (collapsed to corner) */}
        <div class="absolute right-2 top-2 z-40 flex gap-1">
          <AdminPanel />
        </div>
        <DebugPanel
          room={props.room}
          user={props.currentUser}
          votes={votes()}
          players={allPlayers()}
        />

        {/* ===== GAME HEADER BAR ===== */}
        <div class="flex items-center gap-3 border-b bg-white px-4 py-2 shadow-sm" data-testid="game-header">
          {/* Room Name + Round */}
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-slate-700">{props.room.name}</span>
            <Badge variant="secondary" class="text-xs">
              Round {props.room.currentRound}
            </Badge>
          </div>

          <div class="mx-2 h-6 w-px bg-slate-200" />

          {/* Compact Timer */}
          <div class="flex items-center gap-2" data-testid="round-timer">
            <RoundTimer
              roundNumber={props.room.currentRound}
              roundStartTime={props.room.startTime ? BigInt(props.room.startTime) : undefined}
              roundDuration={props.room.roundDuration}
            />
          </div>

          <div class="flex-1" />

          {/* Pot */}
          <div class="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 border border-amber-200">
            <span class="text-sm text-amber-700">Pot</span>
            <span id="pot-amount" class="text-lg font-bold text-amber-900">
              ${props.room.potSize.toFixed(2)}
            </span>
          </div>

          {/* Wallet */}
          <div class="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 border border-emerald-200" data-testid="wallet-display">
            <span class="text-sm text-emerald-700">Wallet</span>
            <span class="text-lg font-bold text-emerald-900" data-testid="wallet-balance">
              ${props.currentUser.walletBalance.toFixed(2)}
            </span>
            <span class="text-xs text-slate-400" data-testid="profit-loss">
              ({props.currentUser.totalProfitLoss >= 0 ? "+" : ""}
              ${props.currentUser.totalProfitLoss.toFixed(2)})
            </span>
          </div>

          <SoundToggle />

          <Button
            size="sm"
            variant="ghost"
            class="text-red-500 hover:bg-red-50 hover:text-red-700"
            onClick={handleLeaveRoom}
            title="Leave Room"
          >
            Leave
          </Button>
        </div>

        {/* ===== MAIN GAME AREA ===== */}
        <div class="flex flex-1 gap-3 overflow-hidden p-3">
          {/* LEFT SIDEBAR: Players */}
          <div class="flex w-56 flex-shrink-0 flex-col gap-2 overflow-auto">
            <div class="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
              Players ({remainingPlayers().length})
            </div>
            <For each={remainingPlayers()}>
              {(player) => {
                const playerVotes = () => votes().filter(
                  (v) => v.playerId === player.identity.toHexString()
                );
                const isCurrentUser = player.identity.isEqual(
                  props.currentUser.identity
                );
                const playerIndex = () => remainingPlayers().indexOf(player);
                const borderColors = ["border-l-blue-500", "border-l-emerald-500", "border-l-violet-500", "border-l-amber-500", "border-l-rose-500", "border-l-cyan-500", "border-l-orange-500", "border-l-pink-500"];

                return (
                  <div
                    class="flex items-center gap-2 rounded-md border border-l-4 bg-white p-2 shadow-sm transition-all hover:shadow"
                    classList={{
                      "ring-2 ring-blue-400 ring-offset-1": isCurrentUser,
                      [borderColors[playerIndex() % borderColors.length]]: true,
                    }}
                  >
                    <div class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {(player.name || "A")[0].toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="truncate text-sm font-medium">
                        {player.name || "Anonymous"}
                        {isCurrentUser && <span class="text-xs text-blue-500 ml-1">(you)</span>}
                      </div>
                      <div class="flex gap-1.5 text-xs text-slate-400">
                        <span>{playerVotes().length}v</span>
                        <span>${player.walletBalance.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>

            <Show when={eliminatedPlayers().length > 0}>
              <div class="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
                Eliminated ({eliminatedPlayers().length})
              </div>
              <For each={eliminatedPlayers()}>
                {(player) => (
                  <div class="flex items-center gap-2 rounded-md border border-red-100 bg-red-50/50 p-2 opacity-60">
                    <span class="text-sm">☠️</span>
                    <span class="text-xs line-through text-slate-500">
                      {player.name || "Anonymous"}
                    </span>
                  </div>
                )}
              </For>
            </Show>
          </div>

          {/* CENTER: Vote Assignment */}
          <div class="flex flex-1 flex-col gap-3 overflow-auto">
            <Card class="flex-1">
              <CardHeader class="pb-2">
                <CardTitle class="flex items-center justify-between text-base">
                  <span>Your Votes ({myVotes().length})</span>
                  <div class="flex gap-1.5 text-xs">
                    <Badge variant="destructive" class="px-2">
                      {redVotes().length} Red
                    </Badge>
                    <Badge class="bg-blue-600 px-2">
                      {blueVotes().length} Blue
                    </Badge>
                    <Show when={unsetVotes().length > 0}>
                      <Badge variant="secondary" class="px-2">
                        {unsetVotes().length} Unset
                      </Badge>
                    </Show>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                {/* Compact Vote Grid */}
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  <For each={myVotes()}>
                    {(vote) => {
                      const color = () => vote.color;
                      const bgClass = () => {
                        if (color() === "red") return "bg-red-100 border-red-400 text-red-800";
                        if (color() === "blue") return "bg-blue-100 border-blue-400 text-blue-800";
                        return "bg-slate-50 border-dashed border-slate-300 text-slate-500";
                      };
                      return (
                        <div
                          class={`relative flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all hover:shadow-md ${bgClass()}`}
                          draggable
                          onDragStart={() => handleDragStart(vote)}
                        >
                          <div class="text-xs font-bold">#{vote.id}</div>
                          <Show
                            when={color()}
                            fallback={
                              <div class="flex gap-1">
                                <button
                                  class="rounded bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-600"
                                  onClick={() => handleSetVoteColor(vote.id, "red")}
                                  data-testid={`set-red-${vote.id}`}
                                >
                                  Red
                                </button>
                                <button
                                  class="rounded bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-600"
                                  onClick={() => handleSetVoteColor(vote.id, "blue")}
                                  data-testid={`set-blue-${vote.id}`}
                                >
                                  Blue
                                </button>
                              </div>
                            }
                          >
                            <button
                              class="text-[10px] underline opacity-60 hover:opacity-100"
                              onClick={() => handleSetVoteColor(vote.id, "")}
                            >
                              Unset
                            </button>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>

                {/* Drop Zones (compact) */}
                <div class="grid grid-cols-2 gap-2">
                  <div
                    data-testid="vote-red"
                    data-color="red"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop("red")}
                    class="flex flex-col items-center gap-1 rounded-lg border-2 border-dashed border-red-300 bg-red-50/50 p-3 text-center transition-colors"
                    classList={{ "border-red-500 bg-red-100": draggedVote() !== null }}
                  >
                    <span class="text-sm font-semibold text-red-700">
                      Red ({redVotes().length})
                    </span>
                    <span class="text-xs text-red-400">Drop here</span>
                  </div>
                  <div
                    data-testid="vote-blue"
                    data-color="blue"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop("blue")}
                    class="flex flex-col items-center gap-1 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 p-3 text-center transition-colors"
                    classList={{ "border-blue-500 bg-blue-100": draggedVote() !== null }}
                  >
                    <span class="text-sm font-semibold text-blue-700">
                      Blue ({blueVotes().length})
                    </span>
                    <span class="text-xs text-blue-400">Drop here</span>
                  </div>
                </div>

                <Show when={myVotes().length >= 2}>
                  <div class="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
                    Split your {myVotes().length} votes across colors to guarantee minority survival.
                  </div>
                </Show>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDEBAR: Market */}
          <div class="w-72 flex-shrink-0 overflow-auto xl:w-80">
            <VoteMarketPanel
              votes={votes()}
              transactions={transactions()}
              roomId={props.room.id}
              roundNumber={props.room.currentRound}
              currentUserId={props.currentUser.identity.toHexString()}
              userWalletBalance={props.currentUser.walletBalance}
            />
          </div>
        </div>

        {/* ===== BOTTOM CHAT DRAWER ===== */}
        <div class="border-t bg-white shadow-lg" classList={{ "h-10": !chatOpen(), "h-80": chatOpen() }}>
          <button
            class="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            onClick={() => setChatOpen(!chatOpen())}
          >
            <div class="flex items-center gap-2">
              <span>Chat</span>
            </div>
            <span class="text-xs">{chatOpen() ? "▼ Collapse" : "▲ Expand"}</span>
          </button>
          <Show when={chatOpen()}>
            <div class="h-[calc(100%-2.5rem)]">
              <Tabs defaultValue="chat">
                <div class="border-b px-4">
                  <TabsList class="grid w-full max-w-xs grid-cols-2">
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="replay">Replay</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="chat" class="h-[calc(100%-3rem)] p-0">
                  <ChatPanel roomId={props.room.id} roundNumber={props.room.currentRound} />
                </TabsContent>
                <TabsContent value="replay" class="h-[calc(100%-3rem)] overflow-auto p-4">
                  <ReplayViewer
                    roomId={props.room.id}
                    transactions={transactions()}
                    gameEvents={[]}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </Show>
        </div>

        {/* Elimination Modal */}
        <Show when={showEliminationModal()}>
          <EliminationModal
            roundNumber={props.room.currentRound - 1}
            eliminatedPlayers={eliminatedPlayers().map(p => p.identity.toHexString())}
            survivingPlayers={remainingPlayers().map(p => p.identity.toHexString())}
            minorityColor={getVoteTotals().minority}
            redVotes={getVoteTotals().red}
            blueVotes={getVoteTotals().blue}
            room={props.room}
            currentUser={props.currentUser}
            onClose={() => setShowEliminationModal(false)}
          />
        </Show>

        {/* Game Over Modal */}
        <Show when={props.room.gameStatus === "completed"}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <Card class="w-96 shadow-2xl">
              <CardHeader>
                <CardTitle class="text-center text-2xl">Game Over!</CardTitle>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="text-center">
                  <p class="text-lg font-semibold">Winners:</p>
                  <For each={remainingPlayers()}>
                    {(player) => (
                      <p class="text-xl font-bold">
                        {player.name || "Anonymous"} - $
                        {(props.room.potSize / remainingPlayers().length).toFixed(2)}
                      </p>
                    )}
                  </For>
                </div>
                <Button class="w-full" onClick={() => window.location.reload()}>
                  Return to Lobby
                </Button>
              </CardContent>
            </Card>
          </div>
        </Show>
      </div>
    </ErrorBoundary>
  );
};

export default VotingInterface;

