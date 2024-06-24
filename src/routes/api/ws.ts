import { type APIEvent } from "@solidjs/start/server";
import { Server } from "socket.io";
import { SignalType, type SocketWithIO, type sServer } from "~/types/socket";
import Axios from "axios";
import { setupCache } from "axios-cache-interceptor";
import counters from "~/lib/Server/counters";
import pokemonFetch from "~/lib/Server/pokemonFetch";
import chat from "~/lib/Server/chat";

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

		const { handler: counterHandler } = counters();
		const { handler: pokemonHandler } = pokemonFetch();
		const { handler: chatHandler } = chat();

		io.on("connection", (socket) => {
			console.log("Connection");
			socket.on("counter.get", (...[input, callback]) => {
				console.log("Counter Get", input);
				callback(3);
			});
			socket.on("counter.delta", (...[input, callback]) => {
				console.log("Counter Delta", input);
				callback();
			});

			// socket.on(SignalType.Counter, counterHandler(socket));
			// socket.on(SignalType.Pokemon, pokemonHandler(socket));
			// socket.on(SignalType.Chat, chatHandler(socket));
		});

		return new Response();
	}
}
