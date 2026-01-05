# 🎯 VOTE EXCHANGE - CORE GAME PRIORITY

## The Fundamental Truth

**SocketSignal IS The Vote Exchange.** Everything else is secondary.

The colony builder, unit movement, resource gathering, and crafting are **optional extensions** that sit alongside the core voting game. They are NOT the main product.

## What is The Vote Exchange?

From `game-design/rules.md`:

> A binary choice (red or blue) is presented to players. Within the given time (say 5 minutes), players negotiate between each other to **buy or sell their voting ticket** or they may **buy or sell guarantees** to vote in a specified way. At the end of the allotted time, players vote and the vote is tallied. **All players who voted in the majority are eliminated** and a new voting round begins with the remaining players.

### Key Mechanics (Priority Order)

1. **Multiple Votes Per Player**
   - Players can own 2, 3, or more votes
   - Acquired by purchasing other players' votes
   - Can split votes (e.g., 1 red, 1 blue) to guarantee minority

2. **Vote Trading Market**
   - List your vote for sale at a price
   - Buy other players' votes
   - Counter-offers and negotiation
   - Real-time order book

3. **Guarantee System** (CRITICAL)
   - **Public Guarantee**: Seller promises to vote a color, one buyer only
   - **Private Guarantee**: Same promise, multiple buyers can purchase
   - Buyers pay for information about how someone will vote
   - Sellers can BLUFF (break the guarantee)

4. **Wallet & Money**
   - Initial buy-in creates the pot
   - Wallet balance for trading
   - Track all transactions
   - Profit/loss tracking

5. **Minority Wins Elimination**
   - Count red vs blue votes
   - Minority color survives
   - Majority voters eliminated
   - Ties split the pot

6. **Pot Distribution**
   - Winner(s) take the pot
   - Game ends with 1-2 players
   - Or tie splits proportionally

## What We Have vs What We Need

### ✅ Already Built (Good Foundation)
- SpacetimeDB connection & real-time sync
- Basic vote color setting (red/blue)
- VoteMarketPanel UI structure
- RoundTimer with phases
- RoundHistory visualization
- Toast notifications
- Chat system

### ❌ MISSING (Core Game Blockers)
- [ ] Multiple votes per player
- [ ] Vote ownership transfer
- [ ] Wallet/money system
- [ ] Guarantee system (public & private)
- [ ] Vote tallying logic
- [ ] Elimination system
- [ ] Pot distribution
- [ ] Win/loss conditions
- [ ] Transaction tracking
- [ ] Proper game flow (lobby → rounds → winner)

## Development Priority

### Phase 0: Core Vote Exchange (CRITICAL - 3-4 weeks)
Implement the actual game from rules.md. Nothing else matters until this works.

**Database Schema**:
- Multiple votes per player
- Wallet balances
- Guarantee tables
- Transaction history

**Reducers**:
- `transfer_vote()`
- `create_guarantee()`
- `purchase_guarantee()`
- `process_round_votes()`
- `distribute_pot()`

**UI Components**:
- VotingInterface (main game screen)
- VoteCard (draggable votes)
- Guarantee market
- Wallet display
- Lobby system

**Testing**:
- Validate Game 1-4 scenarios from rules.md
- 10-player test games
- Edge cases (ties, bluffs, etc.)

### Phase 1: Vote Exchange Polish (2-3 weeks)
- Counter-offers
- Side bets
- Reputation system
- Continuous games (pot carries over)
- Re-buy-in for eliminated players

### Phase 2: Colony Builder Extension (OPTIONAL - 4-6 weeks)
The MMO/resource layer. Players can focus on voting OR colony building OR both.

## Why This Matters

From `game-design/rules.md`:

> As a stand-alone, the Vote Exchange itself is a viable product given that:
> 1. Buy-ins are done with real-world currency and
> 2. that it is possible to cash out.

The Vote Exchange is the **monetizable core**. The colony builder is a nice-to-have that makes the game more approachable and provides a natural resource market, but it's not the main product.

## Example Gameplay (Game 2 from rules.md)

**Setup**: 10 players, $1 buy-in each = $10 pot

**Round 1**:
- James lists his vote for $1.50
- Alice buys it for $1.40
- Alice now has 2 votes, splits them (1 red, 1 blue)
- Vote: 7 Red, 3 Blue → Alice, Elizabeth, Francis survive

**Round 2**:
- Alice lists vote for $3.00
- Francis lists vote for $1.50
- Elizabeth buys Francis's vote for $1.50
- Elizabeth has 2 votes, splits them
- Elizabeth wins $10 pot

**Results**:
- Elizabeth: $7.50 profit
- Francis: $0.50 profit
- Alice: $2.40 loss

This is the game we need to build.

## Action Items

See `todos.md` Sprint 3 for detailed task breakdown.

**Immediate Next Steps**:
1. Update server schema (votes, wallet, guarantees)
2. Implement vote transfer reducer
3. Build VotingInterface component
4. Test Game 1 scenario (no trading)
5. Test Game 2 scenario (vote trading)

---

**Remember**: The colony builder is cool, but The Vote Exchange is the product. Focus there first.

