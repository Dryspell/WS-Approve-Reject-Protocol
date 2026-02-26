# Implementation Status

Maps each section of the design documents to its actual implementation status. This is the source of truth for what exists in the codebase vs. what is aspirational.

**Legend**: Implemented | Partial | Not Started | N/A (not applicable to digital version)

---

## Complete Feature Roadmap (Phases A–K)

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| A | Laborer-Vote Unification | COMPLETE | `vote_id` on Unit, units linked to votes |
| B | Functional Buildings | COMPLETE | 16 building types, construction, assignment, taxation |
| C | Resource Refinement Pipeline | COMPLETE | `game_tick` processes building production |
| D | Equipment System | COMPLETE | `equip_item`/`unequip_item` apply stat bonuses via `recalculate_unit_stats`; `craft_equipment` consumes tiered materials |
| E | Battle Arena | COMPLETE | `create_battle_arena` reducer snapshots unit stats; BattleArenaViewport wired |
| F | Laborer Genetics | COMPLETE | Initial units get LaborerGenetics records; breeding works |
| G | Vote Mechanics Polish | COMPLETE | SideBet economics backed by pot; payouts from pot_size |
| H | Multi-Timeframe Server Hierarchy | COMPLETE | ServerNode table, transfer reducers |
| I | Dual Currency | COMPLETE | PlayerCurrency table with MT + MBLS |
| J | Platform Features | COMPLETE | Tournament, Spectator tables |
| K | Technical Debt | COMPLETE | Dead code removal, docs update, cleanup |
| L | Integration Gap Fixes | COMPLETE | All 10 phases: stat application, craft costs, battle creation, side bet economics, equipment cleanup, tax bugfix, UI wiring, initial genetics, vote sale unification |

### New UI Components

- `BuildingPanel.tsx`
- `EquipmentPanel.tsx`
- `BattleArenaViewport.tsx`
- `GeneticsPanel.tsx`
- `SideBetPanel.tsx`
- `EVCalculator.tsx`
- `TournamentPanel.tsx`

---

## rules.md -- Core Vote Exchange

| Section | Feature | Status | Notes |
|---------|---------|--------|-------|
| Gameplay | Binary choice (red/blue) | Implemented | |
| Gameplay | Timer-based rounds | Implemented | Client-side interval triggers `processRoundVotes` |
| Gameplay | Minority wins, majority eliminated | Implemented | |
| Gameplay | Game ends at 1-2 players | Implemented | |
| Gameplay | Tie = game ends, pot split proportionally | Implemented | Confirmed as intended behavior |
| Players | 3 to Unlimited | Implemented | Min/max configurable per room via `min_players`/`max_players` |
| Vote Trading | Buy/sell votes | Implemented | Flat-price listings only |
| Vote Trading | Trade offers (negotiation) | Implemented | Trade offer system in ChatPanel with accept/decline |
| Vote Splitting | Split votes across colors | Partial | UI exists; server doesn't validate per-player split semantics |
| Guarantees | Public guarantees (one buyer) | Implemented | |
| Guarantees | Private guarantees (multiple buyers) | Implemented | |
| Guarantees | Per-vote enforcement | Implemented | Each guarantee locks a specific vote; server enforces color |
| Guarantees | Duplicate purchase prevention | Implemented | Server + UI prevent same buyer purchasing same guarantee twice |
| Wallet | Player wallet for trading | Implemented | |
| Wallet | Wallet limits/caps | Not Started | rules.md discusses spending limits |
| Bank | Separate bank account | Implemented | |
| Buy-In | Initial buy-in system | Implemented | |
| Buy-In | Post-elimination re-buy | Implemented | 3x cost, 80% to pot; controllable per room via `allow_rebuy` |
| Pot | Pot from buy-ins | Implemented | |
| Pot | Per-round partial distribution | Not Started | Only final distribution exists |
| Pot | Transaction fee contributions | Implemented | 1% fee on vote sales, guarantee purchases, and trade offers |
| Settings | Configurable round duration | Implemented | Via presets or custom |
| Settings | Configurable buy-in amount | Implemented | Via presets or custom |
| Settings | Variable starting votes per player | Implemented | Per-room `votes_per_player` field (default 5) |
| Settings | Allow/disallow re-buy per room | Implemented | Per-room `allow_rebuy` boolean |
| Settings | Allow/disallow mid-game join per room | Implemented | Per-room `allow_midgame_join` boolean |
| Settings | Configurable min/max players per room | Implemented | Per-room `min_players` and `max_players` fields |
| Settings | Vote-on-voting trigger | Not Started | |
| Side-bets | Spectator/eliminated betting | Implemented | SideBet table, SideBetPanel UI |

---

## shared-systems.md -- Currency & Multi-Timeframe

