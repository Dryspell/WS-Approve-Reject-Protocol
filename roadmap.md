# Nashfall Development Roadmap

## Vision & Overview

Nashfall is a **market-based voting game** (The Vote Exchange Protocol) where players trade votes in a minority-wins system. The core gameplay loop is vote trading and strategic voting, with an MMO/Colony-Builder layer providing resource gathering, crafting, minion management, and auto-chess combat.

### Core Pillars (Priority Order)
1. **The Vote Exchange Protocol**: Binary voting with minority-wins elimination (THE CORE GAME)
2. **Market Trading**: Buy/sell votes and guarantees between players
3. **Strategic Depth**: Bluffing, guarantees, wallet management
4. **Real-time Multiplayer**: Powered by SpacetimeDB for instant state synchronization
5. **Colony Builder Extension**: Minion management, resource gathering, crafting, auto-chess combat

---

## Current State (August 2026)

### Live

Vote Exchange Protocol plus a **narrow expedition colony loop**. The 16-building MMO catalog is parked.

**Vote Exchange Protocol Core**
- Binary voting (Red/Blue); minority tickets stay; majority minions fight
- Unplaced tickets split evenly at lock; 0–0 restarts the timer
- Vote trading marketplace (list, buy, cancel) and chat trade offers
- Multiple votes per player (configurable per room)
- Public and private guarantees (locked color, cannot be sold; cancel unsold; refund if seller leaves)
- Wallet, buy-in, pot to winners; re-buy; side bets; 1% fees to pot
- Live vote tally; 2/3 vote-on-voting; timer backstop

**UI/UX**
- Full-screen Three.js colony viewport with glassmorphism HUD
- Live side buttons: Equip, Bet (Build / Gene / EV / Tourney hidden)
- Game Over keep-this-save card (recovery code + bind)
- Lobby Restore save and roster picker (veterans keep gear)
- Market open by default; leave confirm; admin gated to `isDev()`
- Guest name prompt on `/vote`

**Social & Profile**
- Real-time chat system (game rooms + general)
- Speech bubble rendering above 3D avatars for chat messages (including bots)
- Friend system (requests, accept/reject, remove)
- Direct messaging (conversation-based DMs)
- User blocking (with automatic friendship/request cleanup)
- Leaderboard with dark theme, reactive data loading (weekly/season/all-time)
- Player profiles with truncated ID, copy-to-clipboard, and accurate stats

**Match History**
- In-game event feed panel (trades, harvests, purchases, eliminations, votes — real time)
- Post-game match history accessible from Game Over modal and player profile

**Expedition colony (live)**
- 3 actions per minion per round; instant harvest (skill may double yield)
- One camp; refine at camp; craft-and-equip hatchet / spear / vest
- Send-home and match-end roster; equipped gear persists (`OwnedEquipment`)
- Hex-board majority melee; `combat_enabled` skips the fight
- Per-skill XP (level cap 5) on harvest/refine/craft

**Parked colony catalog**
- 16 building types, `game_tick` production, genetics breeding HUD, mithril craft tree

**Bot Simulation**
- Vote strategies (mixed leans contrarian/splitter)
- Harvest, found camp, refine, craft; sit still during `arena`
- Buy cheap listed votes; do not spawn extra laborers
- Eliminated bots may side-bet; optional chat bubbles

**Terrain & Environment**
- Simplex-noise terrain height displacement (multi-octave; center flat, edges undulate)
- Multi-zone biome texturing (lush grass → earthy grass → packed dirt → sandy dust → rocky stone)
- Worn dirt path overlay radiating from center
- Small reflective pond near NW edge
- Environment prop scattering (rocks, bushes, grass tufts; noise affinity gating)
- Perimeter boundary rock clusters at compass points
- Server-side resource clustering by biome zone (Forest NW, Quarry NE, Mine SW, Plains SE)

**Platform**
- Room presets (Quick/Standard/Strategic/High Stakes)
- Sound effects, animations, loading states
- Debug and admin panels (localhost only)
- Replay viewer UI
- SpacetimeDB 2.0 integration with auto-generated TypeScript bindings
- Shared test-id system (`src/lib/test-ids.ts`) and DRY E2E test architecture

### Not Implemented / Future Iteration

- Wallet limits / spending caps
- Per-round partial pot distribution
- 16-building / genetics / server-tree catalog (parked, not deleted)
- Real-money integration / cryptocurrency
- SaaS platform / API for third-party integration
- Mobile-optimized layout
- Full multi-server SpacetimeDB architecture (ServerNode exists; full hierarchy deployment pending)
- Payment processor integration for real currency
- Clan/guild system

---

## Phase 1: Documentation & Accuracy

**Priority**: CRITICAL | **Status**: Complete (Feb 25, 2026)

- [x] Update `development-history.md` with honest feature coverage
- [x] Rewrite `roadmap.md` (this file) with accurate status
- [x] Rewrite `todos.md` to reflect actual backlog
- [x] Create `GAME_CONSTANTS.md` documenting all hardcoded values
- [x] Create `STATUS.md` mapping design docs to implementation status
- [x] Update `README.md` to remove false status claims

