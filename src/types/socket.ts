import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type {
	Server as IOServer,
	Server,
	Socket as SocketforServer,
} from "socket.io";
import type { Socket as SocketforClient } from "socket.io-client";
import { type UnitData } from "./game";

interface SocketServer extends HTTPServer {
	io?: IOServer;
}

export interface SocketWithIO extends NetSocket {
	server: SocketServer;
}

/**
 * Server to Client Actions
 */
export const enum SA {
	UserConnected = "user-connected",
	ChatMessage = "chat-message",
	UserDisconnected = "user-disconnected",
	Move = "s_move",
	Increment = "s_increment",
	Decrement = "s_decrement",
}

export const enum SC_ComType {
	Approve,
	Reject,
	Announce,
}

/**
 * Approves or Rejects a client communication or announces a server action
 */
export type SC_Communication =
	| [type: SC_ComType.Approve | SC_ComType.Reject, communicationId: string]
	| [type: SC_ComType.Announce];

export interface ServerToClientEvents {
	[CA.NewUser]: (meta: SC_Communication) => void;
	[CA.Move]: (meta: SC_Communication) => void;
	[CA.SendChatMessage]: (meta: SC_Communication) => void;
	[CA.Increment]: (meta: SC_Communication) => void;
	[CA.Decrement]: (meta: SC_Communication) => void;

	[SA.UserConnected]: (meta: SC_Communication, data: [name: string]) => void;
	[SA.ChatMessage]: (
		meta: SC_Communication,
		data: [message: string, name: string]
	) => void;
	[SA.UserDisconnected]: (
		meta: SC_Communication,
		data: [name: string]
	) => void;
	[SA.Move]: (meta: SC_Communication, data: [unitData: UnitData]) => void;
	[SA.Increment]: (meta: SC_Communication, data: [amount: number]) => void;
	[SA.Decrement]: (meta: SC_Communication, data: [amount: number]) => void;
}

/**
 * Client to Server Actions
 */
export const enum CA {
	NewUser = "new-user",
	Disconnect = "disconnect",
	SendChatMessage = "send-chat-message",
	Increment = "increment",
	Decrement = "decrement",
	Move = "move",
}

export const enum CS_CommunicationType {
	Request,
}

export type CS_Communication = [
	type: CS_CommunicationType,
	communicationId: string
];

export interface ClientToServerEvents {
	[CA.NewUser]: (meta: CS_Communication, data: [name: string]) => void;
	[CA.Disconnect]: (meta: CS_Communication) => void;
	[CA.SendChatMessage]: (
		meta: CS_Communication,
		data: [message: string]
	) => void;
	[CA.Increment]: (meta: CS_Communication, data: [amount: number]) => void;
	[CA.Decrement]: (meta: CS_Communication, data: [amount: number]) => void;
	[CA.Move]: (meta: CS_Communication, data: [unitData: UnitData]) => void;
}

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
