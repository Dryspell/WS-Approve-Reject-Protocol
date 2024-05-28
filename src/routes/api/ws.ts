import { type APIEvent } from "@solidjs/start/server";
import { Server } from "socket.io";
import {
	CS_CommunicationType,
	SC_ComType,
	serverSocket,
	SignalType,
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

		const signals = new Map<string, number>();
		const defaultValue = 0;

		io.on("connection", (socket) => {
			console.log("Connection");

			socket.on(SignalType.Counter, (params) => {
				console.log({ params });
				const [type, comId, data] = params;

				switch (type) {
					case CS_CommunicationType.Get: {
						socket.emit(SignalType.Counter, [
							SC_ComType.Approve,
							comId,
							[Object.fromEntries(signals.entries())],
						]);
						break;
					}

					case CS_CommunicationType.GetOrCreate: {
						const [sigId] = data;
						const counter = signals.get(sigId);
						if (counter === undefined) {
							signals.set(sigId, defaultValue);
							socket.emit(SignalType.Counter, [
								SC_ComType.Approve,
								comId,
								[defaultValue],
							]);
							socket.broadcast.emit(SignalType.Counter, [
								SC_ComType.Set,
								comId,
								[sigId, defaultValue],
							]);
						} else {
							socket.emit(SignalType.Counter, [
								SC_ComType.Approve,
								comId,
								[counter],
							]);
						}
						break;
					}

					case CS_CommunicationType.Delta: {
						const [sigId, delta] = data;
						const counter = signals.get(sigId);
						if (counter === undefined) {
							socket.emit(SignalType.Counter, [
								SC_ComType.Reject,
								comId,
								["Counter does not exist"],
							]);
						} else {
							signals.set(sigId, counter + delta);
							socket.emit(SignalType.Counter, [
								SC_ComType.Approve,
								comId,
							]);

							socket.broadcast.emit(SignalType.Counter, [
								SC_ComType.Delta,
								comId,
								[sigId, delta],
							]);
						}
						break;
					}
				}
			});
		});

		return new Response();
	}
}
