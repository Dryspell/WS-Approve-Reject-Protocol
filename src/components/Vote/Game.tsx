import {
  GameRoom,
  RoundsReadyState,
  Ticket,
  TicketColor,
  VoteActionType,
  VoteHandlerArgs,
} from "~/lib/Server/vote";
import { createPolled } from "@solid-primitives/timer";
import { Accessor, For, useContext } from "solid-js";
import UserAvatarCard from "../Chat/UserAvatarCard";
import { Badge } from "../ui/badge";
import { SocketContext } from "~/app";
import { DEFAULT_REQUEST_TIMEOUT, DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { clientSocket, SC_ComType, SignalType } from "~/types/socket";
import { createId } from "@paralleldrive/cuid2";
import { InferCallbackData } from "~/types/socket-utils";
import { SetStoreFunction } from "solid-js/store";
import { showToast } from "../ui/toast";
import { Button } from "../ui/button";
import { userIsReady } from "./VoteBox";

function toggleVoteColor(
  ticketId: string,
  ticketOwner: string,
  ticketColor: TicketColor,
  socket: clientSocket,
  roomId: string,
  props: { room: GameRoom; setRooms: SetStoreFunction<Record<string, GameRoom>> },
) {
  const newTicket: Ticket = [ticketId, ticketOwner, (ticketColor + 1) % 3];
  socket
    .timeout(DEFAULT_REQUEST_TIMEOUT)
    .emit(
      SignalType.Vote,
      VoteActionType.SetVoteColor,
      [createId(), [roomId, newTicket]],
      (
        err: Error,
        [returnType, comId, returnData]: InferCallbackData<
          VoteHandlerArgs,
          VoteActionType.SetVoteColor
        >,
      ) => {
        if (err) {
          showToast({
            title: "Error",
            description: err.message,
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }
        if (returnType === SC_ComType.Reject) {
          showToast({
            title: "Error",
            description: returnData[0],
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }
        props.setRooms(
          roomId,
          3,
          ([tickId]) => tickId === ticketId,
          () => newTicket,
        );
      },
    );
}

const readyRoundEnd = (
  socket: clientSocket,
  roomId: string,
  user: { name: string; id: string },
  roomsPreStart: Record<string, RoundsReadyState>,
  setRoomsPreStart: SetStoreFunction<Record<string, RoundsReadyState>>,
) => {
  socket
    .timeout(DEFAULT_REQUEST_TIMEOUT)
    .emit(
      SignalType.Vote,
      VoteActionType.ToggleReadyRoundEnd,
      [createId(), [roomId, [user.id, user.name]]],
      (
        err: Error,
        [returnType, comId, returnData]: InferCallbackData<
          VoteHandlerArgs,
          VoteActionType.ToggleReadyRoundEnd
        >,
      ) => {
        if (err) {
          showToast({
            title: "Error",
            description: err.message,
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }

        if (returnType === SC_ComType.Reject) {
          showToast({
            title: "Error",
            description: returnData[0],
            variant: "error",
            duration: DEFAULT_TOAST_DURATION,
          });
          return;
        }

        if (returnType === SC_ComType.Approve) {
          const [ready] = returnData;
          console.log("Ready?", ready);

          showToast({
            title: ready ? "Readied Up" : "Unreadied",
            description: ready ? "You are ready to end the round!" : "There is still more to do.",
            variant: "success",
            duration: DEFAULT_TOAST_DURATION,
          });
          const [, roundNumber, readyUsers] = roomsPreStart[roomId];
          ready
            ? setRoomsPreStart({
                [roomId]: [roomId, roundNumber, Array.from(new Set([...readyUsers, user.id]))],
              })
            : setRoomsPreStart({
                [roomId]: [roomId, roundNumber, readyUsers.filter(id => id !== user.id)],
              });
        }
      },
    );
};

export default function Game(props: {
  room: GameRoom;
  setRooms: SetStoreFunction<Record<string, GameRoom>>;
  user: Accessor<{ id: string; name: string }>;
  roomsReadyState: Record<string, RoundsReadyState>;
  setRoomsReadyState: SetStoreFunction<Record<string, RoundsReadyState>>;
}) {
  const socket = useContext(SocketContext);
  const [roomId, roomName, members, tickets, offers, startTime, rounds] = props.room;

  const clock = createPolled(() => Date.now(), 1000);

  return (
    <div class="flex flex-row items-center justify-between">
      {startTime == null ? (
        <p>Unreachable</p>
      ) : startTime > clock() ? (
        <p>{`Game will start in ${Math.floor((startTime - clock()) / 1000)} seconds`}</p>
      ) : (
        <div>
          <p>
            {(() => {
              const elapsedTime = new Date(clock() - startTime);
              return `Elapsed time: ${elapsedTime.getMinutes()}m ${elapsedTime.getSeconds()}s`;
            })()}
          </p>
          <For each={members}>
            {member => (
              <UserAvatarCard user={member}>
                <div class="flex justify-end py-1">
                  <For
                    each={tickets.filter(([ticketId, ticketOwner]) => ticketOwner === member[0])}
                  >
                    {([ticketId, ticketOwner, ticketColor]) => (
                      <Badge
                        class={`mx-1 cursor-pointer px-1 ${ticketColor === TicketColor.Red ? "bg-red-500" : ticketColor === TicketColor.Blue ? "bg-blue-500" : ""}`}
                        variant={"outline"}
                        onClick={() => {
                          toggleVoteColor(
                            ticketId,
                            ticketOwner,
                            ticketColor,
                            socket,
                            roomId,
                            props,
                          );
                        }}
                      >{`${ticketId}: ${TicketColor[ticketColor]}`}</Badge>
                    )}
                  </For>
                </div>
                {userIsReady(roomId, member[0], props.roomsReadyState) ? (
                  <Badge class="bg-green-700">Ready</Badge>
                ) : (
                  <Badge class="bg-orange-600">Not Ready</Badge>
                )}
                <Button
                  variant="outline"
                  class="m-1.5 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium"
                  onClick={() => {
                    console.log("Ready Round End");
                    readyRoundEnd(
                      socket,
                      roomId,
                      props.user(),
                      props.roomsReadyState,
                      props.setRoomsReadyState,
                    );
                  }}
                >
                  {userIsReady(roomId, props.user().id, props.roomsReadyState)
                    ? `Unready`
                    : `Ready?`}
                </Button>
              </UserAvatarCard>
            )}
          </For>
        </div>
      )}
    </div>
  );
}
