# Project TODOs

> **Note**: For the complete development roadmap, see [roadmap.md](./roadmap.md)
> 
> **PRIORITY SHIFT**: Focus on core Vote Exchange gameplay (game-design/rules.md) before colony builder features

## 🎯 Sprint 1: UI Modernization ✅ COMPLETED

### High Priority - Completed ✅

- [x] **Extract Game.tsx into smaller components** ✅ DONE
  - [x] Create `src/components/Vote/UnitDetailsPanel.tsx` (~160 lines)
    - ✅ Moved unit stats display from Game.tsx
    - ✅ Uses `Card`, `Badge`, `Button` from solid-ui
    - ✅ Props: `unit`, `taskQueues`, `onVoteColorChange`, `onVoteTrade`, `onCancelTask`
    - ✅ Added green color option for voting
    - ✅ Badge indicators for storage units and task status
  
  - [x] Create `src/components/Vote/InventoryPanel.tsx` (~220 lines)
    - ✅ Moved inventory display with enhanced features
    - ✅ Uses `Card`, `TextField`, `Button`, `Progress`, `Badge` from solid-ui
    - ✅ Props: `unit`, `inventory`, `storageExists`, `onTransferResources`
    - ✅ Added capacity Progress bar with "Nearly Full" warning
    - ✅ Resource grid with emojis and color-coded borders
  
  - [x] Create `src/components/Vote/CraftingPanel.tsx` (~220 lines)
    - ✅ Moved crafting UI with tier-based organization
    - ✅ Uses `Card`, `Tabs`, `Badge`, `Button` from solid-ui
    - ✅ Props: `unit`, `inventory`, `onStartCrafting`
    - ✅ Added recipe categories with Tabs (Tier 1-4)
    - ✅ Shows crafting cost breakdown and output details
    - ✅ Badge for status: "Available", "Insufficient Materials", "Needs Building"
  
  - [x] Create `src/components/Vote/ResourcePanel.tsx` (~125 lines)
    - ✅ Created new component for resource interaction
    - ✅ Uses `Card`, `Button`, `Progress`, `Badge` from solid-ui
    - ✅ Props: `resource`, `selectedUnitsCount`, `onGather`, `onGroupGather`
    - ✅ Display resource type, amount, capacity, and regeneration status
    - ✅ Progress bars for capacity and regeneration
    - ✅ Depletion warnings

- [x] **Improve resource transfer UI** ✅ DONE
  - [x] Styled dropdown with resource type icons (emojis)
  - [x] Shows available amount for each resource type
  - [x] Added validation: prevents transfer if amount > available
  - [x] Added "Transfer All" button for quick actions
  - [x] Shows confirmation toast after transfer with specific amounts
  - [x] Disables transfer when no storage exists with warning message
  - [x] Input validation for numeric values

- [x] **Complete right-click movement implementation** ✅ DONE
  - [x] Verified reducer call working for unit movement
  - [x] Added animated flag waypoint marker at target position
  - [x] Shows blue dashed movement path line from unit to destination
  - [x] Added pulsing circle effect for waypoint visibility
  - [x] Tested with multiple selected units (all move to same waypoint)
  - [x] Auto-clears waypoints after 3 seconds

### Medium Priority - This Week

- [ ] **Add unit tests using Vitest**
  - [ ] Test `lib/crafting.ts`: `canCraftRecipe()`, `getCraftingCost()`, `getCraftingTime()`
  - [ ] Test `lib/spatial-utils.ts`: spatial calculations
  - [ ] Test `lib/game-utils.ts`: game logic utilities
  - [ ] Test `stores/voteStore.ts`: vote state management
  - [ ] Run tests: `pnpm test`

- [ ] **Create ActionBar component** (New - Priority for UX)
  - [ ] Create `src/components/Vote/ActionBar.tsx`
  - [ ] Use `Flex`, `Button` from solid-ui
  - [ ] Quick actions: "Gather", "Transfer to Storage", "Stop All Tasks"
  - [ ] Vote color palette (red, blue, green, yellow buttons)
  - [ ] Building placement button (storage, future: workshops)
  - [ ] Show selected units count: "3 units selected"
  - [ ] Position at bottom of canvas view

## 🎨 Sprint 2: Visual Polish ✅ COMPLETED

