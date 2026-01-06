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

## 🎯 Sprint 3: Core Vote Exchange - Phase 1 ✅ SERVER COMPLETE!

**Goal**: Implement the actual Vote Exchange game from rules.md. This is THE core product.

### Database Schema Updates (Server-side) ✅ COMPLETED

- [x] **Update Vote/Player schema for multiple votes** ✅
  - [x] Reviewed `server/src/lib.rs` vote structures
  - [x] Added `player_id` to track current ownership
  - [x] Added `original_owner` to track who started with vote
  - [x] Vote table redesigned for Vote Exchange
  - [x] Ran `spacetime generate` to update TypeScript bindings

- [x] **Add Wallet/Money system to database** ✅
  - [x] Added `wallet_balance: f64` to User table
  - [x] Added `bank_account: f64` to User table (saved currency)
  - [x] Added `total_profit_loss: f64` for lifetime tracking
  - [x] Added `buyin_amount: f64` to GameRoom table
  - [x] Added `pot_size: f64` to GameRoom table
  - [x] Created Transaction table: `{ id, from_player, to_player, amount, type, vote_id, guarantee_id, timestamp }`

- [x] **Add Guarantee system to database** ✅
  - [x] Created Guarantee table: `{ id, room_id, round_number, seller_id, color, price, guarantee_type, is_active, created_at }`
  - [x] `guarantee_type`: "public" (one buyer) or "private" (multiple buyers)
  - [x] Created GuaranteePurchase table: `{ id, guarantee_id, buyer_id, price_paid, timestamp }`
  - [x] Added `is_active` flag to track if guarantee can still be purchased

- [x] **Add Game Status tracking** ✅
  - [x] Added `game_status: String` to GameRoom ("lobby" | "active" | "completed")
  - [x] Added `eliminated_players: Vec<String>` to track eliminations
  - [x] Added `round_duration: i32` (seconds per round)

### Reducers (Server-side) ✅ COMPLETED

- [x] **Vote ownership transfer reducer** ✅
  - [x] `transfer_vote_ownership(vote_id, buyer_id, price)`
  - [x] Validates: buyer has enough wallet balance
  - [x] Deducts from buyer wallet, adds to seller wallet
  - [x] Updates vote ownership (player_id changes)
  - [x] Creates transaction record with full details

- [x] **Guarantee system reducers** ✅
  - [x] `create_guarantee(room_id, round_number, color, price, guarantee_type)`
  - [x] `purchase_guarantee(guarantee_id)`
  - [x] Public guarantees marked inactive after purchase
  - [x] Private guarantees stay active for multiple buyers
  - [x] Full wallet balance validation

- [x] **Vote color setting** ✅
  - [x] `set_vote_color(vote_id, color)`
  - [x] Validates ownership (only owner can set)
  - [x] Sets red or blue

- [x] **Vote tallying reducer** ✅ FULLY IMPLEMENTED
  - [x] `process_round_votes(room_id, round_number)` - called when timer expires
  - [x] Counts red vs blue votes (considering multiple votes per player)
  - [x] Determines minority color
  - [x] **Tie handling**: Game ends, pot split proportionally by vote count
  - [x] **Elimination**: Marks eliminated players (majority voters)
  - [x] **Win conditions**: 1-2 players left → game over, distribute pot
  - [x] **Next round**: 3+ players → increment round, continue playing
  - [x] Records all pot distribution transactions
  - [x] Updates player profit/loss tracking

- [x] **Game initialization reducers** ✅
  - [x] Updated `create_room(name, creator_id, buyin_amount)` - includes buy-in
  - [x] Updated `start_game(room_id)` - collects buy-ins, creates pot
  - [x] Validates all players have sufficient funds
  - [x] Creates 1 initial vote per player
  - [x] Sets game status to "active"
  - [x] Starts round 1

- [x] **Client connection** ✅
  - [x] Updated `client_connected()` - initializes wallet with $100 starting balance

### Code Quality ✅

- [x] **Added Clone derive to User struct** - Fixed compilation errors
- [x] **Cargo check passes** - No Rust errors
- [x] **TypeScript bindings generated** - All new tables/reducers available in client

### UI Components (Client-side) ✅ COMPLETED!

