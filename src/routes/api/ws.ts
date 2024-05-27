import { type APIEvent } from "@solidjs/start/server";
import { Server } from "socket.io";
import {
	CA,
	SA,
	SC_ComType,
	type SocketWithIO,
	type sServer,
} from "~/types/socket";

const prohibitedWords = ["fish", "cat", "dog"];

export async function GET({ request, nativeEvent }: APIEvent) {
	const socket = nativeEvent.node.res.socket as SocketWithIO | null;
	if (!socket) return;
	if (socket.server.io) {
		console.log("Socket is already running " + request.url, request);
	} else {
		console.log("Initializing Socket");

		const io: sServer = new Server(socket.server, {
			path: "/api/ws",
		});

		socket.server.io = io;

		const users: Record<string, { name: string }> = {};
		const counters = new Map<string, number>();

		io.on("connection", (socket) => {
			socket.on(CA.NewUser, ([type, communicationId], [name]) => {
				users[socket.id] = { ...users[socket.id], name };
				socket.emit(CA.NewUser, [SC_ComType.Approve, communicationId]);
				socket.broadcast.emit(
					SA.UserConnected,
					[SC_ComType.Announce],
					[name]
				);
			});

			socket.on(CA.Disconnect, () => {
				users[socket.id]?.name &&
					socket.broadcast.emit(
						SA.UserDisconnected,
						[SC_ComType.Announce],
						[users[socket.id].name]
					);
				delete users[socket.id];
			});

			socket.on(
				CA.SendChatMessage,
				([type, communicationId], [message]) => {
					if (
						prohibitedWords.some((word) => message.includes(word))
					) {
						socket.emit(CA.SendChatMessage, [
							SC_ComType.Reject,
							communicationId,
						]);
						return;
					} else {
						socket.emit(CA.SendChatMessage, [
							SC_ComType.Approve,
							communicationId,
						]);
						socket.broadcast.emit(
							SA.ChatMessage,
							[SC_ComType.Announce],
							[message, users[socket.id].name]
						);
					}
				}
			);

			socket.on(CA.Move, ([type, communicationId], [unitData]) => {
				socket.emit(CA.Move, [SC_ComType.Approve, communicationId]);
				socket.broadcast.emit(
					SA.Move,
					[SC_ComType.Announce],
					[unitData]
				);
			});

			socket.on(CA.InitCounter, ([type, communicationId], [sigId]) => {
				const counter = counters.get(sigId);
				if (counter === undefined) {
					counters.set(sigId, 0);
					socket.emit(
						CA.InitCounter,
						[SC_ComType.Approve, communicationId],
						[0]
					);
				} else {
					socket.emit(
						CA.InitCounter,
						[SC_ComType.Approve, communicationId],
						[counter]
					);
				}
			});

			socket.on(
				CA.Increment,
				([type, communicationId], [sigId, amount]) => {
					const counter = counters.get(sigId);
					if (counter === undefined) {
					} else {
						const newAmount = counter + amount;

						counters.set(sigId, newAmount);
						socket.emit(CA.Increment, [
							SC_ComType.Approve,
							communicationId,
						]);

						socket.broadcast.emit(
							SA.Increment,
							[SC_ComType.Announce],
							[sigId, newAmount]
						);
					}
				}
			);

			socket.on(
				CA.Decrement,
				([type, communicationId], [sigId, amount]) => {
					const counter = counters.get(sigId);
					if (counter === undefined) {
					} else {
						const newAmount = counter - amount;

						counters.set(sigId, newAmount);
						socket.emit(CA.Decrement, [
							SC_ComType.Approve,
							communicationId,
						]);

						socket.broadcast.emit(
							SA.Decrement,
							[SC_ComType.Announce],
							[sigId, newAmount]
						);
					}
				}
			);
		});

		return new Response();
	}
}
