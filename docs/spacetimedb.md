# SpacetimeDB Integration Guide

## Quick Start

### Prerequisites
- Node.js (v18+)
- SpacetimeDB CLI: `npm install -g @clockworklabs/spacetimedb-cli`

### Local Development

```bash
# Terminal 1: Start SpacetimeDB
spacetime start

# Terminal 2: Publish module (first time or after schema changes)
pnpm publish:local

# Terminal 3: Start dev server
pnpm dev
```

Navigate to `http://localhost:3001` and check the console for:
```
Connected to SpacetimeDB with identity: ...
```

### Environment Configuration

Create `.env` for local development (optional - these are the defaults):
```env
VITE_SPACETIME_HOST=ws://localhost:3000
VITE_SPACETIME_MODULE_NAME=game
```

For cloud deployment:
```env
VITE_SPACETIME_HOST=wss://testnet.spacetimedb.com
VITE_SPACETIME_MODULE_NAME=socket-signals
```

---

## Architecture Overview

```
Browser (Client)          SpacetimeDB Server         Rust Module
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

- **Identity**: Each client gets a unique public key (no passwords needed)
- **Tables**: Defined in Rust, auto-synced to clients (read-only from client)
- **Reducers**: Server functions that modify data (called from client)
- **Subscriptions**: SQL queries that keep client data in real-time sync

---

## Common Patterns

### Get Connection & Identity
```typescript
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";

const { conn, identity, connected } = useSpacetimeDB();
```

### Read Table Data
```typescript
// Get all rows
const users = () => conn()?.db.user.getAll() ?? [];

// Find by primary key
const myUser = () => conn()?.db.user.identity.find(identity()) ?? null;

// Filter rows
const onlineUsers = () => 
  conn()?.db.user.getAll().filter(u => u.online) ?? [];
```

### Call Reducers (Mutations)
```typescript
const connection = conn();
if (!connection) return;

// Set user name
connection.reducers.setName("Alice");

// Move a unit
connection.reducers.moveUnit(42, { x: 100, y: 200 });

// Send message
connection.reducers.sendChatMessage(roomId, "Hello!");
```

### Subscribe to Real-time Updates
```typescript
onMount(() => {
  const connection = conn();
  if (!connection) return;

  connection.db.unit.onInsert((ctx, unit) => {
    console.log("Unit added:", unit);
  });

  connection.db.unit.onUpdate((ctx, oldUnit, newUnit) => {
    console.log("Unit updated:", newUnit);
  });

  connection.db.unit.onDelete((ctx, unit) => {
    console.log("Unit removed:", unit);
  });
});
```

---

## Commands Reference

```bash
# Development
pnpm dev                    # Start dev server (port 3001)
pnpm generate               # Regenerate TypeScript bindings

# Publishing
pnpm publish:local          # Publish to local SpacetimeDB
pnpm publish:cloud          # Publish to cloud

# Debugging
pnpm logs:local             # View local logs
pnpm sql:local "SELECT * FROM user"  # Query local database

# SpacetimeDB CLI
spacetime start             # Start local server
spacetime login             # Login to cloud
spacetime list              # List published modules
spacetime logs MODULE       # View module logs
spacetime sql MODULE "..."  # Run SQL query
```

---

## Authentication

SpacetimeDB uses **Identity-based auth** (no passwords):

- **Local development**: No authentication token required
- **Cloud deployment**: Uses token from localStorage

```typescript
// Each client automatically gets a unique Identity
const { identity } = useSpacetimeDB();

// Identity is automatically managed - no login needed
```

---

## Chat System

The chat system is fully integrated with SpacetimeDB:

```typescript
// Subscribe to messages
connection.db.chatMessage.onInsert((ctx, message) => {
  if (message.roomId === currentRoomId) {
    addMessage(message);
  }
});

// Send messages
connection.reducers.sendChatMessage(roomId, content, null);
```

Chat rooms are automatically created when game rooms are created, and permissions are managed automatically.

---

## Troubleshooting

### "Failed to connect to SpacetimeDB"
1. Check `.env` has correct host/module name
2. Verify SpacetimeDB is running: `spacetime start`
3. Make sure module is published: `pnpm publish:local`

### "Reducer failed" or "Invalid arguments"
1. Regenerate bindings: `pnpm generate`
2. View server logs: `pnpm logs:local`
3. Check reducer parameters match generated types

### "Table not found"
1. Regenerate bindings: `pnpm generate`
2. Republish module: `pnpm publish:local`
3. Hard refresh browser (Ctrl+Shift+R)

### Port Conflicts
- **SpacetimeDB**: Port 3000
- **Dev Server**: Port 3001

---

## Project Structure

```
socketSignal/
├── server/                    # SpacetimeDB Rust module
│   ├── src/lib.rs            # Tables, reducers, game logic
│   └── Cargo.toml
├── src/
│   ├── hooks/useSpacetimeDB.ts  # Connection hook
│   ├── module_bindings/         # Auto-generated types
│   └── components/              # UI components
└── .env                         # Connection config
```

---

## Resources

- [SpacetimeDB Docs](https://spacetimedb.com/docs/sdks/typescript/quickstart)
- [SpacetimeDB Discord](https://discord.gg/spacetimedb)
- See `SPACETIMEDB_EXAMPLES.tsx` for code examples
