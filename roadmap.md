# SocketSignal Development Roadmap

## Vision & Overview

SocketSignal is a **market-based voting game** (The Vote Exchange) where players trade votes in a minority-wins system. The core gameplay loop is vote trading and strategic voting, with optional colony-building elements layered on top.

### Core Pillars (Priority Order)
1. **The Vote Exchange**: Binary voting with minority-wins elimination (THE CORE GAME)
2. **Market Trading**: Buy/sell votes and guarantees between players
3. **Strategic Depth**: Bluffing, guarantees, wallet management
4. **Real-time Multiplayer**: Powered by SpacetimeDB for instant state synchronization
5. **Colony Builder Extension**: Optional MMO/resource layer (future expansion)

---

## Current State ✅

### Core Vote Exchange (Priority 1)
- ✅ VoteMarketPanel UI (needs guarantee system)
- ✅ RoundTimer with phase indicators
- ✅ Basic vote color setting (red/blue)
- ✅ Round history visualization
- ⚠️ **Missing**: Vote guarantees (public/private)
- ⚠️ **Missing**: Vote tallying and minority calculation
- ⚠️ **Missing**: Player elimination system
- ⚠️ **Missing**: Wallet/money system for trading
- ⚠️ **Missing**: Pot distribution logic
- ⚠️ **Missing**: Multiple votes per player

### Infrastructure (Supporting Core Game)
- ✅ SpacetimeDB integration with official SDK
- ✅ Type-safe Rust → TypeScript bindings
- ✅ Chat system with rooms and permissions
- ✅ Connection status handling with auto-reconnect
- ✅ Solid-UI component library integration
- ✅ Toast notification system

### Colony Builder Extension (Priority 2 - Future)
- ✅ Canvas-based unit visualization
- ✅ Basic unit movement and selection
- ✅ Resource gathering and inventory
- ✅ Crafting system with recipes
- ✅ Storage buildings

---

## Phase 0: Core Vote Exchange Implementation 🎯

**Priority**: CRITICAL | **Timeline**: 3-4 weeks

This is THE core game. Everything else is secondary. Based on game-design/rules.md.

### 0.1 Vote Ownership & Multiple Votes System
- [ ] Update database schema: Player can own multiple votes
  - Extend Vote table to track ownership transfers
  - Add `vote_count` to User/Player table
  - Track original owner vs current owner
  
- [ ] Implement vote ownership transfer
  - Reducer: `transfer_vote(from_player, to_player, vote_id, price)`
  - Update VoteMarketPanel to handle vote purchases
  - Show "You own X votes" in UI
  
- [ ] Vote splitting interface
  - Player with 2+ votes can split them (e.g., 1 red, 1 blue)
  - UI: Vote allocation panel (drag votes to red/blue columns)
  - Guarantee minority if you split evenly

### 0.2 Wallet & Money System
- [ ] Implement player wallet system
  - Database: Add `wallet_balance` to User table
  - Database: Add `bank_account` for saved currency
  - Initial buy-in creates pot and sets wallet
  
- [ ] Transaction system
  - Track all trades (vote sales, guarantee purchases)
  - Deduct from buyer's wallet, add to seller's wallet
  - Transaction history table for audit
  
- [ ] Pot management
  - Track pot size (sum of buy-ins)
  - Display pot size prominently in UI
  - Pot distribution logic (winner takes all, or split)

### 0.3 Guarantee System (Critical Feature)
- [ ] **Public Guarantees** (one buyer only)
  - Database: `guarantee_type: 'public' | 'private'`
  - Seller promises to vote a specific color
  - Once purchased, removed from market
  - Buyer pays for information
  
- [ ] **Private Guarantees** (multiple buyers)
  - Same seller can sell to multiple buyers
  - Each buyer pays for the promise
  - Seller can bluff (break promise)
  
- [ ] Guarantee UI
  - Separate section in VoteMarketPanel
  - "Sell Guarantee" button (choose color, price, type)
  - "Buy Guarantee" for listed guarantees
  - Show active guarantees you've purchased
  - Warning: "Guarantees can be broken!"

### 0.4 Vote Tallying & Elimination
- [ ] End-of-round vote processing
  - Count red vs blue votes
  - Determine minority color
  - Calculate who survives (minority voters)
  
- [ ] Player elimination system
  - Mark eliminated players
  - Remove from active player list
  - They keep their wallet but can't vote
  - Optional: Allow re-buy-in at higher cost
  
- [ ] Tie handling
  - If votes are tied, game ends
  - Split pot proportionate to vote count
  - Display tie resolution UI

### 0.5 Game Termination & Pot Distribution
- [ ] Win conditions
  - 1-2 players remaining: winners take pot
  - Tie: split pot by vote proportion
  - Display winner announcement
  
