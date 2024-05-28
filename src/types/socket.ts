import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type {
	Server as IOServer,
	Server,
	Socket as SocketforServer,
} from "socket.io";
import type { Socket as SocketforClient } from "socket.io-client";
import { type UnitData } from "./game";
import { serverCounters } from "~/routes/api/ws";

interface SocketServer extends HTTPServer {
	io?: IOServer;
}

export interface SocketWithIO extends NetSocket {
	server: SocketServer;
}

export const enum SC_ComType {
	Approve,
	Reject,
	Set,
	Delta,
	Loading,
	Error,
}

export interface ServerToClientEvents {
	[SignalType.Counter]: (
		params:
			| [
					type: SC_ComType.Approve,
					comId: string,
					data?:
						| [amount: number]
						| [counters: { [sigId: string]: number }]
			  ]
			| [type: SC_ComType.Reject, comId: string, data: [reason: string]]
			| [
					type: SC_ComType.Delta,
					comId: string,
					data: [sigId: string, amount: number]
			  ]
			| [
					type: SC_ComType.Set,
					comId: string,
					data: [sigId: string, amount: number]
			  ]
	) => void;
}

export const enum SignalType {
	User = "user",
	Counter = "counter",
	Unit = "unit",
}

export const enum CS_CommunicationType {
	Request,
	Get,
	GetOrCreate,
	Set,
	SetOrCreate,
	Delta,
}

export type CS_Communication = [type: CS_CommunicationType, comId: string];

export type ClientToServerEvents = {
	[SignalType.Counter]: ReturnType<
		ReturnType<typeof serverCounters>["csEventsHandler"]
	>;
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
