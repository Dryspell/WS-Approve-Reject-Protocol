# Debug: Reducer Not Being Called

## Status
✅ Module published with logging
✅ Bindings regenerated
✅ SpacetimeDB logs tailing (terminal 6)
✅ Chat tables created in database

## The Symptom

**Browser console shows:**
```
Calling createChatRoom with name: Test Room
createChatRoom called, waiting for onInsert callback
```

**SpacetimeDB logs show:**
```
[NO LOGS - Reducer never called]
```

This means the client is trying to call the reducer, but it's not reaching the server.

## Debugging Steps

### Step 1: Check Browser Console for Errors

Open your browser console (F12) and look for any errors. Common issues:

```javascript
// ❌ Connection error
WebSocket connection to 'ws://localhost:3000/...' failed

// ❌ Reducer error  
Error calling reducer: create_chat_room

// ❌ Not connected
Cannot call reducer: not connected
```

### Step 2: Verify Connection in Browser Console

Type this in the browser console:

```javascript
// Check if connected
window.location.reload(); // Then check the SpacetimeDB logs

// Or manually check the connection
// (assuming you can access the conn in dev tools)
```

### Step 3: Check the Connection URL

In `src/hooks/useSpacetimeDB.ts`, verify:

```typescript
const host = import.meta.env.VITE_SPACETIME_HOST || "ws://localhost:3000";
const moduleName = import.meta.env.VITE_SPACETIME_MODULE_NAME || "game";
```

**Expected values:**
- `host`: `ws://localhost:3000` (for local dev)
- `moduleName`: `game`

### Step 4: Test the Reducer Manually

You can test calling the reducer from the command line:

```bash
# Using spacetime CLI
spacetime call game create_chat_room '{"name": "CLI Test Room"}'
```

If this works, you should see in **terminal 6**:
```
🎯 create_chat_room CALLED! Name: CLI Test Room
📦 Generated room_id: room_...
✅ Inserted chat_room: CLI Test Room (room_...)
🔐 Inserted chat_permission for user ...
🎉 create_chat_room COMPLETED successfully!
```

### Step 5: Check Module Bindings

Verify the generated reducer signature:

```bash
cat src/module_bindings/index.ts | grep -A 5 "createChatRoom("
```

Should show:
```typescript
createChatRoom(name: string) {
  const __args = { name };
  // ...
  this.connection.callReducer("create_chat_room", __argsBuffer, ...);
}
```

### Step 6: Add More Client Logging

Let's add more detailed logging to see exactly what's happening:

```typescript
// In SpacetimeChat.tsx, update createNewRoom:
try {
  console.log("Connection object:", connection);
  console.log("Connection.reducers:", connection.reducers);
  console.log("About to call createChatRoom");
  
  connection.reducers.createChatRoom(name);
  
  console.log("createChatRoom called (but may not have sent yet)");
} catch (error) {
  console.error("Error in createNewRoom:", error);
}
```

## Common Issues & Solutions

### Issue 1: Wrong Database/Module Name

**Symptom:** Reducer never called, no errors in console

**Check:**
```bash
# List all databases
spacetime list

# Should show: game
```

**Solution:**
Make sure your `.env` has:
```
VITE_SPACETIME_MODULE_NAME=game
```

### Issue 2: Connection Not Established

**Symptom:** Console shows "Calling createChatRoom" but connection badge shows "Disconnected"

**Solution:**
```bash
# Restart SpacetimeDB
kill $(ps aux | grep spacetime | awk '{print $2}')
spacetime start

# Refresh browser
```

### Issue 3: WebSocket Connection Failed

**Symptom:** Browser console shows WebSocket error

**Check:**
```bash
# Verify SpacetimeDB is listening
netstat -an | grep 3000
# Should show: 127.0.0.1:3000 ... LISTENING
```

**Solution:**
```bash
# Check if another service is using port 3000
# Kill it or change SpacetimeDB port
```

### Issue 4: Reducer Name Mismatch

**Symptom:** Reducer called but server shows "Unknown reducer"

**Check server logs for:**
```
ERROR: Unknown reducer: create_chat_room
```

**Solution:**
Verify the reducer name in `server/src/lib.rs`:
```rust
#[reducer]
pub fn create_chat_room(...) { ... }
//          ^^^^^^^^^^^^^^^ Must match client call
```

### Issue 5: Client Not Sending Calls

**Symptom:** No WebSocket traffic, no errors

**Possible causes:**
- Browser is caching old code
- Connection object is null/undefined
- Reducer method doesn't exist on connection.reducers

**Solution:**
```bash
# 1. Hard refresh browser
Ctrl + Shift + R

# 2. Clear browser cache completely

# 3. Restart dev server
# Kill the dev server (Ctrl+C) then:
pnpm run dev
```

## Expected Flow (When Working)

### 1. Browser Console
```
Calling createChatRoom with name: Test Room
[WebSocket] Sending: create_chat_room reducer call
createChatRoom called, waiting for onInsert callback
```

### 2. SpacetimeDB Logs (Terminal 6)
```
🎯 create_chat_room CALLED! Name: Test Room, Sender: Identity(...)
📦 Generated room_id: room_1735488000000000
✅ Inserted chat_room: Test Room (room_1735488000000000)
🔐 Inserted chat_permission for user Identity(...)
🎉 create_chat_room COMPLETED successfully!
```

### 3. Browser Console (After Insert)
```
New chat room inserted: { id: "room_...", name: "Test Room", ... }
New chat permission inserted: { room_id: "room_...", ... }
```

### 4. UI
- Room appears in "Available Rooms" list
- Success toast shows
- Room count updates

## What to Try Now

1. **Refresh browser** (Ctrl + Shift + R)
2. **Try creating a room**
3. **Watch terminal 6** for the 🎯 emoji logs
4. **Check browser console** for any errors
5. **Share what you see** in both places

## If Still Not Working

### Get Connection Details

Add this temporary code to SpacetimeChat.tsx:

```typescript
onMount(() => {
  const connection = conn();
  console.log("=== CONNECTION DEBUG ===");
  console.log("Connection:", connection);
  console.log("Connected:", connected());
  console.log("Identity:", identity()?.toHexString());
  console.log("Reducers object:", connection?.reducers);
  console.log("createChatRoom method:", typeof connection?.reducers?.createChatRoom);
  console.log("=====================");
});
```

This will tell us:
- Is there a connection object?
- Is it connected?
- Does the reducers object exist?
- Does the createChatRoom method exist?

### Try Manual Call

In browser console, try:

```javascript
// This is hacky but will help debug
// You need to access the SpacetimeDB connection somehow
// For example, if you can access the component's props
```

## Files to Check

- `src/hooks/useSpacetimeDB.ts` - Connection setup
- `src/components/Chat/SpacetimeChat.tsx` - Reducer call
- `src/module_bindings/index.ts` - Generated methods
- `server/src/lib.rs` - Server-side reducer (line 609)
- Terminal 6 - SpacetimeDB logs (watch for 🎯)

## Next Steps

1. Try creating a room
2. Check terminal 6 for logs with 🎯
3. If no logs appear, the reducer is NOT being called
4. If logs appear, the problem is elsewhere (reactivity, etc.)

Share what you see in both terminal 6 and browser console!