---

## Phase 2: Game-Breaking Bug Fixes

**Priority**: CRITICAL | **Status**: Complete (Feb 25, 2026)

- [x] ~~Fix tie handling~~ Confirmed: ties ending game is intended behavior
- [x] Add guarantee outcome tracking in `process_round_votes`
- [x] Add `leave_room` reducer with mid-game departure handling

---

## Phase 3: Core Feature Completion

**Priority**: HIGH | **Status**: Complete (Feb 25, 2026)

- [x] Wire PlayerProfile name editing to `set_name` reducer
- [x] Implement Leaderboard timeframe filtering (weekly/season/all-time)
- [x] Add transaction history panel in Vote Exchange Protocol UI (all transaction types)
- [x] Implement ChatPanel trade-offer UI with server-side TradeOffer system
- [x] Show guarantee honor/break results in EliminationModal

---

## Phase 4: Test Infrastructure

**Priority**: HIGH | **Status**: Mostly Complete (Feb 26, 2026)

- [x] Fix vitest config (exclude DB-dependent tests, enable pure unit tests)
- [x] Full game simulation E2E (`e2e/full-game-simulation.spec.ts`) -- 4-player game, market flow, leave-room
- [x] Headed browser testing (`headed-simulation` project with slowMo + video recording)
- [x] Console log capture per player (`MultiPlayerHelper.attachLogCapture`)
- [x] Run script (`scripts/run-e2e-headed.sh`) -- starts services, runs headed tests, captures all logs
- [x] NPM scripts: `test:e2e:headed`, `test:e2e:simulate`
- [ ] Add Rust integration tests for `process_round_votes` (requires running SpacetimeDB)
- [ ] Fix 4 known failing E2E tests (race conditions in room state sync)

---

## Phase 4.5: 3D Viewport & UI Architecture

**Priority**: HIGH | **Status**: Complete (Feb 26, 2026)

- [x] Evaluate rendering technologies (Canvas vs Three.js vs Pixi.js spike comparison)
- [x] Implement ColonyViewport component with Three.js (low-poly units, spring physics, selection, shadows)
- [x] Integrate viewport into VotingInterface (units represent votes, team colors = vote colors)
- [x] Rewrite layout to full-screen viewport with glassmorphism HUD overlay
- [x] Implement shared test-id system (TID constants in `src/lib/test-ids.ts`)
- [x] Refactor all E2E tests to use page objects and game flow helpers (DRY)
- [x] Add missing `data-testid` attributes to all interactive UI components

---

## Phase 5: Game Design Alignment

**Priority**: MEDIUM | **Status**: Complete

- [x] Transaction fees (1% `TRANSACTION_FEE_RATE` on all trades, added to pot)
- [x] Extract hardcoded game constants to named constants
- [x] Side-betting for eliminated/spectating players (SideBet, SideBetPanel)
- [ ] Configurable starting wallet limit (per-room or global cap)

---

## Phase 6: Stretch Goals (Mostly Complete)

**Priority**: LOW | **Status**: Implemented where applicable

- [x] Colony Builder integration with Laborer-Vote Unification (laborers as voters)
- [x] Tournament mode (Tournament table, TournamentPanel)
- [x] Spectator mode (Spectator table)
- [x] Side-betting (SideBet table, SideBetPanel)
- [x] Dual currency (MT + MBLS) (PlayerCurrency table)
- [x] Multi-timeframe server hierarchy (ServerNode table, transfer reducers)
- [ ] Mobile responsive layout
- [ ] Per-round partial pot distribution option
- [ ] Vote-on-voting trigger (alternative to timer)
- [ ] Clan/guild system

---

## Complete Feature Roadmap (Phases A–K)

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| A | Laborer-Vote Unification | COMPLETE | |
| B | Functional Buildings | COMPLETE | |
| C | Resource Refinement Pipeline | COMPLETE | |
| D | Equipment System | COMPLETE | `equip_item`/`unequip_item` apply stat bonuses; `craft_equipment` consumes tiered materials |
| E | Battle Arena | COMPLETE | `create_battle_arena` reducer, BattleArenaViewport, auto-chess combat loop |
| F | Laborer Genetics | COMPLETE | Initial units get LaborerGenetics; breeding works |
| G | Vote Mechanics Polish | COMPLETE | Side bet economics backed by pot; payouts from pot_size |
| H | Multi-Timeframe Server Hierarchy | COMPLETE | |
| I | Dual Currency | COMPLETE | |
| J | Platform Features | COMPLETE | |
| K | Technical Debt | COMPLETE | |

---

## Phase L: Integration Gap Fixes

**Priority**: CRITICAL | **Status**: Complete (Feb 26, 2026)

