# Project TODOs

> **Note**: For the complete development roadmap, see [roadmap.md](./roadmap.md)

## 🎯 Sprint 1: UI Modernization (Current Focus)

### High Priority - This Week

- [ ] **Extract Game.tsx into smaller components** (Breaking change - test thoroughly)
  - [ ] Create `src/components/Vote/UnitDetailsPanel.tsx` (~200 lines)
    - Move unit stats display (lines 672-746 from Game.tsx)
    - Use `Card`, `Badge`, `Button` from solid-ui
    - Props: `unit: Unit | undefined`, `taskQueues: UnitTaskQueue[]`, `onVoteColorChange`, `onVoteTrade`, `onCancelTask`
  
  - [ ] Create `src/components/Vote/InventoryPanel.tsx` (~150 lines)
    - Move inventory display (lines 778-836 from Game.tsx)
    - Use `Card`, `TextField`, `Button`, `Progress` from solid-ui
    - Props: `unit: Unit | undefined`, `inventory: UnitInventory | undefined`, `onTransferResources`
    - Add capacity Progress bar (current/max)
  
  - [ ] Create `src/components/Vote/CraftingPanel.tsx` (~180 lines)
    - Move crafting UI (lines 838-864 from Game.tsx)
    - Use `Card`, `Tabs`, `Badge`, `Button` from solid-ui
    - Props: `unit: Unit | undefined`, `inventory: UnitInventory | undefined`, `onStartCrafting`
    - Add recipe categories with Tabs (Primary Resources, Secondary Resources, Tools)
    - Show crafting cost breakdown with resource icons
    - Use Badge for status: "Available" (green), "Insufficient Materials" (gray), "Crafting" (blue)
  
  - [ ] Create `src/components/Vote/ResourcePanel.tsx` (new component)
    - Move resource hover display (lines 748-777 from Game.tsx)
    - Use `Card`, `Button` from solid-ui
    - Props: `resource: Resource | undefined`, `selectedUnits: Set<number>`, `onGather`, `onGroupGather`
    - Display resource type, amount, regeneration status

- [ ] **Improve resource transfer UI**
  - [ ] Replace native `<select>` with styled dropdown using solid-ui TextField variants
  - [ ] Add resource type icons (create simple colored circles matching RESOURCE_COLORS)
  - [ ] Add validation: prevent transfer if amount > available
  - [ ] Add "Transfer All" button
  - [ ] Show confirmation toast after transfer
  - [ ] Disable transfer button when no storage exists

- [ ] **Complete right-click movement implementation**
  - [ ] Verify reducer call in mouseup handler (line 301) is working
  - [ ] Add visual waypoint indicator on canvas (small flag or marker at target position)
  - [ ] Show movement path line from unit to destination
  - [ ] Add movement animations (unit orientation, trail effect)
  - [ ] Test with multiple selected units (formation movement)

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

## 🎨 Sprint 2: Visual Polish (Next Week)

### UI Components to Create

- [ ] **Create VoteMarketPanel component**
  - [ ] Create `src/components/Vote/VoteMarketPanel.tsx`
  - [ ] Use `Card`, `Tabs`, `Badge`, `TextField`, `ScrollArea` from solid-ui
  - [ ] Tab 1: Market listings (units for sale)
  - [ ] Tab 2: My units (price setting)
  - [ ] Tab 3: Trade history
  - [ ] Sort by price (ascending/descending)
  - [ ] Filter by vote color
  - [ ] Quick buy/sell actions

- [ ] **Create RoundTimer component**
  - [ ] Create `src/components/Vote/RoundTimer.tsx`
  - [ ] Use `Progress` (circular variant if available, else create custom)
  - [ ] Show countdown: "Round ends in: 2:34"
  - [ ] Phase indicator: "Voting Phase" / "Action Phase" / "Resolution"
  - [ ] Visual alert when < 30 seconds remain
  - [ ] Play sound effect on phase change (optional)

- [ ] **Create RoundHistory component**
  - [ ] Create `src/components/Vote/RoundHistory.tsx`
  - [ ] Use `Card`, `Carousel`, `ScrollArea` from solid-ui
  - [ ] Timeline view with round cards
  - [ ] Show vote distribution per round (red vs blue count)
  - [ ] Highlight eliminated units with strikethrough
  - [ ] Show trade events with Badge ("Traded", "Sold", "Bought")
  - [ ] Navigate between rounds with Carousel

### Visual Effects

- [ ] **Canvas rendering improvements**
  - [ ] Add particle effect for resource gathering (10-15 small colored dots)
  - [ ] Add movement trail for units (fade out line behind unit)
  - [ ] Add glow effect for selected units (already has dashed circle, add glow)
  - [ ] Add elimination effect (red X, fade out animation)
  - [ ] Add survival effect (green check, celebration)

- [ ] **Toast notification enhancements**
  - [ ] Success: "Resource gathered: +10 wood"
  - [ ] Success: "Crafting complete: Wooden Pole"
  - [ ] Warning: "Unit inventory full"
  - [ ] Warning: "Resource node depleted"
  - [ ] Error: "Cannot craft: insufficient materials"
  - [ ] Info: "Round 5 starting in 30 seconds"

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

- **Phase 1 (UI Modernization)**: 30% complete (8/26 tasks)
- **Phase 2 (Gameplay Features)**: 20% complete (4/20 tasks)
- **Phase 3 (Visual Effects)**: 10% complete (2/18 tasks)
- **Phase 4 (Technical)**: 15% complete (3/22 tasks)

**Current Sprint Focus**: Game.tsx refactoring + Resource transfer UI + Movement controls
**Next Sprint**: Visual polish + Market UI + Round timer

---

**Last Updated**: January 5, 2026
**See [roadmap.md](./roadmap.md) for long-term vision and detailed phase breakdowns.**