### UI Components Created ✅

- [x] **Create VoteMarketPanel component** ✅ DONE
  - [x] Created `src/components/Vote/VoteMarketPanel.tsx` (~270 lines)
  - [x] Uses `Card`, `Tabs`, `Badge`, `TextField`, `ScrollArea` from solid-ui
  - [x] Tab 1: Market listings with filtering and sorting
  - [x] Tab 2: My units with price setting interface
  - [x] Tab 3: Trade history timeline
  - [x] Sort by: price (asc/desc), color, recent
  - [x] Filter by vote color (red, blue, green, yellow)
  - [x] Quick buy/sell actions with validation

- [x] **Create RoundTimer component** ✅ DONE
  - [x] Created `src/components/Vote/RoundTimer.tsx` (~170 lines)
  - [x] Custom circular progress SVG with smooth animation
  - [x] Shows countdown with "mm:ss" format
  - [x] Phase indicators: "🗳️ Voting" / "⚡ Action" / "📊 Resolution"
  - [x] Visual alert with pulsing animation when < 30 seconds
  - [x] Linear progress bar for additional feedback
  - [x] Phase-specific tips and descriptions

- [x] **Create RoundHistory component** ✅ DONE
  - [x] Created `src/components/Vote/RoundHistory.tsx` (~240 lines)
  - [x] Uses `Card`, `Carousel`, `Badge`, `ScrollArea` from solid-ui
  - [x] Carousel navigation for round-by-round history
  - [x] Vote distribution with visual bar charts
  - [x] Highlighted minority winner with "✓ Minority" badge
  - [x] Eliminated units with "☠️" badges
  - [x] Trade events with pricing and player names
  - [x] Summary stats (total rounds, eliminations, trades)

### Visual Effects Added ✅

- [x] **Canvas particle system** ✅ DONE
  - [x] Created `src/lib/canvas/particles.ts` (particle engine)
  - [x] Gathering particles: colored dots from resource to unit
  - [x] Crafting particles: gold sparkles around units
  - [x] Explosion particles: radial burst for eliminations
  - [x] Success particles: green confetti for achievements
  - [x] Integrated into Game.tsx game loop
  - [x] Performance optimized with automatic cleanup

- [x] **Canvas trail system** ✅ DONE
  - [x] Movement trails with fading effect
  - [x] Color-matched to unit vote color
  - [x] Smooth interpolation between points
  - [x] Automatic lifetime management
  - [x] Per-unit trail tracking

- [x] **Toast notification system** ✅ DONE
  - [x] Created `src/lib/toast-helpers.ts` (contextual notifications)
  - [x] Resource events: "🪵 +10 wood gathered"
  - [x] Crafting events: "🔨 Wooden Pole (5s)" → "✨ Crafting complete!"
  - [x] Inventory warnings: "Inventory full - transfer to storage"
  - [x] Vote/Market: "🎨 Unit #3 → red", "💰 Listed for $100"
  - [x] Connection status: "✅ Connected", "🔌 Reconnecting..."
  - [x] Building events: "🏗️ Storage Building constructed"
  - [x] Game rounds: "🎮 Round 5 begins", "⏰ Less than 30s remaining!"
  - [x] 20+ contextual toast helper functions

## 🎯 Sprint 3: Core Vote Exchange - Phase 1 (CRITICAL - Current Focus)

**Goal**: Implement the actual Vote Exchange game from rules.md. This is THE core product.

### Database Schema Updates (Server-side)

- [ ] **Update Vote/Player schema for multiple votes**
  - [ ] Review `server/src/lib.rs` vote structures
  - [ ] Add `vote_owner_id` to track ownership transfers
  - [ ] Add `original_owner_id` to track who started with vote
  - [ ] Add `vote_count` field to User/Player table
  - [ ] Run `spacetime generate` to update TypeScript bindings

- [ ] **Add Wallet/Money system to database**
  - [ ] Add `wallet_balance: f64` to User table
  - [ ] Add `bank_account: f64` to User table (saved currency)
  - [ ] Add `initial_buyin: f64` to GameRoom table
  - [ ] Add `pot_size: f64` to GameRoom table
  - [ ] Create Transaction table: `{ id, from_user, to_user, amount, type, timestamp }`