- [x] Equipment stat application: `equip_item`/`unequip_item` update `UnitStats` via `recalculate_unit_stats`
- [x] Craft resource consumption: `craft_equipment` deducts materials from building inventory
- [x] Battle arena creation: `create_battle_arena` reducer + UI trigger
- [x] Side bet economics: bet amounts go to pot, payouts come from pot
- [x] Equipment cleanup on unit death: unequip at all 3 deletion sites
- [x] Tax rate double-division bug: removed extra /100 in `handleSetBuildingTax`
- [x] Wire missing UI: `onMoveUnit`, `onQueueTask`, `spawn_laborer` button, `contribute_to_building` UI
- [x] Initial unit genetics: create `LaborerGenetics` records in `create_initial_units`
- [x] Unify vote sale systems: `set_vote_for_sale` creates TradeOffer; unified through `transfer_vote_ownership`

---

## Phase M: UI/UX Fix Pass

**Priority**: HIGH | **Status**: Complete (Feb 26, 2026)

24 issues resolved (P0 critical bugs, P1 UX improvements, P3 polish). Key fixes:

- Game Over anonymous winners, modal dismissal, z-index overlap
- Schema mismatch error surface, reactive room state
- Panel button labels, market open by default, leave confirmation
- Leaderboard theming and reactive data load
- AdminPanel gated behind `isDev()`, guest name prompt
- Position update throttle, ChatOverlay suppressed in-game
- Game-start countdown, live vote tally on drop zones

---

## Phase N: Match History & Chat Bubbles

**Priority**: HIGH | **Status**: Complete (Feb 26, 2026)

- [x] In-game event feed (scrollable activity log in HUD; real-time)
- [x] Post-game match history (accessible from Game Over modal and profile)
- [x] 3D speech bubble rendering above avatars (player and bot chat)

---

## Phase O: Bot Full Simulation Expansion

**Priority**: MEDIUM | **Status**: Complete (Feb 26, 2026)

- [x] Fix `combatEnabled` in `createRoom`
- [x] Add unit/resource/unit_stats subscriptions
- [x] Avatar wandering with realistic position updates
- [x] Laborer spawning (rate-limited, respects wallet balance)
- [x] Resource harvesting loop (find nearest node, move, gather, rotate on depletion)
- [x] Market activity (vote listing, vote purchasing, cooldown gate)
- [x] Side bet placement for eliminated bots
- [x] State reset on new game

---

## Phase P: Minion Resource & Combat Mechanics

**Priority**: HIGH | **Status**: Complete (Feb 26, 2026)

- [x] Minion harvesting assignment UI
- [x] Per-skill XP (Woodcutting, Mining, Quarrying, Hunting, Farming, Crafting, Combat; cap level 5)
- [x] Minion evacuation (send unvoted minion to safety before voting)
- [x] Auto-chess combat (automated BattleArena turn-based resolution)
- [x] `combat_enabled` room flag (toggles Battle Arena on/off)
- [x] Crafting from harvested resources (building inventory pipeline)

---

## Phase Q: Terrain Procedural Generation

**Priority**: MEDIUM | **Status**: Complete (Feb 26, 2026)

- [x] Simplex-noise height displacement (multi-octave; center flat, edges undulate)
- [x] Multi-zone biome texturing (grass → dirt → stone transitions)
- [x] Water feature (reflective pond with point light)
- [x] Environment prop scattering with noise affinity
- [x] Perimeter boundary rock clusters
- [x] Server-side resource clustering by biome zone

---

## Future Phases

| Feature | Priority | Notes |
|---------|----------|-------|
| Configurable wallet limit | LOW | Per-room or global spending cap |
| Visual polish on 3D building models | LOW | KayKit assets for buildings in viewport |
| Full multi-server deployment | LOW | ServerNode exists; production hierarchy pending |
| Real-money / payment integration | LOW | Cash-out, fiat on/off ramps |
| Mobile layout | LOW | Responsive across breakpoints |
| Per-round partial pot distribution | LOW | Distribute fraction of pot each round |
| Vote-on-voting trigger | LOW | Super-majority triggers vote instead of timer |
| Clan/guild system | LOW | Persistent social groups |
| E2E test fixes (4 failing) | MEDIUM | Race conditions in room state sync |
| Rust integration tests | MEDIUM | `process_round_votes` server tests |

---

## Architectural Notes

1. **Monolithic `lib.rs`** (~2,200+ lines): Rust server contains both Vote Exchange Protocol and Colony Builder code. Splitting by feature module is the recommended next step.
2. **Client-side round processing**: Every connected client calls `processRoundVotes` when timer hits zero. Should be a server-side scheduled timer.
3. **No server-side validation on round_number**: Server accepts `round_number` from the client; should be derived from room state.
4. **Bot runner**: `scripts/bot-runner.ts` is an active development tool that simulates full player behavior (walking, harvesting, trading). Start with `pnpm bots`.

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
- [Colony Builder Rules](./game-design/rules-colony-builder.md) - MMO/Colony-Builder mechanics
- [TODOs](./todos.md) - Current backlog

---

**Last Updated**: February 26, 2026
