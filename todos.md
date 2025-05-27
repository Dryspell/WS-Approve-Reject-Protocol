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