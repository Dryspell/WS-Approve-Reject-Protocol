import { ChatActionType } from "~/components/Chat";
import {
	CS_ComType,
	SC_ComType,
	serverSocket,
	SignalType,
} from "~/types/socket";

export type User = [userId: string, userName: string, avatarUrl?: string];
export type Message = [
	senderId: string,
	roomId: string,
	timestamp: number,
	message: string
];
export type Room = [
	roomId: string,
	roomName: string,
	members: User[],
	messages: Message[],
	permissions: string[]
];

export type ChatHandlerArgs =
	| [
			type: ChatActionType.CreateOrJoinRoom,
			request: [
				comId: string,
				data: [roomId: string, roomName: string, user: User]
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
					const [roomId, roomName, user] = data;

					const existingRoom = rooms.get(roomId);
					console.log(
						`Received request to create or join room: ${roomId}, ${roomName}, ${user}`
					);

					if (
						!existingRoom &&
						userHasPermissionToCreateRoom(user[0])
					) {
						const roomData: Room = [
							roomId,
							roomName,
							[user],
							[],
							[],
						];
						rooms.set(roomId, roomData);
						socket.join(roomId);

						callback([SC_ComType.Approve, comId, roomData]);
						socket.broadcast.emit(SignalType.Chat, [
							SC_ComType.Set,
							comId,
							roomData,
						]);
					} else if (
						!existingRoom &&
						!userHasPermissionToCreateRoom(user[0])
					) {
						callback([
							SC_ComType.Reject,
							comId,
							["Permission denied to create room"],
						]);
					} else if (
						existingRoom &&
						userHasPermissionToJoinRoom(user[0], roomId)
					) {
						socket.join(roomId);
						const [, roomName, members, messages, permissions] =
							existingRoom;
						const updatedRoom: Room = [
							roomId,
							roomName,
							Array.from(
								new Set(
									[...members, user].map((user) => user[0])
								)
							).map((userId) => [
								userId,
								[...members, user].find(
									(member) => member[0] === userId
								)?.[1] ?? "Unknown User",
							]),
							messages,
							permissions,
						];
						rooms.set(roomId, updatedRoom);

						callback([SC_ComType.Approve, comId, updatedRoom]);
						socket.broadcast.emit(SignalType.Chat, [
							SC_ComType.Set,
							comId,
							updatedRoom,
						]);
					} else if (
						existingRoom &&
						!userHasPermissionToJoinRoom(user[0], roomId)
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
						socket
							.to(roomId)
							.emit(SignalType.Chat, [
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
