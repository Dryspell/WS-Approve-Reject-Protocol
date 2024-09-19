import { CS_ComType, SC_ComType, serverSocket, SignalType, sServer } from "~/types/socket";
import { User } from "./chat";
import { createId } from "@paralleldrive/cuid2";

const DEFAULT_TICKET_COUNT = 3;
const DEFAULT_ROUND_INTERIM_LENGTH = 1000 * 10;
const DEFAULT_ROUND_LENGTH = (1000 * 60 * 1) / 4;

export enum TicketColor {
  Red,
  Blue,
  None,
}

export type Ticket = [ticketId: string, ticketOwner: User[0], ticketColor: TicketColor];

export enum OfferType {
  Buy,
  Sell,
  BuyPromise,
  SellPromise,
}
export type Offer = [offerId: string, offerOwner: User[0], offerType: OfferType, price: number];

export type GameRound = [
  roundNumber: number,
  startTime: number,
  endTime: number,
  roundResult: [previousTickets: Ticket[], newTickets: Ticket[]],
];

export type GameRoom = [
  roomId: string,
  roomName: string,
  members: User[],
  tickets: Ticket[],
  offers: Offer[],
  startTime: number | null,
  rounds: GameRound[],
];

export type RoundsReadyState = [roomId: string, round: number, readyUsers: User[0][]];

export enum VoteActionType {
  CreateOrJoinRoom,
  ToggleReadyGameStart,
  ToggleReadyRoundEnd,
  SetVoteColor,
  CreateOffer,
  AcceptOffer,
  Dev_DeleteRooms,
}

export enum SC_GameEventType {
  RoomCreated,
  UserJoinedRoom,
  UserToggleReadyGameStart,
  GameStart,
  GameEnd,
  RoundStart,
  RoundEnd,
}

export type VoteHandlerArgs =
  | [type: VoteActionType.Dev_DeleteRooms, request: [comId: string], callback: () => void]
  | [
      type: VoteActionType.CreateOrJoinRoom,
      request: [comId: string, data: [roomId: string, roomName: string, user: User]],
      callback: (
        returnData:
          | [
              returnType: SC_ComType.Approve,
              comId: string,
              returnData: [GameRoom, RoundsReadyState],
            ]
          | [returnType: SC_ComType.Reject, comId: string, returnData: [reason: string]],
      ) => void,
    ]
  | [
      type: VoteActionType.ToggleReadyGameStart,
      request: [comId: string, data: [roomId: string, user: User]],
      callback: (
        returnData:
          | [returnType: SC_ComType.Approve, comId: string, [ready: boolean]]
          | [returnType: SC_ComType.Reject, comId: string, returnData: [reason: string]],
      ) => void,
    ]
  | [
      type: VoteActionType.ToggleReadyRoundEnd,
      request: [comId: string, data: [roomId: string, user: User]],
      callback: (
        returnData:
          | [returnType: SC_ComType.Approve, comId: string, [ready: boolean]]
          | [returnType: SC_ComType.Reject, comId: string, returnData: [reason: string]],
      ) => void,
    ]
  | [
      type: VoteActionType.SetVoteColor,
      request: [comId: string, data: [roomId: string, ticket: Ticket]],
      callback: (
        returnData:
          | [returnType: SC_ComType.Approve, comId: string, returnData: [ticket: Ticket]]
          | [returnType: SC_ComType.Reject, comId: string, returnData: [reason: string]],
      ) => void,
    ];

const userHasPermissionToCreateRoom = (userId: string) => true;
const userHasPermissionToJoinRoom = (userId: string, roomId: string) => true;

