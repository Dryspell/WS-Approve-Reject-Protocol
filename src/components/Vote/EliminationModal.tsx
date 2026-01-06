import { Component, For, Show } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

interface EliminationModalProps {
  roundNumber: number;
  eliminatedPlayers: string[];
  survivingPlayers: string[];
  minorityColor: "red" | "blue";
  redVotes: number;
  blueVotes: number;
  onClose: () => void;
}

const EliminationModal: Component<EliminationModalProps> = (props) => {
  const isTie = () => props.redVotes === props.blueVotes;
  const majorityColor = () => props.minorityColor === "red" ? "blue" : "red";

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <Card class="w-full max-w-2xl animate-in fade-in zoom-in duration-300">
        <CardHeader class="border-b">
          <CardTitle class="text-center text-3xl">
            <Show when={isTie()} fallback={<>⚡ Round {props.roundNumber} Results</>}>
              🤝 Round {props.roundNumber} - TIE!
            </Show>
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-6 p-6">
          {/* Vote Counts */}
          <div class="grid grid-cols-2 gap-4">
            <div
              class="rounded-lg border-2 p-4 text-center"
              classList={{
                "border-red-500 bg-red-50": !isTie() && majorityColor() === "red",
                "border-red-300 bg-white": !isTie() && majorityColor() !== "red",
              }}
            >
              <div class="text-4xl">🔴</div>
              <div class="mt-2 text-3xl font-bold">{props.redVotes}</div>
              <div class="text-sm font-semibold text-gray-600">Red Votes</div>
              <Show when={!isTie() && majorityColor() === "red"}>
                <Badge variant="destructive" class="mt-2">Majority</Badge>
              </Show>
              <Show when={!isTie() && props.minorityColor === "red"}>
                <Badge variant="default" class="mt-2 bg-green-600">✓ Minority</Badge>
              </Show>
            </div>

            <div
              class="rounded-lg border-2 p-4 text-center"
              classList={{
                "border-blue-500 bg-blue-50": !isTie() && majorityColor() === "blue",
                "border-blue-300 bg-white": !isTie() && majorityColor() !== "blue",
              }}
            >
              <div class="text-4xl">🔵</div>
              <div class="mt-2 text-3xl font-bold">{props.blueVotes}</div>
              <div class="text-sm font-semibold text-gray-600">Blue Votes</div>
              <Show when={!isTie() && majorityColor() === "blue"}>
                <Badge variant="destructive" class="mt-2">Majority</Badge>
              </Show>
              <Show when={!isTie() && props.minorityColor === "blue"}>
                <Badge variant="default" class="mt-2 bg-green-600">✓ Minority</Badge>
              </Show>
            </div>
          </div>

          {/* Elimination Results */}
          <Show when={!isTie()}>
            <div class="space-y-4">
              {/* Eliminated */}
              <Show when={props.eliminatedPlayers.length > 0}>
                <div class="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div class="mb-2 flex items-center gap-2 text-lg font-semibold text-red-900">
                    <span>☠️</span>
                    <span>Eliminated ({props.eliminatedPlayers.length})</span>
                  </div>
                  <div class="space-y-1">
                    <For each={props.eliminatedPlayers}>
                      {(playerId) => (
                        <div class="text-sm text-red-800">
                          • {playerId.slice(0, 12)}... (voted with majority)
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Survivors */}
              <Show when={props.survivingPlayers.length > 0}>
                <div class="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div class="mb-2 flex items-center gap-2 text-lg font-semibold text-green-900">
                    <span>✅</span>
                    <span>Survived ({props.survivingPlayers.length})</span>
                  </div>
                  <div class="space-y-1">
                    <For each={props.survivingPlayers}>
                      {(playerId) => (
                        <div class="text-sm text-green-800">
                          • {playerId.slice(0, 12)}... (voted with minority)
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          {/* Tie Message */}
          <Show when={isTie()}>
            <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
              <div class="text-lg font-semibold text-yellow-900">
                Perfect Split!
              </div>
              <div class="mt-2 text-sm text-yellow-800">
                Both teams had equal votes. The game continues with all players!
              </div>
            </div>
          </Show>

          {/* Strategy Tip */}
          <Show when={props.survivingPlayers.length > 2}>
            <div class="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
              <p class="font-semibold">💡 Strategy Tip:</p>
              <p class="mt-1">
                With {props.survivingPlayers.length} players remaining, consider buying more votes to guarantee
                you're in the minority. If you have 2+ votes, split them between colors!
              </p>
            </div>
          </Show>

          {/* Continue Button */}
          <Button onClick={props.onClose} class="w-full py-6 text-lg font-semibold">
            <Show when={props.survivingPlayers.length > 2} fallback={<>See Final Results →</>}>
              Continue to Next Round →
            </Show>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EliminationModal;

