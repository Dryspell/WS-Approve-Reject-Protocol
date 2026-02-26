# Development History

This document summarizes the development sprints for The Vote Exchange.

---

## Sprint Timeline

| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 1 | UI Modernization | Complete |
| Sprint 2 | Visual Polish | Complete |
| Sprint 3 | Core Vote Exchange (Server) | Complete |
| Sprint 4 | Game Flow Automation | Complete |
| Sprint 5 | Polish & Developer Tools | Complete |
| Sprint 6 | Social & Engagement Features | Complete |
| Sprint 7 | Feature Completion | Complete |
| Sprint 8 | Friends & Private Messaging | Complete |

---

## Sprint 1: UI Modernization

**Goal**: Extract large components and integrate solid-ui library

**Completed**:
- Extracted `Game.tsx` into modular components:
  - `UnitDetailsPanel.tsx`
  - `InventoryPanel.tsx`
  - `CraftingPanel.tsx`
  - `ResourcePanel.tsx`
- Improved resource transfer UI with validation
- Visual waypoint indicators for unit movement

> **Note**: These components are part of the Colony Builder prototype (`/canvas` route), not the Vote Exchange (`/vote` route).

---

## Sprint 2: Visual Polish

**Goal**: Add visual feedback and polish

**Completed**:
- `VoteMarketPanel.tsx` - Market with tabs, sorting, filtering
- `RoundTimer.tsx` - Circular progress with phase indicators
- `RoundHistory.tsx` - Carousel-based history
- Particle system for resource gathering, crafting, explosions
- Trail system for unit movement
- 20+ toast notification helpers

---

## Sprint 3: Core Vote Exchange (Server)

**Goal**: Implement Vote Exchange game logic server-side

**Completed**:
- **Database Tables**: User (wallet), GameRoom (pot), Vote (ownership), Transaction, Guarantee, GuaranteePurchase
- **Reducers**: vote trading, guarantees, vote tallying, game flow
- **Core Mechanics**: Multiple votes, vote splitting, guarantees (public/private), elimination, pot distribution
- Full TypeScript bindings generated

**Known Gaps** (identified Feb 2026, partially addressed):
- ~~`process_round_votes` does not check guarantee outcomes~~ Fixed: honor/break now tracked
- Tie handling ends game (confirmed as intended behavior)
- ~~No `leave_room` or disconnect handling~~ Fixed: `leave_room` reducer added
- No transaction fees on trades (planned for Phase 5)

---

## Sprint 4: Game Flow Automation

**Goal**: Automate game flow and add testing

**Completed**:
- Auto-round processing when timer expires (client-side interval)
- Buy-in amount UI in room creation
- `EliminationModal.tsx` with vote results and eliminations
- 24 unit tests (crafting, spatial utils)

> **Note**: The 24 unit tests are for the Colony Builder prototype (crafting costs, spatial utilities). There are no unit tests for Vote Exchange game logic (voting, trading, guarantees, round processing).

---

## Sprint 5: Polish & Developer Tools

**Goal**: Add UX polish and dev tools

**Completed**:
- **Sound Effects**: 13 unique sounds using Web Audio API
- **Animations**: 7 animation utilities + CSS keyframes
- **Loading States**: Skeleton loaders, spinners
- **Error Boundaries**: Graceful error handling
- **Debug Panel**: Real-time state inspection
- **Admin Panel**: Room/user management (localhost only)

---

## Sprint 6: Social & Engagement Features

**Goal**: Add social features for player retention

**Completed**:
- **Leaderboard**: Global rankings (timeframe filtering UI exists but is not wired to filtered queries)
- **Replay Viewer**: Playback controls, event timeline
- **Chat System**: In-game messaging (UI)
- **Player Profiles**: Stats display, achievements (6 types defined)
- **Room Presets**: Quick/Standard/Strategic/High Stakes modes

**Known Gaps**:
- Leaderboard always shows all-time data regardless of filter selection
- PlayerProfile name editing not wired to `set_name` reducer
- Achievement tracking may not be fully functional

---

## Sprint 7: Feature Completion

**Goal**: Close remaining feature gaps

**Completed**:
- **Chat Backend Integration**: Real-time SpacetimeDB sync
- **Bank Account Transfers**: Wallet-to-Bank with full UI
- **Post-Elimination Re-Buy**: 3x buy-in to re-enter (80% to pot, 20% house fee)
- New reducers: `transferToBank`, `withdrawFromBank`, `rebuyIntoGame`

---

## Sprint 8: Friends & Private Messaging

**Goal**: Add social connectivity between players

**Completed**:
- Friend requests (send/accept/reject/cancel)
- Friendship management (remove friends)
- Direct message conversations
- User blocking functionality (block/unblock with automatic cleanup)
- Social panel UI with tabs (Friends, Requests, Messages, Blocked)

---

## Sprint 9: 3D Viewport & Rendering Evaluation (Feb 25-26, 2026)

**Focus**: Evaluate rendering technologies and integrate a 3D game viewport.

