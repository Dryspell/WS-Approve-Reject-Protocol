# Testing Guide

## Quick Start

```bash
# Terminal 1: Start SpacetimeDB
spacetime start

# Terminal 2: Start dev server
pnpm dev

# Terminal 3: Run unit tests
pnpm test
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
