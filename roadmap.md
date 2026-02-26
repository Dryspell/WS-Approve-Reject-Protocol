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

## Current State (February 2026)

### Implemented

The core Vote Exchange game loop is functional:

- Binary voting (Red/Blue) with minority wins and majority elimination
- Vote trading marketplace (list, buy, cancel)
- Multiple votes per player (acquired via trading; start with 1)
- Public and private guarantee system (create, purchase)
- Wallet and bank account management (transfer between wallet/bank)
- Buy-in system and pot distribution to winners
- Player elimination across multiple rounds
- Post-elimination re-buy (3x buy-in, 80% to pot)
- Real-time chat system (game rooms + general)
- Friend system (requests, accept/reject, remove)
- Direct messaging (conversation-based DMs)
- User blocking (with automatic friendship/request cleanup)
- Room presets (Quick/Standard/Strategic/High Stakes)
- Sound effects, animations, loading states
- Debug and admin panels (localhost only)
- Leaderboard UI (rankings display)
- Player profiles with stats
- Replay viewer UI
- SpacetimeDB 2.0 integration with auto-generated TypeScript bindings
- Three.js colony viewport with low-poly 3D visuals, spring-eased drag-to-move, selection, and team assignment
- Full-screen 3D viewport layout with glassmorphism HUD overlay (game feels like a real game, not an app)
- Shared test-id system (`src/lib/test-ids.ts`) and DRY E2E test architecture (page objects + game flow helpers)

### Partially Implemented (Has Gaps)

- **Guarantee tracking**: Guarantees can be created and purchased, but `process_round_votes` never checks whether the seller honored or broke their promise. No outcome is recorded.
- **Tie handling**: Server ends the game on any tie and splits pot. Per rules.md, ties should result in no eliminations and the game continuing. Pot split should only happen on tie in the final round (2 players).
- **Leaderboard filtering**: UI has weekly/season/all-time tabs, but all tabs return the same unfiltered data.
- **Player profile editing**: Name field displays but is not wired to the `set_name` reducer.
- **Transaction history**: Server records all transactions, but no client UI component renders the history.
- **Vote split semantics**: Drag-and-drop UI lets players split votes across colors, but server doesn't distinctly handle a player who voted on both sides (they should always survive as they're guaranteed minority).
- **Colony Builder prototype**: Colony-style 3D viewport (Three.js) is now the main game view for Vote Exchange. Units represent votes visually. Full colony builder (resources, crafting, tasks) exists as prototype on `/canvas` route.
- **E2E testing**: 8 Playwright spec files exist with ~116 test cases, but many are smoke tests. Several reference features that don't fully work.

### Not Implemented

- ~~Leave room / disconnect handling~~ Implemented
- ~~Transaction fees~~ Implemented (1% via TRANSACTION_FEE_RATE)
- ~~Counter-offers / negotiation system~~ Implemented (trade offers in ChatPanel)
- ~~Multiple starting votes per player~~ Implemented (STARTING_VOTES_PER_PLAYER = 5)
- Side-betting for spectators/eliminated players
- Wallet limits / spending caps
- Per-round partial pot distribution
- Vote-on-voting trigger (alternative to timer)
- Dual currency system (MT + MBLS)
- Real-money integration / cryptocurrency
- SaaS platform / API for third-party integration
- Colony Builder integration with Vote Exchange (laborers as voters)
- Multi-timeframe server hierarchy
- Mobile-optimized layout

---

## Phase 1: Documentation & Accuracy

**Priority**: CRITICAL | **Status**: Complete (Feb 25, 2026)

### Goals
- Establish an accurate baseline of what exists, what's broken, and what's aspirational
- Prevent anything from being lost or misrepresented as we implement fixes

### Tasks
- [x] Update `development-history.md` with honest feature coverage
- [x] Rewrite `roadmap.md` (this file) with accurate status
- [x] Rewrite `todos.md` to reflect actual backlog
- [x] Create `GAME_CONSTANTS.md` documenting all hardcoded values
- [x] Create `STATUS.md` mapping design docs to implementation status
- [x] Update `README.md` to remove false status claims

---

## Phase 2: Game-Breaking Bug Fixes

**Priority**: CRITICAL | **Status**: Complete (Feb 25, 2026)

### Tasks
- [x] ~~Fix tie handling~~ Confirmed: ties ending game is intended behavior
- [x] Add guarantee outcome tracking in `process_round_votes`
- [x] Add `leave_room` reducer with mid-game departure handling

