import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { Server as IOServer, Server, Socket as SocketforServer } from "socket.io";
import type { Socket as SocketforClient } from "socket.io-client";
import { PokemonApiResponse } from "~/hooks/useDataFetching";
import { counterHandler } from "~/hooks/useCounters";
import { chatHandler } from "~/components/Chat/Chat";
import { voteHandler } from "~/components/Vote/VoteBox";
import { VoteActionType, GameRoom, RoundsReadyState } from "~/types/vote";
import { ChatRoom } from "~/lib/Server/chat";
import { Message } from "~/lib/Server/chat";

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
      | { type: SC_ComType.Approve; comId: string; data: PokemonApiResponse }
      | { type: SC_ComType.Reject; comId: string; data: { reason: string } }
      | { type: SC_ComType.Loading; comId: string }
      | { type: SC_ComType.Error; comId: string; data: { reason: string } }
  ) => void;
  [SignalType.Chat]: ReturnType<typeof chatHandler>;
  [SignalType.Vote]: ReturnType<typeof voteHandler>;
}

export const enum SignalType {
  Counter = "counter",
  Pokemon = "pokemon",
  Chat = "chat",
  Vote = "vote",
}

export enum CS_ComType {
  Get,
  GetOrCreate,
  Set,
  SetOrCreate,
  Delta,
}

type SocketAck<T> = (error: Error | null, response: T) => void;

export type EmitFunction<TEventType, TResponse> = {
  (event: SignalType, data: TEventType, ack: SocketAck<TResponse>): void;
};

export type EmitWithAck<TEventType extends SignalType, TRequest, TResponse> = {
  (event: TEventType, data: TRequest, ack: SocketAck<TResponse>): void;
};

export type CounterActionResponse<T extends CS_ComType> = 
  T extends CS_ComType.Get
    ? { type: SC_ComType.Approve; comId: string; data: { counters: { [k: string]: number } } }
    : T extends CS_ComType.GetOrCreate
    ? { type: SC_ComType.Approve; comId: string; data: { amount: number } }
    : T extends CS_ComType.Delta | CS_ComType.Set | CS_ComType.SetOrCreate
    ? { type: SC_ComType.Approve; comId: string }
    : never;

export type CounterActionRequest<T extends CS_ComType> = 
  T extends CS_ComType.Get
    ? {
        type: T;
        request: {
          comId: string;
        };
      }
    : T extends CS_ComType.GetOrCreate
    ? {
        type: T;
        request: {
          comId: string;
          data: {
            sigId: string;
          };
        };
      }
    : T extends CS_ComType.Delta | CS_ComType.Set | CS_ComType.SetOrCreate
    ? {
        type: T;
        request: {
          comId: string;
          data: {
            sigId: string;
            amount: number;
          };
        };
      }
    : never;

export type VoteActionResponse<T extends VoteActionType> = 
  T extends VoteActionType.CreateOrJoinRoom 
    ? { type: SC_ComType.Approve; comId: string; data: { room: GameRoom; readyState: RoundsReadyState } }
    : T extends VoteActionType.Dev_DeleteRooms
    ? { type: SC_ComType.Approve; comId: string }
    : T extends VoteActionType.ToggleReadyGameStart | VoteActionType.ToggleReadyRoundEnd
    ? { type: SC_ComType.Approve; comId: string; data: { ready: boolean } }
    : T extends VoteActionType.SetVoteColor
    ? { type: SC_ComType.Approve; comId: string; data: { ticket: { id: string; owner: string; color: number } } }
    : never;

export type VoteActionRequest<T extends VoteActionType> = 
  T extends VoteActionType.CreateOrJoinRoom 
    ? {
        type: T;
        request: {
          comId: string;
          data: {
            roomId: string;
            roomName: string;
            user: {
              id: string;
              username: string;
            };
          };
        };
      }
    : T extends VoteActionType.Dev_DeleteRooms
    ? {
        type: T;
        request: {
          comId: string;
          data: Record<string, never>;
        };
      }
    : T extends VoteActionType.ToggleReadyGameStart | VoteActionType.ToggleReadyRoundEnd
    ? {
        type: T;
        request: {
          comId: string;
          data: {
            roomId: string;
            user: {
              id: string;
              username: string;
            };
          };
        };
      }
    : T extends VoteActionType.SetVoteColor
    ? {
        type: T;
        request: {
          comId: string;
          data: {
            roomId: string;
            ticket: {
              id: string;
              owner: string;
              color: number;
            };
          };
        };
      }
    : never;

