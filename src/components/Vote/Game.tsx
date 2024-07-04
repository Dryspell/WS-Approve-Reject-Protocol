import { GameRoom, Ticket, TicketColor } from "~/lib/Server/vote";
import { createPolled } from "@solid-primitives/timer";
import { For } from "solid-js";
import UserAvatarCard from "../Chat/UserAvatarCard";
import { Badge } from "../ui/badge";
import { createId } from "@paralleldrive/cuid2";

export default function Game(props: { rooms: Record<string, GameRoom>; roomId: string }) {
  const room = props.rooms[props.roomId];
  if (!room) return null;
  const [, roomName, members, tickets, offers, startTime] = room;

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
                        class="px-1"
                        variant={"outline"}
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
