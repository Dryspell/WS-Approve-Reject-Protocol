import { Accessor } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import type { GameRoom, ReadyState } from "~/module_bindings";
import { DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { showToast } from "../ui/toast";
import { Button } from "../ui/button";
import { userIsReady } from "~/lib/game-utils";
import { For } from "solid-js";
import { Badge } from "../ui/badge";
import UserAvatarCard from "../Chat/UserAvatarCard";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";

const readyGameStart = async (
  client: any,
  roomId: string,
  user: { name: string; id: string },
  roomsReadyState: Record<string, ReadyState>,
  setRoomsReadyState: SetStoreFunction<Record<string, ReadyState>>,
) => {
  try {
    await client.reducers.toggle_ready(roomId, user.id);
    
    const currentState = roomsReadyState[roomId];
    if (!currentState) return;

    setRoomsReadyState({
      [roomId]: {
        roomId,
        round: 0,
        readyUserIds: currentState.readyUserIds.includes(user.id)
          ? currentState.readyUserIds.filter(id => id !== user.id)
          : [...currentState.readyUserIds, user.id],
      },
    });

    showToast({
      title: currentState.readyUserIds.includes(user.id) ? "Unreadied" : "Readied Up",
      description: currentState.readyUserIds.includes(user.id)
        ? "You are not ready."
        : "You are ready to start the game!",
      variant: "success",
      duration: DEFAULT_TOAST_DURATION,
    });
  } catch (error) {
    showToast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to toggle ready state",
      variant: "error",
      duration: DEFAULT_TOAST_DURATION,
    });
  }
};

export default function GamePreStartInteractions(props: {
  roomId: string;
  rooms: Record<string, GameRoom>;
  user: Accessor<{ name: string; id: string }>;
  roomsPreStart: Record<string, ReadyState>;
  setRoomsPreStart: SetStoreFunction<Record<string, ReadyState>>;
}) {
  const { db } = useSpacetimeDB();
  const room = props.rooms[props.roomId];
  if (!room) return null;
  
  const { memberIds } = room;

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
          onClick={() =>
            readyGameStart(
              db(),
              props.roomId,
              props.user(),
              props.roomsPreStart,
              props.setRoomsPreStart,
            )
          }
        >
          {userIsReady(props.roomId, props.user().id, props.roomsPreStart) ? `Unready` : `Ready?`}
        </Button>
      </div>
    </>
  );
}
