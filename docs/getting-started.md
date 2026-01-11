# Getting Started with SocketSignal

SocketSignal is **The Vote Exchange** - a multiplayer game where players trade votes in a minority-wins elimination system.

## Prerequisites

- Node.js (v18+)
- pnpm: `npm install -g pnpm`
- SpacetimeDB CLI: `npm install -g @clockworklabs/spacetimedb-cli`

## Quick Start (3 Steps)

### Step 1: Start SpacetimeDB
```bash
spacetime start
```
Leave this terminal running.

### Step 2: Publish & Start Dev Server
In a new terminal:
```bash
pnpm install
pnpm publish:local
pnpm dev
```

### Step 3: Open the Game
Navigate to `http://localhost:3001/vote`

Check browser console for: `Connected to SpacetimeDB with identity: ...`

---

## How to Play

### 1. Create a Game Room
1. Go to `/vote`
2. Click "Create Room"
3. Set a buy-in amount (e.g., $10)
4. Wait for players to join

### 2. Gameplay Loop (Each Round)

**Trading Phase (First 4 minutes)**:
- You start with 1 vote
- **Vote Market**: Buy/sell votes from other players
- **Guarantees**: Purchase promises about how others will vote (they can bluff!)

**Voting Phase (Last minute)**:
- Drag your votes to Red or Blue zones
- If you have 2+ votes, split them to guarantee minority

**Resolution (Automatic)**:
- System tallies votes
- **Majority voters**: Eliminated
- **Minority voters**: Survive and advance
- Last 1-2 players win the pot!

### 3. Key Strategies

**The Split Strategy**: With 2+ votes, put some in each color = guaranteed minority!

**The Bluff**: Sell a guarantee saying you'll vote red, then vote blue. Buyer beware!

**The Accumulator**: Buy votes early and cheap, accumulate enough to guarantee survival.

---

## Multi-Player Testing

Open multiple browser windows/tabs - each gets a unique identity. All join the same room to test together.

---

## Common Commands

```bash
pnpm dev          # Start dev server
pnpm generate     # Regenerate TypeScript bindings after Rust changes
pnpm publish:local # Publish SpacetimeDB module
pnpm test         # Run unit tests
```

---

## UI Overview

- **Top Bar**: Pot size, Round timer, Your wallet
- **Left Panel**: Player list (active/eliminated)
- **Center**: Your votes (drag to red/blue zones)
- **Right Panel**: Market (votes, guarantees, history)

---

## Next Steps

- Read the [game rules](../game-design/rules.md) for complete mechanics
- Check [SpacetimeDB docs](./spacetimedb.md) for technical details
- See [testing guide](./testing.md) for test scenarios
