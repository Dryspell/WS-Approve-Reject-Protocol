import { ClientToServerEvents, serverSocket, SignalType } from "./socket";

export type InferHandler<
	T extends () => { handler: (socket: serverSocket) => void }
> = ReturnType<ReturnType<T>["handler"]>;

export type InferRequestData<T extends keyof ClientToServerEvents> = Parameters<
	ClientToServerEvents[T]
>[0];