- [ ] Pot distribution logic
  - Calculate winner's share
  - Update wallet balances
  - Show profit/loss summary for all players
  - Transaction: pot → winner's wallet
  
- [ ] Game summary screen
  - Show all rounds played
  - Final standings (profit/loss per player)
  - Trade history
  - "Play Again" button

### 0.6 Core Voting UI (Traditional Interface)
- [ ] **Lobby/Pre-Game Screen**
  - Player list with buy-in status
  - Set buy-in amount
  - "Ready" button
  - Start game when all ready
  
- [ ] **Main Game Screen** (replace canvas focus)
  - Top: Pot size, round number, timer
  - Left: Player list with vote counts
  - Center: Your votes (drag to set colors)
  - Right: Market panel (votes, guarantees)
  - Bottom: Chat
  
- [ ] **Vote Setting Interface**
  - Visual vote cards you can drag
  - Red/Blue drop zones
  - "Lock in votes" button (can change until round ends)
  - Show which votes are from guarantees
  
- [ ] **Market Interface Enhancements**
  - Real-time order book (buy/sell offers)
  - Price negotiation (counter-offers)
  - Transaction confirmation dialogs
  - Wallet balance always visible

## Phase 1: Vote Exchange Polish & Features 🎨

**Priority**: High | **Timeline**: 2-3 weeks

### 1.1 Advanced Trading Features
- [ ] **Counter-offers system**
  - Buyer can propose different price
  - Seller can accept/reject/counter
  - Negotiation history per trade
  
- [ ] **Buy/Sell requests**
  - "I want to buy at $X" (bid)
  - "I want to sell at $X" (ask)
  - Match orders automatically
  
- [ ] **Guarantee bluffing mechanics**
  - Seller can break guarantee (penalty?)
  - Reputation system for reliable sellers
  - "Trust score" displayed
  
- [ ] **Side bets** (from rules.md)
  - Bet on vote outcome
  - Bet on who gets eliminated
  - Separate betting pool

### 1.2 Multi-Round Gameplay
- [ ] **Continuous games** (from rules.md)
  - Pot distributed each round (e.g., 50%)
  - Remaining pot carries to next round
  - Players can re-buy-in mid-game
  
- [ ] **Post-elimination buy-in**
  - Eliminated players can re-enter
  - Higher cost than initial buy-in
  - Fairness considerations
  
- [ ] **Transaction fees**
  - % of each trade goes to pot
  - Incentivizes more trading
  - Company can match contributions

### 1.3 Player Experience
- [ ] **Player profiles**
  - Win/loss record
  - Total profit/loss
  - Favorite strategies
  - Achievement badges
  
- [ ] **Spectator mode**
  - Watch ongoing games
  - Learn strategies
  - Can't interact
  
- [ ] **Tutorial system**
  - Game 1: No trading (basic minority game)
  - Game 2: Simple vote trading
  - Game 3: Multiple votes and splitting
  - Game 4: Guarantees introduction
  - Interactive walkthrough
  
- [ ] **Game replays**
  - Watch past games
  - See all trades and decisions
  - Learn from winners

### 1.4 Social & Communication
- [ ] **Enhanced chat** (already have basic)
  - Private messages for negotiations
  - Trade proposals in chat
  - Emojis and reactions
  
- [ ] **Player reputation**
  - Trust score (keeps guarantees?)
  - Trade history
  - Ratings from other players
  
- [ ] **Alliances** (future consideration)
  - Team up with other players
  - Share information
  - Coordinate voting

---

## Phase 2: Colony Builder Extension 🎮

**Priority**: Medium (AFTER Vote Exchange works) | **Timeline**: 4-6 weeks

**Note**: This is the MMO/resource layer that sits alongside The Vote Exchange. Players can focus on voting OR colony building OR both.

### 2.1 Advanced Unit Controls
- [ ] Implement full right-click movement system
  - Pathfinding integration (use existing astar from routes/canvas/pathfinding)
  - Movement queuing for multiple waypoints
  - Formation movement for unit groups
  - Visual waypoint indicators on canvas
  
- [ ] Unit grouping and selection
  - Control groups (Ctrl+1-9 hotkeys)
  - Box selection improvements (already basic implementation)
  - Group action commands
  - Selection persistence across views
  
- [ ] Enhanced unit AI
  - Auto-gather when idle toggle
  - Auto-transfer to storage when full
  - Smart task prioritization
  - Idle unit notifications using Toast

### 2.2 Resource Management
- [ ] Expanded inventory UI
  - Detailed item tooltips with stats
  - Sorting and filtering options (by type, quantity)
  - Resource transfer with drag-and-drop
  - Bulk transfer operations
  
- [ ] Dedicated crafting buildings
  - Workshop: Advanced crafting recipes
  - Forge: Metal processing
  - Workshop placement UI with preview
  - Building upgrade system
  
