# Shared Systems

These systems are used by both the core Vote Exchange Protocol and the Colony Builder extension. Where implementation status is noted, refer to [docs/STATUS.md](../docs/STATUS.md) for the authoritative current state.

## Table of Contents

- [Currency Systems](#currency-systems)
- [Market Systems](#market-systems)
- [Multi-TimeFrame System](#multi-timeframe-system)
- [Game Termination Rules](#game-termination-rules)
- [The Eternal Format](#the-eternal-format)

---

## Currency Systems

### Empty Marbles (MT)

**Design intent**: Vall Street's primary in-game currency. Functions as a stablecoin pegged to USD for game entry, resource trades, and marketplace transactions. Players purchase MT directly; it has no scarcity-driven value.

- Primary and pass-through currency for all in-game markets
- Fixed exchange rate to real-world currency (future: actual USD peg)
- Unlimited issuable supply with controlled distribution via buy-ins and transaction fees
- Used for all current game actions: vote trading, guarantee purchase, crafting costs, building construction

**Implementation status**: Fully implemented — `PlayerCurrency` table with `mt_balance` field. Currently play-money only (no real-USD backing).

---

### Essence Marbles (MBLS)

**Design intent**: A scarce earned currency with genuine cryptocurrency characteristics. Generated through gameplay — specifically through victories in the Battle Arena (laborers who survive combat generate Essence) — rather than purchased. Intended for public exchange listing and cross-game transfer.

- Store Essence generated from Battle Arena victories and sacrifice
- Used to maintain Time Shards (in-lore; mechanically: premium market access)
- Limited supply driven by gameplay difficulty
- Tradeable on public exchanges (future)
- Can be exchanged with MT at player-negotiated rates

**Implementation status**: Implemented — `PlayerCurrency` table with `mbls_balance` field. Blockchain integration and public exchange listing are future scope.

---

### Currency Interaction

| Action | Currency Used |
|--------|--------------|
| Buy-in to game | MT |
| Purchase vote | MT |
| Purchase guarantee | MT |
| Craft equipment | MT + resources |
| Construct building | MT + resources |
| Side bet | MT |
| Battle Arena victory bonus | MBLS (future) |
| Cash out | MBLS → external exchange (future) |

---

## Market Systems

### Resource Markets

**Design intent**: All resource trading must occur through an active Vote Exchange Protocol instance. The resource market and the vote market are parallel but linked — they live and die together. When a Vote Exchange Protocol instance terminates (all winners declared, tie, or parent game ends), its associated resource market closes and all resources must be exported, converted, or destroyed.

This coupling creates strategic urgency: stockpiling resources in a dying game is wasteful. Players must decide whether to export resources upward in the server hierarchy, convert them to equipment, or accept the loss.

**Current implementation**: Resource gathering, refinement, and equipment crafting pipelines are functional. Market closure on game termination is partial — resources are not automatically destroyed or relocated when a room ends.

---

### Trading Periods

Each Vote Exchange Protocol instance has a defined trading period (the time between the start of a round and when voting is locked). This period:

- Defines how long players have to trade votes, resources, and guarantees
- Varies by server type in the multi-timeframe hierarchy
- Determines effective server tick rates for production calculations

**Implementation**: Configurable per room via `round_duration` (in seconds). Default: 300 seconds (5 minutes).

---

## Multi-TimeFrame System

### Server Hierarchy

The game servers are arranged in a tiered tree structure based on trading period lengths. Each node in the tree represents a complete Vote Exchange Protocol + Colony Builder game instance. Shorter-period children exist within longer-period parents.

```
Eternal Format (no fixed period, super-majority trigger)
└── City (1-month period)
    └── Town (1-week period)
        └── Village (1-day period)
            └── Expedition (1-minute to 1-hour periods)
```

Longer-period servers have more time for colony building, resource accumulation, and strategic market positioning. Shorter-period servers are faster, more chaotic, and focused on rapid vote trading.

**Implementation status**: `ServerNode` table exists; transfer reducers implemented. Production deployment of the full hierarchy is future scope.

---

### Moving Down the Tree (Joining a Child Server)

Players can enter a shorter-period child game at the start of a new round (not mid-game). They bring:

- Their laborers (up to the child game's `votes_per_player` limit)
- A portion of their resources (carried inventory)
- Their MT wallet (cross-game persistent)

MBLS cannot be brought down — it is only generated and can only move up.

---

### Moving Up the Tree (Returning to Parent)

Players can command a laborer to return to the parent server at any time. When a laborer moves up:

- The laborer's vote for the current round is **voided** (they cannot participate in voting that round)
- The laborer carries its full inventory to the parent server
- This is the primary mechanism for extracting value from fast-paced child games

**This is strategically related to minion evacuation**: evacuating a minion before combat is a within-game action; moving a laborer up the tree is a cross-server action. Both preserve the laborer and its resources at the cost of a vote.

---

### Tick-Rate Considerations

| Server Type | Trading Period | Tick Rate | Gameplay Feel |
|-------------|----------------|-----------|---------------|
| City | 1 month | Slow (1/min) | Long-horizon planning, large colonies |
| Village | 1 day | Medium | Balanced trading and building |
| Expedition | 1-60 min | Fast | Rapid vote trading, minimal colony |

Tick rates determine how often `game_tick` processes building production, resource regeneration, and unit movement. Shorter trading periods require faster ticks to make production meaningful.

---

## Game Termination Rules

### Parent-Child Relationships

The hierarchy enforces strict termination ordering:

1. A child game cannot exist without its parent game
2. If a parent game terminates (all winners decided, tie, or forced end), all children must terminate immediately
3. A child game's round cannot be scheduled to complete after the parent's end time
4. Before joining or creating a child game, players must verify the parent has sufficient remaining time for at least one full round

**Why this matters**: Players in a fast Expedition game are racing against the parent game's timeline. A City game ending early cascades down and forces all children to settle — creating urgency and pressure.

**Implementation status**: Parent-child cascade termination is partially implemented. `ServerNode` table tracks relationships; automatic cascade is planned.

---

### Resource Handling on Termination

When a game terminates:

1. **Winning players** can choose to export their inventory to the parent server or convert it to MT at market rates
2. **Eliminated players** lose their on-hand inventory; items they stored in buildings persist if the building passes to another owner via auction
3. **Unclaimed resources** are destroyed
4. **Equipment in players' inventories** is retained by the player (it moves with the player to the parent)

---

## The Eternal Format

The Eternal Format is the root node of the server hierarchy — the only game with no parent. It has unique mechanics that make it the most strategic and highest-stakes environment:

- **No timer**: Voting is triggered by super-majority desire (e.g., 75%+ of active players vote to initiate a vote round)
- **No running from votes**: Players cannot leave during an active vote round
- **50/50 pot distribution**: Each round, half the pot is distributed to minority voters; the other half remains in the pot
- **Transaction fee contributions**: Fees from all child games flow up to the Eternal Format pot, making it continuously growing
- **Vall Street order management**: The house can fulfill or cancel orders in the Eternal Format to manage liquidity

**Design note**: The Eternal Format is intended to be the ultimate slow-burn, high-strategy environment. Players who survive multiple rounds in the Eternal Format accumulate significant wealth. It is intentionally accessible only to players who have established themselves in faster child games first.

**Implementation status**: Not yet implemented. The `ServerNode` table lays the groundwork; the Eternal Format mechanics require additional reducers and a super-majority voting system.

---

**Last Updated**: February 26, 2026