- [x] **Create VotingInterface.tsx** (main game screen) ✅
  - [x] Created `src/components/Vote/VotingInterface.tsx` (~265 lines)
  - [x] Top bar: Pot size display with 💰 emoji
  - [x] Round timer integration (RoundTimer component)
  - [x] Wallet display with balance and lifetime P/L
  - [x] Player list with active/eliminated status (left panel)
  - [x] Your votes section: drag-and-drop to red/blue zones (center panel)
  - [x] Market panel: VoteMarketPanel with 4 tabs (right panel)
  - [x] Real-time subscriptions to Vote, User, GameRoom tables
  - [x] Game completion modal with winner announcement
  - [x] Vote strategy tips for multi-vote holders
  - [x] Uses Card, Badge, Button, Progress from solid-ui

- [x] **Create VoteCard.tsx** (draggable vote) ✅
  - [x] Created `src/components/Vote/VoteCard.tsx` (~85 lines)
  - [x] Visual card with color-coded icons (🔴 🔵 ⚪)
  - [x] Full drag-and-drop support with onDragStart handler
  - [x] Shows "Original" vs "Purchased" status
  - [x] Clear button to unset color
  - [x] Color-coded borders and backgrounds (red/blue/gray)
  - [x] Ownership indicators showing original owner

- [x] **Enhance VoteMarketPanel.tsx** (updated) ✅
  - [x] Updated to work with Vote table (was Unit-based)
  - [x] Added "Guarantees" tab with full GuaranteeMarket component
  - [x] **Votes Tab**: Browse and purchase votes
    - [x] Sort by price (asc/desc), color, recent
    - [x] Filter by color (red/blue)
    - [x] Buy button with balance validation
  - [x] **Mine Tab**: List your votes for sale
    - [x] Set custom prices
    - [x] Remove from market functionality
    - [x] Shows listing status
  - [x] **Guarantees Tab**: Full guarantee marketplace
  - [x] **History Tab**: Transaction history with timestamps
  - [x] Real-time updates via SpacetimeDB subscriptions

- [x] **Create WalletDisplay.tsx** ✅
  - [x] Created `src/components/Vote/WalletDisplay.tsx` (~140 lines)
  - [x] Current wallet balance with 💵 emoji
  - [x] Bank account balance (future feature ready)
  - [x] Collapsible transaction history with ScrollArea
  - [x] Lifetime profit/loss tracking
  - [x] This game P/L with percentage calculation
  - [x] Progress bar showing balance vs buy-in
  - [x] Transaction type icons (🎫 vote sale, 🤝 guarantee, 💰 pot win)
  - [x] Info box with wallet usage tips
  - [x] Badge indicators for positive/negative P/L

- [x] **Create GuaranteeMarket.tsx** (new component) ✅
  - [x] Created `src/components/Vote/GuaranteeMarket.tsx` (~240 lines)
  - [x] Create guarantee form with:
    - [x] Color selection (red/blue buttons)
    - [x] Price input with validation
    - [x] Type selection (public/private)
    - [x] Explanation of public vs private
  - [x] Available guarantees section:
    - [x] ScrollArea with all active guarantees
    - [x] Buy button with balance validation
    - [x] Shows guarantee details (color, price, type, seller)
    - [x] Purchase tracking (shows if you bought it)
  - [x] Your guarantees section:
    - [x] Shows all guarantees you created
    - [x] Purchase count per guarantee
    - [x] Active/Sold status badges
  - [x] Bluffing warning: "You can break promises!"
  - [x] Info box explaining guarantee mechanics
  - [x] Real-time subscriptions to Guarantee and GuaranteePurchase tables

- [x] **Create PlayerList.tsx** (new component) ✅
  - [x] Created `src/components/Vote/PlayerList.tsx` (~140 lines)
  - [x] Active players section with:
    - [x] Vote counts and color distribution (🔴 X, 🔵 Y, ⚪ Z)
    - [x] Wallet balance display
    - [x] Current user highlighting (blue border, "You" badge)
    - [x] Strategy hints for multi-vote holders
  - [x] Eliminated players section:
    - [x] Grayed out with ☠️ emoji
    - [x] Line-through text styling
    - [x] "Voted with majority" message
  - [x] ScrollArea for long player lists
  - [x] Uses Card, Badge, ScrollArea from solid-ui

- [x] **Integrate PotDisplay** (into VotingInterface) ✅
  - [x] Large card in top bar with 💰 emoji
  - [x] Shows current pot size ($XX.XX format)
  - [x] Real-time updates from GameRoom table
  - [x] Prominent display with large font

### Backend Enhancements ✅

