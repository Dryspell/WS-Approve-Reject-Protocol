import { Component, For, Show, createSignal, onMount } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import RebuyModal from "../game/RebuyModal";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import type { User, GameRoom } from "~/module_bindings/types";
import { resolvePlayerName } from "~/lib/game-utils";

interface EliminationModalProps {
  roundNumber: number;
  eliminatedPlayers: string[];
  survivingPlayers: string[];
  minorityColor: "red" | "blue";
  tiebreaker?: boolean;
  redVotes: number;
  blueVotes: number;
  room: GameRoom;
  currentUser: User;
  onClose: () => void;
}

const EliminationModal: Component<EliminationModalProps> = (props) => {
  const { conn, identity } = useSpacetimeDB();
  const [showRebuy, setShowRebuy] = createSignal(false);
  const [activeGuaranteeCount, setActiveGuaranteeCount] = createSignal(0);
  
  onMount(() => {
    const connection = conn();
    if (!connection) return;

    const guarantees = Array.from(connection.db.guarantee.iter())
      .filter(g => g.roomId === props.room.id && g.roundNumber === props.roundNumber);
    const purchases = Array.from(connection.db.guarantee_purchase.iter());
    const count = guarantees.filter(g => 
      purchases.some(p => p.guaranteeId === g.id)
    ).length;
    setActiveGuaranteeCount(count);
  });
  
  const isTie = () => props.redVotes === props.blueVotes;
  const isCurrentUserEliminated = () => {
    const userId = identity()?.toHexString();
    return userId && props.eliminatedPlayers.includes(userId);
  };
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
                          • {resolvePlayerName(playerId, conn())} (voted with majority)
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
                          • {resolvePlayerName(playerId, conn())} (voted with minority)
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          {/* Tie — game ends, pot splits by votes cast */}
          <Show when={isTie()}>
            <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
              <div class="text-lg font-semibold text-yellow-900">Tie — pot splits</div>
              <div class="mt-2 text-sm text-yellow-800">
                Red and blue tied. The game ends. The pot is split in proportion to votes
                cast this round.
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

          {/* Guarantee Info */}
          <Show when={activeGuaranteeCount() > 0}>
            <div class="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              🔒 {activeGuaranteeCount()} guarantee{activeGuaranteeCount() !== 1 ? 's were' : ' was'} enforced this round
            </div>
          </Show>

          {/* Action Buttons */}
          <div class="space-y-2">
            <Show when={isCurrentUserEliminated() && props.room.allowRebuy}>
              <Button
                class="w-full py-6 text-lg font-semibold"
                variant="default"
                onClick={() => setShowRebuy(true)}
              >
                🎮 Re-Enter Game (3x Buy-in)
              </Button>
            </Show>
            <Button
              onClick={props.onClose}
              class="w-full py-6 text-lg font-semibold"
              variant={isCurrentUserEliminated() ? 'outline' : 'default'}
            >
              <Show when={!isTie() && props.survivingPlayers.length > 2} fallback={<>See Final Results →</>}>
                {isCurrentUserEliminated() ? 'Watch Game' : 'Continue to Next Round'} →
              </Show>
            </Button>
          </div>
        </CardContent>

        {/* Re-buy Modal */}
        <Show when={showRebuy()}>
          <RebuyModal
            user={props.currentUser}
            room={props.room}
            onClose={() => setShowRebuy(false)}
            onSuccess={() => {
              props.onClose();
            }}
          />
        </Show>
      </Card>
    </div>
  );
};

export default EliminationModal;

