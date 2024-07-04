import { clientSocket, SC_ComType, SignalType } from "~/types/socket";
import { Accessor } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import { createId } from "@paralleldrive/cuid2";
import { GameRoom, GameRoomPreStart, VoteActionType, VoteHandlerArgs } from "~/lib/Server/vote";
import { DEFAULT_REQUEST_TIMEOUT } from "~/lib/Client/socket";
import { InferCallbackData } from "~/types/socket-utils";
import { showToast } from "../ui/toast";
import { Button } from "../ui/button";
import { userIsReady } from "./VoteBox";
import { For } from "solid-js";
import { Badge } from "../ui/badge";
import UserAvatarCard from "../Chat/UserAvatarCard";

const readyGameStart = (
  socket: clientSocket,
  roomId: string,
  user: { name: string; id: string },
  roomsPreStart: Record<string, GameRoomPreStart>,
  setRoomsPreStart: SetStoreFunction<Record<string, GameRoomPreStart>>,
) => {
  socket
    .timeout(DEFAULT_REQUEST_TIMEOUT)
    .emit(
      SignalType.Vote,
      VoteActionType.ToggleReadyGameStart,
      [createId(), [roomId, [user.id, user.name]]],
      (
        err: Error,
        [returnType, comId, returnData]: InferCallbackData<
          VoteHandlerArgs,
          VoteActionType.ToggleReadyGameStart
        >,
      ) => {
        if (err) {
          showToast({
            title: "Error",
            description: err.message,
            variant: "error",
            duration: 5000,
          });
          return;
        }

        if (returnType === SC_ComType.Reject) {
          showToast({
            title: "Error",
            description: returnData[0],
            variant: "error",
            duration: 5000,
          });
          return;
        }

        if (returnType === SC_ComType.Approve) {
          const [ready] = returnData;
          console.log("Ready?", ready);

          showToast({
            title: ready ? "Readied Up" : "Unreadied",
            description: ready ? "You are ready to start the game!" : "You are not ready.",
            variant: "success",
            duration: 5000,
          });
          const [, readyUsers] = roomsPreStart[roomId];
          ready
            ? setRoomsPreStart({
                [roomId]: [roomId, Array.from(new Set([...readyUsers, user.id]))],
              })
            : setRoomsPreStart({
                [roomId]: [roomId, readyUsers.filter(id => id !== user.id)],
              });
        }
      },
    );
};

export default function GamePreStartInteractions(props: {
  socket: clientSocket;
  roomId: string;
  rooms: Record<string, GameRoom>;
  user: Accessor<{ name: string; id: string }>;
  roomsPreStart: Record<string, GameRoomPreStart>;
  setRoomsPreStart: SetStoreFunction<Record<string, GameRoomPreStart>>;
}) {
  const room = props.rooms[props.roomId];
  if (!room) return null;
  const [, roomName, members, tickets, offers, startTime] = room;
  return (
    <>
      <div class="flex flex-row items-center justify-between">
        <For each={members}>
          {member => (
            <UserAvatarCard user={member}>
              <div class="flex justify-end">
                {userIsReady(props.roomId, member[0], props.roomsPreStart) ? (
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
