# Project TODOs

> **Note**: For the complete development roadmap, see [roadmap.md](./roadmap.md)

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

## 🎮 Sprint 3: Gameplay Features (Week 3-4)

- [ ] **Unit grouping and hotkeys**
  - [ ] Add keyboard event listener for Ctrl+1 through Ctrl+9
  - [ ] Store control groups in component state
  - [ ] Press number key to select group
  - [ ] Show group indicator on units (small number badge)
  - [ ] Persist groups across rounds (until units eliminated)

- [ ] **Enhanced unit AI**
  - [ ] Add "Auto-gather" toggle in UnitDetailsPanel
  - [ ] Implement auto-gather logic: when idle, find nearest resource
  - [ ] Add "Auto-transfer" toggle: when inventory > 80% full, go to storage
  - [ ] Add idle notification: toast when unit has no tasks
  - [ ] Store AI preferences in unit state (extend Unit type or use client-side state)

- [ ] **Crafting buildings**
  - [ ] Design Workshop building type (like storage building)
  - [ ] Add `isWorkshop: boolean` to Unit type (requires server update)
  - [ ] Workshop placement UI: click "Build Workshop" → click canvas position
  - [ ] Workshop has recipe unlocks (advanced recipes only craftable at workshop)
  - [ ] Show workshop icon and capacity on canvas

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

- **Phase 1 (UI Modernization)**: 88% complete (23/26 tasks) ⬆️ +23%
- **Phase 2 (Gameplay Features)**: 20% complete (4/20 tasks)
- **Phase 3 (Visual Effects)**: 85% complete (15/18 tasks) ⬆️ +75%
- **Phase 4 (Technical)**: 15% complete (3/22 tasks)

**Sprint 1 Status**: ✅ COMPLETED (January 5, 2026)
- ✅ Game.tsx refactored into 4 modular components (650+ lines)
- ✅ Resource transfer UI with validation
- ✅ Visual waypoint indicators for movement
- ✅ ~350 lines reduced from Game.tsx
- ✅ Zero linter errors

**Sprint 2 Status**: ✅ COMPLETED (January 5, 2026)
- ✅ 3 new UI components (VoteMarketPanel, RoundTimer, RoundHistory)
- ✅ Particle system with 4 effect types (680+ lines)
- ✅ Trail system for unit movement
- ✅ 20+ contextual toast notifications
- ✅ Zero linter errors

**Current Sprint Focus**: Sprint 3 - Gameplay Features (Unit AI, Crafting Buildings, Hotkeys)
**Next Sprint**: Technical Infrastructure (Testing, Performance, Error Handling)

---

**Last Updated**: January 5, 2026
**See [roadmap.md](./roadmap.md) for long-term vision and detailed phase breakdowns.**
