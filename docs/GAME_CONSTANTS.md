# Game Constants

Game constants defined in `server/src/lib.rs`. These are now named constants at the top of the file for easy tuning.

---

## Player Defaults

| Constant | Value | Location | Notes |
|----------|-------|----------|-------|
| Starting wallet balance | `100.0` | `STARTING_WALLET` constant | Given to every new user on first connect |
| Starting bank account | `0.0` | `lib.rs` line ~745 | |
| Starting votes per player | `5` | `STARTING_VOTES_PER_PLAYER` constant (global default) | Overridden by per-room `votes_per_player` |
| Starting profit/loss | `0.0` | `lib.rs` line ~746 | Lifetime tracking |

## Game Room Defaults

Global constants serve as defaults; all are overridable per-room at creation time.

| Constant | Default | Location | Per-Room Field | Notes |
|----------|---------|----------|----------------|-------|
| Round duration | `300` seconds (5 min) | `DEFAULT_ROUND_DURATION` | `round_duration` | |
| Votes per player | `5` | `STARTING_VOTES_PER_PLAYER` | `votes_per_player` | |
| Minimum players to start | `3` | `MIN_PLAYERS_TO_START` | `min_players` | |
| Maximum players per room | None | - | `max_players` (Option) | No limit unless set |
| Allow re-buy | `true` | - | `allow_rebuy` | When false, eliminated players cannot re-enter |
| Allow mid-game join | `false` | - | `allow_midgame_join` | When false, new players cannot join an active game |
| Initial pot size | `0.0` | `lib.rs` line ~293 | - | Set to sum of buy-ins when game starts |
| Initial game status | `"lobby"` | `lib.rs` line ~295 | - | |
| Game start countdown | `5000` ms (5 sec) | `lib.rs` line ~425 | - | Delay after all players ready |
| Win condition | `<= 2` players remaining | `WIN_CONDITION_REMAINING` | - | Game ends when 1-2 survivors |

## Room Presets (Client-Side)

| Preset | Buy-in | Round | Votes | Re-buy | Mid-game Join | File |
|--------|--------|-------|-------|--------|---------------|------|
| Quick Game | `$5` | 2 min | 3 | Yes | No | `RoomPresets.tsx` |
| Standard Game | `$10` | 5 min | 5 | Yes | No | `RoomPresets.tsx` (recommended) |
| Strategic Game | `$20` | 10 min | 7 | Yes | No | `RoomPresets.tsx` |
| High Stakes | `$100` | 5 min | 5 | No | No | `RoomPresets.tsx` |
| Custom Game | user-defined | user-defined | user-defined | user-defined | user-defined | `RoomPresets.tsx` |

## Re-Buy System

| Constant | Value | Location | Notes |
|----------|-------|----------|-------|
| Re-buy cost multiplier | `3.0x` buy-in | `REBUY_MULTIPLIER` constant | |
| Pot contribution from re-buy | `80%` | `REBUY_POT_PERCENTAGE` constant | |
| House fee from re-buy | `20%` (implicit) | Derived from pot percentage | Not explicitly tracked; just not added to pot |

## Transaction Fees

| Constant | Value | Location | Notes |
|----------|-------|----------|-------|
| Transaction fee rate | `1%` | `TRANSACTION_FEE_RATE` constant | Applied to vote sales, guarantee purchases, and trade offers |
| Fee destination | Added to room pot | All trade reducers | Fee increases the pot for remaining players |
| Re-buy house fee | `20%` | `REBUY_POT_PERCENTAGE` (inverse) | 80% to pot, 20% retained |

## Vote Mechanics

| Constant | Value | Location | Notes |
|----------|-------|----------|-------|
| Valid vote colors | `"red"`, `"blue"` | `lib.rs` various | Hardcoded string comparison |
| Valid guarantee types | `"public"`, `"private"` | `lib.rs` line ~1089 | |
| Minimum sale price | `> 0` | `lib.rs` line ~1037 | Price must be positive |

## Colony Builder (Prototype -- `/canvas` route)

| Constant | Value | Location | Notes |
|----------|-------|----------|-------|
| Unit spawn area | `100 x 100` | `lib.rs` lines ~445-446 | Random position in this range |
| Unit dimensions | `20 x 20` | `lib.rs` line ~448 | |
| Storage building dimensions | `40 x 40` | `lib.rs` line ~1668 | |
| Resource initial amount | `100` | `lib.rs` line ~503 | |
| Resource max amount | `100` | `lib.rs` line ~504 | |
| Resource regeneration rate | `5` per tick | `lib.rs` line ~505 | |
| Depletion threshold | `20` | `lib.rs` line ~507 | |
| Regeneration cooldown | `10` ticks | `lib.rs` line ~1601 | |

## Wallet & Banking

| Constant | Value | Location | Notes |
|----------|-------|----------|-------|
| Wallet spending cap | None | - | **Not implemented** -- rules.md discusses limits |
| Minimum transfer amount | `> 0` | `lib.rs` `transfer_to_bank` / `withdraw_from_bank` | Must be positive |
| Maximum wallet balance | None | - | No upper limit |

## SpacetimeDB Connection

| Constant | Value | Location | Notes |
|----------|-------|----------|-------|
| Default host (local) | `ws://localhost:3000` | `.env` / `useSpacetimeDB.tsx` | |
| Default host (cloud) | `wss://testnet.spacetimedb.com` | `.env` | |
| Default module name | `game` | `useSpacetimeDB.tsx` | |
| Dev server port | `3001` | `vite.config.ts` | |

---

**Last Updated**: February 25, 2026