function startRound(
  io: sServer,
  socket: serverSocket,
  roomId: string,
  rooms: Map<string, GameRoom>,
  clocks: Map<string, NodeJS.Timeout>,
  round: GameRound,
) {
  const [, startTime, endTime] = round;
  clocks.set(
    roomId,
    setInterval(() => {
      if (Date.now() > startTime) {
        clearInterval(clocks.get(roomId));
        io.to(roomId).emit(SignalType.Vote, [
          SC_GameEventType.RoundStart,
          createId(),
          [roomId, round],
        ]);

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
  // Calculate
  const colorSplit = tickets.reduce(
    (acc, ticket) => {
      const [ticketId, ticketOwner, ticketColor] = ticket;

      if (ticketColor !== TicketColor.None) {
        acc[ticketColor].push(ticket);
      }
      return acc;
    },
    { [TicketColor.Blue]: [], [TicketColor.Red]: [] } as Record<
      TicketColor.Blue | TicketColor.Red,
      Ticket[]
    >,
  );
  const { majorityColor, minorityColor } = (() => {
    const sort = Object.entries(colorSplit).sort((a, b) => b[1].length - a[1].length);
    return { majorityColor: sort[0][0], minorityColor: sort[1][0] };
  })();

  const newTickets = tickets.filter(
    ([ticketId, ticketOwner, ticketColor]) => ticketColor === minorityColor,
  );

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
  clearInterval(clocks.get(roomId));
  round[2] = Date.now();
  const [roundNumber, startTime, endTime] = round;
  const newRoundStart = Date.now() + 1000 * 10;

  const existingRoom = rooms.get(roomId);
  if (!existingRoom) {
    console.error(`Room ${roomId} no longer exists`);
    return;
  }
  const [, roomName, members, tickets, offers, , rounds] = existingRoom;

  const { newTickets } = calculateRoundResult(tickets);

  const newRound: GameRound = [
    roundNumber + 1,
    newRoundStart,
    newRoundStart + 1000 * 60 * 5,
    [tickets, newTickets],
  ];

  rounds.push(newRound);

  startRound(io, socket, roomId, rooms, clocks, newRound);

  io.to(roomId).emit(SignalType.Vote, [
    SC_GameEventType.RoundEnd,
    createId(),
    [roomId, round, newRound],
  ]);
}

export default function vote() {
  const rooms = new Map<string, GameRoom>();
  const roomsReadyState = new Map<string, RoundsReadyState>();
  const clocks = new Map<string, NodeJS.Timeout>();

  const handler =
    (socket: serverSocket, io: sServer) =>
    (...[type, request, callback]: VoteHandlerArgs) => {
      try {
        switch (type) {
          case VoteActionType.Dev_DeleteRooms: {
            rooms.clear();
            roomsReadyState.clear();

            console.log({ rooms });
            console.log({ roomsPreStart: roomsReadyState });
            callback();
            return;
          }

          case VoteActionType.CreateOrJoinRoom: {
            const [comId, [roomId, roomName, user]] = request;
            if (!user) {
              callback([SC_ComType.Reject, comId, ["User is not logged in"]]);
              return;
            }

            let existingRoom = rooms.get(roomId);
            if (!existingRoom && userHasPermissionToCreateRoom(user[0])) {
              const newRoom: GameRoom = [roomId, roomName, [user], [], [], null, []];
              rooms.set(roomId, newRoom);
              socket.join(roomId);
              socket.broadcast.emit(SignalType.Vote, [
                SC_GameEventType.RoomCreated,
                comId,
                newRoom,
              ]);

              const roomPreStart: RoundsReadyState = [roomId, 0, []];
              roomsReadyState.set(roomId, roomPreStart);

              callback([SC_ComType.Approve, comId, [newRoom, roomPreStart]]);
            } else if (!existingRoom && !userHasPermissionToCreateRoom(user[0])) {
              callback([
                SC_ComType.Reject,
                comId,
                ["User does not have permission to create room"],
              ]);
            } else if (existingRoom && userHasPermissionToJoinRoom(user[0], roomId)) {
              let [roomId, roomName, members, tickets, offers, startTime, rounds] = existingRoom;
              // const newRoom: GameRoom = [
              //   roomId,
              //   roomName,
              //   Array.from(new Set([...members, user].map(user => user[0]))).map(userId => [
              //     userId,
              //     [...members, user].find(member => member[0] === userId)?.[1] ?? "Unknown User",
              //   ]),
              //   tickets,
              //   offers,
              //   startTime,
              //   rounds,
              // ];
              members = Array.from(new Set([...members, user].map(user => user[0]))).map(userId => [
                userId,
                [...members, user].find(member => member[0] === userId)?.[1] ?? "Unknown User",
              ]);
              const newRoom: GameRoom = [
                roomId,
                roomName,
                members,
                tickets,
                offers,
                startTime,
                rounds,
              ];
              rooms.set(roomId, newRoom);
              socket.join(roomId);
              socket.broadcast.emit(SignalType.Vote, [
                SC_GameEventType.UserJoinedRoom,
                comId,
                [roomId, user],
              ]);

              const roomPreStart = roomsReadyState.get(roomId) ?? [roomId, 0, []];

              callback([SC_ComType.Approve, comId, [newRoom, roomPreStart]]);
            }

            break;
          }

          case VoteActionType.ToggleReadyGameStart: {
            const [comId, [roomId, user]] = request;
            if (!user) {
              callback([SC_ComType.Reject, comId, ["User is not logged in"]]);
              return;
            }

            const existingRoom = rooms.get(roomId);
            if (!existingRoom) {
              callback([SC_ComType.Reject, comId, ["Room does not exist"]]);
              return;
            }

            const [, roomName, members, tickets, offers, startTime] = existingRoom;
            if (!members.find(([userId]) => userId === user[0])) {
              callback([SC_ComType.Reject, comId, ["User is not in room"]]);
              return;
            }

            const roomPreStart = roomsReadyState.get(roomId);
            if (!roomPreStart) {
              callback([SC_ComType.Reject, comId, ["Room is not in pre-start state"]]);
              return;
            }

            const [roomIdPreStart, roundNumber, readyUsers] = roomPreStart;
            if (readyUsers.find(userId => userId === user[0])) {
              roomsReadyState.set(roomId, [
                roomIdPreStart,
                roundNumber,
                readyUsers.filter(userId => userId !== user[0]),
              ]);
              callback([SC_ComType.Approve, comId, [false]]);
              socket.broadcast.emit(SignalType.Vote, [
                SC_GameEventType.UserToggleReadyGameStart,
                comId,
                [roomId, user, false],
              ]);
              return;
            } else {
              const newPreStart: RoundsReadyState = [roomIdPreStart, 0, [...readyUsers, user[0]]];
              roomsReadyState.set(roomId, newPreStart);
              callback([SC_ComType.Approve, comId, [true]]);
              socket.broadcast.emit(SignalType.Vote, [
                SC_GameEventType.UserToggleReadyGameStart,
                comId,
                [roomId, user, true],
              ]);
              
              // Start game if all users are ready
              if (newPreStart[2].length === members.length) {
                console.log(`All users are ready in room ${roomId}`);
                const startTime = Date.now() + DEFAULT_ROUND_INTERIM_LENGTH;
                const newRound: GameRound = [
                  1,
                  startTime,
                  startTime + DEFAULT_ROUND_LENGTH,
                  [tickets, []],
                ];

                startRound(io, socket, roomId, rooms, clocks, newRound);
                const newRoom: GameRoom = [
                  roomId,
                  roomName,
                  members,
                  members
                    .map(([userId]) =>
                      Array.from(
                        { length: DEFAULT_TICKET_COUNT },
                        () => [createId(), userId, TicketColor.None] as Ticket,
                      ),
                    )
                    .flat(),
                  offers,
                  startTime,
                  [newRound],
                ];
                rooms.set(roomId, newRoom);
                io.to(roomId).emit(SignalType.Vote, [SC_GameEventType.GameStart, comId, newRoom]);
              }
              return;
            }
          }

          case VoteActionType.ToggleReadyRoundEnd: {
            const [comId, [roomId, user]] = request;
            if (!user) {
              callback([SC_ComType.Reject, comId, ["User is not logged in"]]);
              return;
            }

            const existingRoom = rooms.get(roomId);
            if (!existingRoom) {
              callback([SC_ComType.Reject, comId, ["Room does not exist"]]);
              return;
            }

            const [, roomName, members, tickets, offers, startTime, rounds] = existingRoom;
            if (!members.find(([userId]) => userId === user[0])) {
              callback([SC_ComType.Reject, comId, ["User is not in room"]]);
              return;
            }

            const roundReadyState = roomsReadyState.get(roomId);
            if (!roundReadyState) {
              callback([SC_ComType.Reject, comId, ["Room is not in pre-start state"]]);
              return;
            }

            const [, roundNumber, readyUsers] = roundReadyState;
            if (readyUsers.find(userId => userId === user[0])) {
              roomsReadyState.set(roomId, [
                roomId,
                roundNumber,
                readyUsers.filter(userId => userId !== user[0]),
              ]);
              callback([SC_ComType.Approve, comId, [false]]);
              return;
            } else {
              const newRoundReadyState: RoundsReadyState = [
                roomId,
                roundNumber,
                [...readyUsers, user[0]],
              ];
              roomsReadyState.set(roomId, newRoundReadyState);
              callback([SC_ComType.Approve, comId, [true]]);

              // End round if all users ready
              if (newRoundReadyState[2].length === members.length) {
                console.log(`All users are ready in room ${roomId}`);
                const currentRound = rounds[rounds.length - 1];
                endRound(io, socket, roomId, rooms, clocks, currentRound);
              }
              return;
            }
          }

          case VoteActionType.SetVoteColor: {
            const [comId, [roomId, ticket]] = request;
            const [ticketId, ticketOwner, ticketColor] = ticket;
            if (!ticket) {
              callback([SC_ComType.Reject, comId, ["Ticket is not provided"]]);
              return;
            }

            const existingRoom = rooms.get(roomId);
            if (!existingRoom) {
              callback([SC_ComType.Reject, comId, ["Room does not exist"]]);
              return;
            }

            let [, roomName, members, tickets, offers, startTime, rounds] = existingRoom;
            const existingTicket = tickets.find(([tickId]) => tickId === ticketId);
            if (!existingTicket) {
              callback([SC_ComType.Reject, comId, ["Ticket does not exist"]]);
              return;
            }

            // const newRoom: GameRoom = [
            //   roomId,
            //   roomName,
            //   members,
            //   tickets.map(tick => (tick[0] === ticketId ? ticket : tick)),
            //   offers,
            //   startTime,
            //   rounds,
            // ];
            // rooms.set(roomId, newRoom);
            tickets = tickets.map(tick => (tick[0] === ticketId ? ticket : tick));
            callback([SC_ComType.Approve, comId, [ticket]]);
            return;
          }

          default: {
            console.error(`Received unexpected signal: ${VoteActionType[type]}, ${request}`);
          }
        }
      } catch (e) {
        console.error(
          `Failed to properly handle: ${VoteActionType[type]}, ${request}:`,
          e instanceof Error ? e.message : e,
        );
      }
    };

  return { handler };
}
