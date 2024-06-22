import { io } from "socket.io-client";
import { type clientSocket } from "~/types/socket";

export const socket: clientSocket = io({ path: "/api/ws" });
export const DEFAULT_REQUEST_TIMEOUT = 5000;
