import { ChatActionType } from "~/hooks/useChat";
import {
	CS_ComType,
	SC_ComType,
	serverSocket,
	SignalType,
} from "~/types/socket";

export type User = [userId: string, userName: string];
export type Message = [senderId: string, message: string];
export type Room = [
	roomId: string,
	roomName: string,
	memberIds: string[],
	messages: Message[]
];

export default function chat() {
	const rooms = new Map<string, Room>();

	const handler =
		(socket: serverSocket) =>
		([type, comId, data]: [
			type: ChatActionType.CreateOrJoinRoom,
			comId: string,
			data: [roomId: string, roomName: string, userId: string]
		]) => {
			switch (type) {
				case ChatActionType.CreateOrJoinRoom: {
					const [roomId, roomName, userId] = data;
					const existingRoom = rooms.get(roomId);
					if (!existingRoom) {
						const roomData: Room = [roomId, roomName, [userId], []];
						rooms.set(roomId, roomData);
						socket.emit(SignalType.Chat, [
							SC_ComType.Approve,
							comId,
							roomData,
						]);
					} else {
						socket.emit(SignalType.Chat, [
							SC_ComType.Approve,
							comId,
							existingRoom,
						]);
					}
					break;
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
