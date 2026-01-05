import { Component, createSignal, For, Show, onMount } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { User } from "~/module_bindings/user_type";
import type { GameRoom } from "~/module_bindings/game_room_type";
import type { Vote } from "~/module_bindings/vote_type";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import RoundTimer from "./RoundTimer";
import VoteMarketPanel from "./VoteMarketPanel";
import { ToastHelper } from "~/lib/toast-helpers";

interface VotingInterfaceProps {
  room: GameRoom;
  currentUser: User;
}

const VotingInterface: Component<VotingInterfaceProps> = (props) => {
  const { conn, connected } = useSpacetimeDB();
  const [votes, setVotes] = createSignal<Vote[]>([]);
  const [allPlayers, setAllPlayers] = createSignal<User[]>([]);
  const [draggedVote, setDraggedVote] = createSignal<Vote | null>(null);

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

  // Handle vote color setting
  const handleSetVoteColor = async (voteId: number, color: string) => {
    const connection = conn();
    if (!connection) return;

    try {
      connection.reducers.setVoteColor(voteId, color);
      ToastHelper.voteColorChanged(voteId, color);
    } catch (error) {
      ToastHelper.error("Failed to set vote color");
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

  return (
    <div class="flex h-screen flex-col gap-4 p-4">
      {/* Top Bar: Pot, Timer, Wallet */}
      <div class="flex items-center justify-between">
        {/* Pot Display */}
        <Card class="flex-1">
          <CardContent class="flex items-center gap-4 p-4">
            <div class="text-4xl">💰</div>
            <div>
              <div class="text-sm text-gray-500">Pot</div>
              <div class="text-2xl font-bold">${props.room.potSize.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>

        {/* Round Timer */}
        <div class="flex-1 px-4">
          <RoundTimer
            roundNumber={props.room.currentRound}
            roundStartTime={props.room.startTime ? BigInt(props.room.startTime) : undefined}
            roundDuration={props.room.roundDuration}
          />
        </div>

        {/* Wallet Display */}
        <Card class="flex-1">
          <CardContent class="flex items-center gap-4 p-4">
            <div class="text-4xl">💵</div>
            <div>
              <div class="text-sm text-gray-500">Your Wallet</div>
              <div class="text-2xl font-bold">
                ${props.currentUser.walletBalance.toFixed(2)}
              </div>
              <div class="text-xs text-gray-500">
                {props.currentUser.totalProfitLoss >= 0 ? "+" : ""}
                ${props.currentUser.totalProfitLoss.toFixed(2)} lifetime
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Game Area */}
      <div class="grid flex-1 grid-cols-3 gap-4">
        {/* Left: Player List */}
        <Card>
          <CardHeader>
            <CardTitle>Players ({remainingPlayers().length})</CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            {/* Active Players */}
            <For each={remainingPlayers()}>
              {(player) => {
                const playerVotes = votes().filter(
                  (v) => v.playerId === player.identity.toHexString()
                );
                const isCurrentUser = player.identity.isEqual(
                  props.currentUser.identity
                );

                return (
                  <div
                    class="rounded border p-2"
                    classList={{
                      "border-blue-500 bg-blue-50": isCurrentUser,
                    }}
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div class="text-lg">
                          {isCurrentUser ? "👤" : "🧑"}
                        </div>
                        <div>
                          <div class="font-medium">
                            {player.name || "Anonymous"}
                            {isCurrentUser && " (You)"}
                          </div>
                          <div class="text-xs text-gray-500">
                            {playerVotes.length} vote{playerVotes.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <Badge variant="default">${player.walletBalance.toFixed(0)}</Badge>
                    </div>
                  </div>
                );
              }}
            </For>

            {/* Eliminated Players */}
            <Show when={eliminatedPlayers().length > 0}>
              <div class="border-t pt-2">
                <p class="mb-2 text-sm font-semibold text-gray-500">
                  Eliminated ({eliminatedPlayers().length})
                </p>
                <For each={eliminatedPlayers()}>
                  {(player) => (
                    <div class="rounded border border-red-200 bg-red-50 p-2 opacity-60">
                      <div class="flex items-center gap-2">
                        <div class="text-lg">☠️</div>
                        <div class="text-sm line-through">
                          {player.name || "Anonymous"}
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </CardContent>
        </Card>

        {/* Center: Your Votes */}
        <Card>
          <CardHeader>
            <CardTitle>Your Votes ({myVotes().length})</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            {/* Unset Votes */}
            <Show when={unsetVotes().length > 0}>
              <div>
                <p class="mb-2 text-sm font-semibold text-gray-700">
                  Unset Votes ({unsetVotes().length})
                </p>
                <div class="space-y-2">
                  <For each={unsetVotes()}>
                    {(vote) => (
                      <div
                        draggable
                        onDragStart={() => handleDragStart(vote)}
                        class="cursor-move rounded border-2 border-dashed border-gray-300 bg-gray-50 p-3 text-center transition-all hover:border-gray-400 hover:bg-gray-100"
                      >
                        <div class="text-sm font-medium">Vote #{vote.id}</div>
                        <div class="text-xs text-gray-500">
                          Drag to Red or Blue
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Red Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={() => handleDrop("red")}
              class="min-h-32 rounded-lg border-2 border-red-300 bg-red-50 p-4"
            >
              <div class="mb-2 flex items-center justify-between">
                <span class="font-semibold text-red-700">
                  🔴 Red Votes ({redVotes().length})
                </span>
              </div>
              <div class="space-y-2">
                <For
                  each={redVotes()}
                  fallback={
                    <p class="text-center text-sm text-gray-500">
                      Drop votes here
                    </p>
                  }
                >
                  {(vote) => (
                    <div class="rounded border-2 border-red-400 bg-white p-2 text-center">
                      <div class="text-sm font-medium">Vote #{vote.id}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSetVoteColor(vote.id, "")}
                        class="mt-1 text-xs"
                      >
                        Unset
                      </Button>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Blue Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={() => handleDrop("blue")}
              class="min-h-32 rounded-lg border-2 border-blue-300 bg-blue-50 p-4"
            >
              <div class="mb-2 flex items-center justify-between">
                <span class="font-semibold text-blue-700">
                  🔵 Blue Votes ({blueVotes().length})
                </span>
              </div>
              <div class="space-y-2">
                <For
                  each={blueVotes()}
                  fallback={
                    <p class="text-center text-sm text-gray-500">
                      Drop votes here
                    </p>
                  }
                >
                  {(vote) => (
                    <div class="rounded border-2 border-blue-400 bg-white p-2 text-center">
                      <div class="text-sm font-medium">Vote #{vote.id}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSetVoteColor(vote.id, "")}
                        class="mt-1 text-xs"
                      >
                        Unset
                      </Button>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Vote Strategy Tip */}
            <Show when={myVotes().length >= 2}>
              <div class="rounded border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                💡 <strong>Pro tip:</strong> With {myVotes().length} votes, you can
                split them (e.g., {Math.floor(myVotes().length / 2)} red,{" "}
                {Math.ceil(myVotes().length / 2)} blue) to guarantee you're in the
                minority!
              </div>
            </Show>
          </CardContent>
        </Card>

        {/* Right: Market Panel */}
        <div class="overflow-auto">
          <VoteMarketPanel
            units={[]} // Will be updated to work with votes instead of units
            currentUserId={props.currentUser.identity.toHexString()}
            onBuyVote={(unitId, price) => {
              // TODO: Implement vote purchasing
              console.log("Buy vote", unitId, price);
            }}
            onSetPrice={(unitId, price) => {
              // TODO: Implement price setting
              console.log("Set price", unitId, price);
            }}
          />
        </div>
      </div>

      {/* Game Status Messages */}
      <Show when={props.room.gameStatus === "completed"}>
        <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <Card class="w-96">
            <CardHeader>
              <CardTitle class="text-center text-2xl">🎉 Game Over!</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="text-center">
                <p class="text-lg font-semibold">Winners:</p>
                <For each={remainingPlayers()}>
                  {(player) => (
                    <p class="text-xl">
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
  );
};

export default VotingInterface;

