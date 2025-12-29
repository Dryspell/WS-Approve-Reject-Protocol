# SpacetimeDB Integration Guide

## 🚀 Quick Start (5 Minutes)

### 1. Create `.env` File
```env
# For SpacetimeDB Cloud (Recommended)
VITE_SPACETIME_HOST=wss://testnet.spacetimedb.com
VITE_SPACETIME_MODULE_NAME=socket-signals

# Or for local development:
# VITE_SPACETIME_HOST=ws://localhost:3000
# VITE_SPACETIME_MODULE_NAME=game
```

### 2. Choose Your Path

**Option A: Cloud (Easiest)**
```bash
spacetime login
cd server
spacetime publish --project-path . socket-signals
cd ..
pnpm dev
```

**Option B: Local Development**
```bash
# Terminal 1
spacetime start

# Terminal 2
pnpm publish:local
pnpm dev
```

### 3. Verify Connection
Open `http://localhost:5173` and check browser console for:
```
Connected to SpacetimeDB with identity: ...
```

---

## 📖 Understanding SpacetimeDB

### Architecture
```
Browser (Client)          SpacetimeDB Cloud         Your Rust Module
    │                          │                          │
    │  WebSocket Connection    │                          │
    ├─────────────────────────>│                          │
    │                          │                          │
    │  Call Reducer            │  Execute Reducer         │
    ├─────────────────────────>├─────────────────────────>│
    │                          │  Update Tables           │
    │  Auto-sync Updates       │<─────────────────────────│
    │<─────────────────────────│                          │
```

### Key Concepts

**Identity** - Each client gets a unique public key (no passwords!)
**Tables** - Defined in Rust, auto-synced to clients (read-only from client)
**Reducers** - Functions in Rust that modify data (called from client)
**Subscriptions** - SQL queries that keep client data in real-time sync

---

## 💻 Common Patterns

### 1. Get Connection & Identity
```typescript
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";

const { conn, identity, connected } = useSpacetimeDB();
```

### 2. Read Table Data
```typescript
// Get all rows
const users = () => conn()?.db.user.getAll() ?? [];

// Find by primary key
const myUser = () => conn()?.db.user.identity.find(identity()) ?? null;

// Filter rows
const onlineUsers = () => 
  conn()?.db.user.getAll().filter(u => u.online) ?? [];

// Get units in a specific room
const roomUnits = (roomId: number) =>
  conn()?.db.unit.getAll().filter(u => u.roomId === roomId) ?? [];
```

### 3. Call Reducers (Mutations)
```typescript
import { SetNameReducer } from "~/module_bindings/set_name_reducer";
import { MoveUnitReducer } from "~/module_bindings/move_unit_reducer";
import { SendMessageReducer } from "~/module_bindings/send_message_reducer";

const connection = conn();
if (!connection) return;

// Set user name
await SetNameReducer.call(connection, { name: "Alice" });

// Move a unit
await MoveUnitReducer.call(connection, {
  unitId: 42,
  targetPosition: { x: 100, y: 200 }
});

// Send message
await SendMessageReducer.call(connection, { text: "Hello!" });
```

### 4. Subscribe to Real-time Updates
```typescript
onMount(() => {
  const connection = conn();
  if (!connection) return;

  // React to new units
  connection.db.unit.onInsert((ctx, unit) => {
    console.log("Unit added:", unit);
    setUnits(prev => [...prev, unit]);
  });

  // React to unit updates
  connection.db.unit.onUpdate((ctx, oldUnit, newUnit) => {
    console.log("Unit updated:", newUnit);
    setUnits(prev => prev.map(u => u.id === newUnit.id ? newUnit : u));
  });

  // React to unit deletions
  connection.db.unit.onDelete((ctx, unit) => {
    console.log("Unit removed:", unit);
    setUnits(prev => prev.filter(u => u.id !== unit.id));
  });
});
```

