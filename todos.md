# Project TODOs

> **Current Focus**: Documentation review and alignment with implemented features through Sprint 15.
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

## Phase 5: Game Design Alignment (Complete)

- [x] **Transaction fees** -- 1% fee on vote sales, guarantee purchases, and trade offers (added to pot via `TRANSACTION_FEE_RATE`)
- [x] **Extract hardcoded game constants** -- all key values now named constants (`STARTING_WALLET`, `DEFAULT_ROUND_DURATION`, `REBUY_MULTIPLIER`, `REBUY_POT_PERCENTAGE`, `TRANSACTION_FEE_RATE`, `WIN_CONDITION_REMAINING`)
- [x] **Per-room game configuration** -- `votes_per_player`, `min_players`, `max_players`, `allow_rebuy`, `allow_midgame_join` fields on `GameRoom`, exposed in room creation UI and presets
- [x] **Side-betting for eliminated/spectating players** -- SideBet table, SideBetPanel
- [ ] **Configurable starting wallet limit** -- add wallet cap per room or globally

---

## Phase 6: Stretch Goals (Mostly Complete)

- [x] **Colony Builder integration with Vote Exchange Protocol** -- laborers as voters (vote_id on Unit)
- [x] **Tournament mode** -- Tournament table, TournamentPanel
- [x] **Spectator mode** -- Spectator table
- [x] **Dual currency (MT + MBLS)** -- PlayerCurrency table
- [x] **Multi-timeframe server hierarchy** -- ServerNode table, transfer reducers
- [ ] Mobile responsive layout (keep in mind during all work but don't block)
- [ ] Counter-offer / negotiation system (VG-025 in QA outline)
- [ ] Per-round partial pot distribution option
- [ ] Vote-on-voting trigger (alternative to timer-based rounds)
- [ ] Clan/guild system

---

## Complete Feature Roadmap (Phases A–K)

- [x] **Phase A**: Laborer-Vote Unification (vote_id on Unit, units linked to votes)
- [x] **Phase B**: Functional Buildings (16 building types, construction, assignment, taxation)
- [x] **Phase C**: Resource Refinement Pipeline (game_tick processes building production)
- [x] **Phase D**: Equipment System -- equip/unequip apply stat bonuses via `recalculate_unit_stats`; crafting consumes tiered materials
- [x] **Phase E**: Battle Arena -- `create_battle_arena` reducer with stat snapshots; UI wired
- [x] **Phase F**: Laborer Genetics -- initial units get LaborerGenetics records; breeding works
- [x] **Phase G**: Vote Mechanics Polish -- side bet economics backed by pot; payouts from pot_size
- [x] **Phase H**: Multi-Timeframe Server Hierarchy (ServerNode table, transfer reducers)
- [x] **Phase I**: Dual Currency (PlayerCurrency table with MT + MBLS)
- [x] **Phase J**: Platform Features (Tournament, Spectator tables)
- [x] **Phase K**: Technical Debt (dead code removal, docs update, cleanup)

---

## Phase L: Integration Gap Fixes (Complete)

- [x] **Equipment stat application** -- `equip_item`/`unequip_item` recalculate UnitStats via `recalculate_unit_stats` helper
- [x] **Craft resource consumption** -- `craft_equipment` consumes materials from building inventory (5 tiers)
- [x] **Battle arena creation** -- `create_battle_arena` reducer snapshots unit stats; BattleArenaViewport wired
- [x] **Side bet economics** -- bet amounts added to pot, payouts come from pot (zero-sum)
- [x] **Equipment cleanup on unit death** -- unequip items before deletion at all 3 sites
- [x] **Tax rate double-division bug** -- removed extra /100 in `handleSetBuildingTax`
- [x] **Wire missing UI** -- `onMoveUnit`, `onQueueTask`, spawn_laborer button wired in VotingInterface
- [x] **Initial unit genetics** -- `create_initial_units` creates LaborerGenetics records with balanced IVs
- [x] **Unify vote sale systems** -- `set_vote_for_sale` creates TradeOffer; `remove_vote_from_sale` cancels it; `transfer_vote_ownership` marks it accepted

---

## Phase M: UI/UX Fix Pass (Complete)

24 issues resolved across P0 critical bugs, P1 UX improvements, and P3 polish:

**P0 — Critical Bugs**
- [x] **Game Over "Anonymous" winners** -- replaced stale snapshot lookup with live `resolvePlayerName()` from connection
- [x] **"Return to Lobby" did not dismiss modal** -- added `gameOverDismissed` signal; modal hides on navigate
- [x] **ChatOverlay z-index covered Game Over modal** -- raised Game Over modal to `z-[70]`
- [x] **Schema mismatch caused silent "Syncing..."** -- wrapped subscription callback in try/catch; surfaces refresh banner on `RangeError`
- [x] **`GamePreStartInteractions` room not reactive** -- `room` is now a reactive accessor; all references use `room()?.X`

**P1 — UX Issues**
- [x] **Cryptic single-letter panel buttons** -- expanded to icon + label (Build, Equip, Gene, EV, Tourney, Bet)
- [x] **Side Bets only accessible to eliminated players** -- removed `isEliminated()` gate; Bet button available to all
- [x] **Market panel hidden by default** -- `marketOpen` signal now initialises to `true`
- [x] **Leave button had no confirmation** -- inline confirmation card (not modal) with forfeit warning
- [x] **Tavern was a dead placeholder** -- dispatches `open-chat-overlay` custom event handled by ChatOverlay
- [x] **Room Presets did not apply settings** -- repurposed as "Change Rules" feature or hidden if reducer absent
- [x] **Leaderboard broken theming** -- all light-mode classes replaced with dark equivalents
- [x] **Leaderboard didn't load data** -- replaced `onMount` with `createEffect` gated on `connected() && conn()`
- [x] **Profile "ID:" showed empty** -- truncated hex identity with copy-to-clipboard button
- [x] **gamesPlayed heuristic was inaccurate** -- replaced fabricated formula with `wins.length`; note added
- [x] **No navigation while in-game** -- Ranks, Profile, Home icon links added to top bar
- [x] **"Syncing..." had no progress indication** -- pulsing dot + 8-second timeout warning banner
- [x] **AdminPanel visible to all users** -- gated behind `isDev()` helper
- [x] **No name-setting flow on direct /vote navigation** -- `GuestNamePrompt` modal shown when name is empty after subscription
- [x] **Position updates were not rate-limited** -- 100ms throttle + 0.1-unit dead zone on avatar position reducers
- [x] **Dual chat systems were confusing** -- global `ChatOverlay` suppressed on `/vote` routes; in-game ChatPanel is sole interface
- [x] **Tie vote defaulted silently to eliminating Red** -- EliminationModal now shows "Tie — Red eliminated by tiebreaker" message

**P3 — Minor Polish**
- [x] **No game-start countdown** -- 3-second client-side countdown overlay when all players ready
- [x] **Vote drop zones showed no running tally** -- live per-color vote count rendered below each drop zone

---

## Phase N: Match History & Chat Bubbles (Complete)

- [x] **In-game event feed** -- scrollable activity log panel in HUD showing all player actions (trades, harvests, purchases, eliminations, votes) in real time during gameplay
- [x] **Post-game match history** -- accessible from Game Over modal and player profile; shows full chronological event log for the completed game
- [x] **Chat bubbles on 3D avatars** -- speech bubble mesh rendered above unit when player/bot sends a chat message; fades after 4 seconds
- [x] **Bot chat rendering** -- bot messages sent via `send_chat` reducer now appear as speech bubbles in the 3D viewport

---

## Phase O: Bot Full Simulation Expansion (Complete)

- [x] **Fix `createRoom` `combatEnabled` field** -- `combatEnabled: true` now passed in bot `createRoom` call
- [x] **Add unit/resource/unit_stats subscriptions** -- bots subscribe to live unit and resource tables
- [x] **Avatar wandering** -- bots pick random wander targets every 20 ticks and call `updatePlayerPosition` every 5 ticks; visible as moving avatars in colony viewport
- [x] **Laborer spawning** -- bots call `spawnLaborer` when laborer count is below `votesPerPlayer`; rate-limited by 10-tick cooldown
- [x] **Resource harvesting** -- bots assign each laborer to the nearest resource node, call `moveUnit` each tick, and call `gatherResource` when within range; rotate targets when depleted
- [x] **Market activity** -- 15% per-tick chance to list a vote for sale or buy underpriced votes; `marketCooldown` prevents spam
- [x] **Side bet placement** -- eliminated bots place a side bet on the majority color (10% of wallet balance)
- [x] **State reset on new game** -- all laborer targets, flags, and cooldowns cleared on game transition

---

## Phase P: Minion Resource & Combat Mechanics (Complete)

- [x] **Minion harvesting assignment** -- UI allows player to assign any minion to a resource node; minion pathfinds and harvests automatically
- [x] **Per-skill XP system** -- each harvesting action awards XP to the matching skill (Woodcutting, Mining, Quarrying, Hunting, Farming); crafting actions award Crafting XP; combat awards Combat XP; each skill caps at level 5
- [x] **Minion evacuation** -- unvoted, un-promised minions can be sent out of the game before voting closes to save them from potential combat death; evacuated minions return with their inventory
- [x] **Auto-chess combat** -- majority-voting laborers are teleported to BattleArena; teams fight in automated turn-based rounds using unit stats + equipment; results reported back to room event log
- [x] **`combat_enabled` room flag** -- room creation UI includes a "Combat" toggle; when disabled, majority laborers are eliminated without entering the Battle Arena (development/testing mode)
- [x] **Crafting from harvested resources** -- crafting UI allows players to convert harvested raw resources into equipment for minions using building inventories

---

## Phase Q: Terrain Procedural Generation (Complete)

- [x] **Simplex-noise height displacement** -- `PlaneGeometry` vertices displaced by multi-octave noise; center area kept flat for gameplay; edges rise to rolling hills (max ~3 units)
- [x] **Multi-zone biome texturing** -- `createEarthTexture()` rewritten with noise-based biome zones (lush grass, earthy grass, packed dirt, sandy dust, rocky stone); fine grain, pebble dots, and worn dirt paths overlaid
- [x] **Water feature** -- small semi-transparent reflective pond near NW edge with point light for faked reflections
- [x] **Environment prop scattering** -- `scatterEnvironment()` places rocks, bushes, and grass tufts with noise affinity gating; perimeter boundary rocks at compass points define map edges
- [x] **Server-side resource clustering** -- initial resources spawned in geographic biome zones (Forest NW, Quarry NE, Mine SW, Plains SE, sparse Center) matching client coordinate space
- [x] **Ground size alignment** -- `GROUND_SIZE` updated to 100 to match server coordinate space (0–100)

---

## Future Work

- [ ] **Configurable starting wallet limit** -- wallet cap per room or globally
- [ ] **Visual polish on 3D models for buildings** -- richer assets, improved building representations
- [ ] **Full multi-server SpacetimeDB architecture** -- ServerNode/transfers exist; production hierarchy deployment
- [ ] **Payment processor integration for real currency** -- cash-out, real-money transactions
- [ ] **Mobile responsive layout** -- responsive design across breakpoints
- [ ] **Per-round partial pot distribution option** -- distribute fraction of pot each round
- [ ] **Vote-on-voting trigger** -- super-majority triggers vote instead of timer
- [ ] **Clan/guild system** -- persistent social groups
- [ ] **Counter-offer / negotiation system** -- back-and-forth price negotiation in trade offers
- [ ] **Deeper E2E coverage** -- fix 4 known failing tests; add colony builder integration tests

---

## Known E2E Test Failures

The following 4 priority-1 tests are currently failing (12 of 16 pass). Likely root cause: race conditions in SpacetimeDB room state synchronization or DOM overlay elements intercepting pointer events.

- [ ] **VG-003**: "Join existing room" -- room tab not visible to second player within timeout; timing/sync issue
- [ ] **VG-004**: "Multiple players join - pot calculation" -- 5-player room sync; pot display timing
- [ ] **VG-005**: "Room auto-start when all ready (3+ players)" -- ready state synchronization race condition
- [ ] **VG-060**: "4 player room setup for tie scenario" -- room tab visibility for multiple players joining in sequence

---

## Technical Debt

- [ ] Split monolithic `lib.rs` (~2,200+ lines) into separate modules for Vote Exchange Protocol vs Colony Builder
- [ ] Move round processing to server-side scheduled timer (every client currently calls `processRoundVotes` when timer expires — race condition risk)
- [ ] Guard against division-by-zero in pot distribution (fixed in VotingInterface but server should also validate)
- [ ] Server should derive `round_number` from room state instead of accepting it as client parameter
- [ ] Wrap all client-side reducer calls in try-catch
- [ ] Add rate limiting on reducers (server-side)
- [ ] Add input validation on all reducers

---

## Completed Sprints

- Sprint 1: UI Modernization (Colony Builder components)
- Sprint 2: Visual Polish (VoteMarketPanel, RoundTimer, particles, toasts)
- Sprint 3: Core Vote Exchange Protocol Server (tables, reducers, game logic)
- Sprint 4: Game Flow Automation (auto-round, EliminationModal, unit tests)
- Sprint 5: Polish & Developer Tools (sounds, animations, debug/admin panels)
- Sprint 6: Social & Engagement Features (leaderboard, replay, chat UI, profiles, presets)
- Sprint 7: Feature Completion (chat backend, bank transfers, re-buy)
- Sprint 8: Friends & Private Messaging (friend system, DMs, blocking)
- Sprint 9: 3D Viewport & Rendering Evaluation (Three.js spike, ColonyViewport)
- Sprint 10: Full-Screen HUD & DRY Testing (glassmorphism layout, test-ids, page objects)
- Sprint 11: UI/UX Fix Pass (24 issues — P0 bugs, P1 UX, P3 polish)
- Sprint 12: Match History & Chat Bubbles (event feed, post-game log, 3D speech bubbles)
- Sprint 13: Bot Full Simulation Expansion (wandering, laborer harvesting, market activity, side bets)
- Sprint 14: Minion Resource & Combat Mechanics (per-skill XP, evacuation, auto-chess, combat toggle)
- Sprint 15: Terrain Procedural Generation (height displacement, biome texturing, environment scattering)

---

**Last Updated**: February 26, 2026
