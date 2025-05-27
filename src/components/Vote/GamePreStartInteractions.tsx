import { Accessor } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import { GameRoom, RoundsReadyState } from "~/types/vote";
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
  roomsReadyState: Record<string, RoundsReadyState>,
  setRoomsReadyState: SetStoreFunction<Record<string, RoundsReadyState>>,
) => {
  try {
    await client.reducers.toggle_ready(roomId, user.id);
    
    const currentState = roomsReadyState[roomId];
    if (!currentState) return;

    setRoomsReadyState({
      [roomId]: {
        roomId,
        round: 0,
        readyUsers: currentState.readyUsers.includes(user.id)
          ? currentState.readyUsers.filter(id => id !== user.id)
          : [...currentState.readyUsers, user.id],
      },
    });

    showToast({
      title: currentState.readyUsers.includes(user.id) ? "Unreadied" : "Readied Up",
      description: currentState.readyUsers.includes(user.id)
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
  roomsPreStart: Record<string, RoundsReadyState>;
  setRoomsPreStart: SetStoreFunction<Record<string, RoundsReadyState>>;
}) {
  const { db } = useSpacetimeDB();
  const room = props.rooms[props.roomId];
  if (!room) return null;
  
  const { members } = room;

  return (
    <>
      <div class="flex flex-row items-center justify-between">
        <For each={members}>
          {member => (
            <UserAvatarCard user={member}>
              <div class="flex justify-end">
                {userIsReady(props.roomId, member.id, props.roomsPreStart) ? (
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
