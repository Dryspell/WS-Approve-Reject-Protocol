# Implementation Status

Maps each section of the design documents to its actual implementation status. This is the source of truth for what exists in the codebase vs. what is aspirational.

**Live game (August 2026):** Vote Exchange Protocol + a narrow expedition colony loop. One camp, 3 actions per minion per round, harvest / refine / craft-and-equip (hatchet, spear, vest), majority melee, send-home + lobby roster (gear travels with the veteran), guest recovery code + username/passphrase bind.

**Parked:** The 16-building catalog, `game_tick` production, genetics breeding HUD, EV/tournament HUD, parent-server tree, dual-currency / MBLS, clans, monetization. Reducers and tables may still exist; they are not the `/vote` game.

**Legend**: Implemented | Partial | Parked | Not Started | N/A (not applicable to digital version)

---

## Live loop vs parked phases (A–Q)

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| A | Laborer-Vote Unification | LIVE | Each minion is a vote (`vote_id` on Unit) |
| B | Functional Buildings | PARKED | 16-type Build catalog hidden from HUD. Live building is one camp via `found_camp` |
| C | Resource Refinement Pipeline | PARKED / LIVE | `game_tick` building production is parked. Live refine is `refine_at_camp` (2 raw → 1 processed) |
| D | Equipment System | LIVE | Camp `craft_and_equip` + Equip panel swap. Spear/vest feed arena stats; hatchet adds harvest. Gear persists on `OwnedEquipment` |
| E | Battle Arena | LIVE | Majority minions fight on a hex board; survivors extract unless the match is ending |
| F | Laborer Genetics | PARKED | Default IVs still spawn; breeding HUD is hidden |
| G | Vote Mechanics Polish | LIVE | Guarantees lock and cannot be sold; cancel unsold; refund if seller leaves; side bets remain |
| H | Multi-Timeframe Server Hierarchy | PARKED | ServerNode / transfer reducers exist; not the live loop |
| I | Dual Currency | PARKED | PlayerCurrency table exists; play uses wallet + buy-in |
| J | Platform Features | PARKED | Tournament HUD hidden; Spectator table remains |
| K–N | Debt / UX / match history | LIVE | Chat, event feed, Game Over, lobby restore |
| O | Bot simulation | LIVE | Bots vote, harvest, found camp, refine, craft, sit through `arena`; they do not buy extra laborers |
| P | Minion resource & combat | LIVE | 3 actions, skill double-chance, send-home, `combat_enabled` skips arena |
| Q | Terrain | LIVE | Procedural map; resource nodes clustered by biome |

### HUD (live)

- `EquipmentPanel.tsx` — swap hatchet/spear/vest
- `BattleArenaViewport.tsx`
- `SideBetPanel.tsx`
- `UnitContextPanel.tsx` — harvest, camp, refine, craft, send-home
- `RosterPicker.tsx` — next-lobby veterans + gear
- `AccountSaveCard.tsx` — recovery code + bind/restore

### HUD (parked; files remain)

- `BuildingPanel.tsx`, `GeneticsPanel.tsx`, `EVCalculator.tsx`, `TournamentPanel.tsx`

---

## rules.md -- Core Vote Exchange Protocol