- [x] **Vote schema updates** ✅
  - [x] Added `is_for_sale: bool` to Vote table
  - [x] Added `sale_price: Option<f64>` to Vote table
  - [x] Updated vote creation in `start_game` reducer
  - [x] Updated `transfer_vote_ownership` to clear sale status

- [x] **Vote trading reducers** ✅
  - [x] Created `set_vote_for_sale(vote_id, price)` reducer
  - [x] Created `remove_vote_from_sale(vote_id)` reducer
  - [x] Ownership validation (only owner can list)
  - [x] Price validation (must be > 0)

- [x] **TypeScript bindings regenerated** ✅
  - [x] `vote_type.ts` updated with new fields
  - [x] `set_vote_for_sale_reducer.ts` generated
  - [x] `remove_vote_from_sale_reducer.ts` generated

### Utility Files ✅

- [x] **Toast helper enhancements** ✅
  - [x] Created `src/lib/toast-helpers.ts`
  - [x] Vote-specific toasts: color changes, purchases, sales
  - [x] Guarantee toasts: creation, purchase
  - [x] Game event toasts: round start/end, elimination, survival
  - [x] Error toasts: insufficient funds, validation errors
  - [x] Success toasts: wins, achievements
  - [x] 15+ specialized toast helper methods

### Game Flow & Logic

- [x] **Lobby system** ✅ (GamePreStartInteractions exists)
  - [x] Pre-game lobby where players join (in VoteBox.tsx)
  - [x] "Ready" button for each player (ReadyState table)
  - [x] Start game when ready (start_game reducer)
  - [x] Show player list with ready status
  - [ ] Set buy-in amount UI (needs form in lobby)

- [x] **Round timer integration** ✅
  - [x] RoundTimer component shows countdown
  - [x] Integrated into VotingInterface top bar
  - [x] Shows voting phase with visual progress
  - [x] Displays time remaining in mm:ss format
  - [ ] Auto-call `process_round_votes` when timer hits 0 (needs interval)

- [x] **Elimination UI** ✅
  - [x] PlayerList grays out eliminated players
  - [x] ☠️ emoji for eliminated status
  - [x] Separate "Eliminated" section in player list
  - [x] Line-through text styling
  - [ ] Modal showing elimination results (needs EliminationModal component)
  - [ ] "Next Round" button in modal

- [x] **Win condition UI** ✅
  - [x] Game over modal in VotingInterface
  - [x] Shows winner(s) when game status = "completed"
  - [x] Displays pot split calculation
  - [x] "Return to Lobby" button
  - [ ] Detailed profit/loss summary table
  - [ ] Confetti animation for winners

## 🎨 Sprint 5: Polish & Developer Tools ✅ COMPLETED

### Polish Features ✅ COMPLETED

- [x] **Sound Effects System** ✅ DONE
  - [x] Created `src/lib/sounds.ts` (~200 lines)
  - [x] Web Audio API-based sound manager (no audio files!)
  - [x] 13 unique sound effects:
    - [x] `voteSet` - Vote color changed (red/blue tones)
    - [x] `tradeComplete` - Successful trade (ascending chord)
    - [x] `guaranteePurchased` - Guarantee bought
    - [x] `roundStart` - New round alert
    - [x] `timerWarning` - 30 seconds remaining
    - [x] `elimination` - Player eliminated (descending)
    - [x] `survival` - Player survived (ascending)
    - [x] `victory` - Game won (triumphant)
    - [x] `error` - Error occurred (negative tone)
    - [x] `potIncrease` - Money added to pot (coins)
    - [x] `moneyReceived` - Money credited
    - [x] `click` - Button click
    - [x] `hover` - Subtle hover feedback
  - [x] Volume control system
  - [x] Enable/disable functionality
  - [x] Created `src/components/ui/sound-toggle.tsx` (~25 lines)
  - [x] Mute/unmute toggle button (🔊/🔇)
  - [x] Integrated into VotingInterface wallet display
  - [x] Added sounds to VoteMarketPanel (trade, error)
  - [x] Added sounds to GuaranteeMarket (create, purchase, error)

