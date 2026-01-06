# Vote Exchange Testing Guide

## Quick Start

```bash
# Terminal 1: Start SpacetimeDB
pnpm spacetime:start

# Terminal 2: Start dev server
pnpm dev

# Terminal 3: Run unit tests
pnpm test
```

Navigate to `http://localhost:3001/vote`

## Automated Tests ✅

### Unit Tests (24 passing)
```bash
pnpm test
```

**Crafting Tests** (14 tests):
- Resource requirement checking
- Cost calculation
- Time calculation with craft rates
- Recipe validation

**Spatial Utils Tests** (10 tests):
- K-means clustering
- Centroid calculation
- Edge case handling

## Manual Testing Scenarios

### Scenario 1: Basic Game Flow
**Goal**: Verify complete game cycle

1. **Setup**:
   - Open 3 browser tabs
   - Each tab = different player

2. **Lobby**:
   - Tab 1: Create room with $10 buy-in
   - Tab 2-3: Join the room
   - All tabs: Click "Ready"
   - Verify: Pot shows $30

3. **Round 1**:
   - Each player has 1 vote
   - Player 1: Vote red
   - Player 2: Vote blue
   - Player 3: Vote red
   - Wait for timer (or set short duration for testing)

4. **Expected Result**:
   - Elimination modal appears
   - Blue = minority (1 vote)
   - Red = majority (2 votes)
   - Player 2 survives
   - Players 1 & 3 eliminated

5. **Verify**:
   - Player list shows eliminations
   - Game continues or ends
   - Pot distributed correctly

### Scenario 2: Vote Trading
**Goal**: Test marketplace functionality

1. **Setup**: 3 players, $10 buy-in

2. **Actions**:
   - Player 1: List vote for $5
   - Player 2: Buy Player 1's vote
   - Player 2: Now has 2 votes
   - Player 2: Split votes (1 red, 1 blue)

3. **Expected Result**:
   - Player 2 guaranteed minority
   - Player 2 survives
   - Others eliminated

4. **Verify**:
   - Wallet balances updated
   - Vote ownership changed
   - Transaction history shows trade

### Scenario 3: Guarantees
**Goal**: Test guarantee system

1. **Setup**: 4 players, $10 buy-in

2. **Actions**:
   - Player 1: Create public guarantee (red, $3)
   - Player 2: Purchase guarantee
   - Player 1: Vote blue (breaks promise!)
   - Player 3: Vote red
   - Player 4: Vote blue

3. **Expected Result**:
   - Red = minority (1 vote)
   - Blue = majority (2 votes)
   - Player 3 survives
   - Player 1 broke guarantee (Player 2 lost $3)

4. **Verify**:
   - Guarantee marked as broken
   - Transaction recorded
   - Players aware of bluff

### Scenario 4: Tie Handling
**Goal**: Test equal vote distribution

1. **Setup**: 4 players, $10 buy-in

2. **Actions**:
   - Player 1: Vote red
   - Player 2: Vote red
   - Player 3: Vote blue
   - Player 4: Vote blue

3. **Expected Result**:
   - Tie (2 red, 2 blue)
   - No eliminations
   - All players continue
   - Next round starts

4. **Verify**:
   - Elimination modal shows tie message
   - All players still active
   - Pot remains same

### Scenario 5: Multiple Rounds
**Goal**: Test game progression

1. **Setup**: 5 players, $10 buy-in

2. **Round 1**:
   - 3 vote red, 2 vote blue
   - Blue survives (2 players)

