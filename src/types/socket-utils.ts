import { ClientToServerEvents, serverSocket, SignalType, sServer } from "./socket";

export type InferHandler<
  T extends
    | (() => { handler: (socket: serverSocket) => void })
    | (() => { handler: (socket: serverSocket, io: sServer) => void }),
> = ReturnType<ReturnType<T>["handler"]>;

export type InferRequestType<T extends keyof ClientToServerEvents> = Parameters<
  ClientToServerEvents[T]
>[0];

type Head<T extends any[]> = T extends [...infer Head, any] ? Head : any[];

type Tail<T extends any[]> = T extends [any, ...infer Tail] ? Tail : any[];

export type InferRequestData<T extends keyof ClientToServerEvents> = Tail<
  Head<Parameters<ClientToServerEvents[T]>>
>[0];

// export type InferCallbackData<
// 	TSignalType extends keyof ClientToServerEvents,
// 	TCS_ComType
// > = Parameters<
// 	Extract<
// 		Parameters<ClientToServerEvents[TSignalType]>[0],
// 		[TCS_ComType, ...any]
// 	>["2"]
// >[0];

export type InferCallbackData<
  THandlerArgs extends { type: any; callback: (...args: any[]) => any },
  TActionType
> = Parameters<
  Extract<THandlerArgs, { type: TActionType }>["callback"]
>[0];