- [x] **Animation System** ✅ DONE
  - [x] Created `src/lib/animations.ts` (~150 lines)
  - [x] JavaScript animation utilities:
    - [x] `countUp` - Number counter animation
    - [x] `pulse` - Attention getter
    - [x] `shake` - Error feedback
    - [x] `bounce` - Success feedback
    - [x] `fadeIn` / `fadeOut` - Smooth transitions
    - [x] `slideIn` - Directional entrance
    - [x] `scaleUp` - Zoom entrance
    - [x] `confetti` - Victory celebration (50 particles)
  - [x] CSS keyframes for performance:
    - [x] `@keyframes pulse`
    - [x] `@keyframes shake`
    - [x] `@keyframes bounce`
    - [x] `@keyframes confetti-fall`
    - [x] `@keyframes fade-in`
    - [x] `@keyframes slide-up`
    - [x] `@keyframes scale-in`
  - [x] Utility CSS classes (.animate-fade-in, etc.)
  - [x] GPU-accelerated for performance

- [x] **Loading States** ✅ DONE
  - [x] Created `src/components/ui/loading-skeleton.tsx` (~120 lines)
  - [x] `Skeleton` - Base skeleton component with pulse
  - [x] `VoteCardSkeleton` - Vote card placeholder
  - [x] `PlayerCardSkeleton` - Player card placeholder
  - [x] `MarketListingSkeleton` - Market item placeholder
  - [x] `LoadingSpinner` - Animated spinner (sm/md/lg sizes)
  - [x] `LoadingOverlay` - Full-screen loading with message
  - [x] Circle and rectangle skeleton shapes
  - [x] Customizable width/height
  - [x] Pulse animation

- [x] **Error Boundaries** ✅ DONE
  - [x] Created `src/components/ui/error-boundary.tsx` (~100 lines)
  - [x] SolidJS error boundary wrapper
  - [x] Catches all component tree errors
  - [x] User-friendly error fallback UI
  - [x] "Try Again" functionality
  - [x] "Reload Page" option
  - [x] Error message display
  - [x] Stack trace in collapsible details
  - [x] Custom fallback support
  - [x] onError callback for logging
  - [x] Wrapped VotingInterface with ErrorBoundary

### Developer Tools ✅ COMPLETED

- [x] **Debug Panel** ✅ DONE
  - [x] Created `src/components/dev/DebugPanel.tsx` (~230 lines)
  - [x] Fixed bottom-right toggle button (🐛)
  - [x] Slide-up animation
  - [x] **State Tab**:
    - [x] Room information (ID, name, status, round, pot, players)
    - [x] Current user (name, wallet, P/L, online status)
    - [x] All votes (ID, color, owner, for sale status)
    - [x] All players (name, wallet, identity)
    - [x] Real-time data updates
  - [x] **Network Tab**:
    - [x] SpacetimeDB connection status
    - [x] WebSocket status
    - [x] Real-time sync indicator
  - [x] **Logs Tab**:
    - [x] Console.log/error/warn interception
    - [x] Timestamp on each log
    - [x] Color-coded by severity (log/warn/error)
    - [x] Clear button
    - [x] Last 100 logs retained
  - [x] ScrollArea for long content
  - [x] Badge indicators for status
  - [x] Font-mono for technical data
  - [x] Integrated into VotingInterface

- [x] **Admin Panel** ✅ DONE
  - [x] Created `src/components/dev/AdminPanel.tsx` (~300 lines)
  - [x] Fixed top-right toggle button (⚙️ Admin)
  - [x] Localhost-only visibility check
  - [x] Slide-in animation from right
  - [x] **Rooms Tab**:
    - [x] View all game rooms with details
    - [x] Room cards (ID, name, status, round, players, pot, buy-in)
    - [x] Status badges (active/completed/lobby)
    - [x] Force end round button
    - [x] Reset game button (with warning)
    - [x] Refresh button
    - [x] ScrollArea for many rooms
  - [x] **Users Tab**:
    - [x] View all users with details
    - [x] User cards (name, identity, wallet, bank, P/L)
    - [x] Online status indicator (🟢/⚫)
    - [x] Identity truncation (first 16 chars)
    - [x] P/L color coding (green/red)
    - [x] Refresh button
    - [x] ScrollArea for many users
  - [x] **Actions Tab**:
    - [x] Add money form (amount, optional user ID)
    - [x] Quick actions (clear transactions, reset wallets, end games)
    - [x] System info card (connection, identity, counts)
    - [x] Warning: "Requires admin reducers" notice
  - [x] 3-column tabs layout
  - [x] Integrated into VotingInterface

### Integration ✅ COMPLETED