export type ChatActionType = "CreateOrJoinRoom" | "SendMessage" | "LeaveRoom";

export type ChatActionData = {
  CreateOrJoinRoom: {
    roomId: string;
    roomName: string;
    user: {
      id: string;
      username: string;
    };
  };
  SendMessage: {
    message: Message;
  };
  LeaveRoom: {
    roomId: string;
    userId: string;
  };
};

export type ChatActionResponseData = {
  CreateOrJoinRoom: ChatRoom;
  SendMessage: void;
  LeaveRoom: void;
};

export type ChatActionRequest<T extends ChatActionType> = {
  type: T;
  comId: string;
  data: ChatActionData[T];
};

export type ChatActionResponse<T extends ChatActionType> = T extends keyof ChatActionResponseData
  ? ChatActionResponseData[T] extends void
    ? { type: SC_ComType.Approve; comId: string }
    : { type: SC_ComType.Approve; comId: string; data: ChatActionResponseData[T] }
  : never;

interface SocketIOClientWithTimeout<TEventType extends SignalType> extends Omit<SocketforClient<ServerToClientEvents, ClientToServerEvents>, 'timeout'> {
  timeout(ms: number): {
    emit<T extends VoteActionType>(
      event: SignalType.Vote,
      data: VoteActionRequest<T>,
      ack: SocketAck<VoteActionResponse<T> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }>
    ): void;
    emit<T extends CS_ComType>(
      event: SignalType.Counter,
      data: CounterActionRequest<T>,
      ack: SocketAck<CounterActionResponse<T> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }>
    ): void;
    emit<T extends ChatActionType>(
      event: SignalType.Chat,
      data: ChatActionRequest<T>,
      ack: SocketAck<ChatActionResponse<T> | { type: SC_ComType.Reject; comId: string; data: { reason: string } }>
    ): void;
    emit<T extends SignalType>(
      event: T,
      data: ClientToServerEvents[T] extends EmitFunction<infer R, any> ? R : never,
      ack: SocketAck<ClientToServerEvents[T] extends EmitFunction<any, infer R> ? R : never>
    ): void;
  };
}

export type ClientToServerEvents = {
  [SignalType.Counter]: EmitFunction<
    CounterActionRequest<CS_ComType>,
    | CounterActionResponse<CS_ComType>
    | { type: SC_ComType.Reject; comId: string; data: { reason: string } }
  >;
  [SignalType.Pokemon]: EmitFunction<
    {
      type: CS_ComType.Get;
      request: {
        comId: string;
        data: {
          id: number;
        };
      };
    },
    | { type: SC_ComType.Approve; comId: string; data: PokemonApiResponse }
    | { type: SC_ComType.Reject; comId: string; data: { reason: string } }
  >;
  [SignalType.Chat]: EmitFunction<
    ChatActionRequest<ChatActionType>,
    | ChatActionResponse<ChatActionType>
    | { type: SC_ComType.Reject; comId: string; data: { reason: string } }
  >;
  [SignalType.Vote]: EmitFunction<
    VoteActionRequest<VoteActionType>,
    | VoteActionResponse<VoteActionType>
    | { type: SC_ComType.Reject; comId: string; data: { reason: string } }
  >;
};

interface InterServerEvents {
  // ping: () => void;
}

interface SocketData {
  user: {
    id: string;
    username: string;
  };
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

export type clientSocket = SocketIOClientWithTimeout<SignalType>;

// Add helper type for better type inference in components
export type SocketResponse<T extends SignalType> = ClientToServerEvents[T] extends EmitFunction<any, infer R> ? R : never;
export type SocketRequest<T extends SignalType> = ClientToServerEvents[T] extends EmitFunction<infer R, any> ? R : never;
