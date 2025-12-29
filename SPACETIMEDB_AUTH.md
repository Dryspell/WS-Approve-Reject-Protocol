# SpacetimeDB Authentication

## Local vs Remote Connection

The app automatically detects whether you're connecting to a local or remote SpacetimeDB instance:

- **Local** (`localhost` / `127.0.0.1`): No authentication token required
- **Remote** (cloud): Uses token from localStorage

```typescript
// In useSpacetimeDB.ts
const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');
const authToken = isLocalHost ? undefined : localStorage.getItem('auth_token');
```

## Environment Setup

### Local Development (Default)
```env
VITE_SPACETIME_HOST=ws://localhost:3000
VITE_SPACETIME_MODULE_NAME=game
```

### Cloud Deployment
```env
VITE_SPACETIME_HOST=wss://testnet.spacetimedb.com
VITE_SPACETIME_MODULE_NAME=socket-signals
```

## Port Configuration

- **SpacetimeDB**: Port 3000
- **Dev Server**: Port 3001 (to avoid conflict)

## Common Issues

**Authentication errors**: Clear localStorage and reload
```javascript
localStorage.clear();
location.reload();
```

**Connection refused**: Ensure SpacetimeDB is running
```bash
spacetime start
```

**Module not found**: Publish the module
```bash
cd server && spacetime publish --server local --project-path . game
```