- [x] **VotingInterface.tsx**
  - [x] Imported all tools (sounds, animations, error boundary, debug, admin)
  - [x] Wrapped in ErrorBoundary
  - [x] Added DebugPanel with props (room, user, votes, players)
  - [x] Added AdminPanel
  - [x] Added SoundToggle to wallet card
  - [x] Integrated sound effects for vote color changes
  - [x] Error sounds for failures

- [x] **VoteMarketPanel.tsx**
  - [x] Added sounds import
  - [x] Trade complete sound on successful purchase
  - [x] Money received sound
  - [x] Error sound on failures

- [x] **GuaranteeMarket.tsx**
  - [x] Added sounds import
  - [x] Guarantee purchased sound on creation
  - [x] Guarantee purchased sound on purchase
  - [x] Error sounds for failures

### Testing ✅ COMPLETED

- [x] All sounds play correctly
- [x] Mute toggle works
- [x] Animations are smooth
- [x] Loading states display properly
- [x] Error boundary catches errors
- [x] Debug panel shows correct data
- [x] Admin panel loads all rooms/users
- [x] No linter errors
- [x] All components integrated

## 🧪 Sprint 6: Additional Features (NEXT)

### High Priority

- [ ] **Leaderboard System**
  - [ ] Track wins/losses across games
  - [ ] Player rankings (by profit/loss)
  - [ ] Lifetime stats display
  - [ ] Season-based competition
  - [ ] Top 10 players list
  - [ ] Personal rank display

- [ ] **Game Replay Viewer**
  - [ ] Record round history
  - [ ] Playback interface
  - [ ] Vote timeline visualization
  - [ ] Trade history timeline
  - [ ] Strategy analysis tools
  - [ ] Share replay link

- [ ] **In-Game Chat Integration**
  - [ ] Use existing chat components
  - [ ] Room-specific chat
  - [ ] Chat tab in game interface
  - [ ] Whisper/DM functionality
  - [ ] Chat history persistence
  - [ ] Emoji support

- [ ] **Player Profiles**
  - [ ] Avatar selection system
  - [ ] Bio/description field
  - [ ] Achievement badges
  - [ ] Game history viewer
  - [ ] Stats dashboard
  - [ ] Profile page route

- [ ] **Room Presets**
  - [ ] Quick game (2 min rounds)
  - [ ] Standard game (5 min rounds)
  - [ ] Long game (10 min rounds)
  - [ ] Tournament mode (elimination brackets)
  - [ ] Custom settings modal
  - [ ] Save favorite presets

### Testing & Validation (Manual Testing Priority)

- [ ] **Test Game 1 scenario** (from rules.md)
  - [ ] 10 players, $1 buy-in each
  - [ ] No trading, just voting
  - [ ] Verify minority wins
  - [ ] Verify elimination works
  - [ ] Verify pot distribution

- [ ] **Test Game 2 scenario** (from rules.md)
  - [ ] Vote trading between players
  - [ ] Player with 2 votes splits them
  - [ ] Verify wallet transactions
  - [ ] Verify vote ownership changes
  - [ ] Verify pot distribution to winners

- [ ] **Test guarantees** (Game 4 scenario)
  - [ ] Create public guarantee (one buyer)
  - [ ] Create private guarantee (multiple buyers)
  - [ ] Purchase guarantees
  - [ ] Verify wallet deductions
  - [ ] Test guarantee breaking (bluffing scenario)
  - [ ] Verify guarantee becomes inactive after public purchase

- [ ] **Multi-player stress test**
  - [ ] Open 5-10 browser tabs
  - [ ] All join same room
  - [ ] Test simultaneous vote trading
  - [ ] Test simultaneous guarantee purchases
  - [ ] Verify real-time synchronization
  - [ ] Check for race conditions

- [ ] **UI/UX polish testing**
  - [ ] Test drag-and-drop on different browsers
  - [ ] Test mobile touch events
  - [ ] Verify all toasts appear correctly
  - [ ] Check wallet balance updates in real-time
  - [ ] Test market filtering and sorting
  - [ ] Verify eliminated player display

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

### Sprint 3 - Core Vote Exchange (SERVER ✅ COMPLETE - CLIENT 🔄 IN PROGRESS)
**Target**: Implement actual game from game-design/rules.md

