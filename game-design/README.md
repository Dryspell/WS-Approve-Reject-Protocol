# Nashfall — Game Design Documentation

This folder contains the canonical design intent for all game systems. These documents describe **what the game is meant to be**, not necessarily the current state of the codebase. For implementation status, cross-reference [docs/STATUS.md](../docs/STATUS.md).

---

## Document Map

### Core Mechanics

| Document | What It Covers | Implementation Alignment |
|----------|---------------|--------------------------|
| [rules.md](./rules.md) | Binary voting, minority wins, pot, guarantees, wallet, settings | Mostly aligned — see STATUS.md for gaps |
| [rules-colony-builder.md](./rules-colony-builder.md) | Laborers, buildings, resources, crafting, combat, per-skill XP, evacuation, bot simulation | Fully aligned — all major systems implemented |
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

## Current State of Implementation (February 2026)

### Fully Implemented
- Vote Exchange Protocol core loop (vote, trade, eliminate, win)
- Guarantee system (create, purchase, honor/break tracking)
- Laborer-as-voter integration (vote_id on Unit)
- Resource gathering and refinement pipeline
- Equipment system (craft, equip, stat bonuses)
- Laborer genetics and breeding
- Per-skill XP (Woodcutting, Mining, Quarrying, Hunting, Farming, Crafting, Combat; level cap 5)
- Minion evacuation (withdraw unvoted laborers before combat)
- Auto-chess combat (automated BattleArena; `combat_enabled` flag for dev mode)
- Dual currency (MT + MBLS via PlayerCurrency table)
- Multi-timeframe server hierarchy (ServerNode table; not production-deployed)
- Bot simulation (full player AI via `scripts/bot-runner.ts`)

### Partially Implemented
- Resource markets tied to Vote Exchange Protocol instances (basic structure; market closure not fully enforced)
- Parent-child game termination rules (ServerNode exists; cascade logic partial)

### Not Yet Implemented
- Real-money integration
- Blockchain / MBLS cryptocurrency mechanics
- SaaS platform / API
- Wallet spending limits
- Per-round partial pot distribution
- Vote-on-voting trigger

---

## Reading Order

1. **New to the project?** Start with [rules.md](./rules.md) to understand the voting core, then [rules-colony-builder.md](./rules-colony-builder.md) for the full game.
2. **Building a feature?** Check [docs/STATUS.md](../docs/STATUS.md) for implementation status, then read the relevant design doc section.
3. **Thinking about monetization?** Read [monetization.md](./monetization.md) as a vision document, not a requirements document.
4. **Board game prototyping?** Go directly to [boardgame-variant/](./boardgame-variant/).

---

**Last Updated**: February 26, 2026
