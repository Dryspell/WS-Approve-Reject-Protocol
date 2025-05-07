import { GameRoom, RoundsReadyState, Ticket, TicketColor, VoteActionType } from "~/types/vote";
import { createPolled } from "@solid-primitives/timer";
import { Accessor, For, useContext } from "solid-js";
import UserAvatarCard from "../Chat/UserAvatarCard";
import { Badge } from "../ui/badge";
import { SocketContext } from "~/app";
import { DEFAULT_REQUEST_TIMEOUT, DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import {
  clientSocket,
  SC_ComType,
  SignalType,
  VoteActionResponse,
  VoteActionRequest,
} from "~/types/socket";
import { createId } from "@paralleldrive/cuid2";
import { SetStoreFunction } from "solid-js/store";
import { showToast } from "../ui/toast";
import { Button } from "../ui/button";
import { userIsReady } from "~/lib/game-utils";

type SetVoteColorResponse =
  | VoteActionResponse<VoteActionType.SetVoteColor>
  | { type: SC_ComType.Reject; comId: string; data: { reason: string } };
type ToggleReadyResponse =
  | VoteActionResponse<VoteActionType.ToggleReadyRoundEnd>
  | { type: SC_ComType.Reject; comId: string; data: { reason: string } };

function toggleVoteColor(
  ticketId: string,
  ticketOwner: string,
  ticketColor: TicketColor,
  socket: clientSocket,
  roomId: string,
  props: { room: GameRoom; setRooms: SetStoreFunction<Record<string, GameRoom>> },
) {
  const newTicket: Ticket = {
    id: ticketId,
    owner: ticketOwner,
    color: ((ticketColor + 1) % 3) as TicketColor,
  };

  socket.timeout(DEFAULT_REQUEST_TIMEOUT).emit<VoteActionType.SetVoteColor>(
    SignalType.Vote,
    {
      type: VoteActionType.SetVoteColor,
      request: {
        comId: createId(),
        data: { roomId, ticket: newTicket },
      },
    },
    (
      error: Error | null,
      returnData:
        | VoteActionResponse<VoteActionType.SetVoteColor>
        | { type: SC_ComType.Reject; comId: string; data: { reason: string } },
    ) => {
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

      props.setRooms({
        [roomId]: {
          ...props.room,
          tickets: props.room.tickets.map(ticket => (ticket.id === ticketId ? newTicket : ticket)),
        },
      });
    },
  );
}

const readyRoundEnd = (
  socket: clientSocket,
  roomId: string,
  user: { name: string; id: string },
  roomsReadyState: Record<string, RoundsReadyState>,
  setRoomsReadyState: SetStoreFunction<Record<string, RoundsReadyState>>,
) => {
  socket.timeout(DEFAULT_REQUEST_TIMEOUT).emit<VoteActionType.ToggleReadyRoundEnd>(
    SignalType.Vote,
    {
      type: VoteActionType.ToggleReadyRoundEnd,
      request: {
        comId: createId(),
        data: { roomId, user: { id: user.id, username: user.name } },
      },
    },
    (
      error: Error | null,
      returnData:
        | VoteActionResponse<VoteActionType.ToggleReadyRoundEnd>
        | { type: SC_ComType.Reject; comId: string; data: { reason: string } },
    ) => {
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
        description: ready ? "You are ready to end the round!" : "There is still more to do.",
        variant: "success",
        duration: DEFAULT_TOAST_DURATION,
      });

      const currentState = roomsReadyState[roomId];
      if (!currentState) return;

      setRoomsReadyState({
        [roomId]: {
          roomId,
          round: currentState.round,
          readyUsers: ready
            ? Array.from(new Set([...currentState.readyUsers, user.id]))
            : currentState.readyUsers.filter((id: string) => id !== user.id),
        },
      });
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
  const { id: roomId, name: roomName, members, tickets, offers, startTime, rounds } = props.room;

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
                  <For each={tickets.filter(ticket => ticket.owner === member.id)}>
                    {ticket => (
                      <Badge
                        class={`mx-1 cursor-pointer px-1 ${
                          ticket.color === TicketColor.Red
                            ? "bg-red-500"
                            : ticket.color === TicketColor.Blue
                              ? "bg-blue-500"
                              : ""
                        }`}
                        variant={"outline"}
                        onClick={() => {
                          toggleVoteColor(
                            ticket.id,
                            ticket.owner,
                            ticket.color,
                            socket,
                            roomId,
                            props,
                          );
                        }}
                      >{`${ticket.id}: ${TicketColor[ticket.color]}`}</Badge>
                    )}
                  </For>
                </div>
                {userIsReady(roomId, member.id, props.roomsReadyState) ? (
                  <Badge class="bg-green-700">Ready</Badge>
                ) : (
                  <Badge class="bg-orange-600">Not Ready</Badge>
                )}
                <Button
                  variant="outline"
                  class="m-1.5 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium"
                  onClick={() => {
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