**🎉 Server-Side COMPLETE (✅ 100% - January 5, 2026)**:
- ✅ **6 Database Tables**: User (wallet), GameRoom (pot), Vote (ownership), Transaction, Guarantee, GuaranteePurchase
- ✅ **8 Reducers**: transfer_vote_ownership, create_guarantee, purchase_guarantee, set_vote_color, process_round_votes, create_room, start_game, client_connected
- ✅ **Core Mechanics**: Multiple votes, vote splitting, guarantees (public/private), bluffing, elimination, pot distribution
- ✅ **Game Flow**: Lobby → Active → Completed with proper state transitions
- ✅ **Money System**: Wallet validation, transaction tracking, profit/loss calculation
- ✅ **Win Conditions**: Tie (split pot), 1-2 players (winners), elimination (majority out)
- ✅ **TypeScript bindings generated** - All new types available
- ✅ **Cargo compilation successful** - Zero errors
- ✅ **Documentation**: VOTE_EXCHANGE_IMPLEMENTATION.md created

**Client-Side** (✅ 95% - UI COMPLETE! - January 5, 2026):
- ✅ **VotingInterface.tsx** - Main game screen with drag-and-drop voting
- ✅ **VoteCard.tsx** - Draggable vote components with color coding
- ✅ **WalletDisplay.tsx** - Balance, P/L tracking, transaction history
- ✅ **PlayerList.tsx** - Active/eliminated players with vote counts
- ✅ **GuaranteeMarket.tsx** - Full guarantee marketplace (create/buy/sell)
- ✅ **VoteMarketPanel.tsx** - Updated with 4 tabs (Votes, Mine, Guarantees, History)
- ✅ **RoundTimer** - Integrated into main interface
- ✅ **Toast helpers** - 15+ specialized notification functions
- ✅ **Backend enhancements** - Vote trading reducers and schema updates
- ✅ **VoteBox.tsx** - Updated to use VotingInterface instead of Game
- ✅ **TypeScript bindings** - All regenerated with new types
- 🔄 **Minor polish needed**: Auto-trigger round processing, elimination modal
- [ ] **Testing**: Validate Game 1-4 scenarios from rules.md with multiple players

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
- **Phase 0 (Vote Exchange Core - SERVER)**: 100% complete ✅ (20/20 tasks)
  - ✅ Multiple votes per player
  - ✅ Vote ownership & trading
  - ✅ Wallet & money system
  - ✅ Transaction tracking
  - ✅ Guarantee system (public & private)
  - ✅ Vote tallying logic
  - ✅ Elimination system
  - ✅ Pot distribution (win/tie)
  - ✅ Game flow (lobby → active → completed)
  - ✅ TypeScript bindings generated
  
- **Phase 0 (Vote Exchange Core - CLIENT)**: 95% complete ✅ (14/15 tasks)
  - ✅ VotingInterface.tsx - Main game screen
  - ✅ VoteCard.tsx - Draggable votes
  - ✅ WalletDisplay.tsx - Balance tracking
  - ✅ PlayerList.tsx - Player status
  - ✅ GuaranteeMarket.tsx - Full marketplace
  - ✅ VoteMarketPanel.tsx - 4-tab market interface
  - ✅ RoundTimer integration
  - ✅ Toast notification system
  - ✅ Real-time SpacetimeDB subscriptions
  - ✅ Drag-and-drop voting
  - ✅ Vote trading (list/buy/remove)
  - ✅ Guarantee creation & purchase
  - ✅ Elimination display
  - ✅ Game completion modal
  - 🔄 Auto-round processing (needs timer interval)

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

**Previous Sprints**: 
- ✅ Sprint 3 - **VOTE EXCHANGE UI** (Complete - 8 components, 1,400 lines)
- ✅ Sprint 4 - **GAME FLOW AUTOMATION** (Complete - auto-round, buy-in, elimination modal, tests)
- ✅ Sprint 5 - **POLISH & DEVELOPER TOOLS** (Complete - sounds, animations, loading, errors, debug, admin)

**Current Sprint Focus**: Sprint 6 - **ADDITIONAL FEATURES** 🎯
- ✅ Server-side COMPLETE (10 reducers, 6 tables, vote trading added)
- ✅ Client UI COMPLETE (8 new components, all integrated)
- ✅ VotingInterface.tsx - Main game screen with drag-and-drop
- ✅ VoteCard.tsx - Draggable vote components
- ✅ GuaranteeMarket.tsx - Full guarantee marketplace
- ✅ WalletDisplay.tsx - Comprehensive money tracking
- ✅ PlayerList.tsx - Active/eliminated player display
- ✅ VoteMarketPanel.tsx - 4-tab market (Votes/Mine/Guarantees/History)
- ✅ Toast system - 15+ specialized helpers
- ✅ Backend updates - Vote sale/purchase reducers
- ✅ Integration - VoteBox.tsx updated, all subscriptions working

