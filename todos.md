# Colony Builder and Voting System Integration - TODOs

## UI/UX Tasks
- [ ] Update frontend to show vote-related UI elements for units (color, price, owner, etc.)
- [ ] Add vote trading interface (buy/sell, price setting, ownership transfer)
- [ ] Implement round timer and voting phase indicator
- [ ] Add visual indicators for eliminated units and trade events

## Game Mechanics
- [ ] Implement deathmatch system for eliminated units (optional)
- [ ] Add resource management for eliminated units (resources lost or transferred)
- [ ] Integrate market with unit and vote trading

## Market System
- [ ] Create market interface for bulk vote trading
- [ ] Add market history and analytics

## Technical Debt
- [x] Remove old socket.io implementations
- [x] Clean up socket.io dependencies
- [x] Fix type definitions for SpacetimeDB integration
  - [x] Generate proper types from Rust schema using `spacetime generate`
  - [x] Remove manual uuid/rand/getrandom usage in reducers (use `ctx.rng()` instead)
  - [x] Remove manual types and use types from `client/src/module_bindings`
  - [x] Ensure frontend code imports types from generated bindings
- [x] Implement proper error handling for SpacetimeDB operations
- [x] Implement vote state management
- [ ] Implement vote trading state
- [ ] Add unit tests for vote-related functionality

## Testing Infrastructure
- [ ] Set up Vitest for frontend testing
- [ ] Set up SpacetimeDB test database
- [ ] Create seed data for game rooms, units, and votes
- [ ] Write test suites for reducers, stores, and UI

## Future Enhancements
- [ ] Add scaling vote power (e.g., based on resources or upgrades)
- [ ] Implement alliances or team voting

---

**Progress update:**
- SpacetimeDB type generation and schema sync is now complete! Types are generated in `client/src/module_bindings` and should be used throughout the frontend.
- WASM/uuid/rand issues were resolved by removing direct usage and switching to `ctx.rng()` in reducers.
- Manual type definitions are no longer needed for SpacetimeDB tables. 