### Completed
- Interaction patterns study (React Flow drag physics, snap-to-grid, momentum, spring animations)
- Three-way spike comparison: vanilla Canvas, Three.js, Pixi.js — each as production-quality demos
- Decision: committed to Three.js for low-poly 3D visuals
- Created `ColonyViewport` component: humanoid units, spring-eased drag-to-move, selection glow, resource nodes, shadows, fog, tone mapping
- Integrated ColonyViewport into VotingInterface: votes represented as 3D units with team colors
- Refactored global navigation bar to modern slate/white design

### Key Files
- `src/components/game/ColonyViewport.tsx` — Three.js viewport component
- `src/routes/canvas/spike/` — spike implementations (canvas, threejs, pixi)
- `docs/spike-evaluation.md` — evaluation document
- `docs/interaction-patterns.md` — interaction patterns study

---

## Sprint 10: Full-Screen HUD & DRY Testing (Feb 26, 2026)

**Focus**: Make the 3D viewport the main game view; eliminate test fragility.

### Completed
- Rewrote VotingInterface layout: 3D viewport fills entire screen, all UI overlays as glassmorphism HUD panels
- Collapsible side panels: Players (left, open by default), Market (right, closed by default)
- Bottom-center vote control bar with chat toggle
- Dark glass theme (`bg-black/50 backdrop-blur-md`) across all HUD elements
- Created shared `src/lib/test-ids.ts` — TID constants imported by both UI components and E2E page objects
- Added `data-testid` attributes to all interactive elements: VoteBox (12), VotingInterface (10), GamePreStartInteractions (3), ChatPanel (3)
- Rewrote `e2e/helpers/page-objects.ts` — all locators built from TID constants
- Created `e2e/helpers/game-flows.ts` — high-level helpers (setupPlayers, startGame, setVotes, snapshot)
- Refactored all 9 E2E spec files to use page objects and game flows (no raw selectors)
- Fixed bugs: division-by-zero in pot distribution, negative round number in elimination modal, removed unused Badge import

### Key Files
- `src/lib/test-ids.ts` — shared test ID constants
- `e2e/helpers/page-objects.ts` — page objects using TID
- `e2e/helpers/game-flows.ts` — high-level test orchestration
- `src/components/Vote/VotingInterface.tsx` — full-screen HUD layout

---

## Project Statistics

- **Total Components Created**: 30+
- **Lines of Rust Server Code**: ~2,200
- **Unit Tests**: 24 passing (Colony Builder only -- no Vote Exchange tests)
- **E2E Test Files**: 9 Playwright spec files (~120 test cases across 5 simulation scenarios)
- **Backend Reducers**: 30+
- **Database Tables**: 6 Vote Exchange + 3 chat + 4 social + Colony Builder tables
- **Sound Effects**: 13
- **Animation Utilities**: 7

---

## Feature Coverage (Honest Assessment)

| Feature (from rules.md) | Server | Client UI | Tested | Notes |
|--------------------------|--------|-----------|--------|-------|
| Binary voting (Red/Blue) | Yes | Yes | E2E | Core loop works; click drop zones or drag |
| Minority wins, majority eliminated | Yes | Yes | E2E smoke | 5-scenario simulation |
| Vote trading (buy/sell) | Yes | Yes | No | Works; marketplace panel |
| Multiple votes per player | Yes | Yes | E2E | Configurable per room (default 5) |
| Vote splitting (multi-color) | Partial | Yes (drag/drop + click) | No | Server doesn't validate split semantics |
| Public guarantees | Yes | Yes | No | |
| Private guarantees | Yes | Yes | No | |
| Guarantee enforcement (per-vote) | Yes | Yes (GuaranteeMarket) | No | Server locks vote color; per-vote model |
| Wallet system | Yes | Yes | No | No wallet cap/limit |
| Bank account | Yes | Yes | No | |
| Buy-in system | Yes | Yes | No | |
| Pot management | Yes | Yes | No | Division-by-zero guard added |
| Player elimination | Yes | Yes | No | |
| Multi-round gameplay | Yes | Yes | No | |
| Transaction recording | Yes | Yes (History tab) | No | All transaction types in VoteMarketPanel |
| Tie handling | Yes | Yes | No | Tie ends game and splits pot (intended) |
| Post-elimination re-buy | Yes | Yes | No | 3x cost, 80% to pot |
| Guarantee bluffing | Partial | Yes (warning text) | No | Bluffs not recorded/displayed |
| Chat system | Yes | Yes | E2E | In-game chat panel via Three.js HUD |
| Leave room / disconnect | Yes | Yes (HUD button) | No | `leave_room` reducer + UI Leave button |
| Transaction fees | Yes | Yes | No | 1% fee via TRANSACTION_FEE_RATE |
| Side-betting | **No** | No | No | |
| Trade offers (negotiation) | Yes | Yes (ChatPanel) | No | Trade offer system via chat with accept/decline |
| 3D Colony Viewport | N/A | Yes | No | Three.js low-poly with spring physics |

---

## Future Considerations (Not in current scope)

- Dual currency system (MT + MBLS)
- Cryptocurrency / blockchain integration
- SaaS platform / API for third-party integration
- Colony Builder integration with Vote Exchange (laborers as voters)
- Multi-timeframe server hierarchy
- Mobile-first responsive design (stretch goal)

---

**Last Updated**: February 26, 2026