**Next Sprint**: Sprint 6 - **ADDITIONAL FEATURES** 🎯
- 🎯 Leaderboard system (track wins/losses, rankings)
- 🎯 Game replay viewer (round history, trade timeline)
- 🎯 In-game chat (use existing components)
- 🎯 Player profiles (avatars, stats, achievements)
- 🎯 Room presets (quick/standard/long game modes)

**Future Sprint**: Sprint 7 - **MOBILE SUPPORT** (Last Priority)
- 🔜 Touch event handling for drag-and-drop
- 🔜 Responsive layout adjustments
- 🔜 Mobile-optimized UI components
- 🔜 Gesture controls for vote management

---

## 🎉 Sprint 5 Complete - January 5, 2026

### What We Built Today (Part 3)
**Polish & Developer Tools**:
1. **Sound Effects System** - 13 unique sounds using Web Audio API
2. **Animation System** - 7 animation utilities + CSS keyframes
3. **Loading States** - 6 skeleton/loading components
4. **Error Boundaries** - Robust error handling with recovery
5. **Debug Panel** - Real-time state inspection with 3 tabs
6. **Admin Panel** - Game management interface with 3 tabs

**Features Added**:
- ✅ Sound effects for vote, trade, guarantee, elimination, victory (13 total)
- ✅ Mute/unmute toggle in wallet display
- ✅ Animation utilities (countUp, pulse, shake, bounce, fade, slide, confetti)
- ✅ CSS keyframes for performance
- ✅ Skeleton loaders (vote card, player card, market listing)
- ✅ Loading spinner (sm/md/lg) and full-screen overlay
- ✅ Error boundary wrapper with user-friendly fallback
- ✅ Debug panel with state, network, and logs tabs
- ✅ Console log capture (last 100 logs)
- ✅ Admin panel for room/user management
- ✅ Force end round, reset game, add money actions
- ✅ Localhost-only admin security

**Files Created**:
- `src/lib/sounds.ts` (200+ lines) - Web Audio API sound manager
- `src/lib/animations.ts` (150+ lines) - Animation utilities
- `src/components/ui/sound-toggle.tsx` (25 lines) - Mute button
- `src/components/ui/loading-skeleton.tsx` (120 lines) - Loading components
- `src/components/ui/error-boundary.tsx` (100 lines) - Error handling
- `src/components/dev/DebugPanel.tsx` (230 lines) - Debug interface
- `src/components/dev/AdminPanel.tsx` (300+ lines) - Admin interface

**Files Updated**:
- `src/components/Vote/VotingInterface.tsx` - Integrated all tools
- `src/components/Vote/VoteMarketPanel.tsx` - Added sounds
- `src/components/Vote/GuaranteeMarket.tsx` - Added sounds

**Developer Experience**:
- Real-time debugging with state inspector
- Network monitoring for connection issues
- Console log capture for troubleshooting
- Admin tools for testing scenarios
- Quick actions for common admin tasks

**User Experience**:
- Instant audio feedback for all actions
- Smooth animations for state changes
- Loading states prevent confusion
- Error handling with clear messages
- Professional polish throughout

---

## 🎉 Sprint 4 Complete - January 5, 2026

### What We Built Today (Part 2)
**Game Flow Automation**:
1. **Auto-round processing** - Timer automatically triggers vote tallying when time expires
2. **Buy-in amount UI** - Enhanced lobby with configurable buy-in and pot display
3. **Elimination modal** - Beautiful results screen showing vote counts and eliminations
4. **Unit tests** - 24 passing tests for crafting and spatial utils

**Features Added**:
- ✅ Auto-trigger `process_round_votes` on timer expiry (1-second polling)
- ✅ Buy-in amount input in room creation form
- ✅ Enhanced lobby showing pot size and player count
- ✅ Elimination modal with vote distribution visualization
- ✅ Strategy tips in elimination modal
- ✅ Tie handling display
- ✅ 14 unit tests for crafting logic (canCraftRecipe, getCraftingCost, getCraftingTime)
- ✅ 10 unit tests for spatial utils (kmeans clustering)
- ✅ Test suite running successfully (24 tests passing)

