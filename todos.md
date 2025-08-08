# SpacetimeDB Game - TODOs

This document tracks the development progress of the colony builder and voting game.

---

## 🚨 CRITICAL - Testing Infrastructure Setup

### Immediate Blockers (Must Fix First)
- [ ] **Start Docker Desktop** and verify SpacetimeDB can start via `docker-compose up -d spacetimedb`
  - Alternative: Run SpacetimeDB locally using `./scripts/start-spacetimedb.sh`
- [ ] **Verify SpacetimeDB Connection**: Test HTTP endpoint `curl http://localhost:3000/v1/ping`
- [ ] **Build Server Module**: Ensure WASM module is built with `cd server && cargo build --target wasm32-unknown-unknown --release`
- [ ] **Run Test Suite**: Execute `npm test` to verify all 35 tests pass
- [ ] **Fix any test failures** related to database schema or reducer calls

### Testing Infrastructure Tasks
- [ ] Create simplified test startup script that handles Docker/local SpacetimeDB automatically
- [ ] Add test database seeding with realistic game data
- [ ] Set up test coverage reporting and CI/CD integration
- [ ] Create integration tests for the full game flow (room creation → unit movement → voting → resource gathering)

---

## 🎯 High Priority
- [ ] Implement full unit movement controls (right-click to move selected units).
- [ ] Complete the resource transfer UI to use form inputs instead of hardcoded values.
- [ ] Break down `Game.tsx` into smaller, more manageable components (e.g., `UnitDetailsPanel`, `InventoryPanel`, `CraftingPanel`).
- [ ] Add unit tests for vote-related functionality and game mechanics.
- [ ] Refine `README.md` to simplify setup instructions for new developers.

---

## 🚀 Game Systems

### Core Gameplay & Controls
- [x] Implement unit selection with click/drag.
- [ ] Add unit grouping functionality.
- [ ] Implement unit formations.
- [ ] Implement deathmatch system for eliminated units (optional).
- [ ] Add resource management for eliminated units (resources lost or transferred).

### Resource System
#### Gathering
- [x] Implement basic resource gathering with visual feedback.
- [x] Add resource depletion mechanics (depletion, regeneration, respawn).
- [ ] Enhance gathering animations (e.g., particle effects).
- [ ] Implement gathering efficiency (speed modifiers, tool upgrades).

#### Storage & Inventory
- [x] Add basic inventory system for units.
- [x] Implement storage buildings.
- [x] Allow units to transfer resources between each other and to storage.
- [ ] Show inventory UI.

#### Crafting
- [x] Implement crafting recipes and resource requirements.
- [x] Implement a crafting queue and show progress.
- [ ] Add dedicated crafting buildings (e.g., workshops).
- [ ] Add crafting skill progression and recipe unlocks.

### Market & Voting System
- [x] Implement vote state management.
- [x] Implement vote trading state and actions.
- [x] Update frontend to show vote-related UI elements for units (color, price, owner).
- [x] Add vote trading interface (buy/sell, set price).
- [ ] Create market interface for bulk vote trading.
- [ ] Add market history and analytics.
- [ ] Add vote guarantees.
- [ ] Add scaling vote power (e.g., based on resources or upgrades).
- [ ] Implement alliances or team voting.

---

## 🖥️ UI/UX

- [x] Implement round history visualization.
- [ ] Implement round timer and voting phase indicator.
- [ ] Add visual indicators for eliminated units and trade events.
- [ ] Add visual effects for vote changes and trades.
- [ ] Improve round history visualization (e.g., timeline view).
- [ ] Refactor canvas utilities into organized, reusable modules.

---

## 🛠️ Technical Debt & Refactoring

- [x] Remove old socket.io implementations and dependencies.
- [x] Generate proper types from Rust schema using `spacetime generate`.
- [x] Remove manual types and use types from `client/src/module_bindings`.
- [ ] Implement proper error handling for all SpacetimeDB operations.
- [ ] Optimize canvas rendering for a large number of units.
- [ ] Improve state management performance and data structures.

