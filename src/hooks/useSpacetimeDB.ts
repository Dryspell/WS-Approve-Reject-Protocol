import { createSignal, createContext, useContext, ParentComponent, onCleanup, onMount, createEffect } from "solid-js";
import { Identity, type ErrorContextInterface } from "@clockworklabs/spacetimedb-sdk";
import { DbConnection } from "../module_bindings/index";

type SpacetimeDBContextType = {
  conn: () => DbConnection | null;
  identity: () => Identity | null;
  connected: () => boolean;
};

const SpacetimeDBContext = createContext<SpacetimeDBContextType>();

export const SpacetimeDBProvider: ParentComponent = (props) => {
  const [conn, setConn] = createSignal<DbConnection | null>(null);
  const [identity, setIdentity] = createSignal<Identity | null>(null);
  const [connected, setConnected] = createSignal(false);

  onMount(() => {
    const onConnect = (connection: DbConnection, clientIdentity: Identity, token: string) => {
      setConn(connection);
      setIdentity(clientIdentity);
      setConnected(true);
      localStorage.setItem('auth_token', token);
      console.log('Connected to SpacetimeDB with identity:', clientIdentity.toHexString());

      // Subscribe to all tables
      connection
        .subscriptionBuilder()
        .onApplied(() => {
          console.log('SpacetimeDB client cache initialized.');
        })
        .subscribe([
          'SELECT * FROM message',
          'SELECT * FROM user',
          'SELECT * FROM chat_message',
          'SELECT * FROM chat_room',
          'SELECT * FROM chat_permission',
          'SELECT * FROM game_room',
          'SELECT * FROM unit',
          'SELECT * FROM resource',
          'SELECT * FROM unit_inventory',
          'SELECT * FROM game_event',
          'SELECT * FROM ready_state',
          'SELECT * FROM vote',
          'SELECT * FROM unit_task_queue',
        ]);
    };

    const onDisconnect = () => {
      console.log('Disconnected from SpacetimeDB');
      setConnected(false);
    };

    const onConnectError = (ctx: ErrorContextInterface, error: Error) => {
      console.error("Failed to connect to SpacetimeDB:", error);
      setConnected(false);
    };

    // Get the host URL - for cloud it will be like "wss://testnet.spacetimedb.com"
    const host = import.meta.env.VITE_SPACETIME_HOST || "ws://localhost:3000";
    const moduleName = import.meta.env.VITE_SPACETIME_MODULE_NAME || import.meta.env.VITE_SPACETIME_DATABASE || "game";
    
    console.log(`Connecting to SpacetimeDB at ${host} with module ${moduleName}`);

    // For local development, don't use stored tokens as they may be invalid
    // SpacetimeDB local instances don't require authentication
    const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');
    const authToken = isLocalHost ? undefined : (localStorage.getItem('auth_token') || undefined);
    
    if (isLocalHost) {
      console.log('Connecting to local SpacetimeDB (no auth token required)');
    } else {
      console.log('Connecting to remote SpacetimeDB with auth token');
    }

    // Create the connection
    const builder = DbConnection.builder()
      .withUri(host)
      .withModuleName(moduleName)
      .onConnect(onConnect)
      .onDisconnect(onDisconnect)
      .onConnectError(onConnectError);
    
    // Only add token for remote connections
    if (authToken) {
      builder.withToken(authToken);
    }
    
    builder.build();

    onCleanup(() => {
      const connection = conn();
      if (connection) {
        setConn(null);
        setConnected(false);
        setIdentity(null);
      }
    });
  });

  const value = {
    conn,
    identity,
    connected,
  };

  return (
    <SpacetimeDBContext.Provider value={value}>
      {props.children}
    </SpacetimeDBContext.Provider>
  );
};

export const useSpacetimeDB = () => {
  const context = useContext(SpacetimeDBContext);
  if (!context) {
    throw new Error("useSpacetimeDB must be used within a SpacetimeDBProvider");
  }
  return context;
}; 