import { inferRouterInputs } from "@trpc/server";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type {
	Server as IOServer,
	Server,
	Socket as SocketforServer,
} from "socket.io";
import type { Socket as SocketforClient } from "socket.io-client";
import { PokemonApiResponse } from "~/hooks/useDataFetching";
import { Procedures } from "~/lib/tRPC/router";
import { AppRouter } from "../lib/tRPC/router";
import { GetInferenceHelpers } from "@trpc/server/unstable-core-do-not-import";

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
	Request = "request",
	Get = "get",
	GetOrCreate = "getOrCreate",
	Set = "set",
	SetOrCreate = "setOrCreate",
	Delta = "delta",
}

export type ClientToServerEvents = {
	[SignalType.Counter]: (
		params: inferRouterInputs<AppRouter>[SignalType.Counter][CS_ComType.Get]
		// | [type: CS_ComType.Get, comId: string]
		// | [
		// 		type: CS_ComType.GetOrCreate,
		// 		comId: string,
		// 		data: [sigId: string]
		//   ]
		// | [
		// 		type: CS_ComType.Delta,
		// 		comId: string,
		// 		data: [sigId: string, delta: number]
		//   ]
	) => void;
	[SignalType.Pokemon]: (
		params: inferRouterInputs<AppRouter>[SignalType.Pokemon][CS_ComType.Get]
	) => void;
};
// {
// [SignalType.Counter]: (
// 	params:
// 		| [type: CS_ComType.Get, comId: string]
// 		| [
// 				type: CS_ComType.GetOrCreate,
// 				comId: string,
// 				data: [sigId: string]
// 		  ]
// 		| [
// 				type: CS_ComType.Delta,
// 				comId: string,
// 				data: [sigId: string, delta: number]
// 		  ]
// ) => void;
// [SignalType.Pokemon]: (
// 	params: [type: CS_ComType.Get, comId: string, data: [id: number]]
// ) => void;
// };

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
