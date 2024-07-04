import { CS_ComType, SC_ComType, serverSocket, SignalType } from "~/types/socket";
import { User } from "./chat";
import { createId } from "@paralleldrive/cuid2";

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

export type GameRoom = [
  roomId: string,
  roomName: string,
  members: User[],
  tickets: Ticket[],
  offers: Offer[],
  startTime: number | null,
];

export type GameRoomPreStart = [roomId: string, readyUsers: User[0][]];

export enum VoteActionType {
  CreateOrJoinRoom,
  ToggleReadyGameStart,
  SetVoteColor,
  CreateOffer,
  AcceptOffer,
  Dev_DeleteRooms,
}

export enum SC_GameEventType {
  RoomCreated,
  UserJoinedRoom,
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
              returnData: [GameRoom, GameRoomPreStart],
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

export default function vote() {
  const rooms = new Map<string, GameRoom>();
  const roomsPreStart = new Map<string, GameRoomPreStart>();

  const handler =
    (socket: serverSocket) =>
    (...[type, request, callback]: VoteHandlerArgs) => {
      try {
        switch (type) {
          case VoteActionType.Dev_DeleteRooms: {
            rooms.clear();
            roomsPreStart.clear();

            console.log({ rooms });
            console.log({ roomsPreStart });
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
              const newRoom: GameRoom = [roomId, roomName, [user], [], [], null];
              rooms.set(roomId, newRoom);
              socket.join(roomId);
              socket.broadcast.emit(SignalType.Vote, [
                SC_GameEventType.RoomCreated,
                comId,
                newRoom,
              ]);

              const roomPreStart: GameRoomPreStart = [roomId, [user[0]]];
              roomsPreStart.set(roomId, roomPreStart);

              callback([SC_ComType.Approve, comId, [newRoom, roomPreStart]]);
            } else if (!existingRoom && !userHasPermissionToCreateRoom(user[0])) {
              callback([
                SC_ComType.Reject,
                comId,
                ["User does not have permission to create room"],
              ]);
            } else if (existingRoom && userHasPermissionToJoinRoom(user[0], roomId)) {
              const [roomId, roomName, members, tickets, offers, startTime] = existingRoom;
              const newRoom: GameRoom = [
                roomId,
                roomName,
                Array.from(new Set([...members, user].map(user => user[0]))).map(userId => [
                  userId,
                  [...members, user].find(member => member[0] === userId)?.[1] ?? "Unknown User",
                ]),
                tickets,
                offers,
                startTime,
              ];
              rooms.set(roomId, newRoom);
              socket.join(roomId);
              socket.broadcast.emit(SignalType.Vote, [
                SC_GameEventType.RoomCreated,
                comId,
                newRoom,
              ]);

              const roomPreStart = roomsPreStart.get(roomId) ?? [roomId, [user[0]]];

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

            const roomPreStart = roomsPreStart.get(roomId);
            if (!roomPreStart) {
              callback([SC_ComType.Reject, comId, ["Room is not in pre-start state"]]);
              return;
            }

            const [roomIdPreStart, readyUsers] = roomPreStart;
            if (readyUsers.find(userId => userId === user[0])) {
              roomsPreStart.set(roomId, [
                roomIdPreStart,
                readyUsers.filter(userId => userId !== user[0]),
              ]);
              callback([SC_ComType.Approve, comId, [false]]);
              return;
            } else {
              const newPreStart: GameRoomPreStart = [roomIdPreStart, [...readyUsers, user[0]]];
              roomsPreStart.set(roomId, newPreStart);
              callback([SC_ComType.Approve, comId, [true]]);
              if (newPreStart[1].length === members.length) {
                const newRoom: GameRoom = [
                  roomId,
                  roomName,
                  members,
                  members
                    .map(([userId]) =>
                      Array.from(
                        { length: 3 },
                        () => [createId(), userId, TicketColor.None] as Ticket,
                      ),
                    )
                    .flat(),
                  offers,
                  Date.now() + 1000 * 10,
                ];
                rooms.set(roomId, newRoom);
                socket.emit(SignalType.Vote, [SC_GameEventType.GameStart, comId, newRoom]);
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

            const [, roomName, members, tickets, offers, startTime] = existingRoom;
            const existingTicket = tickets.find(([tickId]) => tickId === ticketId);
            if (!existingTicket) {
              callback([SC_ComType.Reject, comId, ["Ticket does not exist"]]);
              return;
            }

            const newRoom: GameRoom = [
              roomId,
              roomName,
              members,
              tickets.map(tick => (tick[0] === ticketId ? ticket : tick)),
              offers,
              startTime,
            ];
            rooms.set(roomId, newRoom);
            callback([SC_ComType.Approve, comId, [ticket]]);
            return;
          }

          default: {
            console.error(`Received unexpected signal: ${CS_ComType[type]}, ${request}`);
          }
        }
      } catch (e) {
        console.error(
          `Failed to properly handle: ${CS_ComType[type]}, ${request}:`,
          e instanceof Error ? e.message : e,
        );
      }
    };

  return { handler };
}
