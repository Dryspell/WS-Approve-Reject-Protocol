# SocketSignal

A multiplayer game combining market-based voting mechanics with colony-building elements, built with SolidStart.

## Overview

SocketSignal is a unique multiplayer game that combines two core mechanics:

1. **The Vote Exchange**: A market-based game where players trade votes in a minority-wins system
2. **Colony Builder**: An MMO-style resource management and colony building system

Players manage colonies of laborers who participate in voting rounds, with the minority voters surviving each round. The game features:

- Real-time trading of votes and resources
- Colony building and resource management
- Multi-timeframe gameplay across different server tiers
- Automated combat system for eliminated laborers
- Complex market dynamics and resource crafting

For detailed game design documentation, see:

- [Core Game Rules](./game-design/rules.md)
- [Colony Builder Mechanics](./game-design/rules-colony-builder.md)

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or pnpm
- SpaceTimeDB CLI (for database management)

### SpaceTimeDB Setup

SocketSignal uses SpaceTimeDB for real-time multiplayer functionality. Here's how to set it up:

1. Install the SpaceTimeDB CLI:

```bash
npm install -g @clockworklabs/spacetimedb-cli
```

2. Initialize SpaceTimeDB in your project:

```bash
spacetimedb init
```

3. Create a new SpaceTimeDB module:

```bash
spacetimedb create-module socket-signal
```

4. Start the SpaceTimeDB development server:

```bash
spacetimedb dev
```

The SpaceTimeDB server will run on `localhost:3000` by default. Your game client will connect to this server for real-time updates.

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/socket-signal.git
cd socket-signal

# Install dependencies
npm install
# or
yarn
# or
pnpm install
```

### Development

Start the development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

### Building

Build the project for production:

```bash
npm run build
```

The build output will be optimized for deployment to different environments based on your configuration in `app.config.js`.

## Project Structure

- `/src` - Source code
- `/game-design` - Game design documentation
- `/public` - Static assets
- `/tests` - Test files
- `/spacetimedb` - SpaceTimeDB module definitions and migrations

## SpaceTimeDB Usage

SpaceTimeDB is used for:

- Real-time game state synchronization
- Vote exchange market operations
- Resource trading and inventory management
- Player and laborer data persistence

Key SpaceTimeDB concepts used in SocketSignal:

- **Tables**: Store game state (players, laborers, resources, etc.)
- **Reducers**: Handle game actions (voting, trading, building)
- **Subscriptions**: Real-time updates for game clients
- **Queries**: Fetch game state and market data

Example SpaceTimeDB table definition:

```rust
#[spacetimedb(table)]
pub struct Player {
    #[primarykey]
    pub id: u64,
    pub name: String,
    pub wallet_balance: u64,
    pub colony_id: Option<u64>,
}
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

[Add your license information here]
