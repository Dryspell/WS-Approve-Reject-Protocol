# Development History

This document summarizes the development sprints for Nashfall.

---

## Sprint Timeline

| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 1 | UI Modernization | Complete |
| Sprint 2 | Visual Polish | Complete |
| Sprint 3 | Core Vote Exchange Protocol (Server) | Complete |
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

> **Note**: These components are part of the Colony Builder prototype (`/canvas` route), not the Vote Exchange Protocol (`/vote` route).

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

## Sprint 3: Core Vote Exchange Protocol (Server)

**Goal**: Implement Vote Exchange Protocol game logic server-side

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

## Sprint 11: UI/UX Fix Pass (Feb 26, 2026)

**Focus**: Systematic 24-issue fix pass across P0 critical bugs, P1 UX, and P3 polish.

### Completed

**P0 — Critical Bugs**
- Fixed Game Over modal showing "Anonymous" winners (live `resolvePlayerName()` lookup)
- Fixed "Return to Lobby" not dismissing the Game Over modal (`gameOverDismissed` signal)
- Fixed ChatOverlay `z-[60]` covering Game Over modal `z-50` (raised modal to `z-[70]`)
- Added try/catch around subscription callback; surfaces refresh banner on `RangeError` schema mismatch
- Made `GamePreStartInteractions` room a reactive accessor; all references use `room()?.X`

**P1 — UX**
- Expanded panel buttons from single letters to icon + text label (Build, Equip, Gene, EV, Tourney, Bet)
- Side Bets accessible to all players (removed `isEliminated()` gate)
- Market panel defaults to open (`marketOpen` initialises to `true`)
- Leave button now shows inline confirmation card with forfeit warning
- Tavern dispatches `open-chat-overlay` custom event (functional)
- Leaderboard dark theme: all light-mode Tailwind classes replaced
- Leaderboard data loading moved to `createEffect` gated on `connected() && conn()`
- Player profile ID shows truncated hex with copy-to-clipboard button
- `gamesPlayed` now uses `wins.length` (removed fabricated formula)
- In-game navigation links (Ranks, Profile, Home) added to top bar
- "Syncing…" replaced with pulsing dot + 8-second timeout warning
- AdminPanel gated behind `isDev()` helper
- Guest name prompt shown when name is empty after subscription on direct `/vote` nav
- Position updates throttled (100ms interval + 0.1-unit dead zone)
- Global ChatOverlay suppressed on `/vote` routes; in-game ChatPanel is sole interface
- Tie tiebreaker displayed in EliminationModal

**P3 — Polish**
- 3-second game-start countdown overlay when all players ready
- Live per-color vote tally below each drop zone during voting

### Key Files
- `src/components/Vote/VotingInterface.tsx`
- `src/components/Vote/GamePreStartInteractions.tsx`
- `src/components/ChatOverlay.tsx`
- `src/components/game/Leaderboard.tsx`
- `src/components/game/PlayerProfile.tsx`
- `src/hooks/useSpacetimeDB.tsx`
- `src/app.tsx`

---

## Sprint 12: Match History & Chat Bubbles (Feb 26, 2026)

**Focus**: Give players visibility into what is happening in the game and around them.

### Completed
- **In-game event feed**: Scrollable HUD panel showing all player actions in real time (trades, harvests, purchases, eliminations, votes cast, side bets placed, laborers spawned)
- **Post-game match history**: Full chronological event log accessible from Game Over modal and player profile page
- **3D speech bubbles**: Billboard mesh rendered above avatar when a player or bot sends a chat message; fades after 4 seconds
- **Bot chat rendering**: Bot messages sent via `send_chat` reducer now appear as speech bubbles in the 3D viewport

### Key Files
- `src/components/game/EventFeedPanel.tsx` (new)
- `src/components/game/MatchHistoryPanel.tsx` (new)
- `src/lib/colony-scene.ts` (speech bubble mesh)

---

## Sprint 13: Bot Full Simulation Expansion (Feb 26, 2026)

**Focus**: Make bots behave as close to a real player as possible.

### Completed
- **`combatEnabled` fix**: `createRoom` now passes `combatEnabled: true`
- **New subscriptions**: Bots subscribe to `unit`, `resource`, and `unit_stats` tables
- **Avatar wandering**: Bots pick random wander targets every 20 ticks; call `updatePlayerPosition` every 5 ticks; visible as moving avatars in colony viewport
- **Laborer spawning**: Bots call `spawnLaborer` when laborer count is below `votesPerPlayer`; 10-tick cooldown; silently catches "Insufficient funds"
- **Resource harvesting loop**: Each laborer assigned to nearest resource node; `moveUnit` called every tick; `gatherResource` called when within 28 units; target rotated when depleted
- **Market activity**: ~15% per-tick chance to list a vote for sale or buy an underpriced vote; `marketCooldown` gate prevents spam
- **Side bet placement**: Eliminated bots place a bet on the majority color (10% of wallet balance); one-shot per game via `hasPlacedSideBet` flag
- **State reset**: All laborer targets, flags, and cooldowns cleared on game transition