### 5. Complete Component Example
```typescript
import { Show, createMemo, onMount } from "solid-js";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { SetNameReducer } from "~/module_bindings/set_name_reducer";

export default function UserProfile() {
  const { conn, identity, connected } = useSpacetimeDB();
  
  // Reactive user lookup
  const currentUser = createMemo(() => {
    const id = identity();
    const connection = conn();
    if (!id || !connection) return null;
    return connection.db.user.identity.find(id) ?? null;
  });
  
  const setName = async (name: string) => {
    const connection = conn();
    if (!connection) return;
    
    try {
      await SetNameReducer.call(connection, { name });
    } catch (err) {
      console.error("Failed to set name:", err);
    }
  };
  
  return (
    <Show when={connected()} fallback={<div>Connecting...</div>}>
      <div>
        <h2>{currentUser()?.name || "Set your name"}</h2>
        <p>Identity: {identity()?.toHexString().slice(0, 8)}...</p>
        <button onClick={() => setName("Alice")}>Set Name</button>
      </div>
    </Show>
  );
}
```

---

## 🛠️ Commands Reference

```bash
# Development
pnpm dev                    # Start dev server (port 5173)
pnpm generate              # Regenerate TypeScript bindings after Rust changes

# Publishing
pnpm publish:local         # Publish to local SpacetimeDB
pnpm publish:cloud         # Publish to cloud (edit module name in package.json)

# Debugging
pnpm logs:cloud            # View cloud logs
pnpm logs:local            # View local logs
pnpm sql:cloud "SELECT * FROM user"   # Query cloud database
pnpm sql:local "SELECT * FROM user"   # Query local database

# SpacetimeDB CLI
spacetime start            # Start local SpacetimeDB server
spacetime login            # Login to SpacetimeDB cloud
spacetime list             # List your published modules
spacetime logs MODULE      # View module logs
spacetime sql MODULE "..." # Run SQL query
spacetime call MODULE REDUCER ARGS  # Call a reducer
```

---

## 🐛 Troubleshooting

### "Failed to connect to SpacetimeDB"
1. Check `.env` has correct `VITE_SPACETIME_HOST`
2. Verify module name: `VITE_SPACETIME_MODULE_NAME`
3. **For cloud**: Make sure you published with `spacetime publish`
4. **For local**: Make sure `spacetime start` is running
5. Check browser console for detailed error messages

### "Reducer failed" or "Invalid arguments"
1. Check reducer parameters match generated types in `module_bindings/`
2. View server logs: `pnpm logs:cloud` or `pnpm logs:local`
3. Make sure you published the latest version of your module
4. Regenerate bindings: `pnpm generate`

### "Table not found" or type errors
1. Regenerate bindings: `pnpm generate`
2. Republish your module
3. Hard refresh browser (Ctrl+Shift+R)
4. Check that table is marked `public` in your Rust module

### Dev server errors
1. Make sure no import errors (check terminal output)
2. Verify all imports are correct after file deletions
3. Try: `rm -rf node_modules && pnpm install`

---

## 📂 Project Structure

```
socketSignal/
├── server/                    # SpacetimeDB Rust module
│   ├── src/
│   │   └── lib.rs            # Tables, reducers, game logic
│   └── Cargo.toml
├── src/
│   ├── hooks/
│   │   └── useSpacetimeDB.ts # Connection hook ✅
│   ├── module_bindings/      # Auto-generated types ✅
│   │   ├── *_table.ts        # Table accessors
│   │   ├── *_type.ts         # Type definitions
│   │   └── *_reducer.ts      # Reducer functions
│   ├── components/
│   │   └── Vote/
│   │       └── Game.tsx      # ✅ Perfect example!
│   ├── app.tsx               # SpacetimeDBProvider ✅
│   └── routes/
│       └── index.tsx         # Updated for SpacetimeDB ✅
├── .env                       # Connection config (create this!)
└── package.json               # Updated scripts ✅
```

