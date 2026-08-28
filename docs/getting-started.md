# Getting Started with Nashfall

Nashfall is a multiplayer game where players trade votes in a minority-wins elimination system — built around **The Vote Exchange Protocol**.

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

The room timer is one continuous timeframe (default **5 minutes**, **5 votes** each). You can recast and trade the whole time. Other players' colors stay hidden until the round ends.

- **Cast**: Drag or click votes onto Red or Blue. Only a ticket on the *minority* color keeps you in the game. Unplaced votes do not count.
- **Harvest**: Select a minion and spend up to **3 actions** this round. Each harvest takes 1 wood, stone, or ore instantly. Skill level is a chance to **double** that yield (0% at 1, +10% per level, 40% at 5). Actions reset at the next round and when you buy a vote.
- **Camp**: 3 wood + 2 stone founds your only building. Refine 2 raw into planks/blocks/ingots, then craft a hatchet (better harvest), spear, or vest.
- **Send home**: Uncolored, unguaranteed minions can leave. The vote is voided; the bag and the minion land on your account stash.
- **Next game**: Survivors of a win (and anyone you already sent home) wait in the lobby roster **with their gear**. Pick up to your vote count; empty slots are fresh recruits. This browser keeps them until you clear storage — or bind a username/passphrase / copy the recovery code on Game Over.
- **Trade**: Buy or sell votes on the market. Selling your last ticket does not knock you out immediately — if you still hold no votes when the round ends, you leave.
- **Guarantees**: Listing a guarantee locks that vote to the promised color. It cannot be broken or sold (public = one buyer; private = many buyers).
- **Resolution**: When the timer hits zero the server tallies. Unplaced tickets split evenly per player (odd leftovers fill the smaller color). Majority minions fight in the arena. Survivors go back to your roster unless this was the last round. Minority tickets carry into the next round. A tie ends the game and splits the pot by votes cast. Last 1–2 players take the pot.

### 3. Key Strategies

**The Split Strategy**: With 2+ votes, put some on each color so you always hold a minority ticket.

**The Guarantee**: Sell a public or private promise — once bought, that vote is locked. You cannot bluff a purchased guarantee.

**The Accumulator**: Buy votes early, then split or pile onto the color you think will be smaller.

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

- **Top Bar**: Pot size, round timer, your wallet
- **Left Panel**: Player list (active/eliminated). Other players' colors stay hidden until the round ends.
- **Center**: Your votes (drag to red/blue zones) and the minority/majority tally
- **Right Panel**: Market (Buy / Sell, guarantees, history)
- **Side buttons**: Equip (swap worn gear) and Bet. Camp/craft lives on the selected minion, not a Build catalog.

---

## Next Steps

- Read the [game rules](../game-design/rules.md) for complete mechanics
- Check [SpacetimeDB docs](./spacetimedb.md) for technical details
- See [testing guide](./testing.md) for test scenarios