### Key Files
- `scripts/bot-runner.ts`

---

## Sprint 14: Minion Resource & Combat Mechanics (Feb 26, 2026)

**Focus**: Make the Colony Builder layer feel like a real game with meaningful laborer progression and stakes.

### Completed
- **Minion harvesting assignment UI**: Player can assign any owned minion to a resource node from the unit context panel; minion pathfinds and harvests automatically
- **Per-skill XP system**: Seven skills, each capped at level 5:
  - Woodcutting (wood nodes), Mining (metal ore), Quarrying (stone/gems), Hunting (hide/food), Farming (fiber/food), Crafting (craft actions), Combat (battle arena)
  - XP values and level thresholds defined in `SKILL_XP_TABLE`
  - `award_skill_xp` server helper increments the correct skill field on `UnitStats`
- **Minion evacuation**: "Withdraw" action available on any minion not assigned as a vote and not promised in a guarantee; evacuated minions leave the battlefield with their inventory; reducer: `evacuate_unit`
- **Auto-chess combat**: Majority-voting laborers teleported to BattleArena on vote resolution; automated turn-based resolution using unit stats + equipment; results written to game event log
- **`combat_enabled` room flag**: Room creation UI includes a Combat toggle; when off, majority laborers are eliminated directly without entering the Battle Arena (safe for development and playtesting)
- **Crafting from harvested resources**: Crafting UI allows converting harvested raw resources into equipment using building inventories

### Key Files
- `server/src/lib.rs` (per-skill XP, evacuate_unit reducer, combat_enabled flag)
- `src/components/Vote/VotingInterface.tsx` (harvesting assignment, evacuation UI)
- `src/components/game/BattleArenaViewport.tsx`

---

## Sprint 15: Terrain Procedural Generation (Feb 26, 2026)

**Focus**: Make the colony world feel geographically coherent, visually interesting, and aligned with gameplay.

### Completed
- **Simplex-noise height displacement**: `PlaneGeometry` segments = 56; vertices displaced by multi-octave noise; power-curve ease function keeps center flat (gameplay area) and lets edges rise to rolling hills (max ~3 units)
- **Multi-zone biome texturing**: `createEarthTexture()` rewritten with noise-based biome zones — lush grass, earthy grass, packed dirt, sandy dust, rocky stone — rendered pixel-by-pixel on a 512×512 canvas
- **Fine surface details**: Pixel-level grain noise (random) overlaid; 1,400 scattered pebble dots
- **Worn dirt paths**: 8 quadratic-curve paths radiating from center toward corners and edges (opacity 0.22, blend mode multiply)
- **Water feature**: `CircleGeometry` pond near NW edge with semi-transparent reflective `MeshStandardMaterial` and point light above for faked reflections on nearby geometry
- **Environment prop scattering**: `scatterEnvironment()` places rocks (rock_1a, rock_1b), bushes (bush_1a, bush_2a), and grass tufts (grass_1a, grass_1b) with noise affinity gating; perimeter boundary rock clusters at N/E/S/W compass points
- **Server-side resource clustering**: Initial resources spawned in geographic biome zones matching client coordinate space; Forest NW (wood/fiber/food), Quarry NE (stone/sand/coal), Mine SW (metal_ore/coal/gems), Plains SE (hide/food/fiber), sparse Center (gems/metal_ore/wood)
- **`GROUND_SIZE` alignment**: Updated to 100 to match server coordinate space (0–100)

### Key Files
- `src/lib/three-utils.ts` (`createEarthTexture`)
- `src/lib/colony-scene.ts` (`buildStaticGeometry`, `scatterEnvironment`)
- `server/src/lib.rs` (biome zone resource spawning)

---

## Project Statistics

- **Total Components Created**: 40+
- **Lines of Rust Server Code**: ~2,400+
- **Unit Tests**: 24 passing (Colony Builder only — no Vote Exchange tests)
- **E2E Test Files**: 9 Playwright spec files (~120 test cases across 5 simulation scenarios)
- **Backend Reducers**: 40+
- **Database Tables**: 6 Vote Exchange + 3 chat + 4 social + Colony Builder tables + UnitStats/UnitSkills
- **Sound Effects**: 13
- **Animation Utilities**: 7
- **Bot Simulation**: Full player simulation (wandering, harvesting, trading, side bets)

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
