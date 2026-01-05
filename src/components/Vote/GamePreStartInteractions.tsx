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
    <>
      <div class="flex flex-row items-center justify-between">
        <For each={memberIds}>
          {memberId => (
            <UserAvatarCard user={{ id: memberId, username: memberId }}>
              <div class="flex justify-end">
                {userIsReady(props.roomId, memberId, props.roomsPreStart) ? (
                  <Badge class="bg-green-700">Ready</Badge>
                ) : (
                  <Badge class="bg-orange-600">Not Ready</Badge>
                )}
              </div>
            </UserAvatarCard>
          )}
        </For>
      </div>
      <div class="flex flex-row items-center justify-between">
        <Button
          variant="outline"
          class="m-1.5 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium"
          onClick={handleToggleReady}
          disabled={!props.connected()}
        >
          {userIsReady(props.roomId, props.user().id, props.roomsPreStart) ? `Unready` : `Ready?`}
        </Button>
      </div>
    </>
  );
}
