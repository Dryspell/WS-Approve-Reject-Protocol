import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type {
	Server as IOServer,
	Server,
	Socket as SocketforServer,
} from "socket.io";
import type { Socket as SocketforClient } from "socket.io-client";
import { PokemonApiResponse } from "~/hooks/useDataFetching";
import { sc_CounterHandler } from "~/hooks/useSocketCounter";
import sCounters from "~/lib/counters";

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
	[SignalType.Counter]: ReturnType<typeof sc_CounterHandler>;
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
}

export const enum SignalType {
	User = "user",
	Counter = "counter",
	Unit = "unit",
	Pokemon = "pokemon",
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
	[SignalType.Counter]: ReturnType<ReturnType<typeof sCounters>["handler"]>;
	[SignalType.Pokemon]: (
		params: [type: CS_ComType.Get, comId: string, data: [id: number]]
	) => void;
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