- [ ] **Add Guarantee system to database**
  - [ ] Create Guarantee table: `{ id, seller_id, color, price, guarantee_type, is_active }`
  - [ ] `guarantee_type`: "public" (one buyer) or "private" (multiple buyers)
  - [ ] Create GuaranteePurchase table: `{ id, guarantee_id, buyer_id, price_paid, timestamp }`
  - [ ] Track if guarantee was honored: `was_honored: bool`

### Reducers (Server-side)

- [ ] **Vote ownership transfer reducer**
  - [ ] `transfer_vote(from_player_id, to_player_id, vote_id, price)`
  - [ ] Validate: buyer has enough wallet balance
  - [ ] Deduct from buyer wallet, add to seller wallet
  - [ ] Update vote ownership
  - [ ] Create transaction record

- [ ] **Guarantee system reducers**
  - [ ] `create_guarantee(seller_id, color, price, guarantee_type)`
  - [ ] `purchase_guarantee(buyer_id, guarantee_id)`
  - [ ] `cancel_guarantee(guarantee_id)` (if no purchases yet)
  - [ ] Validate wallet balance for purchases

- [ ] **Vote tallying reducer**
  - [ ] `process_round_votes()` - called when timer expires
  - [ ] Count red vs blue votes (considering multiple votes per player)
  - [ ] Determine minority color
  - [ ] Mark eliminated players (majority voters)
  - [ ] Check win conditions (1-2 players left, or tie)
  - [ ] Distribute pot if game over

- [ ] **Game initialization reducer**
  - [ ] `initialize_game(room_id, buyin_amount, players[])`
  - [ ] Set each player's wallet = starting amount
  - [ ] Create pot = sum of buy-ins
  - [ ] Give each player 1 vote initially
  - [ ] Set round to 1

### UI Components (Client-side)

- [ ] **Create VotingInterface.tsx** (main game screen)
  - [ ] Create `src/components/Vote/VotingInterface.tsx`
  - [ ] Top bar: Pot size, round number, timer, your wallet
  - [ ] Player list: show all players, their vote counts, eliminated status
  - [ ] Your votes section: drag-and-drop to set red/blue
  - [ ] Market panel: tabs for votes, guarantees, history
  - [ ] Chat panel at bottom
  - [ ] Use Card, Badge, Progress, Tabs from solid-ui

- [ ] **Create VoteCard.tsx** (draggable vote)
  - [ ] Visual card representing one vote
  - [ ] Drag to red or blue zone
  - [ ] Show if vote is from a guarantee
  - [ ] Lock icon if vote is committed
  - [ ] Color-coded borders

- [ ] **Enhance VoteMarketPanel.tsx** (already exists)
  - [ ] Add "Guarantees" tab
  - [ ] Show public vs private guarantees
  - [ ] "Sell Guarantee" button with form
  - [ ] Purchase guarantee button
  - [ ] Show active guarantees you own
  - [ ] Warning: "Seller can break guarantees!"

- [ ] **Create WalletDisplay.tsx**
  - [ ] Show current wallet balance prominently
  - [ ] Show bank account balance
  - [ ] Transaction history dropdown
  - [ ] Profit/loss indicator (vs initial buy-in)

- [ ] **Create PotDisplay.tsx**
  - [ ] Large, prominent pot size display
  - [ ] "💰 Pot: $X.XX"
  - [ ] Animation when pot changes
  - [ ] Breakdown: buy-ins + transaction fees

### Game Flow & Logic

- [ ] **Lobby system**
  - [ ] Pre-game lobby where players join
  - [ ] Set buy-in amount (host decides)
  - [ ] "Ready" button for each player
  - [ ] Start game when all ready (or host forces start)
  - [ ] Show player list with ready status

- [ ] **Round timer integration**
  - [ ] Use existing RoundTimer component
  - [ ] When timer hits 0, call `process_round_votes` reducer
  - [ ] Show "Voting Phase" during countdown
  - [ ] Show "Processing..." when tallying
  - [ ] Show "Round Results" modal after tally

- [ ] **Elimination UI**
  - [ ] Modal showing who was eliminated
  - [ ] Show minority color
  - [ ] Show who survived
  - [ ] "Next Round" button
  - [ ] Gray out eliminated players in player list

