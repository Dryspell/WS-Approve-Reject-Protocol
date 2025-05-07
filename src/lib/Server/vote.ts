import { CS_ComType, SC_ComType, serverSocket, SignalType, sServer } from "~/types/socket";
import { User } from "~/types/user";
import { createId } from "@paralleldrive/cuid2";
import {
  DEFAULT_ROUND_INTERIM_LENGTH,
  DEFAULT_ROUND_LENGTH,
  DEFAULT_TICKET_COUNT,
} from "./gameConfig";
import {
  GameRoom,
  GameRound,
  RoundsReadyState,
  Ticket,
  TicketColor,
  VoteActionType,
  VoteHandlerArgs,
  SocketEvent,
  SC_GameEventType,
} from "~/types/vote";

export type { GameRoom, GameRound, RoundsReadyState, Ticket, TicketColor, VoteActionType, VoteHandlerArgs };

export enum OfferType {
  Buy,
  Sell,
  BuyPromise,
  SellPromise,
}

const userHasPermissionToCreateRoom = (userId: string) => true;
const userHasPermissionToJoinRoom = (userId: string, roomId: string) => true;

function cleanupRoom(roomId: string, clocks: Map<string, NodeJS.Timeout>) {
  const clock = clocks.get(roomId);
  if (clock) {
    clearInterval(clock);
    clocks.delete(roomId);
  }
}

function startRound(
  io: sServer,
  socket: serverSocket,
  roomId: string,
  rooms: Map<string, GameRoom>,
  clocks: Map<string, NodeJS.Timeout>,
  round: GameRound,
) {
  const { startTime, endTime } = round;
  cleanupRoom(roomId, clocks);

  clocks.set(
    roomId,
    setInterval(() => {
      if (Date.now() > startTime) {
        cleanupRoom(roomId, clocks);
        io.to(roomId).emit(SignalType.Vote, {
          type: SC_GameEventType.RoundStart,
          comId: createId(),
          data: { roomId, round },
        } as SocketEvent);

        clocks.set(
          roomId,
          setInterval(() => {
            if (Date.now() > endTime) {
              endRound(io, socket, roomId, rooms, clocks, round);
            }
          }),
        );
      }
    }, 1000),
  );
}

export const calculateRoundResult = (tickets: Ticket[]) => {
  const colorSplit = tickets.reduce(
    (acc, ticket) => {
      if (ticket.color !== TicketColor.None) {
        acc[ticket.color].push(ticket);
      }
      return acc;
    },
    { [TicketColor.Blue]: [], [TicketColor.Red]: [] } as Record<
      TicketColor.Blue | TicketColor.Red,
      Ticket[]
    >,
  );

  const sortedColors = Object.entries(colorSplit)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([color]) => parseInt(color) as TicketColor.Blue | TicketColor.Red);

  const majorityColor = sortedColors[0];
  const minorityColor = sortedColors[1];

  const newTickets = tickets.filter(ticket => ticket.color === minorityColor);

  return {
    colorSplit,
    majorityColor,
    minorityColor,
    newTickets,
  };
};

function endRound(
  io: sServer,
  socket: serverSocket,
  roomId: string,
  rooms: Map<string, GameRoom>,
  clocks: Map<string, NodeJS.Timeout>,
  round: GameRound,
) {
  cleanupRoom(roomId, clocks);
  round.endTime = Date.now();
  const { number, startTime, endTime } = round;
  const newRoundStart = Date.now() + DEFAULT_ROUND_INTERIM_LENGTH;

  const existingRoom = rooms.get(roomId);
  if (!existingRoom) {
    const error = `Room ${roomId} no longer exists`;
    console.error(error);
    io.to(roomId).emit(SignalType.Vote, {
      type: SC_GameEventType.Error,
      comId: createId(),
      data: { roomId, error },
    } as SocketEvent);
    return;
  }
  const { name, members, tickets, offers, rounds } = existingRoom;

  const { newTickets } = calculateRoundResult(tickets);

  const newRound: GameRound = {
    number: number + 1,
    startTime: newRoundStart,
    endTime: newRoundStart + 1000 * 60 * 5,
    result: { previousTickets: tickets, newTickets },
  };

  rounds.push(newRound);

  startRound(io, socket, roomId, rooms, clocks, newRound);

  io.to(roomId).emit(SignalType.Vote, {
    type: SC_GameEventType.RoundEnd,
    comId: createId(),
    data: { roomId, previousRound: round, newRound },
  } as SocketEvent);
}