---

## ✅ What's Working

Your project already has these correct:

- ✅ **Rust module** (`server/src/lib.rs`) - Tables and reducers are solid
- ✅ **Generated bindings** (`src/module_bindings/`) - Auto-generated, perfect
- ✅ **Connection hook** (`src/hooks/useSpacetimeDB.ts`) - Using official SDK
- ✅ **Game component** (`src/components/Vote/Game.tsx`) - Great example to follow!
- ✅ **Dev server** - Now starting successfully

---

## ⚠️ What Was Removed/Fixed

We removed these files because they didn't fit SpacetimeDB's architecture:

- ❌ `src/lib/spacetimedb.ts` - Custom HTTP client (replaced with official SDK)
- ❌ `src/routes/api/index.ts` - Caused Vinxi import conflict
- ❌ `src/routes/api/server.ts` - Traditional auth doesn't fit SpacetimeDB

Updated:
- ✅ `src/routes/index.tsx` - Now uses SpacetimeDB Identity
- ✅ `src/app.tsx` - Uses SpacetimeDBProvider
- ✅ `package.json` - Updated scripts for cloud/local publishing

---

## 🔑 Authentication with SpacetimeDB

SpacetimeDB uses **Identity-based auth** (no passwords needed):

### How It Works
```typescript
// Each client automatically gets a unique Identity
const { identity } = useSpacetimeDB();

// Users can optionally set a display name
await SetNameReducer.call(connection, { name: "Alice" });

// In your Rust module, you can access the caller:
#[reducer]
pub fn set_name(ctx: &ReducerContext, name: String) {
    // ctx.sender is the caller's Identity
    let user = ctx.db.user().identity().find(ctx.sender);
}
```

### No Traditional Auth Needed
- No usernames or passwords
- No session management
- No JWT tokens (unless you want to integrate external auth)
- Identity is automatically managed

### Optional: Display Names
```rust
#[table(name = user, public)]
pub struct User {
    #[primary_key]
    identity: Identity,
    name: Option<String>,  // Optional display name
    online: bool,
}
```

---

## 📦 Complete Example: Chat Component

See `SPACETIMEDB_EXAMPLES.tsx` for full working examples including:
- User profile display
- Setting user names
- Sending messages
- Chat rooms
- Real-time unit updates
- Game actions

---

## 🎯 Next Steps

1. **Publish your module**
   ```bash
   spacetime login
   cd server
   spacetime publish --project-path . socket-signals
   ```

2. **Test connection**
   - Run `pnpm dev`
   - Open `http://localhost:5173`
   - Check console: "Connected to SpacetimeDB..."

3. **Test real-time sync**
   - Open multiple browser windows
   - Try sending messages or moving units
   - Watch updates sync automatically!

4. **Build your features**
   - Use `Game.tsx` as a reference
   - Follow patterns in this guide
   - Check `SPACETIMEDB_EXAMPLES.tsx` for more examples

---

## 🔗 Resources

- **Official Docs**: https://spacetimedb.com/docs/quickstarts/typescript
- **SDK Reference**: https://spacetimedb.com/docs/sdks/typescript/quickstart
- **Discord**: https://discord.gg/spacetimedb
- **Your Code Examples**: See `SPACETIMEDB_EXAMPLES.tsx`
- **Working Component**: Check `src/components/Vote/Game.tsx`

---

## 💡 Key Takeaways

1. **No traditional backend** - Your Rust module IS the backend
2. **Client-side SDK only** - Use it in components, not server routes
3. **Identity-based auth** - No passwords needed
4. **Real-time by default** - Subscriptions handle sync automatically
5. **Call reducers to mutate** - Tables are read-only from client
6. **Use generated types** - Everything in `module_bindings/` is auto-generated

---

**You're all set!** 🚀 Your SpacetimeDB integration is ready to go. Just publish your module and start building!



