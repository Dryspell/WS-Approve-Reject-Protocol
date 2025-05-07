import { clientSocket, SC_ComType, SignalType, VoteActionResponse, VoteActionRequest } from "~/types/socket";
import { Accessor } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import { createId } from "@paralleldrive/cuid2";
import { GameRoom, RoundsReadyState, VoteActionType } from "~/types/vote";
import { DEFAULT_REQUEST_TIMEOUT, DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { showToast } from "../ui/toast";
import { Button } from "../ui/button";
import { userIsReady } from "~/lib/game-utils";
import { For } from "solid-js";
import { Badge } from "../ui/badge";
import UserAvatarCard from "../Chat/UserAvatarCard";

const readyGameStart = (
  socket: clientSocket,
  roomId: string,
  user: { name: string; id: string },
  roomsReadyState: Record<string, RoundsReadyState>,
  setRoomsReadyState: SetStoreFunction<Record<string, RoundsReadyState>>,
) => {
  socket
    .timeout(DEFAULT_REQUEST_TIMEOUT)
    .emit<VoteActionType.ToggleReadyGameStart>(
      SignalType.Vote,
      {
        type: VoteActionType.ToggleReadyGameStart,
        request: {
          comId: createId(),
          data: { roomId, user: { id: user.id, username: user.name } },
        },
      },
      (error: Error | null, returnData: VoteActionResponse<VoteActionType.ToggleReadyGameStart> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }) => {
        if (error) {
          showToast({
            title: "Error",
            description: error.message,
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }

        if (returnData.type === SC_ComType.Reject) {
          showToast({
            title: "Error",
            description: returnData.data.reason,
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }

        const ready = returnData.data.ready;
        showToast({
          title: ready ? "Readied Up" : "Unreadied",
          description: ready ? "You are ready to start the game!" : "You are not ready.",
          variant: "success",
          duration: DEFAULT_TOAST_DURATION,
        });

        const currentState = roomsReadyState[roomId];
        if (!currentState) return;

        setRoomsReadyState({
          [roomId]: {
            roomId,
            round: 0,
            readyUsers: ready
              ? Array.from(new Set([...currentState.readyUsers, user.id]))
              : currentState.readyUsers.filter((id: string) => id !== user.id),
          },
        });
      }
    );
};

export default function GamePreStartInteractions(props: {
  socket: clientSocket;
  roomId: string;
  rooms: Record<string, GameRoom>;
  user: Accessor<{ name: string; id: string }>;
  roomsPreStart: Record<string, RoundsReadyState>;
  setRoomsPreStart: SetStoreFunction<Record<string, RoundsReadyState>>;
}) {
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
              props.socket,
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
