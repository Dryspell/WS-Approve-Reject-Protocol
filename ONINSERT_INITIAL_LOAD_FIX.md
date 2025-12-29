# OnInsert Initial Load Fix - Preventing Duplicate Toasts

## The Problem

When refreshing the page, you saw a success toast for **every existing room** in the database:

```
✅ Room "test" created successfully
✅ Room "testing" created successfully
✅ Room "test1" created successfully
✅ Room "test2" created successfully
✅ Room "CLI Test Room" created successfully
```

This happened even though you didn't create those rooms - they were just being loaded from the database!

## Why This Happened

According to the [SpacetimeDB documentation](https://spacetimedb.com/docs/quickstarts/typescript#notify-about-new-users), the `onInsert` callback fires in **two different contexts**:

### 1. After Subscription Initialization (Existing Data)
When you first subscribe to a table, `onInsert` is called for **every existing row** to populate your client cache.

### 2. After Reducer Runs (New Data)
When a reducer creates a new row, `onInsert` is called to notify you about the new data.

### The Issue

Our original code didn't distinguish between these two cases:

```typescript
// ❌ Shows toast for BOTH existing and new rooms
connection.db.chatRoom.onInsert((ctx, room) => {
  setRooms(prev => [...prev, room]);
  showToast({
    title: "Success",
    description: `Room "${room.name}" created successfully`,
  });
  // This fires for:
  // - 5 existing rooms during initial load ← Unwanted toasts!
  // - 1 new room when you create it ← Wanted toast!
});
```

## The Solution

We need to distinguish between "initial load" and "newly created" rows. We use the `subscriptionsSet` flag to track this:

```typescript
// ✅ Only shows toast for newly created rooms
connection.db.chatRoom.onInsert((ctx, room) => {
  // Check if we already have this room
  const existingRoom = rooms().find(r => r.id === room.id);
  if (!existingRoom) {
    setRooms(prev => [...prev, room]);
    
    // Only show toast AFTER initial setup is complete
    if (subscriptionsSet()) {
      showToast({
        title: "Success",
        description: `Room "${room.name}" created successfully`,
      });
    }
  }
});
```

### How It Works

**Timeline during initial load:**
1. `subscriptionsSet = false`
2. Load initial rooms: `const initialRooms = Array.from(connection.db.chatRoom.iter())`
3. Set up `onInsert` callback
4. `onInsert` might fire for existing rows (depending on timing)
5. Check: Is room already in list? Yes → Skip
6. Check: Is `subscriptionsSet()` true? No → **Don't show toast** ✅
7. `subscriptionsSet = true`

**Timeline when creating new room:**
1. `subscriptionsSet = true` (already set up)
2. User calls `createChatRoom("New Room")`
3. Server creates the room
4. `onInsert` fires with the new room
5. Check: Is room already in list? No → Add it
6. Check: Is `subscriptionsSet()` true? Yes → **Show toast** ✅

## Preventing Duplicates

We also added duplicate checking to prevent adding the same item twice:

### For Rooms
```typescript
const existingRoom = rooms().find(r => r.id === room.id);
if (!existingRoom) {
  setRooms(prev => [...prev, room]);
}
```

### For Messages
```typescript
const existingMessage = allMessages().find(m => m.id === message.id);
if (!existingMessage) {
  setAllMessages(prev => [...prev, message]);
}
```

### For Permissions
```typescript
const existingPermission = allPermissions().find(
  p => p.roomId === permission.roomId && p.userId.isEqual(permission.userId)
);
if (!existingPermission) {
  setAllPermissions(prev => [...prev, permission]);
}
```

## Why Not Just Load Initial Data Differently?

You might wonder: "Why not just skip loading initial data manually?"

```typescript
// ❌ Could we do this?
connection.db.chatRoom.onInsert((ctx, room) => {
  setRooms(prev => [...prev, room]);
  // Let onInsert handle EVERYTHING (initial + new)?
});
```

**Problems with this approach:**
1. **Race condition**: `onInsert` might fire before our callback is attached
2. **Ordering**: No guarantee initial data loads before UI renders
3. **Control**: We want explicit control over when initial data is loaded
4. **Performance**: Loading synchronously is faster than waiting for callbacks

**Our approach:**
1. **Load initial data synchronously** - Fast, guaranteed to complete
2. **Set up callbacks** - Handle future updates
3. **Prevent duplicates** - Check if item already exists
4. **Only notify for new data** - Use `subscriptionsSet` flag

## Alternative Solutions

### Alternative 1: Track Initial Room IDs
```typescript
const initialRoomIds = new Set(initialRooms.map(r => r.id));

connection.db.chatRoom.onInsert((ctx, room) => {
  if (!initialRoomIds.has(room.id)) {
    // This is a new room, not from initial load
    showToast({ ... });
  }
  setRooms(prev => [...prev, room]);
});
```

**Pros:** Explicit tracking of initial vs new
**Cons:** More memory, need to maintain Set

### Alternative 2: Delayed Callback Attachment
```typescript
const initialRooms = Array.from(connection.db.chatRoom.iter());
setRooms(initialRooms);

// Wait a bit before setting up callback
setTimeout(() => {
  connection.db.chatRoom.onInsert((ctx, room) => {
    showToast({ ... });
    setRooms(prev => [...prev, room]);
  });
}, 100);
```

**Pros:** Simple logic
**Cons:** Race condition, arbitrary timeout, fragile

### Our Solution (Best)
```typescript
// 1. Load initial data
setRooms(initialRooms);

// 2. Set up callback with guards
connection.db.chatRoom.onInsert((ctx, room) => {
  const existingRoom = rooms().find(r => r.id === room.id);
  if (!existingRoom) {
    setRooms(prev => [...prev, room]);
    if (subscriptionsSet()) {
      showToast({ ... });
    }
  }
});

// 3. Mark setup complete
setSubscriptionsSet(true);
```

**Pros:** 
- Deterministic
- No race conditions
- Handles duplicates
- Clear intent

## Expected Behavior After Fix

### On Page Load
```
✅ SpacetimeDB connection ready!
📦 Initial rooms loaded: 5
💬 Initial messages loaded: 0
🔐 Initial permissions loaded: 5
✅ All subscriptions set up!
[No toasts shown] ← Fixed!
```

### When Creating New Room
```
Calling createChatRoom with name: My New Room
createChatRoom called, waiting for onInsert callback
🎉 New chat room inserted: { id: "room_...", name: "My New Room" }
✅ Room "My New Room" created successfully ← Toast appears!
```

## Testing the Fix

1. **Refresh the page** (Ctrl + Shift + R)
2. **Check:** No success toasts should appear ✅
3. **Check:** All 5 existing rooms should be visible ✅
4. **Create a new room** (e.g., "Test Room 6")
5. **Check:** Success toast appears for the new room ✅
6. **Check:** New room appears in the list ✅

## Key Takeaways

1. **`onInsert` fires for both existing and new data** - Always account for this
2. **Use flags to track initialization state** - Know when initial load is complete
3. **Check for duplicates** - Prevent adding the same item twice
4. **Only notify users for actual new data** - Not for initial load
5. **Load initial data explicitly** - Don't rely solely on callbacks

## References

From SpacetimeDB TypeScript Quickstart:
> Note that these callbacks can fire in two contexts:
> - After a reducer runs, when the client's cache is updated about changes to subscribed rows.
> - After calling `subscribe`, when the client's cache is initialized with all existing matching rows.

This is standard SpacetimeDB behavior, and our fix properly handles both cases!

