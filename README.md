# SocketSignal - The Vote Exchange

A multiplayer game combining market-based voting mechanics with strategic elimination, built with SolidJS and SpacetimeDB.

## Overview

**The Vote Exchange** is a market-based multiplayer game where players trade votes in a minority-wins elimination system.

### Core Gameplay

Players buy into a game, creating a pot. During each timed round:
- **Trade votes**: Buy and sell voting tickets between players
- **Trade guarantees**: Purchase promises about how others will vote (they can bluff!)
- **Strategic voting**: Players with multiple votes can split them to guarantee minority
- **Elimination**: After voting, majority voters are eliminated, minority survives
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
```

Navigate to `http://localhost:3001/vote` to play!

See [docs/getting-started.md](./docs/getting-started.md) for detailed setup instructions.

## Project Status

**Feature Complete**: 95% ✅  
**Current Focus**: Mobile Optimization (Sprint 8)

The Vote Exchange is fully playable on desktop with all core mechanics implemented.

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](./docs/getting-started.md) | Setup and how to play |
| [SpacetimeDB Guide](./docs/spacetimedb.md) | Database integration |
| [Testing Guide](./docs/testing.md) | Test scenarios and manual testing |
| [Deployment Guide](./docs/deployment.md) | Production deployment |
| [Development History](./docs/development-history.md) | Sprint summaries |
| [Game Rules](./game-design/rules.md) | Complete game mechanics |
| [TODOs](./todos.md) | Current sprint tasks |

## Tech Stack

- **Frontend**: SolidJS, SolidStart, TailwindCSS, Solid-UI
- **Backend**: SpacetimeDB (Rust)
- **Real-time**: WebSocket via SpacetimeDB SDK
- **Testing**: Vitest

## Project Structure

```
socketSignal/
├── server/              # SpacetimeDB Rust module
│   └── src/lib.rs       # Tables, reducers, game logic
├── src/
│   ├── components/      # UI components
│   │   └── Vote/        # Vote Exchange components
│   ├── hooks/           # React hooks
│   ├── lib/             # Utilities
│   ├── module_bindings/ # Auto-generated SpacetimeDB types
│   └── routes/          # Page routes
├── game-design/         # Game design documentation
├── docs/                # Technical documentation
└── tests/               # Unit tests
```

## Development

```bash
pnpm dev          # Start development server
pnpm generate     # Regenerate TypeScript bindings
pnpm publish:local # Publish SpacetimeDB module
pnpm test         # Run unit tests
pnpm build        # Build for production
```

## Contributing

Contributions are welcome! Please read the [game rules](./game-design/rules.md) to understand the core mechanics before contributing.

## License

[Add your license information here]
