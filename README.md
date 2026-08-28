# Nashfall — The Vote Exchange Protocol

A multiplayer game combining market-based voting mechanics with strategic elimination, MMO-style colony building, and real-time 3D world exploration. Built with SolidJS, Three.js, and SpacetimeDB.

## Overview

**The Vote Exchange Protocol** is a market-based multiplayer game where players trade votes in a minority-wins elimination system. Players manage a colony of laborers who both vote on their behalf and gather resources to craft equipment — the same laborers who vote in the majority are sent into an automated Battle Arena to fight for survival.

### Core Gameplay

Players buy into a game, creating a pot. During each timed round:
- **Trade votes**: Buy and sell voting tickets between players
- **Trade guarantees**: Purchase promises about how others will vote (a guaranteed vote is locked and cannot be sold or broken)
- **Spend 3 actions**: Harvest, found one camp, refine, craft a hatchet/spear/vest
- **Strategic voting**: Players with multiple votes can split them to hold a minority ticket
- **Send home**: Uncolored minions bank bag + veteran (and their gear) for the next lobby
- **Elimination**: After the tally, majority minions fight in the arena; survivors return to the roster
- **Winner takes pot**: Last 1-2 players standing win the pot

## Quick Start

```bash
# Install dependencies
pnpm install

# Terminal 1: Start SpacetimeDB
spacetime start

# Terminal 2: Publish module & start dev server
pnpm publish:local
pnpm dev

# Terminal 3 (optional): Run bot simulation
pnpm bots
```

Navigate to `http://localhost:3001/vote` to play!

See [docs/getting-started.md](./docs/getting-started.md) for detailed setup instructions.

## Project Status

**Current Focus**: Live expedition loop — vote market + 3-action camp/arena/roster. The 16-building catalog is parked.

**Backend**: SpacetimeDB 2.0 (migrated Feb 2026)

See [STATUS.md](./docs/STATUS.md) for live vs parked, and [roadmap.md](./roadmap.md) for history. The long-game colony catalog lives in [rules-colony-builder.md](./game-design/rules-colony-builder.md) and is not the current HUD.

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](./docs/getting-started.md) | Setup and how to play |
| [SpacetimeDB Guide](./docs/spacetimedb.md) | Database integration |
| [Testing Guide](./docs/testing.md) | Test scenarios and manual testing |
| [QA Testing Outline](./docs/qa-testing-outline.md) | Comprehensive QA test cases |
| [Deployment Guide](./docs/deployment.md) | SpacetimeDB Cloud, Vercel, CDN setup, checklist |
| [CDN Asset Strategy](./docs/cdn-asset-strategy.md) | 3D asset hosting, Cloudflare R2, Draco compression |
| [Development History](./docs/development-history.md) | Sprint summaries |
| [Game Constants](./docs/GAME_CONSTANTS.md) | All hardcoded values |
| [Implementation Status](./docs/STATUS.md) | Vision vs. reality mapping |
| [Game Rules](./game-design/rules.md) | Core Vote Exchange Protocol mechanics |
| [Colony Builder Rules](./game-design/rules-colony-builder.md) | MMO/Colony-Builder mechanics |
| [Roadmap](./roadmap.md) | Development phases and priorities |
| [TODOs](./todos.md) | Current backlog |

## Tech Stack

- **Frontend**: SolidJS, SolidStart, TailwindCSS, Solid-UI
- **3D Rendering**: Three.js (low-poly colony viewport, procedural terrain, spring physics)
- **Procedural Generation**: simplex-noise (terrain height displacement, biome texturing)
- **Backend**: SpacetimeDB (Rust)
- **Real-time**: WebSocket via SpacetimeDB SDK
- **Testing**: Vitest (unit), Playwright (E2E)
- **Bot Simulation**: TypeScript bot runner (`scripts/bot-runner.ts`)

## Project Structure

```
nashfall/
├── server/              # SpacetimeDB Rust module
│   └── src/lib.rs       # Tables, reducers, game logic (~2,200+ lines)
├── src/
│   ├── components/      # UI components
│   │   ├── Vote/        # Vote Exchange Protocol components (VotingInterface, VoteBox, etc.)
│   │   └── game/        # 3D viewport and game-specific panels
│   ├── hooks/           # SolidJS hooks
│   ├── lib/             # Utilities (three-utils, colony-scene, asset-loader)
│   ├── module_bindings/ # Auto-generated SpacetimeDB types
│   └── routes/          # Page routes
├── scripts/             # Developer tools
│   └── bot-runner.ts    # Full bot simulation (walking, harvesting, trading)
├── game-design/         # Game design documentation
├── docs/                # Technical documentation
├── tests/               # Unit tests
└── e2e/                 # Playwright E2E tests
    └── helpers/         # Page objects, game flows, shared test IDs
```

## Development

```bash
pnpm dev                  # Start development server
pnpm bots                 # Run bot simulation (multiple AI players)
pnpm generate             # Regenerate TypeScript bindings
pnpm publish:local        # Publish SpacetimeDB module
pnpm test                 # Run unit tests
pnpm test:e2e             # Run E2E tests (headless)
pnpm test:e2e:headed      # Run E2E tests with visible browser
pnpm test:e2e:simulate    # Run full game simulation E2E
pnpm build                # Build for production
```

## Game Highlights

- **Minority-wins voting**: Trade your way into the safe minority each round
- **Laborer economics**: The same minions that vote also mine, craft, and fight
- **Per-skill progression**: Woodcutting, Mining, Quarrying, Hunting, Farming, Crafting, and Combat each level independently (cap: 5)
- **Minion evacuation**: Save your best laborers by withdrawing them before the vote closes
- **Auto-chess combat**: Majority voters' laborers fight automatically; equipment and stats determine the winner
- **Procedural world**: Simplex-noise terrain with biome zones, water features, and clustered resource deposits

## Contributing

Contributions are welcome! Please read the [game rules](./game-design/rules.md) and [colony builder rules](./game-design/rules-colony-builder.md) to understand the core mechanics before contributing.

## License

[Add your license information here]