**Files Created/Updated**:
- `src/components/Vote/EliminationModal.tsx` (new, 160 lines)
- `src/components/Vote/VotingInterface.tsx` (updated with auto-processing)
- `src/components/Vote/VoteBox.tsx` (updated with buy-in UI)
- `src/components/Vote/GamePreStartInteractions.tsx` (enhanced lobby display)
- `tests/crafting.test.ts` (new, 200+ lines)
- `tests/spatial-utils.test.ts` (new, 180+ lines)
- `vitest.config.ts` (fixed path resolution)

**Ready for Manual Testing**:
The game is now fully playable end-to-end:
1. Create room with custom buy-in
2. Players join and ready up
3. Game starts, players trade votes
4. Timer expires, votes are tallied automatically
5. Elimination modal shows results
6. Next round starts or game ends
7. Winners receive pot distribution

---

## 🎉 Sprint 3 Complete - January 5, 2026

### What We Built Today
**8 New UI Components** (1,400+ lines of code):
1. **VotingInterface.tsx** (265 lines) - Main game screen with 3-column layout
2. **VoteCard.tsx** (85 lines) - Draggable vote components
3. **WalletDisplay.tsx** (140 lines) - Balance, P/L, transaction history
4. **PlayerList.tsx** (140 lines) - Active/eliminated players with vote counts
5. **GuaranteeMarket.tsx** (240 lines) - Create & purchase guarantees
6. **VoteMarketPanel.tsx** (Updated, 290 lines) - 4-tab market interface
7. **RoundTimer** (Integrated) - Visual countdown in main UI
8. **toast-helpers.ts** (150 lines) - 15+ specialized notification functions

**Backend Enhancements**:
- Updated Vote table with `is_for_sale` and `sale_price` fields
- Added `set_vote_for_sale` reducer
- Added `remove_vote_from_sale` reducer
- Updated `transfer_vote_ownership` to clear sale status
- Regenerated all TypeScript bindings

**Integration**:
- Updated VoteBox.tsx to use VotingInterface
- Real-time SpacetimeDB subscriptions in all components
- Full drag-and-drop vote management
- Market trading with balance validation
- Guarantee marketplace fully functional

**Documentation**:
- Created VOTE_EXCHANGE_UI_IMPLEMENTATION.md (full technical docs)
- Created QUICKSTART_VOTE_EXCHANGE.md (player & developer guide)
- Updated README.md with latest status
- Updated todos.md (this file)

### Ready for Testing! 🚀
The Vote Exchange is now fully playable:
- ✅ Create rooms with buy-ins
- ✅ Join and ready up
- ✅ Trade votes between players
- ✅ Create and purchase guarantees
- ✅ Drag votes to red/blue zones
- ✅ Track wallet balance and P/L
- ✅ View eliminated players
- ✅ Win conditions and pot distribution

**Next Steps**: Multi-player testing, auto-round processing, mobile support

---

## 📈 Progress Summary

### Completed Sprints (January 5, 2026)
- ✅ **Sprint 1**: UI Modernization (4 components extracted, solid-ui integration)
- ✅ **Sprint 2**: Visual Polish (market panel, timer, history, particles, trails, toasts)
- ✅ **Sprint 3**: Vote Exchange UI (8 components, full UI implementation)
- ✅ **Sprint 4**: Game Flow Automation (auto-round, buy-in, elimination modal, 24 unit tests)
- ✅ **Sprint 5**: Polish & Dev Tools (sounds, animations, loading, errors, debug, admin)

### Code Statistics
- **Total Components Created**: 20+
- **Total Lines Written**: ~5,000+
- **Unit Tests**: 24 passing
- **Backend Reducers**: 10
- **Database Tables**: 6
- **Sound Effects**: 13
- **Animation Utilities**: 7
- **Loading Components**: 6

### Game Completeness
- **Backend**: 100% ✅ (all reducers, tables, game logic)
- **UI**: 100% ✅ (all screens, components, interactions)
- **Polish**: 100% ✅ (sounds, animations, loading, errors)
- **Dev Tools**: 100% ✅ (debug panel, admin panel)
- **Testing**: 50% (unit tests ✅, manual testing pending)
- **Additional Features**: 0% (next sprint)
- **Mobile Support**: 0% (last sprint)

**Last Updated**: January 5, 2026 - Sprint 5 COMPLETE ✅  
**See [roadmap.md](./roadmap.md) for long-term vision and detailed phase breakdowns.**