---

## 🧪 Testing Infrastructure

- [ ] Set up Vitest for frontend testing.
- [ ] Set up a SpacetimeDB test database.
- [ ] Create seed data for game rooms, units, and votes.
- [ ] Write test suites for reducers, stores, and UI components.

---

## 🌐 Infrastructure & Deployment

### Security
- [ ] Configure row-level security in SpacetimeDB.
- [ ] Set up proper access controls and user permissions.
- [ ] Implement session handling and rate limiting for authentication.
- [ ] Add audit logging.

### Production
- [x] Set up Nginx reverse proxy with SSL.
- [x] Configure a systemd service for SpacetimeDB.
- [x] Implement a health check endpoint.
- [x] Set up basic monitoring and logging.
- [x] Implement a database backup and restoration strategy.
  - [x] Set up regular database backups.
  - [x] Configure backup retention.
  - [ ] Test backup restoration.

---
**Progress update:**
- SpacetimeDB type generation and schema sync is now complete! Types are generated in `client/src/module_bindings` and should be used throughout the frontend.
- WASM/uuid/rand issues were resolved by removing direct usage and switching to `ctx.rng()` in reducers.
- Basic resource gathering, inventory, and crafting systems are implemented with visual feedback and task queuing.

# Voting System TODOs

## UI/UX Improvements

### Canvas Visualization
- [ ] Add unit movement/dragging functionality
  - Allow users to drag units to new positions
  - Implement smooth animations for unit movement
  - Add visual feedback during drag operations

### Unit Selection
- [ ] Implement unit selection with click/drag
  - Single click to select a unit
  - Click and drag to select multiple units
  - Add visual feedback for selected units
  - Implement selection box visualization

### Visual Effects
- [ ] Add visual effects for vote changes
  - Animate color transitions
  - Add particle effects for vote changes
  - Show vote change confirmation animations
- [ ] Add visual effects for trades
  - Animate trade transactions
  - Show price change effects
  - Add trade confirmation animations

### Round History
- [ ] Improve round history visualization
  - Add timeline view for round history
  - Show vote distribution over time
  - Add interactive timeline controls
  - Visualize vote patterns and trends

## Game Mechanics

### Unit Management
- [ ] Add unit grouping functionality
  - Allow users to group units
  - Implement group selection
  - Add group vote actions
- [ ] Implement unit formations
  - Add different formation patterns
  - Allow users to arrange units in formations
  - Add formation-based voting

### Voting System
- [ ] Add vote guarantees
  - Implement vote guarantee mechanics
  - Add visual indicators for guaranteed votes
  - Show guarantee status in unit details
- [ ] Improve vote trading
  - Add price negotiation
  - Implement trade history
  - Add trade notifications

### Game Flow
- [ ] Add round management
  - Implement round timer
  - Add round transition effects
  - Show round status and progress
- [ ] Add game state persistence
  - Save game state between sessions
  - Implement game recovery
  - Add game history

## Technical Improvements

### Performance
- [ ] Optimize canvas rendering
  - Implement efficient redraw strategies
  - Add frame rate control
  - Optimize for large numbers of units
- [ ] Improve state management
  - Optimize store updates
  - Implement efficient data structures
  - Add state caching

### Code Organization
- [ ] Refactor canvas utilities
  - Organize canvas-related code
  - Add proper TypeScript types
  - Improve code reusability
- [ ] Improve error handling
  - Add comprehensive error handling
  - Implement error recovery
  - Add error logging

### Testing
- [ ] Add unit tests
  - Test canvas utilities
  - Test game mechanics
  - Test state management
- [ ] Add integration tests
  - Test game flow
  - Test multiplayer interactions
  - Test persistence

## Documentation
- [ ] Add user documentation
  - Document game mechanics
  - Add tutorial
  - Create user guide
- [ ] Add developer documentation
  - Document code structure
  - Add API documentation
  - Create contribution guide 