3. **Round 2**:
   - 2 players left
   - Both vote (doesn't matter)
   - Game ends

4. **Expected Result**:
   - Game over modal
   - Pot split between 2 survivors
   - Each gets $25

5. **Verify**:
   - Correct pot distribution
   - Wallet balances updated
   - Profit/loss calculated

## Edge Cases to Test

### 1. Single Player
- Create room
- Ready up alone
- Start game
- **Expected**: Error or game doesn't start

### 2. All Same Vote
- All players vote red
- **Expected**: Tie or special handling

### 3. Disconnection
- Player disconnects mid-game
- **Expected**: Game continues without them

### 4. Insufficient Funds
- Try to buy vote with $0 balance
- **Expected**: Error toast, purchase blocked

### 5. Timer Edge Cases
- Round ends exactly at 0:00
- **Expected**: Votes tallied immediately

### 6. Rapid Trading
- Multiple trades in quick succession
- **Expected**: All transactions processed correctly

## Performance Testing

### Load Test (10+ Players)
1. Open 10 browser tabs
2. All join same room
3. Trade votes simultaneously
4. Monitor:
   - Real-time sync speed
   - UI responsiveness
   - Server load

### Stress Test (Rapid Actions)
1. 5 players
2. Spam vote color changes
3. Rapid buy/sell in market
4. Monitor:
   - No race conditions
   - All updates sync
   - No crashes

## UI/UX Testing

### Drag and Drop
- [ ] Votes drag smoothly
- [ ] Drop zones highlight
- [ ] Visual feedback on drop
- [ ] Works on all browsers

### Toasts
- [ ] Appear for all actions
- [ ] Correct messages
- [ ] Auto-dismiss
- [ ] Not too spammy

### Modals
- [ ] Elimination modal displays correctly
- [ ] Game over modal shows winners
- [ ] Can't interact with game while modal open
- [ ] Close button works

### Responsive Design
- [ ] Works on desktop (1920x1080)
- [ ] Works on laptop (1366x768)
- [ ] Works on tablet (768x1024)
- [ ] Works on mobile (375x667)

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Focus indicators visible

## Security Testing

### Input Validation
- [ ] Can't set negative buy-in
- [ ] Can't set negative vote price
- [ ] Can't transfer more resources than available
- [ ] Can't buy with insufficient funds

### Authorization
- [ ] Can only modify own votes
- [ ] Can't cheat by inspecting network
- [ ] Can't manipulate other players' data

## Bug Reporting Template

```
**Title**: Brief description

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**:
What should happen

**Actual Behavior**:
What actually happens

**Screenshots**:
[Attach if applicable]

**Environment**:
- Browser: Chrome 120
- OS: Windows 11
- Players: 3
- Room: test-room-1

**Console Errors**:
[Paste any errors]
```

## Test Checklist

### Core Functionality
- [ ] Room creation with buy-in
- [ ] Player join/ready
- [ ] Game start
- [ ] Vote drag-and-drop
- [ ] Vote color setting
- [ ] Vote marketplace (list/buy/remove)
- [ ] Guarantee creation
- [ ] Guarantee purchase
- [ ] Auto-round processing
- [ ] Elimination modal
- [ ] Game over modal
- [ ] Pot distribution

### Real-time Sync
- [ ] Vote updates sync
- [ ] Market updates sync
- [ ] Player status syncs
- [ ] Timer syncs across clients
- [ ] Wallet balances sync

### Error Handling
- [ ] Insufficient funds error
- [ ] Invalid input error
- [ ] Network error recovery
- [ ] Graceful degradation

### Performance
- [ ] No lag with 10 players
- [ ] Smooth animations
- [ ] Fast market updates
- [ ] Quick round processing

## Success Criteria

✅ **Pass**: All core functionality works  
✅ **Pass**: No critical bugs  
✅ **Pass**: Real-time sync reliable  
✅ **Pass**: UI responsive and intuitive  
⚠️ **Warning**: Minor bugs acceptable  
❌ **Fail**: Game-breaking bugs

## Notes for Testers

- Use Chrome DevTools to simulate multiple users
- Check console for errors
- Monitor network tab for failed requests
- Test with different buy-in amounts ($1, $10, $100)
- Try edge cases (0 votes, all same color, etc.)
- Report anything confusing or unintuitive

---

**Happy Testing!** 🎮

