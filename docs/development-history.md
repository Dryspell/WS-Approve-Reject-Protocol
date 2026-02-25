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

## Project Statistics

- **Total Components Created**: 27+
- **Lines of Rust Server Code**: ~2,200
- **Unit Tests**: 24 passing (Colony Builder only -- no Vote Exchange tests)
- **E2E Test Files**: 8 Playwright spec files (~116 test cases defined)
- **Backend Reducers**: 30+
- **Database Tables**: 6 Vote Exchange + 3 chat + 4 social + Colony Builder tables
- **Sound Effects**: 13
- **Animation Utilities**: 7

---

## Feature Coverage (Honest Assessment)

| Feature (from rules.md) | Server | Client UI | Tested | Notes |
|--------------------------|--------|-----------|--------|-------|
| Binary voting (Red/Blue) | Yes | Yes | E2E smoke | Core loop works |
| Minority wins, majority eliminated | Yes | Yes | No | Untested beyond manual |
| Vote trading (buy/sell) | Yes | Yes | No | Works but no counter-offers |
| Multiple votes per player | Yes | Yes | No | Via trading only (start with 1) |
| Vote splitting (multi-color) | Partial | Yes (drag/drop) | No | Server doesn't validate split semantics |
| Public guarantees | Yes | Yes | No | |
| Private guarantees | Yes | Yes | No | |
| Guarantee enforcement (per-vote) | Yes | Yes (GuaranteeMarket) | No | Server locks vote color when guarantee is purchased; per-vote model |
| Wallet system | Yes | Yes | No | No wallet cap/limit |
| Bank account | Yes | Yes | No | |
| Buy-in system | Yes | Yes | No | |
| Pot management | Yes | Yes | No | |
| Player elimination | Yes | Yes | No | |
| Multi-round gameplay | Yes | Yes | No | |
| Transaction recording | Yes | Yes (History tab) | No | All transaction types shown in VoteMarketPanel |
| Tie handling | Yes | Yes | No | Tie ends game and splits pot (intended) |
| Post-elimination re-buy | Yes | Yes | No | 3x cost, 80% to pot |
| Guarantee bluffing | Partial | Yes (warning text) | No | Bluffs not recorded/displayed |
| Chat system | Yes | Yes | E2E smoke | |
| Leave room / disconnect | Yes | No UI button yet | No | `leave_room` reducer handles mid-game departure |
| Transaction fees | **No** | No | No | All trades are zero-fee |
| Side-betting | **No** | No | No | |
| Trade offers (negotiation) | Yes | Yes (ChatPanel) | No | Trade offer system via chat with accept/decline |

---

## Future Considerations (Not in current scope)

- Dual currency system (MT + MBLS)
- Cryptocurrency / blockchain integration
- SaaS platform / API for third-party integration
- Colony Builder integration with Vote Exchange (laborers as voters)
- Multi-timeframe server hierarchy
- Mobile-first responsive design (stretch goal)

---

**Last Updated**: February 25, 2026
