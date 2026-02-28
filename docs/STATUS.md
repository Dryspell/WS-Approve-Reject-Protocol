# Implementation Status

Maps each section of the design documents to its actual implementation status. This is the source of truth for what exists in the codebase vs. what is aspirational.

**Legend**: Implemented | Partial | Not Started | N/A (not applicable to digital version)

---

## Complete Feature Roadmap (Phases A–K + L–Q)

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| A | Laborer-Vote Unification | COMPLETE | `vote_id` on Unit, units linked to votes |
| B | Functional Buildings | COMPLETE | 16 building types, construction, assignment, taxation |
| C | Resource Refinement Pipeline | COMPLETE | `game_tick` processes building production |
| D | Equipment System | COMPLETE | `equip_item`/`unequip_item` apply stat bonuses via `recalculate_unit_stats`; `craft_equipment` consumes tiered materials |
| E | Battle Arena | COMPLETE | `create_battle_arena` reducer snapshots unit stats; BattleArenaViewport wired; auto-chess combat loop |
| F | Laborer Genetics | COMPLETE | Initial units get LaborerGenetics records; breeding works |
| G | Vote Mechanics Polish | COMPLETE | SideBet economics backed by pot; payouts from pot_size |
| H | Multi-Timeframe Server Hierarchy | COMPLETE | ServerNode table, transfer reducers |
| I | Dual Currency | COMPLETE | PlayerCurrency table with MT + MBLS |
| J | Platform Features | COMPLETE | Tournament, Spectator tables |
| K | Technical Debt | COMPLETE | Dead code removal, docs update, cleanup |
| L | Integration Gap Fixes | COMPLETE | Stat application, craft costs, battle creation, side bet economics, equipment cleanup, tax bugfix, UI wiring, initial genetics, vote sale unification |
| M | UI/UX Fix Pass | COMPLETE | 24 issues: P0 bugs, P1 UX, P3 polish |
| N | Match History & Chat Bubbles | COMPLETE | In-game event feed, post-game log, 3D speech bubbles |
| O | Bot Full Simulation Expansion | COMPLETE | Wandering, laborer harvesting, market activity, side bets |
| P | Minion Resource & Combat Mechanics | COMPLETE | Per-skill XP, evacuation, auto-chess, combat toggle |
| Q | Terrain Procedural Generation | COMPLETE | Height displacement, biome texturing, environment scattering |

### UI Components (Complete)

- `BuildingPanel.tsx`
- `EquipmentPanel.tsx`
- `BattleArenaViewport.tsx`
- `GeneticsPanel.tsx`
- `SideBetPanel.tsx`
- `EVCalculator.tsx`
- `TournamentPanel.tsx`
- `MatchHistoryPanel.tsx`
- `EventFeedPanel.tsx`

---

## rules.md -- Core Vote Exchange Protocol

| Section | Feature | Status | Notes |
|---------|---------|--------|-------|
| Gameplay | Binary choice (red/blue) | Implemented | |
| Gameplay | Timer-based rounds | Implemented | Client-side interval triggers `processRoundVotes` |
| Gameplay | Minority wins, majority eliminated | Implemented | |
| Gameplay | Game ends at 1-2 players | Implemented | |
| Gameplay | Tie = game ends, pot split proportionally | Implemented | Confirmed as intended behavior |
| Gameplay | Game-start countdown overlay | Implemented | 3-second client-side countdown when all players ready |
| Gameplay | Live vote tally on drop zones | Implemented | Per-color count shown below each drop zone |
| Players | 3 to Unlimited | Implemented | Min/max configurable per room via `min_players`/`max_players` |
| Vote Trading | Buy/sell votes | Implemented | Flat-price listings only |
| Vote Trading | Trade offers (negotiation) | Implemented | Trade offer system in ChatPanel with accept/decline |
| Vote Splitting | Split votes across colors | Partial | UI exists; server doesn't validate per-player split semantics |
| Guarantees | Public guarantees (one buyer) | Implemented | |
| Guarantees | Private guarantees (multiple buyers) | Implemented | |
| Guarantees | Per-vote enforcement | Implemented | Each guarantee locks a specific vote; server enforces color |
| Guarantees | Duplicate purchase prevention | Implemented | Server + UI prevent same buyer purchasing same guarantee twice |
| Guarantees | Honor/break tracking | Implemented | `process_round_votes` records outcome; shown in EliminationModal |
| Wallet | Player wallet for trading | Implemented | |
| Wallet | Wallet limits/caps | Not Started | rules.md discusses spending limits |
| Bank | Separate bank account | Implemented | |
| Buy-In | Initial buy-in system | Implemented | |
| Buy-In | Post-elimination re-buy | Implemented | 3x cost, 80% to pot; controllable per room via `allow_rebuy` |
| Pot | Pot from buy-ins | Implemented | |
| Pot | Per-round partial distribution | Not Started | Only final distribution exists |
| Pot | Transaction fee contributions | Implemented | 1% fee on vote sales, guarantee purchases, and trade offers |
| Side-bets | Spectator/eliminated betting | Implemented | SideBet table, SideBetPanel UI; accessible to all players |
| Settings | Configurable round duration | Implemented | Via presets or custom |
| Settings | Configurable buy-in amount | Implemented | Via presets or custom |
| Settings | Variable starting votes per player | Implemented | Per-room `votes_per_player` field (default 5) |
| Settings | Allow/disallow re-buy per room | Implemented | Per-room `allow_rebuy` boolean |
| Settings | Allow/disallow mid-game join per room | Implemented | Per-room `allow_midgame_join` boolean |
| Settings | Configurable min/max players per room | Implemented | Per-room `min_players` and `max_players` fields |
| Settings | `combat_enabled` toggle | Implemented | Disables Battle Arena for development/testing; majority eliminated without combat |
| Settings | Vote-on-voting trigger | Not Started | |
| UI | Market panel open by default | Implemented | `marketOpen` initialises to `true` |
| UI | Labeled panel buttons | Implemented | Build, Equip, Gene, EV, Tourney, Bet (icon + text) |
| UI | Leave confirmation | Implemented | Inline card (not modal) with forfeit warning |
| UI | In-game navigation links | Implemented | Ranks, Profile, Home in top bar |
| UI | Admin panel gated to dev | Implemented | `isDev()` guard |
| UI | Tie tiebreaker message | Implemented | EliminationModal shows "Tie — Red eliminated by tiebreaker" |

