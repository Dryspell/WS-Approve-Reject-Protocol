import { GameRoom, Ticket, TicketColor, VoteActionType, VoteHandlerArgs } from "~/lib/Server/vote";
import { createPolled } from "@solid-primitives/timer";
import { For, useContext } from "solid-js";
import UserAvatarCard from "../Chat/UserAvatarCard";
import { Badge } from "../ui/badge";
import { SocketContext } from "~/app";
import { DEFAULT_REQUEST_TIMEOUT, DEFAULT_TOAST_DURATION } from "~/lib/timeout-constants";
import { SC_ComType, SignalType } from "~/types/socket";
import { createId } from "@paralleldrive/cuid2";
import { InferCallbackData } from "~/types/socket-utils";
import { SetStoreFunction } from "solid-js/store";
import { showToast } from "../ui/toast";

export default function Game(props: {
  room: GameRoom;
  setRooms: SetStoreFunction<Record<string, GameRoom>>;
}) {
  const socket = useContext(SocketContext);
  const [roomId, roomName, members, tickets, offers, startTime] = props.room;

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
                        class={`mx-1 px-1 ${ticketColor === TicketColor.Red ? "bg-red-500" : ticketColor === TicketColor.Blue ? "bg-blue-500" : ""}`}
                        variant={"outline"}
                        onClick={() => {
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
                        }}
                      >{`${ticketId}: ${TicketColor[ticketColor]}`}</Badge>
                    )}
                  </For>
                </div>
              </UserAvatarCard>
            )}
          </For>
        </div>
      )}
    </div>
  );
}
