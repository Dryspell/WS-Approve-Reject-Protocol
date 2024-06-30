import { CS_ComType, SC_ComType, serverSocket, SignalType } from "~/types/socket";
import { User } from "./chat";

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
  ReadyGameStart,
  SetVoteColor,
  CreateOffer,
  AcceptOffer,
}

export type VoteHandlerArgs =
  | [
      type: VoteActionType.CreateOrJoinRoom,
      request: [comId: string, data: [roomId: string, roomName: string, user: User]],
      callback: (
        returnData:
          | [returnType: SC_ComType.Approve, comId: string, returnData: GameRoom]
          | [returnType: SC_ComType.Reject, comId: string, returnData: [reason: string]],
      ) => void,
    ]
  | [
      type: VoteActionType.ReadyGameStart,
      request: [comId: string, data: [roomId: string, user: User]],
      callback: (
        returnData:
          | [returnType: SC_ComType.Approve, comId: string]
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
              socket.broadcast.emit(SignalType.Vote, [SC_ComType.Set, roomId, newRoom]);
              callback([SC_ComType.Approve, comId, newRoom]);
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
              socket.broadcast.emit(SignalType.Vote, [SC_ComType.Set, roomId, newRoom]);

              callback([SC_ComType.Approve, comId, newRoom]);
            }

            break;
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
