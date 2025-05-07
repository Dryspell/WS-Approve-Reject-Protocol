import { SC_ComType, serverSocket, SignalType, sServer, ChatActionRequest, ChatActionResponse, ChatActionType } from "~/types/socket";
import { User } from "~/types/user";
import { dbService } from "./db";
import { Message } from "~/types/chat";

export type ChatRoom = {
  roomId: string;
  roomName: string;
  members: User[];
  messages: Message[];
  permissions: string[];
};

type ChatHandlerArgs = {
  type: ChatActionType;
  request: ChatActionRequest<ChatActionType>;
  callback: (
    returnData: ChatActionResponse<ChatActionType> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }
  ) => void;
};

const userHasPermissionToCreateRoom = (userId: string) => true;
const userHasPermissionToJoinRoom = (userId: string, roomId: string) => true;
const userHasPermissionToSendMessage = (userId: string, roomId: string) => true;

export const chatHandler = (socket: serverSocket) => {
  return async (
    request: ChatActionRequest<ChatActionType>,
    callback: (error: Error | null, response: ChatActionResponse<ChatActionType>) => void
  ) => {
    const { type, comId, data } = request;

    try {
      switch (type) {
        case ChatActionType.SendMessage: {
          const { message } = data as { message: Message };
          
          // Save message to database
          await dbService.saveMessage(message);

          // Broadcast the message to all clients in the room
          socket.to(message.roomId).emit(SignalType.Chat, {
            type: SC_ComType.Delta,
            comId,
            data: message,
          });

          callback(null, {
            type: SC_ComType.Approve,
            comId,
            data: { success: true },
          } as ChatActionResponse<ChatActionType.SendMessage>);
          break;
        }

        case ChatActionType.GetMessages: {
          const { roomId, limit } = data as { roomId: string; limit?: number };
          
          // Get messages from database
          const messages = await dbService.getMessages(roomId, limit);

          callback(null, {
            type: SC_ComType.Approve,
            comId,
            data: { messages },
          } as ChatActionResponse<ChatActionType.GetMessages>);
          break;
        }

        default:
          callback(null, {
            type: SC_ComType.Reject,
            comId,
            data: { reason: `Unknown chat action type: ${type}` },
          });
      }
    } catch (error) {
      console.error(`Failed to handle chat action: ${type}, ${comId}:`, error);
      callback(null, {
        type: SC_ComType.Reject,
        comId,
        data: { reason: error instanceof Error ? error.message : "Unknown error" },
      });
    }
  };
};

export default function chat() {
  const rooms = new Map<string, ChatRoom>();

  const handler =
    (socket: serverSocket, io: sServer) =>
    async ({ type, request, callback }: ChatHandlerArgs) => {
      try {
        switch (type) {
          case ChatActionType.SendMessage: {
            const { comId, data } = request;
            const { message } = data as { message: Message };
            const room = rooms.get(message.roomId);

            if (!room) {
              callback({ type: SC_ComType.Reject, comId, data: { reason: "Room does not exist" } });
              break;
            }

            if (userHasPermissionToSendMessage(message.senderId, message.roomId)) {
              // Save message to database
              await dbService.saveMessage(message);
              
              // Update in-memory room state
              room.messages.push(message);
              rooms.set(message.roomId, room);
              
              callback({ 
                type: SC_ComType.Approve, 
                comId,
                data: { success: true }
              });
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

          case ChatActionType.GetMessages: {
            const { comId, data } = request;
            const { roomId, limit } = data as { roomId: string; limit?: number };
            const room = rooms.get(roomId);

            if (!room) {
              callback({ type: SC_ComType.Reject, comId, data: { reason: "Room does not exist" } });
              break;
            }

            // Get messages from database
            const dbMessages = await dbService.getMessages(roomId, limit);
            // Convert null roundNumber to undefined
            const messages: Message[] = dbMessages.map(msg => ({
              ...msg,
              roundNumber: msg.roundNumber ?? undefined
            }));
            room.messages = messages;
            rooms.set(roomId, room);

            callback({ 
              type: SC_ComType.Approve, 
              comId,
              data: { messages }
            });
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
