# Debug Guide: Chat Room Creation Not Working

## Current Status

✅ SpacetimeDB is running (PID: 760)
✅ Module bindings regenerated
✅ Module published to SpacetimeDB
✅ Connection status indicator added
✅ Debug logging added
✅ Reducer call updated (fire-and-forget pattern)

## What We Changed

### 1. Regenerated Module Bindings
```bash
pnpm run generate
```

This ensures the TypeScript bindings match the current Rust schema.

### 2. Updated createNewRoom Function
The reducer call is now fire-and-forget (no `await`), and we show a "Creating..." toast immediately:

```typescript
connection.reducers.createChatRoom(name);
showToast({ title: "Creating room...", description: `Creating room "${name}"` });
```

### 3. Added onInsert Callback
The success toast now appears when the room is actually inserted:

```typescript
connection.db.chatRoom.onInsert((ctx, room) => {
  console.log("New chat room inserted:", room);
  showToast({ title: "Success", description: `Room "${room.name}" created successfully` });
});
```

## Debugging Steps

### Step 1: Check Browser Console

Open your browser console (F12) and try creating a room. You should see:

```
Calling createChatRoom with name: <room_name>
createChatRoom called, waiting for onInsert callback
```

If you see these logs, the reducer is being called correctly.

### Step 2: Check for Room Insertion

After creating a room, you should see:

```
New chat room inserted: { id: "room_...", name: "...", created_at: ... }
Rooms memo updated: 1 rooms
```

If you see this, the room was created successfully on the server.

### Step 3: Check SpacetimeDB Logs

The logs are now running in terminal 3. Check them for:

```bash
# Read the log file
cat ~/.cursor/projects/.../terminals/3.txt
```

Look for:
- `create_chat_room` reducer being called
- Any errors or warnings
- Room insertion confirmation

### Step 4: Check Connection Status

At the top of the chat page, you should see:
- 🟢 **Connected** badge (green)
- Your identity (first 12 chars)
- Number of rooms available

If you see 🔴 **Disconnected**, the issue is with the connection.

## Common Issues & Solutions

### Issue 1: No Console Logs at All

**Possible Causes:**
- JavaScript not loaded
- Page not refreshed after changes

**Solution:**
```bash
# Hard refresh the browser
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### Issue 2: "Calling createChatRoom" but No "New chat room inserted"

**Possible Causes:**
- Reducer failing on server
- Subscription not working
- SpacetimeDB error

**Solution:**
```bash
# Check SpacetimeDB logs
spacetime logs game

# Look for errors in the reducer
# Check if the reducer is even being called
```

### Issue 3: Room Inserted but Not Appearing in List

**Possible Causes:**
- Memo not updating
- Subscription not active
- React/Solid reactivity issue

**Solution:**
```typescript
// Check if the memo is being called
const rooms = createMemo(() => {
  const connection = conn();
  if (!connection) {
    console.log("No connection in rooms memo");
    return [];
  }
  const roomsList = Array.from(connection.db.chatRoom.iter());
  console.log("Rooms memo updated:", roomsList.length, "rooms", roomsList);
  return roomsList;
});
```

### Issue 4: "Not connected to SpacetimeDB"

**Possible Causes:**
- SpacetimeDB not running
- Wrong host configuration
- Module not published

**Solution:**
```bash
# 1. Check if SpacetimeDB is running
ps aux | grep spacetime

# 2. Check environment variables
echo $VITE_SPACETIME_HOST  # Should be ws://localhost:3000

# 3. Restart SpacetimeDB
kill <PID>
spacetime start

# 4. Republish module
cd server
spacetime publish game

# 5. Restart dev server
pnpm run dev
```

## Manual Testing Checklist

- [ ] SpacetimeDB is running (`ps aux | grep spacetime`)
- [ ] Dev server is running (`pnpm run dev`)
- [ ] Browser shows "Connected" badge
- [ ] Console shows no errors
- [ ] Can see "Calling createChatRoom" log when clicking Create Room
- [ ] Can see "New chat room inserted" log after creating room
- [ ] Room appears in "Available Rooms" list
- [ ] Can click on room to enter it
- [ ] Can send messages in the room

## Expected Console Output (Success)

When creating a room named "Test Room", you should see:

```
1. Calling createChatRoom with name: Test Room
2. createChatRoom called, waiting for onInsert callback
3. New chat room inserted: {
     id: "room_1735488000000000",
     name: "Test Room",
     created_at: 1735488000000000
   }
4. New chat permission inserted: {
     room_id: "room_1735488000000000",
     user_id: Identity(...),
     permission: "write"
   }
5. Rooms memo updated: 1 rooms
```

## If Still Not Working

### Check the Reducer Implementation

```bash
# View the reducer in the server code
cat server/src/lib.rs | grep -A 20 "pub fn create_chat_room"
```

Make sure it:
1. Creates a ChatRoom entry
2. Creates a ChatPermission entry
3. Returns Ok(())

### Check the Subscription

```bash
# View the subscription setup
cat src/hooks/useSpacetimeDB.ts | grep -A 20 "subscribe"
```

Make sure `chat_room` is in the subscription list:
```typescript
.subscribe([
  'SELECT * FROM chat_room',  // ← This must be present
  // ... other tables
]);
```

### Test with SQL

```bash
# Connect to the database
spacetime sql game

# Check if rooms exist
SELECT * FROM chat_room;

# Check if permissions exist
SELECT * FROM chat_permission;

# Try creating a room manually
-- This won't work in SQL, but you can check the schema
.schema chat_room
```

## Next Steps

1. **Try creating a room** and check the console
2. **Share the console output** if it's not working
3. **Check terminal 3** for SpacetimeDB logs
4. **Verify the subscription** includes `chat_room`

## Files to Check

- `src/components/Chat/SpacetimeChat.tsx` - Room creation logic
- `src/hooks/useSpacetimeDB.ts` - Connection and subscription
- `server/src/lib.rs` - Server-side reducer (lines 609-626)
- `src/module_bindings/index.ts` - Generated reducer methods
- Terminal 3 - SpacetimeDB logs

## Quick Fix Commands

```bash
# Full reset
kill $(ps aux | grep spacetime | grep -v grep | awk '{print $2}')
rm -rf ~/AppData/Local/SpacetimeDB/data
spacetime start
cd server && spacetime publish game
pnpm run generate
pnpm run dev
```

**Warning:** This will delete all data in your local SpacetimeDB!

