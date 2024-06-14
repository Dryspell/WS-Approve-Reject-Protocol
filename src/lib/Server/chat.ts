import {
	CS_ComType,
	SC_ComType,
	serverSocket,
	SignalType,
} from "~/types/socket";

export type Message = [sender: string, message: string];

export default function chat() {
	const rooms = new Map<string, Message[]>();

	const handler =
		(socket: serverSocket) =>
		([type, comId, data]: [
			type: CS_ComType.GetOrCreate,
			comId: string,
			data: [room: string]
		]) => {
			switch (type) {
				case CS_ComType.GetOrCreate: {
					const [room] = data;
					const messages = rooms.get(room);
					if (messages === undefined) {
						rooms.set(room, []);
						socket.emit(SignalType.Chat, [
							SC_ComType.Approve,
							comId,
							[] as Message[],
						]);
					} else {
						socket.emit(SignalType.Chat, [
							SC_ComType.Approve,
							comId,
							messages,
						]);
					}
					break;
				}
			}
		};

	return { rooms, handler };
}
