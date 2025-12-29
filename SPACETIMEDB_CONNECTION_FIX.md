# SpacetimeDB Connection Fix Guide

## Problem
SpacetimeDB is failing to start with a file lock error:
```
Error: error while taking database lock on spacetime.pid
Caused by:
    The process cannot access the file because another process has locked a portion of the file. (os error 33)
```

This means SpacetimeDB is either already running or didn't shut down cleanly.

## Solutions

### Option 1: Find and Connect to Running Instance
If SpacetimeDB is already running, you just need to make sure your app is connecting to the right port.

1. **Check if SpacetimeDB is running:**
   ```bash
   # Windows (PowerShell)
   Get-Process | Where-Object {$_.ProcessName -like "*spacetime*"}
   
   # Or check what's listening on port 3000
   netstat -ano | findstr :3000
   ```

2. **Check your environment variables:**
   The app expects SpacetimeDB on `ws://localhost:3000` by default.
   
   Create or edit `.env` file:
   ```env
   VITE_SPACETIME_HOST=ws://localhost:3000
   VITE_SPACETIME_MODULE_NAME=game
   ```

3. **Restart your dev server:**
   ```bash
   npm run dev
   ```

---

### Option 2: Kill Existing Process and Restart

1. **Find the process ID (PID):**
   ```bash
   # Windows (PowerShell)
   Get-Process | Where-Object {$_.ProcessName -like "*spacetime*"}
   
   # Or using netstat to find what's on port 3000
   netstat -ano | findstr :3000
   # The last column is the PID
   ```

2. **Kill the process:**
   ```bash
   # Windows (Command Prompt as Admin)
   taskkill /PID <PID_NUMBER> /F
   
   # Example:
   taskkill /PID 12345 /F
   ```

3. **Delete the lock file (if it still exists):**
   ```bash
   # Navigate to SpacetimeDB data directory
   cd C:\Users\Pangloss\AppData\Local\SpacetimeDB\data
   
   # Delete the lock file
   del spacetime.pid
   ```

4. **Start SpacetimeDB fresh:**
   ```bash
   spacetime start
   ```

---

### Option 3: Use Different Terminal Windows

If you want to keep things organized:

1. **Terminal 1 - SpacetimeDB:**
   ```bash
   spacetime start
   ```
   Leave this running in the background.

2. **Terminal 2 - Dev Server:**
   ```bash
   npm run dev
   ```

3. Keep both terminals open and visible so you can monitor both services.

---

## Verify Connection

Once SpacetimeDB is running, you should see in your app:

✅ **Connected**: Green badge saying "● Connected" with your identity
❌ **Disconnected**: Red badge saying "● Disconnected" with connection help

The connection status indicator appears at the top of the chat component and shows:
- Connection state (Connected/Disconnected)
- Your SpacetimeDB identity (when connected)
- Number of available chat rooms
- Helpful error message when not connected

---

## Publishing Your Module

If you've made changes to the server code, you need to republish:

```bash
# Navigate to server directory
cd server

# Build and publish to local SpacetimeDB
spacetime publish -s game

# Or if using a specific host
spacetime publish -s game --project-path .
```

---

## Checking Logs

To see what's happening with SpacetimeDB:

```bash
# Check SpacetimeDB logs
spacetime logs game

# Or for more detailed logs
spacetime logs game --follow
```

---

## Common Issues

### Issue: Port 3000 is already in use
**Solution:** Either:
- Stop whatever is using port 3000, or
- Configure SpacetimeDB to use a different port
- Update `VITE_SPACETIME_HOST` to match

### Issue: Module not found
**Solution:**
```bash
# List all modules
spacetime list

# If 'game' module doesn't exist, publish it
cd server
spacetime publish -s game
```

### Issue: Connection refused
**Solution:**
- Make sure SpacetimeDB is actually running
- Check firewall settings
- Verify the correct host/port in your .env file

### Issue: Identity/auth errors
**Solution:**
```bash
# Clear browser storage (in dev console)
localStorage.clear();

# Or manually remove the auth token
localStorage.removeItem('auth_token');
```

---

## Quick Start Checklist

- [ ] SpacetimeDB is running (`spacetime start`)
- [ ] `.env` file has correct `VITE_SPACETIME_HOST`
- [ ] Module is published (`spacetime publish -s game`)
- [ ] Dev server is running (`npm run dev`)
- [ ] Browser shows "Connected" badge
- [ ] No errors in browser console or terminal

---

## Connection Status in Code

The SpacetimeChat component now includes a connection status indicator that shows:

```tsx
// At the top of the chat interface
<Badge variant="default">● Connected</Badge>
// OR
<Badge variant="destructive">● Disconnected</Badge>

// When disconnected, shows helpful error message with:
// - Expected host URL
// - Troubleshooting steps
// - Current configuration
```

All action buttons (Create Room, Send Message) are automatically disabled when not connected.