| Section | Feature | Status | Notes |
|---------|---------|--------|-------|
| Gameplay | Binary choice (red/blue) | Implemented | |
| Gameplay | Timer-based rounds | Implemented | Server `RoundTimerEntry` is authoritative; HUD timer resets each round |
| Gameplay | Minority wins, majority eliminated | Implemented | Minority tickets carry forward. Unplaced tickets split evenly at lock. Majority minions fight in the arena; survivors return to the roster unless the match is ending. Sold-out hands stay in until end of round, then drop if still empty |
| Gameplay | Game ends at 1-2 players | Implemented | |
| Gameplay | Tie = game ends, pot split proportionally | Implemented | 0–0 is not a tie (timeframe restarts); UI shows pot-split, not a red tiebreaker |
| Gameplay | Game-start countdown overlay | Implemented | 3-second client-side countdown when all players ready |
| Gameplay | Live vote tally on drop zones | Implemented | Per-color count shown below each drop zone |
| Players | 3 to Unlimited | Implemented | Min/max configurable per room via `min_players`/`max_players` |
| Vote Trading | Buy/sell votes | Implemented | Flat-price listings only |
| Vote Trading | Trade offers (negotiation) | Implemented | Trade offer system in ChatPanel with accept/decline |
| Vote Splitting | Split votes across colors | Partial | UI exists; server doesn't validate per-player split semantics |
| Guarantees | Public guarantees (one buyer) | Implemented | Listing deactivates after first purchase |
| Guarantees | Private guarantees (multiple buyers) | Implemented | Stays listed; same buyer cannot buy twice |
| Guarantees | Per-vote enforcement | Implemented | Active or purchased guarantee locks color on `set_vote_color` / `set_unit_vote_color` and at tally |
| Guarantees | Duplicate purchase prevention | Implemented | Server + UI prevent same buyer purchasing same guarantee twice |
| Guarantees | Cancel / unlist unsold | Implemented | `cancel_guarantee` unlists unsold promises and drops the lock |
| Guarantees | Transfer with vote sale | Blocked | Guaranteed votes cannot be listed, transferred, or accepted in a trade |
| Guarantees | Refund if seller leaves | Implemented | `leave_room` refunds buyers, claws seller proceeds + pot fee |
| Guarantees | Honor/break (bluff) | N/A | Digital version forces the color; cannot break a purchased guarantee |
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
| Settings | `combat_enabled` toggle | Implemented | When off, majority minions extract without entering the arena |
| Settings | Vote-on-voting trigger | Implemented | Supermajority (2/3 of remaining players) calls `vote_end_round`; timer remains the backstop |
| UI | Market panel open by default | Implemented | `marketOpen` initialises to `true` |
| UI | Labeled panel buttons | Implemented | Live HUD: Equip, Bet. Build / Gene / EV / Tourney hidden (parked catalog) |
| UI | Leave confirmation | Implemented | Inline card (not modal) with forfeit warning |
| UI | In-game navigation links | Implemented | Ranks, Profile, Home in top bar |
| UI | Admin panel gated to dev | Implemented | `isDev()` guard |
| UI | Tie results copy | Implemented | EliminationModal and Game Over: pot splits by votes cast |

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
| Core | Building construction | Parked | 16-type catalog hidden. Live: one camp |
| Core | Resource gathering | Implemented | 3-action harvest; skill level is a (level−1)×10% chance to double yield (0–40%). Node still loses 1. |
| Core | Camp / refine / craft | Implemented | One camp per player (3 wood + 2 stone). Refine 2 raw → 1 processed (craft skill may double). Craft+equip hatchet/spear/vest. |
| Core | Send home | Implemented | Spends 1 action; bag → `PlayerStash`, minion → `OwnedLaborer`, equipped gear → `OwnedEquipment`. |
| Core | Roster / next lobby | Implemented | Winners' surviving minions + camp goods settle to the account. Lobby `RosterPicker` brings veterans up to `votes_per_player`; empty slots are recruits. Equipped gear travels with the veteran and is worn again on the next expedition. Sent-home veterans stay out of that expedition. Guest recovery code + username/passphrase bind on Game Over and lobby Restore save. |
| Core | Crafting system | Implemented | Craft/equip/unequip reducers; consumes building inventory |
| Integration | Laborers as voters | Implemented | `vote_id` on Unit, units linked to votes |
| Integration | Majority laborers enter Battle Arena | Implemented | BattleArena, BattleUnit tables; auto-chess combat |
| Integration | Market access requires Vote Exchange Protocol | Partial | |
| Integration | Minion evacuation before voting | Implemented | Unvoted/un-promised minions can be withdrawn to safety |
| Combat | Battle Arena | Implemented | BattleArenaViewport, turn-based automated combat |
| Combat | Team-based automated combat (auto-chess) | Implemented | Automated turn resolution using unit stats + equipment |
| Combat | Majority melee each round | Implemented | Each player's majority minions sit together on a hex board, spaced around the center. They walk toward the closest enemy player and attack when adjacent. Survivors return to the roster unless the match is ending. |
| Combat | Equipment durability | Implemented | Equipment system |
| Resources | Primary resources (wood, stone, ore...) | Implemented | Instant harvest from biome-clustered nodes. `game_tick` building production is parked |
| Resources | Secondary resources (lumber, ingots...) | Implemented | Refinement pipeline |
| Resources | Tertiary products (armor, weapons...) | Implemented | Equipment crafting |
| Equipment | Item modifiers/tiers | Partial | Live items are hatchet / spear / vest. Extra slots and mithril tiers are parked |
| Equipment | Weapons and armor types | Implemented | craft/equip/unequip reducers |
| Buildings | Dormitories, farms, refineries | Parked | Long-game catalog; not on the live HUD |
| Laborers | Genetics and lineage system | Parked | Default IVs still apply; breeding HUD hidden |
| Laborers | Stats (combat, gathering, crafting) | Implemented | Stat fields on unit type; recalculated on equip/unequip |
| Laborers | Per-skill XP (level cap 5) | Implemented | Woodcutting, Mining, Quarrying, Hunting, Farming, Crafting, Combat |
| Automation | Bot simulation | Implemented | `scripts/bot-runner.ts` — vote strategies, camp/refine/craft, harvest, cheap-vote buys; no extra `spawnLaborer` |
| Automation | Player automation / task queuing | Parked | Instant 3-action reducers replaced the queue. `UnitTaskQueue` craft/upgrade is unused |
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
| Revenue | Tournament entry fees | Parked | Tournament table remains; HUD hidden |
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
| EV Display | Show expected values to players | Parked | EVCalculator exists; removed from live HUD |
| Strategy Info | Probability/odds display in UI | Parked | EVCalculator hidden |
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
| Bot players | Implemented | `scripts/bot-runner.ts` — colony + vote AI for practice |

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
| Equipment system | Implemented | Equip panel swaps worn gear; camp crafts hatchet/spear/vest; gear persists on veterans |
| Building types | Parked | 16-type BuildingPanel hidden; live camp only |
| Task animations | Partial | Walk/idle transitions work; gather/craft animations not yet connected |

---

## Site Structure & Navigation

| Feature | Status | Notes |
|---------|--------|-------|
| Dark-themed landing page | Implemented | Hero, How It Works, Features, CTA sections |
| Guest play flow | Implemented | Display-name prompt. Game Over + lobby Restore save: recovery code, username/passphrase bind (`account_bind`) |
| Guest name prompt on direct /vote nav | Implemented | Shown when name is empty after subscription |
| Restyled Nav | Implemented | Dark theme, Play/Ranks/Profile links |
| In-game navigation links | Implemented | Ranks, Profile, Home icon links in top bar during gameplay |
| Chat overlay (Messenger-style) | Implemented | Floating panel with friends, DMs, chat rooms, notification badges |
| Global chat availability | Implemented | ChatOverlay mounted in AppShell; suppressed on `/vote` routes |

---

**Last Updated**: August 25, 2026
