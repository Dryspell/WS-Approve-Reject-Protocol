import { createSignal, onMount } from "solid-js";
import { SpacetimeDB, Identity } from "@clockworklabs/spacetimedb-sdk";

// Types matching our Rust server
export interface ChatRoom {
  id: string;
  name: string;
  created_by: Identity;
  created_at: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: Identity;
  message: string;
  timestamp: number;
  round_number?: number;
}

export interface ChatPermission {
  room_id: string;
  user_id: Identity;
  permission: string;
}

export interface SpacetimeDBClient {
  subscribe: <T>(subscription: string, params: string, callback: (data: T) => void) => void;
  reducers: {
    create_room: (name: string) => Promise<string>;
    send_message: (room_id: string, message: string, round_number?: number) => Promise<string>;
    set_permission: (room_id: string, user_id: Identity, permission: string) => Promise<void>;
  };
  disconnect: () => void;
}

export function useSpacetimeDB() {
  const [db, setDb] = createSignal<SpacetimeDBClient | null>(null);
  const [connected, setConnected] = createSignal(false);

  onMount(() => {
    // Initialize SpacetimeDB connection
    const spacetime = new SpacetimeDB({
      host: import.meta.env.VITE_SPACETIME_HOST || "localhost:3000",
      database: import.meta.env.VITE_SPACETIME_DATABASE || "chat",
    });

    // Connect to the database
    spacetime.connect().then(() => {
      setDb(spacetime as unknown as SpacetimeDBClient);
      setConnected(true);
    }).catch((error: Error) => {
      console.error("Failed to connect to SpacetimeDB:", error);
    });

    // Cleanup on unmount
    return () => {
      spacetime.disconnect();
    };
  });

  return { db, connected };
} 