---

## shared-systems.md -- Currency & Multi-Timeframe

| Section | Feature | Status | Notes |
|---------|---------|--------|-------|
| Currency | Empty Marbles (MT) stable currency | Implemented | PlayerCurrency table |
| Currency | Essence Marbles (MBLS) crypto | Implemented | PlayerCurrency table |
| Currency | Fixed exchange rates | Implemented | |
| Markets | Resource markets tied to Vote Exchange Protocol | Partial | Basic structure |
| Markets | Markets close when Vote Exchange Protocol ends | Partial | |
| Multi-Timeframe | Server hierarchy tree | Implemented | ServerNode table |
| Multi-Timeframe | City server (1-month period) | Implemented | |
| Multi-Timeframe | Expedition server (1-minute period) | Implemented | |
| Multi-Timeframe | Resource transfer between servers | Implemented | Transfer reducers |
| Termination | Parent-child game relationships | Partial | |
| Termination | Eternal Format | Partial | |

---

## rules-colony-builder.md -- MMO/Colony Builder

| Section | Feature | Status | Notes |
|---------|---------|--------|-------|
| Core | Laborer assignment to tasks | Implemented | Units with vote_id, task system; UI for resource assignment |
| Core | Building construction | Implemented | 16 building types, BuildingPanel |
| Core | Resource gathering | Implemented | Resource refinement pipeline |
| Core | Crafting system | Implemented | Craft/equip/unequip reducers; consumes building inventory |
| Integration | Laborers as voters | Implemented | `vote_id` on Unit, units linked to votes |
| Integration | Majority laborers enter Battle Arena | Implemented | BattleArena, BattleUnit tables; auto-chess combat |
| Integration | Market access requires Vote Exchange Protocol | Partial | |
| Integration | Minion evacuation before voting | Implemented | Unvoted/un-promised minions can be withdrawn to safety |
| Combat | Battle Arena | Implemented | BattleArenaViewport, turn-based automated combat |
| Combat | Team-based automated combat (auto-chess) | Implemented | Automated turn resolution using unit stats + equipment |
| Combat | `combat_enabled` room flag | Implemented | Development toggle; disables Battle Arena when off |
| Combat | Equipment durability | Implemented | Equipment system |
| Resources | Primary resources (wood, stone, ore...) | Implemented | game_tick processes production; biome zone clustering |
| Resources | Secondary resources (lumber, ingots...) | Implemented | Refinement pipeline |
| Resources | Tertiary products (armor, weapons...) | Implemented | Equipment crafting |
| Equipment | Item modifiers/tiers | Implemented | Equipment table, EquipmentPanel |
| Equipment | Weapons and armor types | Implemented | craft/equip/unequip reducers |
| Buildings | Dormitories, farms, refineries | Implemented | 16 building types, taxation |
| Laborers | Genetics and lineage system | Implemented | LaborerGenetics (6 IVs), breeding, GeneticsPanel |
| Laborers | Stats (combat, gathering, crafting) | Implemented | Stat fields on unit type; recalculated on equip/unequip |
| Laborers | Per-skill XP (level cap 5) | Implemented | Woodcutting, Mining, Quarrying, Hunting, Farming, Crafting, Combat |
| Automation | Bot simulation | Implemented | `scripts/bot-runner.ts` — full simulation with wandering, harvesting, market, side bets |
| Automation | Player automation / task queuing | Partial | `UnitTaskQueue` move/gather; craft/upgrade tasks not yet processed |
| Setting | Medieval fantasy art style | Partial | KayKit 3D models; procedural terrain |

