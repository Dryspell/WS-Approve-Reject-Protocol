import { createSignal, onMount, onCleanup } from "solid-js";
import { Identity, type DbConnectionImpl, type ErrorContextInterface } from "@clockworklabs/spacetimedb-sdk";
import { DbConnection } from "../module_bindings/index";

export const useSpacetimeDB = () => {
  const [conn, setConn] = createSignal<DbConnection | null>(null);
  const [identity, setIdentity] = createSignal<Identity | null>(null);
  const [connected, setConnected] = createSignal(false);

  onMount(() => {
    // const subscribeToQueries = (connection: DbConnection, queries: string[]) => {
    //   connection
    //     .subscriptionBuilder()
    //     .onApplied(() => {
    //       console.log('SDK client cache initialized.');
    //     })
    //     .subscribe(queries);
    // };

    const onConnect = (connection: DbConnection, clientIdentity: Identity, token: string) => {
      setConn(connection);
      setIdentity(clientIdentity);
      setConnected(true);
      localStorage.setItem('auth_token', token);
      console.log('Connected to SpacetimeDB with identity:', clientIdentity.toHexString());

      // // Subscribe to relevant tables - add your queries here
      // subscribeToQueries(connection, [
      //   'SELECT * FROM message',
      //   'SELECT * FROM user',
      //   'SELECT * FROM chat_message',
      //   'SELECT * FROM chat_room'
      // ]);
    };

    const onDisconnect = () => {
      console.log('Disconnected from SpacetimeDB');
      setConnected(false);
    };

    const onConnectError = (ctx: ErrorContextInterface, error: Error) => {
      console.error("Failed to connect to SpacetimeDB:", error);
      setConnected(false);
    };

    // Create the connection
    DbConnection.builder()
      .withUri(import.meta.env.VITE_SPACETIME_HOST || "http://localhost:3000")
      .withModuleName(import.meta.env.VITE_SPACETIME_DATABASE || "game")
      .withToken(localStorage.getItem('auth_token') || '')
      .onConnect(onConnect)
      .onDisconnect(onDisconnect)
      .onConnectError(onConnectError)
      .build();

    onCleanup(() => {
      const connection = conn();
      if (connection) {
        // Instead of close(), we can just set our local state
        setConn(null);
        setConnected(false);
        setIdentity(null);
      }
    });
  });

  return { conn, identity, connected };
}; 