- [ ] **Win condition UI**
  - [ ] Game over modal
  - [ ] Show winner(s)
  - [ ] Show final pot distribution
  - [ ] Show profit/loss for all players
  - [ ] "Play Again" button

### Testing & Validation

- [ ] **Test Game 1 scenario** (from rules.md)
  - [ ] 10 players, $1 buy-in each
  - [ ] No trading, just voting
  - [ ] Verify minority wins
  - [ ] Verify elimination works

- [ ] **Test Game 2 scenario** (from rules.md)
  - [ ] Vote trading between players
  - [ ] Player with 2 votes splits them
  - [ ] Verify wallet transactions
  - [ ] Verify pot distribution

- [ ] **Test guarantees** (Game 4 scenario)
  - [ ] Create public guarantee
  - [ ] Create private guarantee
  - [ ] Purchase guarantees
  - [ ] Verify wallet deductions
  - [ ] Test guarantee breaking (bluffing)

## 🎮 Sprint 4: Colony Builder Features (DEFERRED - After Vote Exchange Works)

**Note**: These are secondary features. The Vote Exchange is the core game. Colony building is an optional layer.

- [ ] **Unit grouping and hotkeys** (DEFERRED)
- [ ] **Enhanced unit AI** (DEFERRED)
- [ ] **Crafting buildings** (DEFERRED)
- [ ] **Resource market integration** (DEFERRED)

See roadmap.md Phase 2 for full colony builder details.

## 🔧 Technical Debt & Optimization

### Performance

- [ ] **Canvas optimization for large unit counts** (Target: 100+ units)
  - [ ] Implement viewport culling: only render units in visible area
  - [ ] Use object pooling for canvas paths (reuse objects instead of creating new)
  - [ ] Add spatial grid for quick position lookups (lib/canvas/spatial.ts)
  - [ ] Throttle gameLoop to 30 FPS if unit count > 50
  - [ ] Add FPS counter in debug mode

- [ ] **SpacetimeDB subscription optimization**
  - [ ] Review all onInsert/onUpdate/onDelete handlers
  - [ ] Use batching for multiple updates
  - [ ] Implement selective field subscriptions (only subscribe to needed fields)
  - [ ] Add connection quality indicator (latency display)

### Testing

- [ ] **SpacetimeDB test setup**
  - [ ] Create `tests/fixtures/seed-data.ts`: generate mock game data
  - [ ] Create `tests/spacetimedb-mock.ts`: mock SpacetimeDB connection
  - [ ] Write integration test: create unit → gather resource → check inventory
  - [ ] Write integration test: set vote color → trade vote → verify owner change
  - [ ] Write integration test: craft item → check task queue → verify output

### Error Handling

- [ ] **Improve SpacetimeDB error handling**
  - [ ] Wrap all reducer calls in try-catch
  - [ ] Use `lib/spacetime-errors.ts` for custom error types
  - [ ] Show user-friendly error messages (not raw error objects)
  - [ ] Add retry logic for transient errors (connection issues)
  - [ ] Log errors to console with full context for debugging

## 🔒 Security & Production (Before Public Launch)

- [ ] **SpacetimeDB security**
  - [ ] Review server/src/lib.rs for access control
  - [ ] Add ownership checks: users can only modify their own units
  - [ ] Add rate limiting: max 10 actions per second per user
  - [ ] Add input validation on all reducers
  - [ ] Add row-level security policies

- [ ] **Production readiness**
  - [ ] Test backup restoration with scripts/backup-spacetimedb.sh
  - [ ] Set up monitoring (uptime, error rate, player count)
  - [ ] Load test with multiple concurrent players (use scripts/manual-test.sh)
  - [ ] Create deployment checklist
  - [ ] Document deployment process in DEPLOYMENT.md

## 📝 Documentation

- [ ] **Code documentation**
  - [ ] Add JSDoc comments to all exported functions
  - [ ] Document SpacetimeDB reducer parameters
  - [ ] Create ARCHITECTURE.md (system design overview)
  - [ ] Update README.md with latest features

- [ ] **User documentation**
  - [ ] Create in-game tutorial (use Carousel component)
  - [ ] Write game mechanics guide (how voting works)
  - [ ] Create FAQ for common issues
  - [ ] Add tooltips for all UI elements

