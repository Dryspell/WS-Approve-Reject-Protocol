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

const userHasPermissionToCreateRoom = (userId: string) => true;
const userHasPermissionToJoinRoom = (userId: string, roomId: string) => true;
const userHasPermissionToSendMessage = (userId: string, roomId: string) => true;

export default function chat() {
	const rooms = new Map<string, Room>();

	const handler =
		(socket: serverSocket) =>
		([type, comId, data]:
			| [
					type: ChatActionType.CreateOrJoinRoom,
					comId: string,
					data: [roomId: string, roomName: string, userId: string]
			  ]
			| [
					type: ChatActionType.SendMessage,
					comId: string,
					data: [message: Message]
			  ]) => {
			switch (type) {
				case ChatActionType.CreateOrJoinRoom: {
					const [roomId, roomName, userId] = data;

					const existingRoom = rooms.get(roomId);

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
						socket.emit(SignalType.Chat, [
							SC_ComType.Approve,
							comId,
							roomData,
						]);
						socket.broadcast.emit(SignalType.Chat, [
							SC_ComType.Set,
							comId,
							roomData,
						]);
					} else if (
						!existingRoom &&
						!userHasPermissionToCreateRoom(userId)
					) {
						socket.emit(SignalType.Chat, [
							SC_ComType.Reject,
							comId,
							["Permission denied to create room"],
						]);
					} else if (
						existingRoom &&
						userHasPermissionToJoinRoom(userId, roomId)
					) {
						socket.emit(SignalType.Chat, [
							SC_ComType.Approve,
							comId,
							existingRoom,
						]);
					} else if (
						existingRoom &&
						!userHasPermissionToJoinRoom(userId, roomId)
					) {
						socket.emit(SignalType.Chat, [
							SC_ComType.Reject,
							comId,
							["Permission denied to join room"],
						]);
					}
					break;
				}

				case ChatActionType.SendMessage: {
					const [[senderId, roomId, timestamp, message]] = data;
					const room = rooms.get(roomId);

					if (!room) {
						socket.emit(SignalType.Chat, [
							SC_ComType.Reject,
							comId,
							["Room does not exist"],
						]);
						break;
					}

					if (userHasPermissionToSendMessage(senderId, roomId)) {
						room?.[3].push([senderId, roomId, timestamp, message]);
						rooms.set(roomId, room);
						socket.emit(SignalType.Chat, [
							SC_ComType.Approve,
							comId,
						]);
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
						`Received unexpected signal: ${CS_ComType[type]}, ${comId}, ${data}`
					);
				}
			}
		};

	return { rooms, handler };
}
