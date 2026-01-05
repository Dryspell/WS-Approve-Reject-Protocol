# SocketSignal Development Roadmap

## Vision & Overview

SocketSignal is a unique multiplayer game combining market-based voting mechanics with colony-building elements. Players manage colonies of laborers who participate in voting rounds, with minority voters surviving each round while building and managing resources in real-time.

### Core Pillars
- **Real-time Multiplayer**: Powered by SpacetimeDB for instant state synchronization
- **Strategic Depth**: Market dynamics, resource management, and voting strategy
- **Social Gameplay**: Trading, alliances, and competitive colony building
- **Scalable Design**: Multi-timeframe gameplay across different server tiers

---

## Current State ✅

### Completed Features
- ✅ SpacetimeDB integration with official SDK
- ✅ Type-safe Rust → TypeScript bindings
- ✅ Basic unit movement and selection system
- ✅ Resource gathering and inventory management
- ✅ Crafting system with recipes
- ✅ Vote state management and trading interface
- ✅ Chat system with rooms and permissions
- ✅ Connection status handling with auto-reconnect
- ✅ Canvas-based unit visualization
- ✅ Task queue system for units
- ✅ Storage buildings for resource management
- ✅ Basic UI components from Solid-UI (Button, Card, Badge, Resizable, Toast, etc.)

### Active Development
- 🔄 Full unit movement controls (right-click to move)
- 🔄 Resource transfer UI improvements
- 🔄 Game.tsx component refactoring

---

## Phase 1: Core UI/UX Modernization 🎨

**Priority**: High | **Timeline**: 2-3 weeks

### 1.1 Component Library Enhancement
- [ ] Create `UnitCard` component using Solid-UI Card with hover effects
  - Display unit stats, inventory, and vote status
  - Use Badge for status indicators (active, idle, gathering)
  - Implement with proper TypeScript types from module_bindings
  
- [ ] Build `ResourcePanel` using Tabs component
  - Tab 1: Unit inventory with Progress bars for capacity
  - Tab 2: Storage building contents
  - Tab 3: Crafting recipes with visual indicators
  - Use ScrollArea for long lists
  
- [ ] Create `VoteMarket` component with Card layout
  - Market listings with price sorting
  - Buy/sell forms using TextField components
  - Trade history timeline using Flex layout
  - Market analytics charts (integrate with existing graphs)

- [ ] Design `ActionBar` component using Flex
  - Quick actions for selected units
  - Resource transfer shortcuts
  - Vote color palette selector
  - Building placement tools

### 1.2 Game.tsx Refactoring
- [ ] Extract `UnitDetailsPanel.tsx` (~200 lines)
  - Unit stats display with Card component
  - Inventory management with visual feedback
  - Action buttons using Button variants (outline, ghost, destructive)
  - Task queue management with Tabs
  
- [ ] Extract `InventoryPanel.tsx` (~150 lines)
  - Grid layout for resources with Progress indicators
  - Transfer form using TextField with validation
  - Capacity warnings using Toast
  - Resource type selector using native select styled with Solid-UI
  
- [ ] Extract `CraftingPanel.tsx` (~180 lines)
  - Recipe cards with Badge for status (available, locked, crafting)
  - Cost breakdown with visual resource icons
  - Crafting queue with Progress bars
  - Recipe categories using Tabs
  
- [ ] Extract `GameCanvas.tsx` (~300 lines)
  - Separate rendering logic from game logic
  - Improve performance with canvas optimization
  - Add minimap feature (small canvas preview)
  - Zoom and pan controls with visual indicators

### 1.3 Visual Polish
- [ ] Implement consistent color scheme
  - Define color tokens in tailwind.config.cjs
  - Use Solid-UI variants for semantic colors
  - Resource-type color coding (already partially done)
  
- [ ] Add loading states with Progress component
  - Connection loading (SpacetimeDB)
  - Resource gathering progress
  - Crafting progress indicators
  
- [ ] Create toast notification system enhancements
  - Success: Resource gathered, craft complete
  - Warning: Low inventory, trade pending
  - Error: Connection lost, invalid action
  - Info: Round changes, game events
  
- [ ] Design hover tooltips for UI elements
  - Unit stats on canvas hover
  - Resource node information
  - Building details and capacity
  - Vote market price trends

### 1.4 Responsive Design
- [ ] Mobile-friendly layout adjustments
  - Stack panels vertically on small screens
  - Touch-friendly button sizes
  - Simplified canvas controls for touch
  
- [ ] Tablet optimization
  - Two-column layout using Resizable
  - Collapsible side panels
  - Gesture support for unit selection

---

## Phase 2: Gameplay Features 🎮

**Priority**: High | **Timeline**: 4-6 weeks

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

