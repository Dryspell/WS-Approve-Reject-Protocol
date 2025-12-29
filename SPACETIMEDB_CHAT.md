# SpacetimeDB Chat Implementation

Quick reference for the SpacetimeDB chat feature in this project.

## Key Components

- **SpacetimeChat.tsx**: Main chat component with rooms, messages, and permissions
- **useSpacetimeDB.ts**: Hook providing connection, identity, and subscription management
- **Server (lib.rs)**: Rust reducers for `create_chat_room`, `send_chat_message`, and permission management

## SpacetimeDB Patterns (SolidJS)

### Connection & Data Loading
```typescript
const { conn, identity, connected } = useSpacetimeDB();

// Use signals for reactive data
const [rooms, setRooms] = createSignal<ChatRoom[]>([]);

// Load initial data and set up subscriptions in createEffect
createEffect(() => {
  const connection = conn();
  if (!connection || !connected()) return;
  
  // Load initial data
  const initialRooms = Array.from(connection.db.chatRoom.iter());
  setRooms(initialRooms);
  
  // Subscribe to updates
  connection.db.chatRoom.onInsert((ctx, room) => {
    setRooms(prev => [...prev, room]);
  });
});
```

### Calling Reducers
```typescript
connection.reducers.createChatRoom(name);
connection.reducers.sendChatMessage(roomId, content);
```

### Permissions Check
```typescript
const hasWritePermission = createMemo(() => {
  const currentRoomId = currentRoom();
  const currentIdentity = identity()?.toHexString();
  return permissions().some(
    p => p.roomId === currentRoomId && 
         p.userId.toHexString() === currentIdentity && 
         p.permission === "write"
  );
});
```

## Common Issues

1. **Rooms not appearing**: Ensure `chat_room` table is in subscription list in `useSpacetimeDB.ts`
2. **Connection timing**: Use `createEffect` (not `onMount`) to wait for connection
3. **Reactivity**: Use signals + `onInsert` callbacks, not just memos with `iter()`
4. **Schema mismatch**: Run `pnpm run generate` after server changes

## Regenerating Bindings

After modifying `server/src/lib.rs`:
```bash
spacetime publish game
pnpm run generate
```

