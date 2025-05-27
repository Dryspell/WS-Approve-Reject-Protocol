import { createSignal, onMount, onCleanup } from "solid-js";
import { DbConnection, Identity } from "@clockworklabs/spacetimedb-sdk";
import type { SpacetimeDBGameClient } from "~/types/spacetime-client";

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

export const useSpacetimeDB = () => {
  const [db, setDb] = createSignal<SpacetimeDBGameClient | null>(null);
  const [connected, setConnected] = createSignal(false);

  onMount(() => {
    const client = DbConnection.builder()
      .withUri(import.meta.env.VITE_SPACETIME_HOST || "http://localhost:3000")
      .withModuleName(import.meta.env.VITE_SPACETIME_DATABASE || "game")
      .onConnect((connection, identity, token) => {
        setDb(connection as unknown as SpacetimeDBGameClient);
        setConnected(true);
      })
      .onConnectError((ctx, error) => {
        console.error("Failed to connect to SpacetimeDB:", error);
      })
      .build() as unknown as SpacetimeDBGameClient;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    client.on("connect", handleConnect);
    client.on("disconnect", handleDisconnect);

    onCleanup(() => {
      client.off("connect", handleConnect);
      client.off("disconnect", handleDisconnect);
      client.disconnect();
    });
  });

  return { db, connected };
}; 