- [ ] Crafting progression system
  - Recipe unlocks based on resources gathered
  - Skill levels for different craft types
  - Quality tiers for crafted items
  - Crafting speed bonuses

### 2.3 Voting & Market Enhancements
- [ ] Market interface improvements
  - Bulk vote trading (trade multiple units at once)
  - Market order book display using Tabs
  - Price history charts using existing graph components
  - Trade notifications and confirmations
  
- [ ] Vote guarantees system
  - Purchase vote insurance
  - Guarantee UI with risk indicators
  - Payout calculations and history
  
- [ ] Advanced voting mechanics
  - Vote power scaling (based on resources/upgrades)
  - Alliance voting (team coordination)
  - Vote delegation system
  - Strategic voting UI with predictions

---

## Phase 3: UI/UX Enhancements 🖥️

**Priority**: Medium | **Timeline**: 3-4 weeks

### 3.1 Game State Visualization
- [ ] Round timer component
  - Countdown display using Progress (circular)
  - Phase indicators (voting, action, resolution)
  - Visual and audio alerts for phase changes
  - Next round preview
  
- [ ] Enhanced round history
  - Timeline view using Carousel component
  - Vote distribution visualization
  - Elimination and survival indicators
  - Trade event markers
  
- [ ] Unit status indicators
  - Health/status bars on canvas
  - Activity animations (gathering, moving, crafting)
  - Death animations for eliminated units
  - Celebration effects for survivors

### 3.2 Visual Effects & Animations
- [ ] Canvas rendering effects
  - Particle effects for resource gathering
  - Trail effects for unit movement
  - Glow effects for selected units
  - Resource depletion visual feedback (already basic implementation)
  
- [ ] UI transition animations
  - Smooth panel transitions using CSS animations
  - Toast slide-in/out effects (already in Toast component)
  - Button hover effects (leverage Solid-UI)
  - Modal fade effects
  
- [ ] Game event animations
  - Vote change indicators with color transitions
  - Trade completion celebrations
  - Round elimination effects
  - Resource transfer animations

### 3.3 Information Architecture
- [ ] Improved navigation using Nav component
  - Game lobby selector
  - Settings panel
  - Tutorial/help system
  - Statistics dashboard
  
- [ ] In-game HUD redesign
  - Resource counters with icons
  - Selected unit summary
  - Round information bar
  - Quick action buttons
  
- [ ] Context-sensitive help
  - First-time user tutorial using Carousel
  - Tooltips for complex mechanics
  - Interactive tutorial mode
  - Help panel with search

---

## Phase 4: Technical Infrastructure 🔧

**Priority**: Medium-High | **Timeline**: 3-5 weeks

### 4.1 Testing & Quality
- [ ] Frontend testing setup (Vitest already configured)
  - Unit tests for game-utils.ts, crafting.ts, spatial-utils.ts
  - Component tests for UI components
  - Integration tests for SpacetimeDB operations
  - E2E tests for critical user flows
  
- [ ] SpacetimeDB test environment
  - Seed data generation scripts
  - Mock data for offline development
  - Test reducers with various scenarios
  - Performance benchmarking
  
- [ ] Error handling improvements
  - Comprehensive error boundaries
  - User-friendly error messages using Toast
  - Automatic error reporting
  - Connection recovery strategies

### 4.2 Performance Optimization
- [ ] Canvas rendering optimization
  - Implement object pooling for entities
  - Spatial partitioning for large unit counts
  - Viewport culling (only render visible units)
  - FPS monitoring and throttling
  
- [ ] State management improvements
  - Optimize SpacetimeDB subscriptions
  - Implement selective updates (only changed fields)
  - Memoization for expensive computations
  - Lazy loading for inactive game states
  
- [ ] Bundle optimization
  - Code splitting by route (already some splitting)
  - Tree shaking unused Solid-UI components
  - Asset optimization (images, fonts)
  - Lazy load non-critical features

### 4.3 Developer Experience
- [ ] Development tooling
  - Enhanced debug UI with game state inspector (routes/db-inspector.tsx exists)
  - SpacetimeDB query playground
  - Component storybook for UI components
  - Performance profiling tools
  
