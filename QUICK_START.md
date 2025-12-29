# Quick Start Guide - SpacetimeDB Authentication Fixed! 🎉

## What Was Fixed

Your SpacetimeDB connection was failing because:
1. ❌ Client was trying to use cloud authentication tokens for local development
2. ❌ SpacetimeDB module wasn't published
3. ❌ Port conflict between dev server and SpacetimeDB

All issues are now **RESOLVED**! ✅

## Start Your App (3 Simple Steps)

### Step 1: Start SpacetimeDB
```bash
spacetime start
```

**Expected output:**
```
Starting SpacetimeDB listening on 0.0.0.0:3000
```

Leave this terminal running.

### Step 2: Publish Your Module (if not already done)
In a new terminal:
```bash
pnpm publish:local
```

**Expected output:**
```
Updated database with name: game, identity: c2002cace3beace2190e84293085cdc304cb867778548373a5b811992baa9cd0
```

### Step 3: Start Dev Server
```bash
pnpm dev
```

**Expected output:**
```
➜ Local:    http://localhost:3001/
```

### Step 4: Test Connection
1. Open `http://localhost:3001` in your browser
2. Open browser console (F12)
3. Look for these messages:

```
Connecting to SpacetimeDB at ws://localhost:3000 with module game
Connecting to local SpacetimeDB (no auth token required)
Connected to SpacetimeDB with identity: <your-identity>
SpacetimeDB client cache initialized.
```

## Environment Setup (Optional)

Create a `.env` file if you want to customize:

```env
# Local Development (default behavior)
VITE_SPACETIME_HOST=ws://localhost:3000
VITE_SPACETIME_MODULE_NAME=game
```

**Note:** If no `.env` file exists, these are the defaults, so it will work without one!

## Troubleshooting

### Issue: "Connection refused" or "Failed to connect"

**Solution 1:** Make sure SpacetimeDB is running
```bash
# Check if SpacetimeDB is running
netstat -ano | findstr :3000

# If not running, start it
spacetime start
```

**Solution 2:** Clear old auth tokens
```javascript
// In browser console:
localStorage.removeItem('auth_token');
location.reload();
```

### Issue: "Module not found"

**Solution:** Republish the module
```bash
pnpm publish:local
```

### Issue: Port 3000 already in use

**Solution:** Stop the conflicting process or use a different port
```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill //F //PID <PID>
```

## What Changed in the Code

### `src/hooks/useSpacetimeDB.ts`
- ✅ Now detects localhost connections
- ✅ Skips authentication for local development
- ✅ Only uses tokens for cloud connections

### `package.json`
- ✅ Dev server now runs on port 3001 (avoiding conflict with SpacetimeDB on 3000)

### SpacetimeDB Module
- ✅ Published to local instance with name "game"

## Next Steps

1. **Test the connection** - Open the app and check the console
2. **Try the features** - Navigate to different pages (Counters, Chat, Vote, etc.)
3. **Open multiple tabs** - See real-time synchronization in action!
4. **Read the docs** - Check `SPACETIMEDB_GUIDE.md` for more details

## Common Commands

```bash
# Start everything
spacetime start          # Terminal 1
pnpm dev                 # Terminal 2

# Publish module after changes
pnpm publish:local

# Regenerate TypeScript bindings
pnpm generate

# View SpacetimeDB logs
pnpm logs:local

# Query database directly
pnpm sql:local
```

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐
│   Browser       │         │  SpacetimeDB     │
│  (port 3001)    │◄───────►│  (port 3000)     │
│                 │  WebSocket │                │
│  - SolidJS App  │         │  - Rust Module   │
│  - SDK Client   │         │  - Tables        │
│  - No Auth      │         │  - Reducers      │
│    (local)      │         │  - No Auth       │
└─────────────────┘         │    (local)       │
                            └──────────────────┘
```

## Success Indicators

✅ SpacetimeDB running on port 3000
✅ Dev server running on port 3001  
✅ Console shows "Connected to SpacetimeDB"
✅ No authentication errors
✅ Real-time updates working

---

**You're all set!** Your SpacetimeDB authentication is now properly configured for local development. 🚀

For more details, see:
- `AUTH_FIX_SUMMARY.md` - Technical details of the fix
- `SPACETIMEDB_GUIDE.md` - Complete SpacetimeDB guide
- `SPACETIMEDB_EXAMPLES.tsx` - Code examples




