# SpacetimeDB Migration Guide

## Overview

This guide will help you migrate from the custom SpacetimeDB client to the official SpacetimeDB SDK and configure your app for SpacetimeDB cloud hosting.

## Understanding SpacetimeDB Architecture

SpacetimeDB has a unique architecture that's different from traditional client-server apps:

### Server-Side (Rust Module)
- **Location**: `server/src/lib.rs`
- **Purpose**: Defines tables, reducers, and all database logic
- **Runs**: Inside SpacetimeDB (not on your server)
- **Language**: Rust (or TypeScript server modules)

### Client-Side (TypeScript SDK)
- **Location**: Your SolidJS app (`src/`)
- **Purpose**: Connect to SpacetimeDB, call reducers, subscribe to data
- **Runs**: In the browser
- **Language**: TypeScript/JavaScript

### Key Concepts

1. **Tables** - Defined in your Rust module, automatically synced to clients
2. **Reducers** - Functions that modify data (like mutations/RPCs)
3. **Subscriptions** - SQL queries that keep client data in sync
4. **Identity** - Built-in authentication (no passwords needed!)

## What We Changed

### ✅ Fixed

1. **Removed custom SpacetimeDB client** (`src/lib/spacetimedb.ts` - can be deleted)
2. **Updated `useSpacetimeDB` hook** - Now uses official SDK with proper context
3. **Updated `app.tsx`** - Uses official SpacetimeDBProvider

### ❌ Still Broken (Needs Major Refactor)

These files are using the wrong architecture:

- `src/lib/game.ts` - Trying to use custom client
- `src/routes/api/server.ts` - Server-side auth doesn't work this way
- `src/lib/Server/auth.ts` - Traditional auth isn't needed with SpacetimeDB
- `src/components/Chat/SpacetimeChat.tsx` - Using wrong subscription pattern

## How to Use SpacetimeDB Properly

### 1. Connecting to SpacetimeDB

The connection is now handled globally by `SpacetimeDBProvider` in `app.tsx`:

```tsx
import { SpacetimeDBProvider } from "~/hooks/useSpacetimeDB";

<SpacetimeDBProvider>
  <YourApp />
</SpacetimeDBProvider>
```

### 2. Using the Connection in Components

```tsx
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { UserTable } from "~/module_bindings/user_table";
import { SetNameReducer } from "~/module_bindings/set_name_reducer";

function MyComponent() {
  const { conn, identity, connected } = useSpacetimeDB();
  
  // Access tables (read-only)
  const users = () => conn()?.db.user.getAll() ?? [];
  
  // Call reducers (mutations)
  const setName = async (name: string) => {
    const connection = conn();
    if (!connection) return;
    await SetNameReducer.call(connection, { name });
  };
  
  return (
    <Show when={connected()}>
      <div>Identity: {identity()?.toHexString()}</div>
      <For each={users()}>
        {user => <div>{user.name || "Anonymous"}</div>}
      </For>
    </Show>
  );
}
```

### 3. Subscribing to Data

The connection automatically subscribes to all tables when it connects (see `useSpacetimeDB.ts`). 
Data is automatically kept in sync!

### 4. Calling Reducers

All your reducers are auto-generated in `module_bindings/`. Use them like this:

```tsx
import { SendChatMessageReducer } from "~/module_bindings/send_chat_message_reducer";
import { CreateRoomReducer } from "~/module_bindings/create_room_reducer";
import { MoveUnitReducer } from "~/module_bindings/move_unit_reducer";

// In your component:
const connection = conn();
if (!connection) return;

// Send a chat message
await SendChatMessageReducer.call(connection, {
  roomId: "room_123",
  text: "Hello world",
  roundNumber: 1,
});

// Move a unit
await MoveUnitReducer.call(connection, {
  unitId: 42,
  targetPosition: { x: 100, y: 200 },
});
```

### 5. Reading Table Data

Tables are reactive and automatically updated:

```tsx
const { conn } = useSpacetimeDB();

// Get all users
const allUsers = () => conn()?.db.user.getAll() ?? [];

// Find by primary key (identity)
const myUser = () => conn()?.db.user.identity.find(identity()) ?? null;

// Filter users
const onlineUsers = () => 
  conn()?.db.user.getAll().filter(u => u.online) ?? [];

// Get all units in a room
const roomUnits = (roomId: number) =>
  conn()?.db.unit.getAll().filter(u => u.roomId === roomId) ?? [];
```

## Configuring for SpacetimeDB Cloud

### 1. Publish Your Module to Cloud

First, create an account at https://spacetimedb.com