---

## Match History & Event Feed

| Feature | Status | Notes |
|---------|--------|-------|
| In-game event feed | Implemented | Scrollable activity log in HUD; shows trades, harvests, purchases, eliminations, votes in real time |
| Post-game match history | Implemented | Full chronological event log accessible from Game Over modal and player profile |
| Event types tracked | Implemented | Vote cast, trade executed, resource harvested, item crafted, elimination, side bet placed, laborer spawned |

---

## Chat & Communication

| Feature | Status | Notes |
|---------|--------|-------|
| In-game chat panel | Implemented | ChatPanel in HUD (sole interface during gameplay) |
| Global ChatOverlay | Implemented | Suppressed on `/vote`; available on all other routes |
| Speech bubbles (3D) | Implemented | Billboard mesh rendered above avatar for 4 seconds on new message |
| Bot chat bubbles | Implemented | Bot `send_chat` calls render as speech bubbles in viewport |
| Trade offer UI | Implemented | Chat-based accept/decline for trade negotiations |

---

## Terrain & Environment

| Feature | Status | Notes |
|---------|--------|-------|
| Terrain height displacement | Implemented | Simplex-noise multi-octave; center flat (gameplay area), edges undulate (max ~3 units) |
| Biome texture zones | Implemented | Noise-driven lush grass → earthy grass → packed dirt → sandy dust → rocky stone |
| Fine surface details | Implemented | Pixel-level grain noise, scattered pebble dots |
| Worn dirt paths | Implemented | 8 quadratic-curve paths radiating from center toward edges |
| Water feature (pond) | Implemented | Semi-transparent reflective `MeshStandardMaterial` near NW edge; point light above |
| Environment prop scattering | Implemented | Rocks, bushes, grass tufts placed with noise affinity gating |
| Perimeter boundary rocks | Implemented | Tight clusters at N/S/E/W compass points to frame map edges |
| Server resource clustering | Implemented | Biome zone assignments: Forest NW, Quarry NE, Mine SW, Plains SE, sparse Center |
| Ground size alignment | Implemented | `GROUND_SIZE = 100` matches server coordinate space (0–100) |

---

## monetization.md -- Revenue & SaaS

| Section | Feature | Status | Notes |
|---------|---------|--------|-------|
| Revenue | Game entry fees | Not Started | Buy-in exists but uses play currency |
| Revenue | Transaction fees (~1%) | Implemented | `TRANSACTION_FEE_RATE` constant, fees added to pot |
| Revenue | Cash-out system | Not Started | |
| Revenue | Skins/cosmetics | Not Started | |
| Revenue | Tournament entry fees | Implemented | Tournament table, TournamentPanel |
| Revenue | Side-betting platform | Implemented | SideBet table, SideBetPanel |
| SaaS | Chat-based API platform | Not Started | |
| SaaS | Twitch/Discord/YouTube integration | Not Started | |
| SaaS | Subscription tiers | Not Started | |
| Currency | MT stablecoin | Implemented | PlayerCurrency table |
| Currency | MBLS cryptocurrency | Implemented | PlayerCurrency table |
| Currency | Blockchain integration | Not Started | |
| Pricing | Base game purchase | Not Started | |
| Pricing | Premium subscription | Not Started | |
| Pricing | SaaS tier pricing | Not Started | |
| Legal | KYC/AML compliance | Not Started | |
| Legal | Geographic restrictions | Not Started | |
| Legal | Age verification | Not Started | |

---

## mathematical-analysis.md

| Section | Feature | Status | Notes |
|---------|---------|--------|-------|
| EV Display | Show expected values to players | Implemented | EVCalculator component |
| Strategy Info | Probability/odds display in UI | Implemented | EVCalculator |
| Balance | Guarantee pricing guidance | Partial | |

---

## QA Testing Outline (qa-testing-outline.md)

Summary of testability based on current implementation:

