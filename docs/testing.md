# Testing Guide

## Quick Start

```bash
# Terminal 1: Start SpacetimeDB
spacetime start

# Terminal 2: Start dev server
pnpm dev

# Terminal 3: Run unit tests
pnpm test

# Terminal 4: Run E2E tests (requires dev server running)
pnpm test:e2e
```

Navigate to `http://localhost:3001/vote`

---

## Automated Tests

### Unit Tests (24 passing)
```bash
pnpm test
```

- **Crafting Tests** (14 tests): Resource requirements, costs, times
- **Spatial Utils Tests** (10 tests): K-means clustering, centroid calculation

### E2E Tests (Playwright)
```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run with browser UI (visual debugging)
pnpm test:e2e:ui

# Run with browser visible
pnpm test:e2e:headed

# Run full game simulation (headed, slow, with video)
pnpm test:e2e:simulate

# Debug mode (step through tests)
pnpm test:e2e:debug

# View HTML report after tests
pnpm test:e2e:report
```

**E2E Test Coverage (9 spec files, ~120 tests):**
- P1: Core voting (room creation, joining, voting, trading, guarantees, wallet, rounds, ties)
- P2: Chat (send/receive, sync, empty message prevention, special characters)
- P3: Social (friends, DMs, blocking)
- P4: Game management & UI (presets, player list, ready system, accessibility)
- P5: Leaderboard & profiles
- P6: Edge cases (reconnection, negative input, concurrent actions)
- P7: Performance (5-player load, room isolation, sync speed, stability)
- Full game flow (complete user journey tests)
- Full game simulation (5 scenarios: standard, quick, no-rebuy, tie, departure)

---

## Test Architecture

### Shared Test IDs (`src/lib/test-ids.ts`)

All `data-testid` attributes are defined as constants in a single file, imported by both UI components and E2E tests. When a selector changes, it changes in one place.

```
UI Component ──imports──> TID constants <──imports── E2E Page Object
```

```typescript
// src/lib/test-ids.ts
export const TID = {
  connectionStatus: 'connection-status',
  createRoomBtn: 'create-room-btn',
  voteRed: 'vote-red',
  // ...
} as const;
```

**Rule**: Tests never use raw CSS selectors or text-based locators for elements that have a TID. All selectors go through page objects.

### Page Objects (`e2e/helpers/page-objects.ts`)

`VoteGamePage` encapsulates all game UI interactions:

```typescript
const gp = new VoteGamePage(page);
await gp.goto();
await gp.waitForConnection();
await gp.createRoom('My Room', { buyinAmount: 10, votesPerPlayer: 5 });
await gp.joinRoom('My Room');
await gp.clickReady();
await gp.voteRed();
```

### Game Flow Helpers (`e2e/helpers/game-flows.ts`)

High-level orchestration for common multi-player flows:

```typescript
const players = await setupPlayers(multiPlayer, 5, logStream);
await startGame(players, roomName, { buyinAmount: 10 });
await setVotes(players, ['red', 'red', 'red', 'blue', 'blue']);
await snapshot(pages, 'scenario1', 'after-votes', logStream);
```

### Snapshots & Game State

The `snapshot()` helper captures both a PNG screenshot and a JSON file with extracted game state (wallet, pot, timer, active players, chat messages, errors) for each player at meaningful moments.

---

## Multi-User Testing Mode

For manual testing with multiple players in different browser tabs, add `?multiuser=true` to the URL:

```
http://localhost:3001/vote?multiuser=true
```

This ensures each tab gets a **unique user identity** instead of sharing localStorage.

**How it works:**
- Normal mode: User data stored in `localStorage` (shared across tabs)
- Multiuser mode: User data stored in `sessionStorage` (unique per tab)

**When to use:**
- Testing vote trading between players
- Testing game mechanics with multiple participants
- QA testing scenarios from the testing outline

---

## Manual Testing Scenarios

### Scenario 1: Basic Game Flow
**Goal**: Verify complete game cycle

1. Open 3 browser tabs (each = different player)
2. Tab 1: Create room with $10 buy-in
3. Tabs 2-3: Join the room
4. All tabs: Click "Ready" → Pot shows $30
5. Each player sets vote color (2 red, 1 blue)
6. Wait for timer → Blue = minority, survives
7. Verify elimination modal and player list updates

### Scenario 2: Vote Trading
**Goal**: Test marketplace functionality

1. 3 players, $10 buy-in
2. Player 1: List vote for $5
3. Player 2: Buy Player 1's vote → Now has 2 votes
4. Player 2: Split votes (1 red, 1 blue) → Guaranteed minority
5. Verify wallet balances and vote ownership

### Scenario 3: Guarantees
**Goal**: Test guarantee system

1. 4 players, $10 buy-in
2. Player 1: Create public guarantee (red, $3)
3. Player 2: Purchase guarantee
4. Player 1: Vote blue (breaks promise!)
5. Verify guarantee marked as broken

### Scenario 4: Tie Handling
**Goal**: Test equal vote distribution

1. 4 players, $10 buy-in
2. 2 vote red, 2 vote blue → Tie
3. No eliminations, all players continue

### Scenario 5: Multiple Rounds
**Goal**: Test game progression

1. 5 players, $10 buy-in
2. Round 1: 3 red, 2 blue → Blue survives (2 players)
3. Round 2: 2 players left → Game ends
4. Pot split between 2 survivors ($25 each)

---

## Edge Cases

| Case | Expected Result |
|------|-----------------|
| Single player | Error or game doesn't start |
| All same vote | Tie or special handling |
| Disconnection | Game continues without them |
| Insufficient funds | Error toast, purchase blocked |
| Timer at 0:00 | Votes tallied immediately |

---

## UI/UX Testing

- [ ] Votes drag smoothly
- [ ] Drop zones highlight
- [ ] Toasts appear for all actions
- [ ] Modals display correctly
- [ ] Responsive on different screen sizes

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Performance Testing

### Load Test (10+ Players)
1. Open 10 browser tabs
2. All join same room
3. Trade votes simultaneously
4. Monitor real-time sync speed

---

## Bug Reporting Template

```
**Title**: Brief description

**Steps to Reproduce**:
1. Step 1
2. Step 2

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happens

**Environment**:
- Browser: Chrome 120
- OS: Windows 11
- Players: 3
```
