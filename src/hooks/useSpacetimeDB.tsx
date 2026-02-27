import { createSignal, createContext, useContext, ParentComponent, onCleanup, onMount, createEffect } from "solid-js";
import { isServer } from "solid-js/web";

// Types imported dynamically to avoid SSR issues
type Identity = import("spacetimedb").Identity;
type DbConnection = import("../module_bindings/index").DbConnection;

type SpacetimeDBContextType = {
  conn: () => DbConnection | null;
  identity: () => Identity | null;
  connected: () => boolean;
  subscribed: () => boolean;
  connectionError: () => string | null;
};

const SpacetimeDBContext = createContext<SpacetimeDBContextType>();

export const SpacetimeDBProvider: ParentComponent = (props) => {
  const [conn, setConn] = createSignal<DbConnection | null>(null);
  const [identity, setIdentity] = createSignal<Identity | null>(null);
  const [connected, setConnected] = createSignal(false);
  const [subscribed, setSubscribed] = createSignal(false);
  const [connectionError, setConnectionError] = createSignal<string | null>(null);

  onMount(async () => {
    // Skip connection on server-side rendering
    if (isServer) {
      return;
    }
    
    // Dynamically import SDK and bindings to avoid SSR issues
    const { Identity: IdentityClass } = await import("spacetimedb");
    const { DbConnection: DbConnectionClass } = await import("../module_bindings/index");
    
    // Get the host URL - v2 SDK uses http:// (handles WS upgrade internally)
    const host = import.meta.env.VITE_SPACETIME_HOST || "http://127.0.0.1:3000";
    const moduleName = import.meta.env.VITE_SPACETIME_MODULE_NAME || import.meta.env.VITE_SPACETIME_DATABASE || "game";
    const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');
    
    const onConnect = (connection: DbConnection, clientIdentity: Identity, token: string) => {
      setConn(connection);
      setIdentity(clientIdentity);
      setConnected(true);
      
      // Persist token for all environments so identity survives page refresh
      localStorage.setItem('stdb_auth_token', token);
      
      console.log('Connected to SpacetimeDB with identity:', clientIdentity.toHexString());

      // Catch DataView decode errors from schema/binding mismatch
      const origOnError = window.onerror;
      window.addEventListener("unhandledrejection", (e) => {
        if (e.reason instanceof RangeError && e.reason.message.includes("DataView")) {
          setConnectionError("schema-mismatch");
          setSubscribed(false);
        }
      });

      // Subscribe to all tables
      connection
        .subscriptionBuilder()
        .onApplied(() => {
          console.log('SpacetimeDB client cache initialized.');
          setConnectionError(null);
          setSubscribed(true);
        })
        .onError((ctx: any) => {
          console.error('SpacetimeDB subscription error:', ctx);
          setConnectionError("subscription-error");
        })
        .subscribe([
          // Core tables
          'SELECT * FROM message',
          'SELECT * FROM user',
          // Chat system
          'SELECT * FROM chat_message',
          'SELECT * FROM chat_room',
          'SELECT * FROM chat_permission',
          // Game system
          'SELECT * FROM game_room',
          'SELECT * FROM unit',
          'SELECT * FROM unit_stats',
          'SELECT * FROM resource',
          'SELECT * FROM unit_inventory',
          'SELECT * FROM unit_task_queue',
          'SELECT * FROM game_event',
          'SELECT * FROM ready_state',
          'SELECT * FROM vote',
          'SELECT * FROM transaction',
          'SELECT * FROM guarantee',
          'SELECT * FROM guarantee_purchase',
          'SELECT * FROM trade_offer',
          // Social system
          'SELECT * FROM friend_request',
          'SELECT * FROM friendship',
          'SELECT * FROM direct_message_conversation',
          'SELECT * FROM direct_message',
          'SELECT * FROM blocked_user',
        ]);
    };

    const onDisconnect = () => {
      console.log('Disconnected from SpacetimeDB');
      setConnected(false);
    };

    const onConnectError = (ctx: any, error: Error) => {
      console.error("Failed to connect to SpacetimeDB:", error);
      setConnected(false);
      setConnectionError("connect-error");
    };
    
    console.log(`Connecting to SpacetimeDB at ${host} with module ${moduleName}`);

    // Restore auth token from previous session (all environments)
    const authToken = localStorage.getItem('stdb_auth_token') || undefined;
    
    if (authToken) {
      console.log('Restoring previous SpacetimeDB identity');
    } else {
      console.log('No stored token — new identity will be created');
    }

    // Create the connection
    const builder = DbConnectionClass.builder()
      .withUri(host)
      .withDatabaseName(moduleName)
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
    subscribed,
    connectionError,
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