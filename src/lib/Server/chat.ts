import { SC_ComType, serverSocket, SignalType, sServer, ChatActionRequest, ChatActionResponse } from "~/types/socket";
import { User } from "~/types/user";

export type Message = {
  senderId: string;
  roomId: string;
  timestamp: number;
  message: string;
};

export type ChatRoom = {
  roomId: string;
  roomName: string;
  members: User[];
  messages: Message[];
  permissions: string[];
};

type CreateRoomHandlerArgs = {
  type: "CreateOrJoinRoom";
  request: ChatActionRequest<"CreateOrJoinRoom">;
  callback: (
    returnData: ChatActionResponse<"CreateOrJoinRoom"> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }
  ) => void;
};

type SendMessageHandlerArgs = {
  type: "SendMessage";
  request: ChatActionRequest<"SendMessage">;
  callback: (
    returnData: ChatActionResponse<"SendMessage"> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }
  ) => void;
};

type ChatHandlerArgs = CreateRoomHandlerArgs | SendMessageHandlerArgs;

const userHasPermissionToCreateRoom = (userId: string) => true;
const userHasPermissionToJoinRoom = (userId: string, roomId: string) => true;
const userHasPermissionToSendMessage = (userId: string, roomId: string) => true;

export default function chat() {
  const rooms = new Map<string, ChatRoom>();

  const handler =
    (socket: serverSocket, io: sServer) =>
    ({ type, request, callback }: ChatHandlerArgs) => {
      try {
        switch (type) {
          case "CreateOrJoinRoom": {
            const { comId, data } = request;
            const { roomId, roomName, user } = data;

            const existingRoom = rooms.get(roomId);
            console.log(`Received request to create or join room: ${roomId}, ${roomName}, ${user}`);

            if (!existingRoom && userHasPermissionToCreateRoom(user.id)) {
              const roomData: ChatRoom = {
                roomId,
                roomName,
                members: [user],
                messages: [],
                permissions: []
              };
              rooms.set(roomId, roomData);
              socket.join(roomId);

              callback({ type: SC_ComType.Approve, comId, data: roomData });
              socket.broadcast.emit(SignalType.Chat, { type: SC_ComType.Set, comId, data: roomData });
            } else if (!existingRoom && !userHasPermissionToCreateRoom(user.id)) {
              callback({ type: SC_ComType.Reject, comId, data: { reason: "Permission denied to create room" } });
            } else if (existingRoom && userHasPermissionToJoinRoom(user.id, roomId)) {
              socket.join(roomId);
              const updatedRoom: ChatRoom = {
                roomId,
                roomName: existingRoom.roomName,
                members: Array.from(
                  new Set([...existingRoom.members, user].map(user => user.id))
                ).map(userId => {
                  const foundUser = [...existingRoom.members, user].find(member => member.id === userId);
                  return {
                    id: userId,
                    username: foundUser?.username ?? "Unknown User"
                  };
                }),
                messages: existingRoom.messages,
                permissions: existingRoom.permissions
              };
              rooms.set(roomId, updatedRoom);

              callback({ type: SC_ComType.Approve, comId, data: updatedRoom });
              socket.broadcast.emit(SignalType.Chat, { type: SC_ComType.Set, comId, data: updatedRoom });
            } else if (existingRoom && !userHasPermissionToJoinRoom(user.id, roomId)) {
              callback({ type: SC_ComType.Reject, comId, data: { reason: "Permission denied to join room" } });
            }
            break;
          }

          case "SendMessage": {
            const { comId, data } = request;
            const { message } = data;
            const room = rooms.get(message.roomId);

            if (!room) {
              callback({ type: SC_ComType.Reject, comId, data: { reason: "Room does not exist" } });
              break;
            }

            if (userHasPermissionToSendMessage(message.senderId, message.roomId)) {
              room.messages.push(message);
              rooms.set(message.roomId, room);
              callback({ type: SC_ComType.Approve, comId });
              io.to(message.roomId).emit(SignalType.Chat, {
                type: SC_ComType.Delta,
                comId,
                data: message
              });
            } else {
              callback({ type: SC_ComType.Reject, comId, data: { reason: "Permission denied to send message" } });
            }
            break;
          }

          default: {
            // This type should never be reached due to exhaustive type checking
            const _exhaustiveCheck: never = type;
            console.error(`Received unexpected signal type: ${_exhaustiveCheck}`);
          }
        }
      } catch (e) {
        console.error(
          `Failed to properly handle: ${type}, ${JSON.stringify(request)}:`,
          e instanceof Error ? e.message : e,
        );
      }
    };

  return { rooms, handler };
}
