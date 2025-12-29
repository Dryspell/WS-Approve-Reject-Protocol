# Project TODOs

## Current Priority

- [ ] Implement full unit movement controls (right-click to move selected units)
- [ ] Complete resource transfer UI with form inputs
- [ ] Break down `Game.tsx` into smaller components (`UnitDetailsPanel`, `InventoryPanel`, `CraftingPanel`)
- [ ] Add unit tests for game mechanics

## Core Gameplay

### Units & Movement
- [ ] Unit grouping functionality
- [ ] Unit formations
- [ ] Enhanced gathering animations and effects

### Resources
- [ ] Show inventory UI for units
- [ ] Dedicated crafting buildings (workshops)
- [ ] Crafting skill progression and recipe unlocks

### Voting & Market
- [ ] Market interface for bulk vote trading
- [ ] Market history and analytics
- [ ] Vote guarantees
- [ ] Scaling vote power (based on resources/upgrades)
- [ ] Alliances or team voting

## UI/UX

- [ ] Round timer and voting phase indicator
- [ ] Visual indicators for eliminated units and trade events
- [ ] Improved round history (timeline view)
- [ ] Visual effects for vote changes and trades

## Technical

### Performance & Quality
- [ ] Proper error handling for all SpacetimeDB operations
- [ ] Canvas rendering optimization for large unit counts
- [ ] State management performance improvements

### Testing
- [ ] Set up Vitest for frontend testing
- [ ] Create SpacetimeDB test database with seed data
- [ ] Write test suites for reducers, stores, and UI components

## Infrastructure

### Security
- [ ] Configure row-level security in SpacetimeDB
- [ ] Access controls and user permissions
- [ ] Session handling and rate limiting
- [ ] Audit logging

### Production
- [ ] Test backup restoration
- [ ] Publish module to SpacetimeDB cloud
- [ ] Test real-time sync with multiple browser windows

---

## ✅ Recently Completed

- SpacetimeDB chat component with rooms, messages, and permissions
- Connection status indicator with reconnection handling
- Permissions-based UI controls (read-only indicator)
- Official SpacetimeDB SDK migration
- Type generation from Rust schema
- Basic resource gathering, inventory, and crafting systems
- Vote state management and trading interface
- Nginx reverse proxy with SSL
- Database backup strategy