export default function vote() {
  const rooms = new Map<string, GameRoom>();
  const roomsReadyState = new Map<string, RoundsReadyState>();
  const clocks = new Map<string, NodeJS.Timeout>();

  const handler = (socket: serverSocket, io: sServer) => (args: VoteHandlerArgs) => {
    const { type, request, callback } = args;
    try {
      switch (type) {
        case VoteActionType.Dev_DeleteRooms: {
          rooms.forEach((_, roomId) => cleanupRoom(roomId, clocks));
          rooms.clear();
          roomsReadyState.clear();
          clocks.clear();
          callback();
          return;
        }

        case VoteActionType.CreateOrJoinRoom: {
          const { comId, data } = request;
          const { roomId, roomName, user } = data;

          if (!user) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "User is not logged in" },
            });
            return;
          }
          socket.data.user.id = user.id;
          socket.data.user.username = user.username;

          let existingRoom = rooms.get(roomId);
          if (!existingRoom && userHasPermissionToCreateRoom(user.id)) {
            const newRoom: GameRoom = {
              id: roomId,
              name: roomName,
              members: [user],
              tickets: [],
              offers: [],
              startTime: null,
              rounds: [],
            };
            rooms.set(roomId, newRoom);
            socket.join(roomId);
            socket.broadcast.emit(SignalType.Vote, {
              type: SC_GameEventType.RoomCreated,
              comId,
              data: newRoom,
            } as SocketEvent);

            const roomPreStart: RoundsReadyState = {
              roomId,
              round: 0,
              readyUsers: [],
            };
            roomsReadyState.set(roomId, roomPreStart);

            callback({
              type: SC_ComType.Approve,
              comId,
              data: { room: newRoom, readyState: roomPreStart },
            });
          } else if (!existingRoom && !userHasPermissionToCreateRoom(user.id)) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "User does not have permission to create room" },
            });
          } else if (existingRoom && userHasPermissionToJoinRoom(user.id, roomId)) {
            let { members } = existingRoom;
            members = Array.from(new Set([...members, user].map(user => user.id))).map(userId => ({
              id: userId,
              username:
                [...members, user].find(member => member.id === userId)?.username ?? "Unknown User",
            }));

            const newRoom: GameRoom = {
              ...existingRoom,
              members,
            };
            rooms.set(roomId, newRoom);
            socket.join(roomId);
            socket.broadcast.emit(SignalType.Vote, {
              type: SC_GameEventType.UserJoinedRoom,
              comId,
              data: { roomId, user },
            } as SocketEvent);

            const roomPreStart = roomsReadyState.get(roomId) ?? {
              roomId,
              round: 0,
              readyUsers: [],
            };

            callback({
              type: SC_ComType.Approve,
              comId,
              data: { room: newRoom, readyState: roomPreStart },
            });
          }
          break;
        }

        case VoteActionType.ToggleReadyGameStart: {
          const { comId, data } = request;
          const { roomId, user } = data;
          if (!user) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "User is not logged in" },
            });
            return;
          }

          const existingRoom = rooms.get(roomId);
          if (!existingRoom) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "Room does not exist" },
            });
            return;
          }

          const { members, tickets, offers, name } = existingRoom;
          if (!members.find(member => member.id === user.id)) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "User is not in room" },
            });
            return;
          }

          const roomPreStart = roomsReadyState.get(roomId);
          if (!roomPreStart) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "Room is not in pre-start state" },
            });
            return;
          }

          if (socket.data.user.id !== user.id) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "User attempted to toggle ready for a different user" },
            });
            return;
          }

          const { readyUsers } = roomPreStart;
          if (readyUsers.find(userId => userId === user.id)) {
            roomsReadyState.set(roomId, {
              ...roomPreStart,
              readyUsers: readyUsers.filter(userId => userId !== user.id),
            });
            callback({
              type: SC_ComType.Approve,
              comId,
              data: { ready: false },
            });
            socket.broadcast.emit(SignalType.Vote, {
              type: SC_GameEventType.UserToggleReadyGameStart,
              comId,
              data: { roomId, user, readyState: false },
            } as SocketEvent);
            return;
          } else {
            const newPreStart: RoundsReadyState = {
              ...roomPreStart,
              readyUsers: [...readyUsers, user.id],
            };
            roomsReadyState.set(roomId, newPreStart);
            callback({
              type: SC_ComType.Approve,
              comId,
              data: { ready: true },
            });
            socket.broadcast.emit(SignalType.Vote, {
              type: SC_GameEventType.UserToggleReadyGameStart,
              comId,
              data: { roomId, user, readyState: true },
            } as SocketEvent);

            // Start game if all users are ready
            if (newPreStart.readyUsers.length === members.length) {
              const startTime = Date.now() + DEFAULT_ROUND_INTERIM_LENGTH;
              const newRound: GameRound = {
                number: 1,
                startTime,
                endTime: startTime + DEFAULT_ROUND_LENGTH,
                result: { previousTickets: tickets, newTickets: [] },
              };

              startRound(io, socket, roomId, rooms, clocks, newRound);
              const newRoom: GameRoom = {
                ...existingRoom,
                tickets: members
                  .map(member =>
                    Array.from(
                      { length: DEFAULT_TICKET_COUNT },
                      () =>
                        ({ id: createId(), owner: member.id, color: TicketColor.None }) as Ticket,
                    ),
                  )
                  .flat(),
                startTime,
                rounds: [newRound],
              };
              rooms.set(roomId, newRoom);
              io.to(roomId).emit(SignalType.Vote, {
                type: SC_GameEventType.GameStart,
                comId,
                data: newRoom,
              } as SocketEvent);
            }
            return;
          }
        }

        case VoteActionType.ToggleReadyRoundEnd: {
          const { comId, data } = request;
          const { roomId, user } = data;
          if (!user) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "User is not logged in" },
            });
            return;
          }

          const existingRoom = rooms.get(roomId);
          if (!existingRoom) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "Room does not exist" },
            });
            return;
          }

          const { members, rounds } = existingRoom;
          if (!members.find(member => member.id === user.id)) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "User is not in room" },
            });
            return;
          }

          const roundReadyState = roomsReadyState.get(roomId);
          if (!roundReadyState) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "Room is not in pre-start state" },
            });
            return;
          }

          const { readyUsers } = roundReadyState;
          if (readyUsers.find(userId => userId === user.id)) {
            roomsReadyState.set(roomId, {
              ...roundReadyState,
              readyUsers: readyUsers.filter(userId => userId !== user.id),
            });
            callback({
              type: SC_ComType.Approve,
              comId,
              data: { ready: false },
            });
            return;
          } else {
            const newRoundReadyState: RoundsReadyState = {
              ...roundReadyState,
              readyUsers: [...readyUsers, user.id],
            };
            roomsReadyState.set(roomId, newRoundReadyState);
            callback({
              type: SC_ComType.Approve,
              comId,
              data: { ready: true },
            });

            // End round if all users ready
            if (newRoundReadyState.readyUsers.length === members.length) {
              const currentRound = rounds[rounds.length - 1];
              endRound(io, socket, roomId, rooms, clocks, currentRound);
            }
            return;
          }
        }

        case VoteActionType.SetVoteColor: {
          const { comId, data } = request;
          const { roomId, ticket } = data;
          if (!ticket) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "Ticket is not provided" },
            });
            return;
          }

          const existingRoom = rooms.get(roomId);
          if (!existingRoom) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "Room does not exist" },
            });
            return;
          }

          let { tickets } = existingRoom;
          const existingTicket = tickets.find(tick => tick.id === ticket.id);
          if (!existingTicket) {
            callback({
              type: SC_ComType.Reject,
              comId,
              data: { reason: "Ticket does not exist" },
            });
            return;
          }

          tickets = tickets.map(tick => (tick.id === ticket.id ? ticket : tick));
          callback({
            type: SC_ComType.Approve,
            comId,
            data: { ticket },
          });
          return;
        }

        default: {
          console.error(`Received unexpected signal: ${VoteActionType[type]}, ${request}`);
        }
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error(`Failed to properly handle: ${VoteActionType[type]}, ${request}:`, error);
      callback({
        type: SC_ComType.Reject,
        comId: request.comId,
        data: { reason: `Internal server error: ${error}` },
      });
    }
  };

  return { handler };
}
