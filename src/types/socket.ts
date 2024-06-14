import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type {
	Server as IOServer,
	Server,
	Socket as SocketforServer,
} from "socket.io";
import type { Socket as SocketforClient } from "socket.io-client";
import { PokemonApiResponse } from "~/hooks/useDataFetching";
import { counterHandler } from "~/hooks/useCounters";
import counters from "~/lib/Server/counters";
import pokemonFetch from "~/lib/Server/pokemonFetch";
import { chatHandler } from "~/hooks/useChat";
import chat from "~/lib/Server/chat";

interface SocketServer extends HTTPServer {
	io?: IOServer;
}

export interface SocketWithIO extends NetSocket {
	server: SocketServer;
}

export enum SC_ComType {
	Approve,
	Reject,
	Set,
	Delta,
	Loading,
	Error,
}

export interface ServerToClientEvents {
	[SignalType.Counter]: ReturnType<typeof counterHandler>;
	[SignalType.Pokemon]: (
		params:
			| [
					type: SC_ComType.Approve,
					comId: string,
					data: PokemonApiResponse
			  ]
			| [type: SC_ComType.Reject, comId: string, data: [reason: string]]
			| [type: SC_ComType.Loading, comId: string]
			| [type: SC_ComType.Error, comId: string, data: [reason: string]]
	) => void;
	[SignalType.Chat]: ReturnType<typeof chatHandler>;
}

export const enum SignalType {
	User = "user",
	Counter = "counter",
	Unit = "unit",
	Pokemon = "pokemon",
	Chat = "chat",
}

export enum CS_ComType {
	Request,
	Get,
	GetOrCreate,
	Set,
	SetOrCreate,
	Delta,
}

export type ClientToServerEvents = {
	[SignalType.Counter]: ReturnType<ReturnType<typeof counters>["handler"]>;
	[SignalType.Pokemon]: ReturnType<
		ReturnType<typeof pokemonFetch>["handler"]
	>;
	[SignalType.Chat]: ReturnType<typeof chat>["handler"];
};

interface InterServerEvents {
	// ping: () => void;
}

interface SocketData {
	// user: {
	//   id: string;
	//   username: string;
	// };
}

export type sServer = Server<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>;
export type serverSocket = SocketforServer<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>;

export type clientSocket = SocketforClient<
	ServerToClientEvents,
	ClientToServerEvents
>;
