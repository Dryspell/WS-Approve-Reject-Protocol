import { ClientToServerEvents, serverSocket, SignalType } from "./socket";

export type InferHandler<
	T extends () => { handler: (socket: serverSocket) => void }
> = ReturnType<ReturnType<T>["handler"]>;

export type InferRequestType<T extends keyof ClientToServerEvents> = Parameters<
	ClientToServerEvents[T]
>[0];

type Head<T extends any[]> = T extends [...infer Head, any] ? Head : any[];

type Tail<T extends any[]> = T extends [any, ...infer Tail] ? Tail : any[];

export type InferRequestData<T extends keyof ClientToServerEvents> = Tail<
	Head<Parameters<ClientToServerEvents[T]>>
>[0];