| Section | Feature | Status | Notes |
|---------|---------|--------|-------|
| Currency | Empty Marbles (MT) stable currency | Implemented | PlayerCurrency table |
| Currency | Essence Marbles (MBLS) crypto | Implemented | PlayerCurrency table |
| Currency | Fixed exchange rates | Implemented | |
| Markets | Resource markets tied to Vote Exchange | Partial | Basic structure |
| Markets | Markets close when Vote Exchange ends | Partial | |
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
| Core | Laborer assignment to tasks | Implemented | Units with vote_id, task system |
| Core | Building construction | Implemented | 16 building types, BuildingPanel |
| Core | Resource gathering | Implemented | Resource refinement pipeline |
| Core | Crafting system | Implemented | Craft/equip/unequip reducers |
| Integration | Laborers as voters | Implemented | vote_id on Unit, units linked to votes |
| Integration | Majority laborers enter Battle Arena | Implemented | BattleArena, BattleUnit tables |
| Integration | Market access requires Vote Exchange | Partial | |
| Combat | Battle Arena | Implemented | BattleArenaViewport, turn-based combat |
| Combat | Team-based automated combat | Implemented | BattleUnit |
| Combat | Equipment durability | Implemented | Equipment system |
| Resources | Primary resources (wood, stone, ore...) | Implemented | game_tick processes production |
| Resources | Secondary resources (lumber, ingots...) | Implemented | Refinement pipeline |
| Resources | Tertiary products (armor, weapons...) | Implemented | Equipment crafting |
| Equipment | Item modifiers/tiers | Implemented | Equipment table, EquipmentPanel |
| Equipment | Weapons and armor types | Implemented | craft/equip/unequip reducers |
| Buildings | Dormitories, farms, refineries | Implemented | 16 building types, taxation |
| Laborers | Genetics and lineage system | Implemented | LaborerGenetics (6 IVs), breeding, GeneticsPanel |
| Laborers | Stats (combat, gathering, crafting) | Implemented | Stat fields on unit type |
| Automation | Bot/automation systems | Not Started | |
| Setting | Medieval fantasy art style | Partial | Basic colored shapes; 3D models exist |

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
| Currency | Public exchange listing | Not Started | |
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
| P1 | Core Voting | VG-001 to VG-062 | ~85% | Trade offers, guarantee tracking, and transaction history now implemented |
| P2 | Chat | CH-001 to CH-021 | ~90% | Most chat features work |
| P3 | Social | SO-001 to SO-034 | ~85% | Friend/DM/block system works |
| P4 | Game Mgmt & UI | UI-001 to UI-031 | ~70% | Replay viewer, round history may not be functional |
| P5 | Leaderboard & Profiles | LB-001 to PR-004 | ~70% | Filtering works; name editing works; achievements unclear |
| P6 | Edge Cases | EC-001 to EC-022 | ~60% | Leave room implemented (reducer + UI button). Disconnect handling improved. |
| P7 | Performance | PF-001 to PF-022 | ~50% | Basic load testing possible |

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
| Bot players | Not Started | |

---

## Infrastructure & Deployment

| Feature | Status | Notes |
|---------|--------|-------|
| SpacetimeDB 2.0 integration | Implemented | Migrated Feb 2026 |
| TypeScript auto-generated bindings | Implemented | |
| Local development setup | Implemented | `spacetime start` + `pnpm dev` |
| Cloud deployment (SpacetimeDB testnet) | Documented | Not verified recently |
| Docker deployment | Documented | Not verified recently |
| Fly.io deployment | Documented | `fly.toml` exists |
| Backup scripts | Documented | Referenced but not verified |
| Monitoring/alerting | Not Started | |

---

## 3D Viewport & HUD System

| Feature | Status | Notes |
|---------|--------|-------|
| Three.js spike evaluation | Implemented | Compared Canvas, Three.js, Pixi.js; committed to Three.js |
| ColonyViewport component | Implemented | KayKit character models (GLB), spring physics, selection, drag-to-move |
| Full-screen viewport layout | Implemented | 3D viewport fills screen, UI overlays as glassmorphism HUD |
| Collapsible HUD panels | Implemented | Players (left), Market (right), Votes (bottom center) |
| KayKit asset integration | Implemented | Adventurers (6 characters), Dungeon (structures), ResourceBits (resource nodes) |
| Asset loader with caching | Implemented | GLTFLoader + SkeletonUtils.clone, LoadingManager, progress tracking, CDN-ready |
| Character animations | Implemented | Idle/walk transitions, animation mixer per unit, shared animation rig |
| Team-color indicators | Implemented | Colored ring at feet, red/blue team banners in environment |
| Server-driven units | Implemented | Unit table data drives viewport; fallback to vote-derived units |
| Server-driven resources | Implemented | Resource table maps to KayKit ResourceBits models |
| Unit Context Panel | Implemented | Stats, inventory, tasks, vote color on unit selection |
| Health bars | Implemented | Billboard health bars above units from UnitStats |
| Loading progress overlay | Implemented | Shows asset loading progress with animated bar |
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
| Restyled Nav | Implemented | Dark theme, Play/Ranks/Profile links, no Chat/Social |
| Chat overlay (Messenger-style) | Implemented | Floating panel with friends, DMs, chat rooms, notification badges |
| Global chat availability | Implemented | ChatOverlay mounted in AppShell, works on all pages |

---

**Last Updated**: February 26, 2026
