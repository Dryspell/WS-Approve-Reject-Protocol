import type { Identity } from "@clockworklabs/spacetimedb-sdk";

export interface SpacetimeDBGameClient {
  reducers: {
    create_room: (name: string) => Promise<string>;
    send_message: (room_id: string, message: string, round_number?: number) => Promise<string>;
    set_permission: (room_id: string, user_id: Identity, permission: string) => Promise<void>;
    create_game_event: (
      room_id: string,
      event_type: string,
      source_id: string,
      target_id: string,
      value: number
    ) => Promise<void>;
  };
  subscribe: <T>(table: string, filter: string, callback: (data: T) => void) => void;
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
} 