| Priority | Area | Test Cases | Actually Testable | Notes |
|----------|------|------------|-------------------|-------|
| P1 | Core Voting | VG-001 to VG-062 | ~90% | All core features implemented including tally, countdown, tie message |
| P2 | Chat | CH-001 to CH-021 | ~95% | Chat bubbles, trade offers, ChatPanel all implemented |
| P3 | Social | SO-001 to SO-034 | ~85% | Friend/DM/block system works |
| P4 | Game Mgmt & UI | UI-001 to UI-031 | ~80% | Event feed, post-game history, match log implemented |
| P5 | Leaderboard & Profiles | LB-001 to PR-004 | ~80% | Reactive data loading, truncated ID, copy-to-clipboard |
| P6 | Edge Cases | EC-001 to EC-022 | ~65% | Leave room, disconnect handling, evacuation implemented |
| P7 | Performance | PF-001 to PF-022 | ~50% | Position throttle added; server-side rate limiting pending |

---

## Social Features (across docs)

| Feature | Status | Notes |
|---------|--------|-------|
| Friend requests | Implemented | Send, accept, reject, cancel |
| Friends list with online status | Implemented | |
| Remove friend | Implemented | |
| Direct messages | Implemented | Conversation-based |
| Unread message tracking | Implemented | |
| User blocking | Implemented | Auto-removes friendship, cancels pending requests |
| Clan/guild system | Not Started | |
| Spectator mode | Implemented | Spectator table |
| Bot players | Implemented | `scripts/bot-runner.ts` — full simulation |

---

## Infrastructure & Deployment

| Feature | Status | Notes |
|---------|--------|-------|
| SpacetimeDB 2.0 integration | Implemented | Migrated Feb 2026 |
| TypeScript auto-generated bindings | Implemented | |
| Local development setup | Implemented | `spacetime start` + `pnpm dev` |
| Bot simulation runner | Implemented | `pnpm bots` starts `scripts/bot-runner.ts` |
| Cloud deployment (SpacetimeDB testnet) | Documented | Not verified recently |
| Docker deployment | Documented | Not verified recently |
| Fly.io deployment | Documented | `fly.toml` exists |
| Backup scripts | Documented | Referenced but not verified |
| Monitoring/alerting | Not Started | |

---

## 3D Viewport & HUD System

| Feature | Status | Notes |
|---------|---------|-------|
| Three.js spike evaluation | Implemented | Compared Canvas, Three.js, Pixi.js; committed to Three.js |
| ColonyViewport component | Implemented | KayKit character models (GLB), spring physics, selection, drag-to-move |
| Full-screen viewport layout | Implemented | 3D viewport fills screen, UI overlays as glassmorphism HUD |
| Collapsible HUD panels | Implemented | Players (left), Market (right, open by default), Votes (bottom center) |
| KayKit asset integration | Implemented | Adventurers (6 characters), Dungeon (structures), ResourceBits (resource nodes) |
| Asset loader with caching | Implemented | GLTFLoader + SkeletonUtils.clone, LoadingManager, progress tracking, CDN-ready |
| Character animations | Implemented | Idle/walk transitions, animation mixer per unit, shared animation rig |
| Team-color indicators | Implemented | Colored ring at feet, red/blue team banners in environment |
| Server-driven units | Implemented | Unit table data drives viewport; fallback to vote-derived units |
| Server-driven resources | Implemented | Resource table maps to KayKit ResourceBits models |
| Unit Context Panel | Implemented | Stats, inventory, tasks, vote color on unit selection |
| Health bars | Implemented | Billboard health bars above units from UnitStats |
| Loading progress overlay | Implemented | Shows asset loading progress with animated bar |
| Speech bubbles | Implemented | Billboard text mesh above avatar on chat; 4-second fade |
| Procedural terrain | Implemented | Simplex-noise displacement, biome texturing, pond, prop scattering |
| Shared test-id contract | Implemented | `src/lib/test-ids.ts` — constants shared between UI and E2E tests |
| DRY E2E test helpers | Implemented | Page objects + game flow helpers eliminate raw selectors |
| Equipment system | Implemented | Equipment table, EquipmentPanel, craft/equip/unequip reducers |
| Building types | Implemented | 16 building types, BuildingPanel |
| Task animations | Partial | Walk/idle transitions work; gather/craft animations not yet connected |

---

## Site Structure & Navigation

| Feature | Status | Notes |
|---------|--------|-------|
| Dark-themed landing page | Implemented | Hero, How It Works, Features, CTA sections |
| Guest play flow | Implemented | GuestNamePrompt modal, auto-generated guest names |
| Guest name prompt on direct /vote nav | Implemented | Shown when name is empty after subscription |
| Restyled Nav | Implemented | Dark theme, Play/Ranks/Profile links |
| In-game navigation links | Implemented | Ranks, Profile, Home icon links in top bar during gameplay |
| Chat overlay (Messenger-style) | Implemented | Floating panel with friends, DMs, chat rooms, notification badges |
| Global chat availability | Implemented | ChatOverlay mounted in AppShell; suppressed on `/vote` routes |

---

**Last Updated**: February 26, 2026
