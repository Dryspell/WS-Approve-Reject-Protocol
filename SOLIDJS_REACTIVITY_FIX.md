# SolidJS Reactivity Fix for SpacetimeDB

## The Problem

The chat rooms weren't appearing in the UI even though they were being inserted into SpacetimeDB. The console showed:
```
Calling createChatRoom with name: Test Room
createChatRoom called, waiting for onInsert callback
New chat room inserted: { ... }
```

But the UI didn't update!

## Root Cause

### ❌ What Was Wrong

We were using `createMemo` to read directly from SpacetimeDB's cache:

```typescript
const rooms = createMemo(() => {
  const connection = conn();
  if (!connection) return [];
  return Array.from(connection.db.chatRoom.iter());
});
```

**The Problem:** `connection.db.chatRoom.iter()` is not a reactive source in SolidJS. When SpacetimeDB updates its cache, SolidJS doesn't know to re-run the memo because there's no signal dependency.

### ✅ The Solution

Use SolidJS signals and update them in SpacetimeDB's `onInsert` callbacks:

```typescript
// 1. Create signals for the data
const [rooms, setRooms] = createSignal<ChatRoom[]>([]);

// 2. Load initial data in onMount
onMount(() => {
  const connection = conn();
  if (!connection) return;
  
  // Load initial rooms
  const initialRooms = Array.from(connection.db.chatRoom.iter());
  setRooms(initialRooms);
  
  // 3. Listen for updates and update the signal
  connection.db.chatRoom.onInsert((ctx, room) => {
    setRooms(prev => [...prev, room]);
  });
});

// 4. Now the UI automatically updates when rooms change!
```

## How It Works

### SolidJS Reactivity Model

In SolidJS:
- **Signals** are reactive sources
- **Effects** and **Memos** track which signals they read
- When a signal updates, all effects/memos that read it automatically re-run

### SpacetimeDB + SolidJS Integration

```typescript
// ❌ BAD - No reactivity
const data = createMemo(() => Array.from(connection.db.table.iter()));

// ✅ GOOD - Reactive
const [data, setData] = createSignal([]);
connection.db.table.onInsert((ctx, item) => {
  setData(prev => [...prev, item]);
});
```

## The Complete Pattern

### 1. Define Signals
```typescript
const [rooms, setRooms] = createSignal<ChatRoom[]>([]);
const [messages, setMessages] = createSignal<ChatMessage[]>([]);
const [permissions, setPermissions] = createSignal<ChatPermission[]>([]);
```

### 2. Load Initial Data
```typescript
onMount(() => {
  const connection = conn();
  if (!connection) return;
  
  // Load existing data
  setRooms(Array.from(connection.db.chatRoom.iter()));
  setMessages(Array.from(connection.db.chatMessage.iter()));
  setPermissions(Array.from(connection.db.chatPermission.iter()));
});
```

### 3. Subscribe to Updates
```typescript
// Add new items
connection.db.chatRoom.onInsert((ctx, room) => {
  setRooms(prev => [...prev, room]);
});

// Update existing items
connection.db.chatRoom.onUpdate((ctx, oldRoom, newRoom) => {
  setRooms(prev => prev.map(r => r.id === newRoom.id ? newRoom : r));
});

// Remove items
connection.db.chatRoom.onDelete((ctx, room) => {
  setRooms(prev => prev.filter(r => r.id !== room.id));
});
```

### 4. Use Memos for Derived Data
```typescript
// Filter messages for current room
const messages = createMemo(() => {
  const currentRoomId = currentRoom();
  return allMessages().filter(msg => msg.roomId === currentRoomId);
});
```

## Before vs After

### Before (Not Working)
```typescript
// ❌ Memo reads directly from SpacetimeDB cache
const rooms = createMemo(() => {
  const connection = conn();
  if (!connection) return [];
  return Array.from(connection.db.chatRoom.iter());
});
// UI doesn't update when rooms change!
```

### After (Working)
```typescript
// ✅ Signal updated by onInsert callback
const [rooms, setRooms] = createSignal<ChatRoom[]>([]);

onMount(() => {
  const connection = conn();
  if (!connection) return;
  
  setRooms(Array.from(connection.db.chatRoom.iter()));
  
  connection.db.chatRoom.onInsert((ctx, room) => {
    setRooms(prev => [...prev, room]);
  });
});
// UI automatically updates when rooms signal changes!
```

## Key Takeaways

1. **SpacetimeDB cache is NOT reactive** - It won't trigger SolidJS updates
2. **Use signals for data** - Make data reactive by storing it in signals
3. **Use onInsert/onUpdate/onDelete** - Update signals in these callbacks
4. **Load initial data** - Don't forget to load existing data on mount
5. **Use memos for filtering** - Derive filtered/sorted data from signals

## Testing the Fix

After this fix, when you create a room:

1. ✅ Console shows: `"New chat room inserted: { ... }"`
2. ✅ Signal is updated: `setRooms(prev => [...prev, room])`
3. ✅ UI re-renders automatically
4. ✅ Room appears in "Available Rooms" list
5. ✅ Success toast appears

## Performance Note

This pattern is efficient because:
- SolidJS's fine-grained reactivity only updates what changed
- We're not polling or re-fetching data
- SpacetimeDB handles the real-time sync
- We just need to wire SpacetimeDB's events to SolidJS's signals

## Common Pitfalls

### Pitfall 1: Reading cache in memos
```typescript
// ❌ DON'T DO THIS
const data = createMemo(() => connection.db.table.iter());
```

### Pitfall 2: Forgetting initial load
```typescript
// ❌ Only listening for new inserts, missing existing data
connection.db.table.onInsert((ctx, item) => {
  setData(prev => [...prev, item]);
});
```

### Pitfall 3: Not using signals at all
```typescript
// ❌ Local state won't update from SpacetimeDB
const [rooms, setRooms] = createSignal([]);
// ... but never calling setRooms in onInsert
```

## Related Patterns

### React
In React, you'd use `useState` instead:
```javascript
const [rooms, setRooms] = useState([]);
```

### Vue
In Vue, you'd use `ref`:
```javascript
const rooms = ref([]);
```

### Svelte
In Svelte, you'd use stores:
```javascript
const rooms = writable([]);
```

The pattern is the same across all frameworks: **use the framework's reactive primitives, not just reading from cache!**

