import { User } from "~/types/user";
import { SC_ComType } from "~/types/socket";

export enum TicketColor {
  Red,
  Blue,
  None,
}

export type Ticket = {
  id: string;
  owner: string;
  color: TicketColor;
};

export type GameRound = {
  number: number;
  startTime: number;
  endTime: number;
  result: { previousTickets: Ticket[]; newTickets: Ticket[] };
};

export type GameRoom = {
  id: string;
  name: string;
  members: User[];
  tickets: Ticket[];
  offers: any[]; // TODO: Define proper type if needed on client
  startTime: number | null;
  rounds: GameRound[];
};

export type RoundsReadyState = {
  roomId: string;
  round: number;
  readyUsers: string[];
};

export enum VoteActionType {
  CreateOrJoinRoom,
  ToggleReadyGameStart,
  ToggleReadyRoundEnd,
  SetVoteColor,
  Dev_DeleteRooms,
}

export enum SC_GameEventType {
  RoomCreated,
  UserJoinedRoom,
  UserToggleReadyGameStart,
  GameStart,
  GameEnd,
  RoundStart,
  RoundEnd,
  Error,
}

export type SocketEvent =
  | {
      type: SC_GameEventType.RoomCreated;
      comId: string;
      data: GameRoom;
    }
  | {
      type: SC_GameEventType.UserJoinedRoom;
      comId: string;
      data: { roomId: string; user: User };
    }
  | {
      type: SC_GameEventType.UserToggleReadyGameStart;
      comId: string;
      data: { roomId: string; user: User; readyState: boolean };
    }
  | {
      type: SC_GameEventType.GameStart;
      comId: string;
      data: GameRoom;
    }
  | {
      type: SC_GameEventType.RoundStart;
      comId: string;
      data: { roomId: string; round: GameRound };
    }
  | {
      type: SC_GameEventType.RoundEnd;
      comId: string;
      data: { roomId: string; previousRound: GameRound; newRound: GameRound };
    }
  | {
      type: SC_GameEventType.Error;
      comId: string;
      data: { roomId: string; error: string };
    };

export type VoteHandlerArgs =
  | {
      type: VoteActionType.Dev_DeleteRooms;
      request: { comId: string };
      callback: () => void;
    }
  | {
      type: VoteActionType.CreateOrJoinRoom;
      request: { comId: string; data: { roomId: string; roomName: string; user: User } };
      callback: (
        returnData:
          | {
              type: SC_ComType.Approve;
              comId: string;
              data: { room: GameRoom; readyState: RoundsReadyState };
            }
          | { type: SC_ComType.Reject; comId: string; data: { reason: string } },
      ) => void;
    }
  | {
      type: VoteActionType.ToggleReadyGameStart;
      request: { comId: string; data: { roomId: string; user: User } };
      callback: (
        returnData:
          | { type: SC_ComType.Approve; comId: string; data: { ready: boolean } }
          | { type: SC_ComType.Reject; comId: string; data: { reason: string } },
      ) => void;
    }
  | {
      type: VoteActionType.ToggleReadyRoundEnd;
      request: { comId: string; data: { roomId: string; user: User } };
      callback: (
        returnData:
          | { type: SC_ComType.Approve; comId: string; data: { ready: boolean } }
          | { type: SC_ComType.Reject; comId: string; data: { reason: string } },
      ) => void;
    }
  | {
      type: VoteActionType.SetVoteColor;
      request: { comId: string; data: { roomId: string; ticket: Ticket } };
      callback: (
        returnData:
          | { type: SC_ComType.Approve; comId: string; data: { ticket: Ticket } }
          | { type: SC_ComType.Reject; comId: string; data: { reason: string } },
      ) => void;
    }; 