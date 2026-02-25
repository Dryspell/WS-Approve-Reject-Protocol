import { Component, For, Show } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { User, Vote } from "~/module_bindings/types";

interface PlayerListProps {
  players: User[];
  eliminatedPlayerIds: string[];
  votes: Vote[];
  currentUserId: string;
  showVoteCounts?: boolean;
  showWalletBalance?: boolean;
}

const PlayerList: Component<PlayerListProps> = (props) => {
  const activePlayers = () => {
    return props.players.filter(
      (p) => !props.eliminatedPlayerIds.includes(p.identity.toHexString())
    );
  };

  const eliminatedPlayers = () => {
    return props.players.filter((p) =>
      props.eliminatedPlayerIds.includes(p.identity.toHexString())
    );
  };

  const getPlayerVoteCount = (playerId: string) => {
    return props.votes.filter((v) => v.playerId === playerId).length;
  };

  const getPlayerVoteColors = (playerId: string) => {
    const playerVotes = props.votes.filter((v) => v.playerId === playerId);
    const red = playerVotes.filter((v) => v.color === "red").length;
    const blue = playerVotes.filter((v) => v.color === "blue").length;
    const unset = playerVotes.filter((v) => !v.color).length;

    return { red, blue, unset };
  };

  return (
    <Card class="h-full">
      <CardHeader>
        <CardTitle>
          Players ({activePlayers().length}
          {eliminatedPlayers().length > 0 && ` + ${eliminatedPlayers().length} out`})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea class="h-96">
          <div class="space-y-3 pr-2">
            {/* Active Players */}
            <div>
              <p class="mb-2 text-sm font-semibold text-gray-700">Active</p>
              <div class="space-y-2">
                <For each={activePlayers()}>
                  {(player) => {
                    const isCurrentUser =
                      player.identity.toHexString() === props.currentUserId;
                    const voteCount = getPlayerVoteCount(player.identity.toHexString());
                    const voteColors = getPlayerVoteColors(
                      player.identity.toHexString()
                    );

                    return (
                      <div
                        class="rounded-lg border p-3 transition-all hover:shadow-sm"
                        classList={{
                          "border-blue-500 bg-blue-50": isCurrentUser,
                          "border-gray-200 bg-white": !isCurrentUser,
                        }}
                      >
                        <div class="flex items-start justify-between">
                          <div class="flex items-center gap-2">
                            <span class="text-xl">
                              {isCurrentUser ? "👤" : "🧑"}
                            </span>
                            <div>
                              <div class="font-semibold">
                                {player.name || "Anonymous"}
                                {isCurrentUser && (
                                  <Badge variant="default" class="ml-2 text-xs">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <Show when={props.showVoteCounts}>
                                <div class="mt-1 flex items-center gap-2 text-xs">
                                  <span class="text-gray-600">
                                    {voteCount} vote{voteCount !== 1 ? "s" : ""}
                                  </span>
                                  <Show when={voteColors.red > 0}>
                                    <Badge variant="outline" class="text-xs">
                                      🔴 {voteColors.red}
                                    </Badge>
                                  </Show>
                                  <Show when={voteColors.blue > 0}>
                                    <Badge variant="outline" class="text-xs">
                                      🔵 {voteColors.blue}
                                    </Badge>
                                  </Show>
                                  <Show when={voteColors.unset > 0}>
                                    <Badge variant="outline" class="text-xs">
                                      ⚪ {voteColors.unset}
                                    </Badge>
                                  </Show>
                                </div>
                              </Show>
                            </div>
                          </div>
                          <Show when={props.showWalletBalance}>
                            <Badge variant="secondary" class="text-xs">
                              ${player.walletBalance.toFixed(0)}
                            </Badge>
                          </Show>
                        </div>

                        {/* Player status indicators */}
                        <Show when={voteCount > 1}>
                          <div class="mt-2 rounded bg-green-50 px-2 py-1 text-xs text-green-700">
                            💪 Multiple votes - can split for guaranteed minority
                          </div>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>

            {/* Eliminated Players */}
            <Show when={eliminatedPlayers().length > 0}>
              <div class="border-t pt-3">
                <p class="mb-2 text-sm font-semibold text-red-600">
                  Eliminated ({eliminatedPlayers().length})
                </p>
                <div class="space-y-2">
                  <For each={eliminatedPlayers()}>
                    {(player) => (
                      <div class="rounded-lg border border-red-200 bg-red-50 p-3 opacity-70">
                        <div class="flex items-center gap-2">
                          <span class="text-xl">☠️</span>
                          <div class="flex-1">
                            <div class="font-semibold line-through">
                              {player.name || "Anonymous"}
                            </div>
                            <div class="text-xs text-gray-600">
                              Voted with majority
                            </div>
                          </div>
                          <Show when={props.showWalletBalance}>
                            <Badge variant="outline" class="text-xs">
                              ${player.walletBalance.toFixed(0)}
                            </Badge>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* No Players Message */}
            <Show when={activePlayers().length === 0 && eliminatedPlayers().length === 0}>
              <div class="rounded border border-dashed p-8 text-center text-sm text-gray-500">
                No players yet. Waiting for players to join...
              </div>
            </Show>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PlayerList;

