# Implementation Status

Maps each section of the design documents to its actual implementation status. This is the source of truth for what exists in the codebase vs. what is aspirational.

**Legend**: Implemented | Partial | Not Started | N/A (not applicable to digital version)

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
| Side-bets | Spectator/eliminated betting | Not Started | |

---

## shared-systems.md -- Currency & Multi-Timeframe

| Section | Feature | Status | Notes |
|---------|---------|--------|-------|
| Currency | Empty Marbles (MT) stable currency | Not Started | Uses generic `wallet_balance: f64` |
| Currency | Essence Marbles (MBLS) crypto | Not Started | |
| Currency | Fixed exchange rates | Not Started | |
| Markets | Resource markets tied to Vote Exchange | Not Started | |
| Markets | Markets close when Vote Exchange ends | Not Started | |
| Multi-Timeframe | Server hierarchy tree | Not Started | |
| Multi-Timeframe | City server (1-month period) | Not Started | |
| Multi-Timeframe | Expedition server (1-minute period) | Not Started | |
| Multi-Timeframe | Resource transfer between servers | Not Started | |
| Termination | Parent-child game relationships | Not Started | |
| Termination | Eternal Format | Not Started | |

---

## rules-colony-builder.md -- MMO/Colony Builder

| Section | Feature | Status | Notes |
|---------|---------|--------|-------|
| Core | Laborer assignment to tasks | Partial | Units exist on `/canvas` route with task system |
| Core | Building construction | Partial | Storage buildings implemented |
| Core | Resource gathering | Partial | Basic gather mechanic works |
| Core | Crafting system | Partial | Recipes and crafting exist in prototype |
| Integration | Laborers as voters | Not Started | No connection between units and votes |
| Integration | Majority laborers enter Battle Arena | Not Started | |
| Integration | Market access requires Vote Exchange | Not Started | |
| Combat | Battle Arena | Not Started | |
| Combat | Team-based automated combat | Not Started | |
| Combat | Equipment durability | Not Started | |
| Resources | Primary resources (wood, stone, ore...) | Partial | Basic resource nodes exist |
| Resources | Secondary resources (lumber, ingots...) | Not Started | |
| Resources | Tertiary products (armor, weapons...) | Not Started | |
| Equipment | Item modifiers/tiers | Not Started | |
| Equipment | Weapons and armor types | Not Started | |
| Buildings | Dormitories, farms, refineries | Not Started | Only storage buildings |
| Laborers | Genetics and lineage system | Not Started | |
| Laborers | Stats (combat, gathering, crafting) | Partial | Basic stat fields on unit type |
| Automation | Bot/automation systems | Not Started | |
| Setting | Medieval fantasy art style | Not Started | Basic colored shapes only |

---

## monetization.md -- Revenue & SaaS

| Section | Feature | Status | Notes |
|---------|---------|--------|-------|
| Revenue | Game entry fees | Not Started | Buy-in exists but uses play currency |
| Revenue | Transaction fees (~1%) | Implemented | `TRANSACTION_FEE_RATE` constant, fees added to pot |
| Revenue | Cash-out system | Not Started | |
| Revenue | Skins/cosmetics | Not Started | |
| Revenue | Tournament entry fees | Not Started | |
| Revenue | Side-betting platform | Not Started | |
| SaaS | Chat-based API platform | Not Started | |
| SaaS | Twitch/Discord/YouTube integration | Not Started | |
| SaaS | Subscription tiers | Not Started | |
| Currency | MT stablecoin | Not Started | |
| Currency | MBLS cryptocurrency | Not Started | |
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
| EV Display | Show expected values to players | Not Started | |
| Strategy Info | Probability/odds display in UI | Not Started | |
| Balance | Guarantee pricing guidance | Not Started | |

---

## QA Testing Outline (qa-testing-outline.md)

Summary of testability based on current implementation:

| Priority | Area | Test Cases | Actually Testable | Notes |
|----------|------|------------|-------------------|-------|
| P1 | Core Voting | VG-001 to VG-062 | ~85% | Trade offers, guarantee tracking, and transaction history now implemented |
| P2 | Chat | CH-001 to CH-021 | ~90% | Most chat features work |
| P3 | Social | SO-001 to SO-034 | ~85% | Friend/DM/block system works |
| P4 | Game Mgmt & UI | UI-001 to UI-031 | ~70% | Replay viewer, round history may not be functional |
| P5 | Leaderboard & Profiles | LB-001 to PR-004 | ~40% | Filtering broken, name editing broken, achievements unclear |
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
| Spectator mode | Not Started | |
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
| ColonyViewport component | Implemented | Low-poly 3D with spring physics, selection, drag-to-move |
| Full-screen viewport layout | Implemented | 3D viewport fills screen, UI overlays as glassmorphism HUD |
| Collapsible HUD panels | Implemented | Players (left), Market (right), Votes (bottom center) |
| Shared test-id contract | Implemented | `src/lib/test-ids.ts` — constants shared between UI and E2E tests |
| DRY E2E test helpers | Implemented | Page objects + game flow helpers eliminate raw selectors |

---

**Last Updated**: February 26, 2026
