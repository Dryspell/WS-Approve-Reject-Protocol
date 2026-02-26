# Project TODOs

> **Current Focus**: Documentation accuracy, then game-breaking bug fixes
>
> See [docs/development-history.md](./docs/development-history.md) for completed sprint summaries.
> See [docs/STATUS.md](./docs/STATUS.md) for vision-vs-implementation mapping.

---

## Phase 1: Documentation (Complete)

- [x] Update `development-history.md` with honest feature coverage
- [x] Rewrite `roadmap.md` with accurate implementation status
- [x] Rewrite `todos.md` (this file) to reflect actual backlog
- [x] Create `docs/GAME_CONSTANTS.md` documenting all hardcoded values
- [x] Create `docs/STATUS.md` mapping each design doc section to implementation status
- [x] Update `README.md` to remove false "95% Feature Complete" claim

---

## Phase 2: Game-Breaking Bug Fixes (Complete)

- [x] ~~Fix tie handling~~ Confirmed: ties ending game is intended behavior
- [x] **Add guarantee outcome tracking** -- `process_round_votes` now compares promised color vs actual vote and writes `honored` field
- [x] **Add `leave_room` reducer** -- removes player, auto-eliminates mid-game, voids votes, cancels guarantees, handles game end

---

## Phase 3: Core Feature Completion (Complete)

- [x] **Wire PlayerProfile name editing** -- connected to `set_name` reducer
- [x] **Implement Leaderboard timeframe filtering** -- weekly (7d), season (90d), all-time with reactive data reload
- [x] **Add transaction history panel** -- VoteMarketPanel history tab now shows all transaction types with icons and color-coded amounts
- [x] **Implement ChatPanel trade-offer system** -- new `TradeOffer` table, `create_trade_offer`/`accept_trade_offer`/`cancel_trade_offer` reducers, inline chat UI with accept/decline
- [x] **Show guarantee results in EliminationModal** -- displays honored/broken status for all purchased guarantees

---

## Phase 4: Test Infrastructure (Partially Complete)

- [x] **Fix vitest config** -- excluded DB-dependent tests, kept pure unit tests working
- [x] **Full game simulation E2E** -- `e2e/full-game-simulation.spec.ts` with 5-player lifecycle across 5 scenarios
- [x] **Headed browser testing** -- `headed-simulation` Playwright project with `slowMo`, video recording, and screenshots
- [x] **Log capture** -- `MultiPlayerHelper.attachLogCapture()` writes per-player console logs to `test-logs/`
- [x] **Run script** -- `scripts/run-e2e-headed.sh` starts services, publishes module, runs headed tests with full logging
- [x] **NPM scripts** -- `test:e2e:headed` and `test:e2e:simulate` for quick access
- [x] **Rich E2E scenarios** -- Standard, Quick (3 votes), No-Rebuy, Tie, and Player Departure scenarios with chat, market, and guarantee interactions
- [ ] **Add Rust integration tests for `process_round_votes`** (requires running SpacetimeDB)
- [ ] **Fix failing E2E tests** -- 4 priority-1 tests currently failing (see Known E2E Issues below)

---

## Phase 4.5: 3D Viewport & UI Architecture (Complete)

- [x] **Three.js spike evaluation** -- compared Canvas, Three.js, Pixi.js; committed to Three.js for low-poly 3D
- [x] **ColonyViewport component** -- Three.js viewport with humanoid units, spring physics, selection, drag-to-move
- [x] **Full-screen viewport layout** -- 3D viewport fills screen, all game UI overlaid as glassmorphism HUD panels
- [x] **Shared test-id system** -- `src/lib/test-ids.ts` constants imported by both UI components and E2E tests
- [x] **DRY E2E refactoring** -- page objects use TID constants, game-flows.ts provides high-level test helpers
- [x] **data-testid coverage** -- added test IDs to VoteBox, VotingInterface, GamePreStartInteractions, ChatPanel

---

## Phase 5: Game Design Alignment (Partially Complete)

- [x] **Transaction fees** -- 1% fee on vote sales, guarantee purchases, and trade offers (added to pot via `TRANSACTION_FEE_RATE`)
- [x] **Extract hardcoded game constants** -- all key values now named constants (`STARTING_WALLET`, `DEFAULT_ROUND_DURATION`, `REBUY_MULTIPLIER`, `REBUY_POT_PERCENTAGE`, `TRANSACTION_FEE_RATE`, `WIN_CONDITION_REMAINING`)
- [x] **Per-room game configuration** -- `votes_per_player`, `min_players`, `max_players`, `allow_rebuy`, `allow_midgame_join` fields on `GameRoom`, exposed in room creation UI and presets
- [ ] **Configurable starting wallet limit** -- add wallet cap per room or globally
- [ ] **Side-betting for eliminated/spectating players** -- bets on round outcomes

---

## Phase 6: Stretch Goals

- [ ] Mobile responsive layout (keep in mind during all work but don't block)
- [ ] Counter-offer / negotiation system (VG-025 in QA outline)
- [ ] Per-round partial pot distribution option
- [ ] Vote-on-voting trigger (alternative to timer-based rounds)
- [ ] Colony Builder integration with Vote Exchange (laborers as voters)
- [ ] Tournament mode with brackets
- [ ] Bot players for solo practice
- [ ] Spectator mode
- [ ] Clan/guild system

---

## Known E2E Test Failures

The following 4 priority-1 tests are currently failing (12 of 16 pass). Likely root cause: race conditions in SpacetimeDB room state synchronization or DOM overlay elements intercepting pointer events (similar to the `GamePreStartInteractions` fixed/absolute positioning bug).

- [ ] **VG-003**: "Join existing room" -- room tab not visible to second player within timeout; timing/sync issue
- [ ] **VG-004**: "Multiple players join - pot calculation" -- 5-player room sync; pot display timing
- [ ] **VG-005**: "Room auto-start when all ready (3+ players)" -- ready state synchronization race condition
- [ ] **VG-060**: "4 player room setup for tie scenario" -- room tab visibility for multiple players joining in sequence

---

## Technical Debt

- [ ] Split monolithic `lib.rs` (~2,200 lines) into separate modules for Vote Exchange vs Colony Builder
- [ ] Move round processing to server-side scheduled timer (every client currently calls `processRoundVotes` when timer expires — race condition risk)
- [ ] Guard against division-by-zero in pot distribution (fixed in VotingInterface but server should also validate)
- [ ] Server should derive `round_number` from room state instead of accepting it as client parameter
- [ ] Remove dead code: `server/src/auth.rs` (unreferenced)
- [ ] Wrap all client-side reducer calls in try-catch
- [ ] Add rate limiting on reducers
- [ ] Add input validation on all reducers

---

## Completed Sprints

- Sprint 1: UI Modernization (Colony Builder components)
- Sprint 2: Visual Polish (VoteMarketPanel, RoundTimer, particles, toasts)
- Sprint 3: Core Vote Exchange Server (tables, reducers, game logic)
- Sprint 4: Game Flow Automation (auto-round, EliminationModal, unit tests)
- Sprint 5: Polish & Developer Tools (sounds, animations, debug/admin panels)
- Sprint 6: Social & Engagement Features (leaderboard, replay, chat UI, profiles, presets)
- Sprint 7: Feature Completion (chat backend, bank transfers, re-buy)
- Sprint 8: Friends & Private Messaging (friend system, DMs, blocking)

---

**Last Updated**: February 26, 2026
