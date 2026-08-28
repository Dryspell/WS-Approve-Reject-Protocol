# Nashfall — Game Design Documentation

This folder contains the canonical design intent for all game systems. These documents describe **what the game is meant to be**, not necessarily the current state of the codebase. For implementation status, cross-reference [docs/STATUS.md](../docs/STATUS.md).

---

## Document Map

### Core Mechanics

| Document | What It Covers | Implementation Alignment |
|----------|---------------|--------------------------|
| [rules.md](./rules.md) | Binary voting, minority wins, pot, guarantees, wallet, settings | Mostly aligned — see STATUS.md for gaps |
| [rules-colony-builder.md](./rules-colony-builder.md) | Long-game colony catalog plus the live expedition loop | Live loop aligned (camp, 3 actions, arena, roster + gear). 16-building / genetics / server-tree sections are parked design |
| [shared-systems.md](./shared-systems.md) | Currency (MT/MBLS), resource markets, multi-timeframe server hierarchy | MT/MBLS implemented; markets partial; hierarchy implemented but not production-deployed |

### Supporting Analysis

| Document | What It Covers | Notes |
|----------|---------------|-------|
| [mathematical-analysis.md](./mathematical-analysis.md) | EV calculations, guarantee pricing, probability tables | EVCalculator component implemented; ongoing |
| [monetization.md](./monetization.md) | Revenue streams, SaaS model, pricing, crypto | **Vision document** — currently play-money only; real-money, crypto, SaaS are future |
| [legal-considerations.md](./legal-considerations.md) | Gambling law, securities law analysis | Advisory — play-money status currently sidesteps most risk |

### Board Game Variants

| Document | What It Covers | Notes |
|----------|---------------|-------|
| [boardgame-variant/parlor-edition.md](./boardgame-variant/parlor-edition.md) | Fast 4-10 player tabletop variant | Streamlined; pure vote trading focus |
| [boardgame-variant/grand-strategy-edition.md](./boardgame-variant/grand-strategy-edition.md) | Full colony-builder tabletop adaptation | Intentional divergences from digital noted within |
| [boardgame-variant/todos.md](./boardgame-variant/todos.md) | Prototyping tasks and playtest schedule | Physical prototyping; separate from digital roadmap |

---

## Design Pillars

The following principles govern all design decisions across digital and physical:

1. **The Vote Exchange Protocol is the core** — everything else (colony builder, resource markets, bot simulation, board game variants) extends it without replacing it
2. **Markets require participation** — to access any market (labor, resources, votes), a player must be active in a Vote Exchange Protocol instance
3. **Laborers are voters** — the same entities that gather resources also cast votes and fight in combat; their dual role creates genuine strategic tension
4. **Stakes should feel real** — whether through real money (future) or high-value play currency, the elimination system must carry weight
5. **Transparency enables strategy** — expected values, vote distributions, and market activity should be visible to encourage informed play

---

## Current State of Implementation (August 2026)

### Live on `/vote`
- Vote Exchange Protocol (vote, trade, guarantees, eliminate, pot)
- Vote-on-voting trigger (2/3 of remaining players; timer is the backstop)
- Unplaced tickets split evenly at lock; 0–0 restarts the timer; sold-out hands drop at end of round
- Laborer-as-voter (`vote_id`); 3 actions per minion per round
- Harvest, one camp, refine, craft-and-equip (hatchet / spear / vest)
- Send-home and match-end roster; equipped gear persists on the veteran
- Guest recovery code + username/passphrase bind
- Majority hex-arena melee; `combat_enabled` can skip the fight
- Practice bots that vote and play the colony path
- Guarantee cancel (unsold) and buyer refund if the seller leaves

### Parked (code may exist; not the live HUD)
- 16-building catalog, `game_tick` production, genetics breeding, EV/tournament panels
- Dual currency (MT + MBLS), multi-timeframe server tree
- Resource markets tied to Vote Exchange Protocol instances

### Not this game yet
- Real-money integration, blockchain, SaaS, wallet caps, per-round pot drip, clans

---

## Reading Order

1. **New to the project?** Start with [rules.md](./rules.md) for the voting core, then the live-loop note at the top of [rules-colony-builder.md](./rules-colony-builder.md). The rest of that file is the parked long-game catalog.
2. **Building a feature?** Check [docs/STATUS.md](../docs/STATUS.md) for implementation status, then read the relevant design doc section.
3. **Thinking about monetization?** Read [monetization.md](./monetization.md) as a vision document, not a requirements document.
4. **Board game prototyping?** Go directly to [boardgame-variant/](./boardgame-variant/).

---

**Last Updated**: August 25, 2026
