# Authentication Fix Summary

## Problem Identified

Your SpacetimeDB client was failing to connect due to authentication issues. The logs showed:
```
Fetching key for issuer https://auth.spacetimedb.com
```

This indicated the client was trying to use cloud authentication tokens for a **local** SpacetimeDB instance.

## Root Causes

1. **Invalid Token Usage**: The client was attempting to use a stored `auth_token` from localStorage, which was either:
   - Invalid or expired
   - Meant for cloud authentication
   - Not needed for local development

2. **Port Conflict**: The dev server was running on port 3000, conflicting with SpacetimeDB which also needs port 3000

3. **Module Not Published**: The SpacetimeDB module wasn't initially published to the local instance

## Solutions Applied

### 1. Fixed Authentication Logic (`src/hooks/useSpacetimeDB.ts`)

**Before:**
```typescript
DbConnection.builder()
  .withUri(host)
  .withModuleName(moduleName)
  .withToken(localStorage.getItem('auth_token') || undefined) // ❌ Always tried to use token
  .build();
```

**After:**
```typescript
// Detect if connecting to local or remote
const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');
const authToken = isLocalHost ? undefined : (localStorage.getItem('auth_token') || undefined);

const builder = DbConnection.builder()
  .withUri(host)
  .withModuleName(moduleName)
  .onConnect(onConnect)
  .onDisconnect(onDisconnect)
  .onConnectError(onConnectError);

// Only add token for remote connections
if (authToken) {
  builder.withToken(authToken);
}

builder.build();
```

**Key Change**: Local connections now skip token authentication entirely, as local SpacetimeDB instances don't require it.

### 2. Fixed Port Conflict (`package.json`)

Changed dev server scripts to run on port 3001:
```json
"scripts": {
  "dev": "vinxi dev --port 3001",
  "dev:client": "vinxi dev --port 3001",
  ...
}
```

This avoids conflict with SpacetimeDB which runs on port 3000.

### 3. Published Module

Successfully published the `game` module to local SpacetimeDB:
```bash
cd server && spacetime publish --server local --project-path . game
```

Result:
```
Updated database with name: game, identity: c2002cace3beace2190e84293085cdc304cb867778548373a5b811992baa9cd0
```

## How to Test

1. **Start SpacetimeDB** (if not already running):
   ```bash
   spacetime start
   ```

2. **Start Dev Server**:
   ```bash
   pnpm dev
   ```

3. **Open Browser**:
   - Navigate to `http://localhost:3001`
   - Open browser console
   - Look for: `"Connecting to local SpacetimeDB (no auth token required)"`
   - Then: `"Connected to SpacetimeDB with identity: ..."`

## Environment Configuration

Create a `.env` file in the project root:

```env
# Local Development (default)
VITE_SPACETIME_HOST=ws://localhost:3000
VITE_SPACETIME_MODULE_NAME=game
```

For cloud deployment, change to:
```env
VITE_SPACETIME_HOST=wss://testnet.spacetimedb.com
VITE_SPACETIME_MODULE_NAME=socket-signals
```

## Key Takeaways

1. **Local vs Remote**: Local SpacetimeDB instances don't require authentication tokens
2. **Port Management**: Dev server (3001) and SpacetimeDB (3000) need separate ports
3. **Module Publishing**: Always publish your module after changes to `server/src/lib.rs`
4. **Token Handling**: Only use auth tokens when connecting to cloud instances

## Next Steps

1. Clear browser localStorage if you still have connection issues:
   ```javascript
   localStorage.removeItem('auth_token');
   ```

2. Monitor the browser console for connection messages

3. Check SpacetimeDB logs in terminal for any server-side errors

4. If issues persist, verify:
   - SpacetimeDB is running: `netstat -ano | findstr :3000`
   - Module is published: `spacetime list --server local`
   - Browser is connecting to correct port (3001)

## Files Modified

- ✅ `src/hooks/useSpacetimeDB.ts` - Fixed auth logic
- ✅ `app.config.ts` - Changed port to 3001
- ✅ `README_SPACETIMEDB.md` - Updated documentation
- ✅ `server/` - Published module to local instance

Your authentication should now work correctly for local development! 🎉