---

## Phase 3: Core Feature Completion

**Priority**: HIGH | **Status**: Complete (Feb 25, 2026)

### Tasks
- [x] Wire PlayerProfile name editing to `set_name` reducer
- [x] Implement Leaderboard timeframe filtering (weekly/season/all-time)
- [x] Add transaction history panel in Vote Exchange UI (all transaction types)
- [x] Implement ChatPanel trade-offer UI with server-side TradeOffer system
- [x] Show guarantee honor/break results in EliminationModal

---

## Phase 4: Test Infrastructure

**Priority**: HIGH | **Status**: Mostly Complete

### Tasks
- [x] Fix vitest config (exclude DB-dependent tests, enable pure unit tests)
- [x] Full game simulation E2E (`e2e/full-game-simulation.spec.ts`) -- 4-player game, market flow, leave-room
- [x] Headed browser testing (`headed-simulation` project with slowMo + video recording)
- [x] Console log capture per player (`MultiPlayerHelper.attachLogCapture`)
- [x] Run script (`scripts/run-e2e-headed.sh`) -- starts services, runs headed tests, captures all logs
- [x] NPM scripts: `test:e2e:headed`, `test:e2e:simulate`
- [ ] Add Rust integration tests for `process_round_votes` (requires running SpacetimeDB)
- [ ] Fix any failing E2E tests (requires running dev server)

---

## Phase 4.5: 3D Viewport & UI Architecture

**Priority**: HIGH | **Status**: Complete (Feb 26, 2026)

### Tasks
- [x] Evaluate rendering technologies (Canvas vs Three.js vs Pixi.js spike comparison)
- [x] Implement ColonyViewport component with Three.js (low-poly units, spring physics, selection, shadows)
- [x] Integrate viewport into VotingInterface (units represent votes, team colors = vote colors)
- [x] Rewrite layout to full-screen viewport with glassmorphism HUD overlay
- [x] Implement shared test-id system (TID constants in `src/lib/test-ids.ts`)
- [x] Refactor all E2E tests to use page objects and game flow helpers (DRY)
- [x] Add missing `data-testid` attributes to all interactive UI components

---

## Phase 5: Game Design Alignment

**Priority**: MEDIUM | **Status**: Partially Complete

### Tasks
- [x] Transaction fees (1% `TRANSACTION_FEE_RATE` on all trades, added to pot)
- [x] Extract hardcoded game constants to named constants
- [ ] Configurable starting wallet limit (per-room or global cap)
- [ ] Side-betting for eliminated/spectating players

---

## Phase 6: Stretch Goals

**Priority**: LOW | **Status**: Future

- Mobile responsive layout (keep in mind during all work)
- Counter-offer / negotiation system
- Per-round partial pot distribution option
- Vote-on-voting trigger (alternative to timer)
- Colony Builder integration with Vote Exchange
- Tournament mode
- Bot players for solo practice
- Spectator mode
- Clan/guild system

---

## Architectural Notes

1. **Monolithic `lib.rs`** (~2,200 lines): Rust server contains both Vote Exchange and Colony Builder code. Consider splitting if Colony Builder grows.
2. **Client-side round processing**: Every connected client calls `processRoundVotes` when timer hits zero. Should ideally be a server-side scheduled timer.
3. **No server-side validation on round_number**: `processRoundVotes` accepts `round_number` from the client. Server should derive this from room state.
4. **Dead code**: `server/src/auth.rs` is not referenced. Colony Builder components only used on `/canvas` route.

---

## Documentation Index

- [Getting Started](./docs/getting-started.md) - Setup and how to play
- [SpacetimeDB Guide](./docs/spacetimedb.md) - Database integration
- [Testing Guide](./docs/testing.md) - Test scenarios
- [QA Testing Outline](./docs/qa-testing-outline.md) - Comprehensive QA test cases
- [Deployment Guide](./docs/deployment.md) - Production deployment
- [Development History](./docs/development-history.md) - Sprint summaries
- [Game Constants](./docs/GAME_CONSTANTS.md) - All hardcoded values
- [Implementation Status](./docs/STATUS.md) - Vision vs. reality mapping
- [Game Rules](./game-design/rules.md) - Complete game mechanics
- [TODOs](./todos.md) - Current backlog

---

**Last Updated**: February 26, 2026
