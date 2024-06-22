import { ChatActionType } from "~/hooks/useChat";
import {
	CS_ComType,
	SC_ComType,
	serverSocket,
	SignalType,
} from "~/types/socket";

export type User = [userId: string, userName: string];
export type Message = [
	senderId: string,
	roomId: string,
	timestamp: number,
	message: string
];
export type Room = [
	roomId: string,
	roomName: string,
	memberIds: string[],
	messages: Message[],
	permissions: string[]
];

export type ChatHandlerArgs =
	| [
			type: ChatActionType.CreateOrJoinRoom,
			request: [
				comId: string,
				data: [roomId: string, roomName: string, userId: string]
			],
			callback: (
				returnData:
					| [
							returnType: SC_ComType.Approve,
							comId: string,
							returnData: Room
					  ]
					| [
							returnType: SC_ComType.Reject,
							comId: string,
							returnData: [reason: string]
					  ]
			) => void
	  ]
	| [
			type: ChatActionType.SendMessage,
			request: [comId: string, data: [message: Message]],
			callback: (
				returnData:
					| [returnType: SC_ComType.Approve, comId: string]
					| [
							returnType: SC_ComType.Reject,
							comId: string,
							returnData: [reason: string]
					  ]
			) => void
	  ];

const userHasPermissionToCreateRoom = (userId: string) => true;
const userHasPermissionToJoinRoom = (userId: string, roomId: string) => true;
const userHasPermissionToSendMessage = (userId: string, roomId: string) => true;

export default function chat() {
	const rooms = new Map<string, Room>();

	const handler =
		(socket: serverSocket) =>
		(...[type, request, callback]: ChatHandlerArgs) => {
			switch (type) {
				case ChatActionType.CreateOrJoinRoom: {
					const [comId, data] = request;
					const [roomId, roomName, userId] = data;

					const existingRoom = rooms.get(roomId);
					console.log(
						`Received request to create or join room: ${roomId}, ${roomName}, ${userId}`
					);

					if (
						!existingRoom &&
						userHasPermissionToCreateRoom(userId)
					) {
						const roomData: Room = [
							roomId,
							roomName,
							[userId],
							[],
							[],
						];
						rooms.set(roomId, roomData);
						callback([SC_ComType.Approve, comId, roomData]);
						socket.broadcast.emit(SignalType.Chat, [
							SC_ComType.Set,
							comId,
							roomData,
						]);
					} else if (
						!existingRoom &&
						!userHasPermissionToCreateRoom(userId)
					) {
						callback([
							SC_ComType.Reject,
							comId,
							["Permission denied to create room"],
						]);
					} else if (
						existingRoom &&
						userHasPermissionToJoinRoom(userId, roomId)
					) {
						callback([SC_ComType.Approve, comId, existingRoom]);
					} else if (
						existingRoom &&
						!userHasPermissionToJoinRoom(userId, roomId)
					) {
						callback([
							SC_ComType.Reject,
							comId,
							["Permission denied to join room"],
						]);
					}
					break;
				}

				case ChatActionType.SendMessage: {
					const [comId, data] = request;
					const [[senderId, roomId, timestamp, message]] = data;
					const room = rooms.get(roomId);

					if (!room) {
						callback([
							SC_ComType.Reject,
							comId,
							["Room does not exist"],
						]);
						break;
					}

					if (userHasPermissionToSendMessage(senderId, roomId)) {
						room?.[3].push([senderId, roomId, timestamp, message]);
						rooms.set(roomId, room);
						callback([SC_ComType.Approve, comId]);
						socket.broadcast.emit(SignalType.Chat, [
							SC_ComType.Delta,
							comId,
							[senderId, roomId, timestamp, message],
						]);
						break;
					}
				}

				default: {
					console.error(
						`Received unexpected signal: ${CS_ComType[type]}, ${request}`
					);
				}
			}
		};

	return { rooms, handler };
}