Then publish your module:

```bash
# Login to SpacetimeDB cloud
spacetime login

# Publish your module
cd server
spacetime publish --project-path . your-game-name

# Note the URL and module name from the output
```

### 2. Update Environment Variables

Create a `.env` file in your project root:

```env
# For SpacetimeDB Cloud (Testnet)
VITE_SPACETIME_HOST=wss://testnet.spacetimedb.com
VITE_SPACETIME_MODULE_NAME=your-game-name

# Or for local development
# VITE_SPACETIME_HOST=ws://localhost:3000
# VITE_SPACETIME_MODULE_NAME=game
```

### 3. Remove Docker/Nginx (Optional)

Since you're using cloud hosting, you can delete these files:

- `docker-compose.yml`
- `Dockerfile`
- `server/Dockerfile`
- `nginx.conf`
- `spacetimedb.service`

## Common Patterns

### Pattern 1: Display Current User Info

```tsx
function UserProfile() {
  const { conn, identity, connected } = useSpacetimeDB();
  
  const currentUser = createMemo(() => {
    const id = identity();
    const connection = conn();
    if (!id || !connection) return null;
    return connection.db.user.identity.find(id);
  });
  
  return (
    <Show when={connected()} fallback={<div>Connecting...</div>}>
      <div>
        <h2>{currentUser()?.name || "Set your name"}</h2>
        <p>Identity: {identity()?.toHexString().slice(0, 8)}...</p>
      </div>
    </Show>
  );
}
```

### Pattern 2: Calling a Reducer with Error Handling

```tsx
import { SendMessageReducer } from "~/module_bindings/send_message_reducer";
import { showToast } from "~/components/ui/toast";

async function sendMessage(text: string) {
  const connection = conn();
  if (!connection) {
    showToast({
      title: "Error",
      description: "Not connected to SpacetimeDB",
      variant: "error",
    });
    return;
  }
  
  try {
    await SendMessageReducer.call(connection, { text });
    showToast({
      title: "Success",
      description: "Message sent!",
      variant: "default",
    });
  } catch (error) {
    showToast({
      title: "Error",
      description: error.message,
      variant: "error",
    });
  }
}
```

### Pattern 3: Reactive Table Queries

```tsx
function UnitList(props: { roomId: number }) {
  const { conn } = useSpacetimeDB();
  
  // Automatically updates when units change
  const units = createMemo(() => 
    conn()?.db.unit.getAll()
      .filter(u => u.roomId === props.roomId)
      .sort((a, b) => a.id - b.id) ?? []
  );
  
  return (
    <For each={units()}>
      {unit => <UnitCard unit={unit} />}
    </For>
  );
}
```

## Migration Checklist

- [x] Install `@clockworklabs/spacetimedb-sdk` package
- [x] Update `useSpacetimeDB.ts` to use official SDK
- [x] Update `app.tsx` to use SpacetimeDBProvider
- [ ] Update all components to use new patterns
- [ ] Remove/refactor server-side files that don't fit SpacetimeDB architecture
- [ ] Remove custom `src/lib/spacetimedb.ts` file
- [ ] Publish module to SpacetimeDB cloud
- [ ] Update `.env` with cloud credentials
- [ ] Test connection and data sync
- [ ] Remove Docker/nginx files (optional)

## Common Mistakes to Avoid

1. ❌ **Don't** try to query SpacetimeDB from server-side code
2. ❌ **Don't** implement your own auth with passwords - use Identity
3. ❌ **Don't** manually manage WebSocket connections
4. ❌ **Don't** try to use SQL queries from the client (use table methods)
5. ✅ **Do** use the generated reducer functions
6. ✅ **Do** rely on automatic subscriptions
7. ✅ **Do** use Identity for user identification

## Next Steps

1. **Review your components** - Update any using the old custom client
2. **Test locally** - Make sure everything works with local SpacetimeDB
3. **Publish to cloud** - Deploy your module to SpacetimeDB cloud
4. **Update environment** - Point your app to the cloud URL
5. **Remove old code** - Delete custom client and unused files

## Resources

- [SpacetimeDB TypeScript Quickstart](https://spacetimedb.com/docs/quickstarts/typescript)
- [SpacetimeDB SDK Documentation](https://spacetimedb.com/docs/sdks/typescript/quickstart)
- [SpacetimeDB Discord](https://discord.gg/spacetimedb) - Get help from the community

## Need Help?

If you're stuck, check:
1. This migration guide
2. The SpacetimeDB documentation (linked above)
3. The generated code in `module_bindings/` for examples
4. The SpacetimeDB Discord for community support

