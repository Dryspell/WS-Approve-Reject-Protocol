# SpacetimeDB Setup Guide

## Quick Start (Cloud Hosting)

### 1. Install SpacetimeDB CLI

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://install.spacetimedb.com | sh

# Windows
# Download from https://spacetimedb.com/install
```

### 2. Create SpacetimeDB Account

```bash
spacetime login
```

Follow the prompts to create an account or log in.

### 3. Publish Your Module

```bash
cd server
spacetime publish --project-path . your-game-name
```

**Important**: Note the module name and URL from the output!

### 4. Configure Environment Variables

Create a `.env` file in your project root:

```env
# SpacetimeDB Cloud (Testnet)
VITE_SPACETIME_HOST=wss://testnet.spacetimedb.com
VITE_SPACETIME_MODULE_NAME=your-game-name

# Your game-specific settings
VITE_GAME_NAME="Socket Signals"
```

Replace `your-game-name` with the module name you chose.

### 5. Install Dependencies

```bash
pnpm install
```

### 6. Run Your App

```bash
pnpm dev:client
```

Your app will connect to SpacetimeDB cloud automatically!

## Local Development (Optional)

If you want to develop locally without cloud:

### 1. Start Local SpacetimeDB

```bash
spacetime start
```

Leave this running in a terminal.

### 2. Publish Module Locally

```bash
cd server
spacetime publish --server local --project-path . game
```

### 3. Configure for Local

Update `.env`:

```env
# Local Development
VITE_SPACETIME_HOST=ws://localhost:3000
VITE_SPACETIME_MODULE_NAME=game
```

### 4. Run Your App

```bash
pnpm dev:client
```

## Useful Commands

### View Database Logs

```bash
# Cloud
spacetime logs your-game-name

# Local
spacetime logs --server local game
```

### Query Database

```bash
# Cloud
spacetime sql your-game-name "SELECT * FROM user"

# Local
spacetime sql --server local game "SELECT * FROM user"
```

### Call a Reducer

```bash
# Cloud
spacetime call your-game-name send_message "Hello World"

# Local
spacetime call --server local game send_message "Hello World"
```

### Regenerate TypeScript Bindings

After updating your Rust module:

```bash
pnpm generate
```

This runs:
```bash
spacetime generate --lang typescript --out-dir src/module_bindings --project-path server
```

## Troubleshooting

### "Failed to connect to SpacetimeDB"

1. Check that `VITE_SPACETIME_HOST` is correct in `.env`
2. Check that `VITE_SPACETIME_MODULE_NAME` matches your published module
3. Check browser console for detailed error messages
4. For cloud: Make sure you've published your module
5. For local: Make sure `spacetime start` is running

### "Reducer failed" or "Table not found"

1. Make sure you've published the latest version of your module
2. Regenerate bindings: `pnpm generate`
3. Check your reducer parameters match the generated types

### Changes to Rust module not reflecting

1. Republish your module: `cd server && spacetime publish ...`
2. Regenerate bindings: `pnpm generate`
3. Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)

### Module name doesn't match

If you get "module not found", double-check:
1. The module name in `.env` matches what you published
2. You're using the right server (local vs cloud)
3. You published successfully (check with `spacetime list`)

## Architecture Overview

```
┌─────────────────┐
│  Your Browser   │
│  (SolidJS App)  │
└────────┬────────┘
         │ WebSocket
         │ (Official SDK)
         ▼
┌─────────────────┐
│  SpacetimeDB    │
│  Cloud/Local    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Your Module    │
│  (Rust Code)    │
│  server/src/    │
└─────────────────┘
```

## Migration Status

### ✅ Completed
- [x] Installed official SpacetimeDB SDK
- [x] Created proper connection provider
- [x] Updated app.tsx to use new provider
- [x] Have working Rust module with tables and reducers
- [x] Have generated TypeScript bindings

### ⚠️ Needs Update
- [ ] `src/lib/game.ts` - Using old custom client
- [ ] `src/routes/api/server.ts` - Wrong architecture (trying to do server-side DB access)
- [ ] `src/lib/Server/auth.ts` - Wrong architecture (use SpacetimeDB Identity instead)
- [ ] `src/components/Chat/SpacetimeChat.tsx` - Possibly using old patterns
- [ ] Remove `src/lib/spacetimedb.ts` (custom client no longer needed)

### 📝 Recommended
- [ ] Remove Docker files (using cloud instead)
- [ ] Update tests to use official SDK
- [ ] Document your module's reducers and tables

## Next Steps

1. **Choose hosting**: Decide if you want cloud or local development
2. **Publish module**: Follow steps above to publish
3. **Update .env**: Configure connection strings
4. **Test connection**: Run app and check browser console
5. **Fix remaining files**: Update files marked as "Needs Update"
6. **Remove old code**: Delete custom client and Docker files

## Resources

- **Main Docs**: https://spacetimedb.com/docs/quickstarts/typescript
- **SDK Reference**: https://spacetimedb.com/docs/sdks/typescript/quickstart
- **Discord**: https://discord.gg/spacetimedb
- **Examples in this repo**: 
  - `SPACETIMEDB_MIGRATION_GUIDE.md` - Detailed migration guide
  - `SPACETIMEDB_EXAMPLES.tsx` - Working code examples
  - `src/components/Vote/Game.tsx` - Real component using SDK correctly