- [ ] Documentation
  - Component API documentation
  - SpacetimeDB schema documentation (use SPACETIMEDB_*.md files)
  - Game mechanics documentation (game-design/*.md)
  - Contribution guidelines

---

## Phase 5: Security & Production Readiness 🔒

**Priority**: High (before public launch) | **Timeline**: 2-3 weeks

### 5.1 Security Implementation
- [ ] SpacetimeDB security
  - Row-level security policies
  - Access control for sensitive operations
  - Input validation on all reducers
  - Rate limiting for API calls
  
- [ ] User authentication
  - Implement JWT authentication (keys already generated)
  - Session management with timeouts
  - Secure identity storage
  - Two-factor authentication support
  
- [ ] Audit logging
  - Log all critical game actions
  - Trade and market transaction logs
  - Admin action logging
  - Security event monitoring

### 5.2 Production Infrastructure
- [ ] Database management
  - Automated backup verification (scripts/backup-spacetimedb.sh exists)
  - Disaster recovery procedures
  - Database migration strategies
  - Monitoring and alerting
  
- [ ] Deployment pipeline
  - CI/CD setup with automated tests
  - Staging environment for testing
  - Blue-green deployment strategy
  - Rollback procedures
  
- [ ] Monitoring & Observability
  - Application performance monitoring
  - Real-time player metrics
  - Error tracking and alerting
  - Resource usage monitoring

---

## Phase 6: Advanced Features 🚀

**Priority**: Low (post-MVP) | **Timeline**: Ongoing

### 6.1 Social Features
- [ ] Enhanced chat system (basic chat exists)
  - Private messaging
  - Guild/clan chat channels
  - Emojis and reactions
  - Chat moderation tools
  
- [ ] Social interactions
  - Friend system
  - Trade proposals and negotiations
  - Alliance formation tools
  - Player reputation system

### 6.2 Meta-Game Systems
- [ ] Progression and unlocks
  - Player levels and experience
  - Achievement system with Badge displays
  - Unlockable cosmetics
  - Prestige system
  
- [ ] Leaderboards and rankings
  - Global leaderboards by various metrics
  - Seasonal rankings
  - Clan/guild rankings
  - Personal statistics dashboard

### 6.3 Game Modes
- [ ] Additional game modes
  - Tournament mode with brackets
  - Practice mode against AI
  - Custom game rules
  - Scenario challenges
  
- [ ] Multi-timeframe system
  - Blitz games (fast rounds)
  - Standard games (current)
  - Marathon games (long-term strategy)
  - Asynchronous play modes

---

## Appendix: Component Usage Guide 📚

### Available Solid-UI Components
Located in `src/components/ui/`:

1. **Button** (`button.tsx`)
   - Variants: default, destructive, outline, ghost, link
   - Sizes: default, sm, lg, icon
   - Use for: Actions, navigation, form submissions

2. **Card** (`card.tsx`)
   - Components: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
   - Use for: Content grouping, panels, unit details

3. **Badge** (`badge.tsx`)
   - Variants: default, secondary, destructive, outline
   - Use for: Status indicators, tags, labels

4. **Tabs** (`tabs.tsx`)
   - Components: Tabs, TabsList, TabsTrigger, TabsContent
   - Use for: Multi-section panels, navigation

5. **Progress** (`progress.tsx`)
   - Use for: Loading states, resource capacity, crafting progress

6. **TextField** (`text-field.tsx`)
   - Components: TextField, TextFieldLabel, TextFieldInput, TextFieldDescription, TextFieldErrorMessage
   - Use for: Forms, inputs, resource transfer amounts

7. **Resizable** (`resizable.tsx`)
   - Components: Resizable, ResizablePanel, ResizableHandle
   - Already used in Game.tsx - excellent for split views

8. **Toast** (`toast.tsx`)
   - Functions: showToast, Toaster component
   - Already integrated - use for notifications

9. **Flex** (`flex.tsx`)
   - Flexible layout component
   - Use for: Action bars, button groups, layouts

10. **ScrollArea** (`scroll-area.tsx`)
    - Use for: Long lists, chat messages, history

11. **Carousel** (`carousel.tsx`)
    - Use for: Tutorials, round history, feature showcases

12. **Label** (`label.tsx`)
    - Use for: Form labels, consistent typography

### Integration Best Practices
- Always import types from `module_bindings/` for game entities
- Use `showToast` from `components/ui/toast` for all user feedback
- Leverage existing canvas utilities in `lib/canvas/`
- Follow SpacetimeDB patterns from `hooks/useSpacetimeDB.tsx`
- Maintain type safety - derive types from database schema

---

## Success Metrics 📊

### User Experience
- First-time user completion rate > 80%
- Average session length > 30 minutes
- Player retention (Day 7) > 40%
- UI responsiveness < 100ms for interactions

### Technical Performance
- Canvas FPS > 30 for up to 100 units
- SpacetimeDB sync latency < 200ms
- Initial load time < 3 seconds
- Zero crashes per user session

### Engagement
- Average daily active users growth
- Chat messages per user session > 10
- Trades per game > 5
- Return player rate > 60%

---

## Contributing

This roadmap is a living document. As we complete phases and learn more about player needs, we'll adjust priorities and add new features. All tasks should align with our core pillars: real-time multiplayer, strategic depth, and social gameplay.

For detailed task tracking, see [todos.md](./todos.md).
For game design details, see [game-design/README.md](./game-design/README.md).

