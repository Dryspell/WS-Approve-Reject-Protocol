# SocketSignal Development Roadmap

## Vision & Overview

SocketSignal is a **market-based voting game** (The Vote Exchange) where players trade votes in a minority-wins system. The core gameplay loop is vote trading and strategic voting, with optional colony-building elements layered on top.

### Core Pillars (Priority Order)
1. **The Vote Exchange**: Binary voting with minority-wins elimination (THE CORE GAME)
2. **Market Trading**: Buy/sell votes and guarantees between players
3. **Strategic Depth**: Bluffing, guarantees, wallet management
4. **Real-time Multiplayer**: Powered by SpacetimeDB for instant state synchronization
5. **Colony Builder Extension**: Optional MMO/resource layer (future expansion)

---

## Current State (January 2026)

### ✅ Completed (95% Feature Complete)

**Core Vote Exchange**:
- Binary voting (Red/Blue) with minority wins
- Vote trading marketplace
- Multiple votes per player with vote splitting
- Public & private guarantee system (with bluffing)
- Wallet & bank account management
- Buy-in and pot distribution
- Player elimination and multi-round gameplay
- Transaction tracking
- Tie handling

**Social Features**:
- Real-time chat system
- Leaderboards (all-time, season, weekly)
- Player profiles with achievements
- Game replay viewer
- Room presets (Quick/Standard/Strategic/High Stakes)

**Polish & Tools**:
- Sound effects (13 unique sounds)
- Animations and loading states
- Error boundaries
- Debug and admin panels

**Infrastructure**:
- SpacetimeDB integration with official SDK
- Type-safe Rust → TypeScript bindings
- 24 unit tests passing

See [docs/development-history.md](./docs/development-history.md) for detailed sprint summaries.

---

## Phase 1: Mobile Optimization 📱 (Current)

**Priority**: HIGH | **Status**: In Progress

### Goals
- Make The Vote Exchange fully playable on mobile devices
- Progressive Web App for installable experience

### Tasks
- [ ] Responsive layouts (3-column → stacked/tabbed for mobile)
- [ ] Touch-optimized drag-and-drop
- [ ] PWA setup (manifest, service worker, install prompt)
- [ ] Performance optimization (lazy loading, virtual scrolling)
- [ ] Cross-device testing (iOS Safari, Android Chrome)

---

## Phase 2: Beta Launch & Iteration

**Priority**: HIGH | **Timeline**: After Mobile

### Goals
- Launch beta testing with real users
- Gather feedback and iterate

### Tasks
- [ ] Beta launch announcement
- [ ] Feedback collection system
- [ ] Bug fix sprints based on user reports
- [ ] Balance tuning (buy-ins, round times)
- [ ] Tutorial/onboarding flow

---

## Phase 3: Advanced Game Modes

**Priority**: MEDIUM | **Timeline**: Post-Beta

### Continuous Game Mode
- Per-round pot distribution (e.g., 50% each round)
- Mid-game join/leave
- Eternal games without fixed end

### Tournament Mode
- Elimination brackets
- Scheduled tournaments
- Prizes and rankings

### Custom Games
- Variable initial votes per player
- Wallet size limits
- Transaction fees to pot
- Vote-on-voting trigger (supermajority forces vote)

---

## Phase 4: Monetization

**Priority**: MEDIUM | **Timeline**: Post-Beta

### In-Game Economy
- Transaction fees (% of trades to pot)
- Side-betting on vote outcomes
- Premium cosmetics (avatars, themes)

### Real Money Integration
- Legal/compliance review required
- Cryptocurrency integration exploration
- Deposit/withdrawal system
- KYC/AML compliance

---

## Phase 5: Colony Builder Extension

**Priority**: LOW | **Timeline**: Future

The MMO/resource layer sits alongside The Vote Exchange. Players can focus on voting OR colony building OR both.

### Already Implemented
- Canvas-based unit visualization
- Unit movement and selection
- Resource gathering and inventory
- Crafting system with recipes
- Storage buildings

### Future Work
- [ ] Unit grouping and hotkeys
- [ ] Enhanced unit AI
- [ ] Crafting buildings (workshops, forges)
- [ ] Resource market integration with Vote Exchange
- [ ] Integration requirement: participate in Vote Exchange to access markets

---

## Phase 6: Advanced Social Features

**Priority**: LOW | **Timeline**: Future

- [ ] Friend system
- [ ] Private messaging
- [ ] Clan/guild system
- [ ] Spectator mode
- [ ] Bot players for solo practice

---

## Success Metrics

### User Experience
- First-time completion rate > 80%
- Average session length > 30 minutes
- Day 7 retention > 40%

### Technical Performance
- Canvas FPS > 30 for 100+ units
- SpacetimeDB sync latency < 200ms
- Initial load time < 3 seconds

### Engagement
- Trades per game > 5
- Chat messages per session > 10
- Return player rate > 60%

---

## Documentation

- [Getting Started](./docs/getting-started.md) - Setup and how to play
- [SpacetimeDB Guide](./docs/spacetimedb.md) - Database integration
- [Testing Guide](./docs/testing.md) - Test scenarios
- [Deployment Guide](./docs/deployment.md) - Production deployment
- [Development History](./docs/development-history.md) - Sprint summaries
- [Game Rules](./game-design/rules.md) - Complete game mechanics
- [TODOs](./todos.md) - Current sprint tasks

---

**Last Updated**: January 11, 2026
