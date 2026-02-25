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
};

const SpacetimeDBContext = createContext<SpacetimeDBContextType>();

export const SpacetimeDBProvider: ParentComponent = (props) => {
  const [conn, setConn] = createSignal<DbConnection | null>(null);
  const [identity, setIdentity] = createSignal<Identity | null>(null);
  const [connected, setConnected] = createSignal(false);
  const [subscribed, setSubscribed] = createSignal(false);

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
    
    // For local development: clear any stored tokens to ensure fresh identity per window
    // For production: persist tokens for session continuity
    if (isLocalHost) {
      localStorage.removeItem('auth_token');
      console.log('Local development: Cleared stored auth token for fresh identity');
    }
    
    const onConnect = (connection: DbConnection, clientIdentity: Identity, token: string) => {
      setConn(connection);
      setIdentity(clientIdentity);
      setConnected(true);
      
      // Only persist auth tokens for remote/production instances
      if (!isLocalHost) {
        localStorage.setItem('auth_token', token);
        console.log('Saved auth token for production environment');
      }
      
      console.log('Connected to SpacetimeDB with identity:', clientIdentity.toHexString());

      // Subscribe to all tables
      connection
        .subscriptionBuilder()
        .onApplied(() => {
          console.log('SpacetimeDB client cache initialized.');
          setSubscribed(true);
        })
        .onError((ctx: any) => {
          console.error('SpacetimeDB subscription error:', ctx);
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
    };
    
    console.log(`Connecting to SpacetimeDB at ${host} with module ${moduleName}`);

    // Load auth token only for remote connections
    const authToken = isLocalHost ? undefined : (localStorage.getItem('auth_token') || undefined);
    
    if (isLocalHost) {
      console.log('🔓 Local development mode: Each window gets a unique identity');
    } else {
      console.log('🔒 Production mode: Using persisted auth token');
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