---

## ✅ Recently Completed

### Sprint 3 - Core Vote Exchange (In Progress - CRITICAL)
**Target**: Implement actual game from game-design/rules.md
- [ ] Database schema: multiple votes, wallet, guarantees
- [ ] Reducers: vote transfer, guarantees, tallying, elimination
- [ ] UI: VotingInterface, VoteCard, guarantee system
- [ ] Game flow: lobby, rounds, elimination, pot distribution
- [ ] Testing: Validate Game 1-4 scenarios from rules.md

### Sprint 2 - Visual Polish (Completed January 5, 2026)
- ✅ **VoteMarketPanel.tsx** - Market with tabs, sorting, filtering, buy/sell interface
- ✅ **RoundTimer.tsx** - Circular progress timer with phase indicators and warnings
- ✅ **RoundHistory.tsx** - Carousel-based history with vote distributions and trade events
- ✅ **Particle System** - Resource gathering, crafting sparkles, explosions, celebrations
- ✅ **Trail System** - Smooth fading trails for moving units
- ✅ **Toast Helpers** - 20+ contextual notifications with emojis and variants

### Sprint 1 - UI Modernization (Completed January 5, 2026)
- ✅ **UnitDetailsPanel.tsx** - Modular unit details with Card, Badge, Button components
- ✅ **InventoryPanel.tsx** - Enhanced inventory with Progress bars, validation, Transfer All
- ✅ **CraftingPanel.tsx** - Tier-based crafting with Tabs, status badges, recipe details
- ✅ **ResourcePanel.tsx** - Resource interaction with capacity/regeneration progress
- ✅ **Resource Transfer UI** - Validated transfers with emojis, warnings, storage checks
- ✅ **Visual Waypoints** - Animated flag markers, movement paths, pulsing effects
- ✅ Game.tsx refactored (~350 lines reduced)

### Previous Milestones
- ✅ SpacetimeDB chat component with rooms, messages, and permissions
- ✅ Connection status indicator with reconnection handling
- ✅ Permissions-based UI controls (read-only indicator)
- ✅ Official SpacetimeDB SDK migration
- ✅ Type generation from Rust schema
- ✅ Basic resource gathering, inventory, and crafting systems
- ✅ Vote state management and trading interface
- ✅ Nginx reverse proxy with SSL
- ✅ Database backup strategy
- ✅ Solid-UI component integration (Button, Card, Badge, Tabs, Toast, Resizable, etc.)
- ✅ Canvas-based unit visualization with selection
- ✅ Task queue system for units
- ✅ Storage buildings

---

## 📊 Progress Tracking

### Core Vote Exchange (THE PRIORITY)
- **Phase 0 (Vote Exchange Core)**: 15% complete (3/20 tasks)
  - ✅ Basic vote color UI
  - ✅ Market panel structure
  - ✅ Round timer
  - ⚠️ Missing: Multiple votes, guarantees, elimination, pot distribution

### Supporting Systems
- **UI Components**: 85% complete (visual polish done)
- **Infrastructure**: 70% complete (SpacetimeDB, chat, toasts)
- **Colony Builder**: 40% complete (DEFERRED until Vote Exchange works)

**Sprint 1 Status**: ✅ COMPLETED (January 5, 2026)
- ✅ Game.tsx refactored into 4 modular components
- ✅ Resource transfer UI with validation
- ✅ Visual waypoint indicators

**Sprint 2 Status**: ✅ COMPLETED (January 5, 2026)
- ✅ VoteMarketPanel, RoundTimer, RoundHistory
- ✅ Particle & trail systems
- ✅ Toast notification helpers

**Current Sprint Focus**: Sprint 3 - **CORE VOTE EXCHANGE IMPLEMENTATION**
- 🎯 Multiple votes per player
- 🎯 Wallet & money system
- 🎯 Guarantee system (public/private)
- 🎯 Vote tallying & elimination
- 🎯 Pot distribution

**Next Sprint**: Vote Exchange Polish (advanced trading, side bets, reputation)

---

**Last Updated**: January 5, 2026
**See [roadmap.md](./roadmap.md) for long-term vision and detailed phase breakdowns.**
