import { Accessor } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import type { GameRoom } from "~/module_bindings/game_room_type";
import type { ReadyState } from "~/module_bindings/ready_state_type";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { showToast } from "../ui/toast";
import { Button } from "../ui/button";
import { userIsReady } from "~/lib/game-utils";
import { For } from "solid-js";
import { Badge } from "../ui/badge";
import UserAvatarCard from "../Chat/UserAvatarCard";
import type { DbConnection } from "~/module_bindings/index";

export default function GamePreStartInteractions(props: {
  roomId: string;
  rooms: Record<string, GameRoom>;
  user: Accessor<{ name: string; id: string }>;
  roomsPreStart: Record<string, ReadyState>;
  setRoomsPreStart: SetStoreFunction<Record<string, ReadyState>>;
  conn: Accessor<DbConnection | null>;
  connected: Accessor<boolean>;
}) {
  const room = props.rooms[props.roomId];
  if (!room) return null;
  
  const { memberIds } = room;

  const handleToggleReady = () => {
    const connection = props.conn();
    const user = props.user();

    if (!connection || !props.connected()) {
      showToast({
        title: "Error",
        description: "Not connected to SpacetimeDB",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
      return;
    }

    try {
      const currentState = props.roomsPreStart[props.roomId];
      const wasReady = currentState?.readyUserIds.includes(user.id) || false;

      console.log("Toggle ready:", {
        roomId: room.id,
        userId: user.id,
        currentState,
        wasReady,
        allReadyStates: props.roomsPreStart
      });

      // Call the reducer - it's fire-and-forget, the onUpdate callback in parent will update state
      connection.reducers.toggleReady(room.id, user.id);

      showToast({
        title: wasReady ? "Unreadied" : "Readied Up",
        description: wasReady
          ? "You are not ready."
          : "You are ready to start the game!",
        duration: DEFAULT_TOAST_DURATION,
      });
    } catch (error) {
      console.error("Failed to toggle ready state:", error);
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle ready state",
        variant: "error",
        duration: DEFAULT_TOAST_DURATION,
      });
    }
  };

  return (
    <div class="space-y-4">
      {/* Game Info */}
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-semibold text-blue-900">
              {room.name}
            </div>
            <div class="text-sm text-blue-700">
              {memberIds.length} {memberIds.length === 1 ? "player" : "players"} • ${room.buyinAmount.toFixed(2)} buy-in
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm text-blue-600">Pot</div>
            <div class="text-2xl font-bold text-blue-900">
              ${(room.buyinAmount * memberIds.length).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div class="flex flex-row flex-wrap gap-2">
        <For each={memberIds}>
          {memberId => (
            <UserAvatarCard user={{ id: memberId, username: memberId }}>
              <div class="flex justify-end">
                {userIsReady(props.roomId, memberId, props.roomsPreStart) ? (
                  <Badge class="bg-green-700">✓ Ready</Badge>
                ) : (
                  <Badge class="bg-orange-600">Waiting...</Badge>
                )}
              </div>
            </UserAvatarCard>
          )}
        </For>
      </div>

      {/* Ready Button */}
      <div class="flex flex-col gap-2">
        <Button
          variant={userIsReady(props.roomId, props.user().id, props.roomsPreStart) ? "outline" : "default"}
          class="w-full py-6 text-lg font-semibold"
          onClick={handleToggleReady}
          disabled={!props.connected()}
        >
          {userIsReady(props.roomId, props.user().id, props.roomsPreStart) 
            ? "✓ Ready (click to unready)" 
            : "Ready to Play?"}
        </Button>
        <div class="text-center text-sm text-gray-600">
          {userIsReady(props.roomId, props.user().id, props.roomsPreStart)
            ? "Waiting for other players..."
            : `You'll pay $${room.buyinAmount.toFixed(2)} when the game starts`}
        </div>
      </div>
    </div>
  );
}
