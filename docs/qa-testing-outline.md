# QA Testing Outline - The Vote Exchange

> **Priority Order**: Core Voting Gameplay → Chat Functionality → Social Features → Other Features
> 
> **Testing Environment**: Desktop browsers (Chrome, Firefox, Safari, Edge)
> 
> **Last Updated**: January 11, 2026

---

## Table of Contents

1. [Testing Setup](#testing-setup)
2. [Priority 1: Core Voting Gameplay](#priority-1-core-voting-gameplay)
3. [Priority 2: Chat Functionality](#priority-2-chat-functionality)
4. [Priority 3: Social Features](#priority-3-social-features)
5. [Priority 4: Game Management & UI](#priority-4-game-management--ui)
6. [Priority 5: Leaderboard & Profiles](#priority-5-leaderboard--profiles)
7. [Priority 6: Edge Cases & Error Handling](#priority-6-edge-cases--error-handling)
8. [Priority 7: Performance & Load Testing](#priority-7-performance--load-testing)
9. [Bug Reporting Template](#bug-reporting-template)

---

## Testing Setup

### Prerequisites
1. SpacetimeDB running locally (`spacetime start`)
2. Development server running (`pnpm dev`)
3. Multiple browser instances (use incognito/private windows for separate players)
4. Navigate to `http://localhost:3001/vote`

### Automated E2E Tests (Playwright)

Many test cases have corresponding automated E2E tests. Run them with:

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific priority tests
pnpm test:e2e priority-1    # Core Voting
pnpm test:e2e priority-2    # Chat
pnpm test:e2e priority-3    # Social
pnpm test:e2e priority-6    # Edge Cases

# Interactive UI mode
pnpm test:e2e:ui
```

**E2E Test Files:**
- `e2e/full-game-flow.spec.ts` - Complete user journey tests
- `e2e/priority-1-core-voting.spec.ts` - VG-001 to VG-062
- `e2e/priority-2-chat.spec.ts` - CH-001 to CH-021
- `e2e/priority-3-social.spec.ts` - SO-001 to SO-034
- `e2e/priority-4-ui.spec.ts` - UI-001 to UI-031
- `e2e/priority-5-leaderboard.spec.ts` - LB-001 to PR-004
- `e2e/priority-6-edge-cases.spec.ts` - EC-001 to EC-022
- `e2e/priority-7-performance.spec.ts` - PF-001 to PF-022

**Test Results (January 11, 2026):**
See `e2e/TEST-RESULTS.md` for detailed analysis.

| Area | Status | Notes |
|------|--------|-------|
| Room Creation | ✅ Passing | VG-002, VG-003 verified |
| Multi-player Identity | ✅ Passing | Unique identities confirmed |
| Ready System | ⚠️ Needs Investigation | Toggle not updating UI |
| Toast Notifications | ✅ Passing | UI-013 verified |
| Form Components | ✅ Passing | UI-014 verified |

### Manual Test Player Setup
- Open 3-5 browser tabs with `?multiuser=true` parameter
- Example: `http://localhost:3001/vote?multiuser=true`
- Each tab will auto-create a unique identity
- Set unique names for each player for easier tracking

---

## Priority 1: Core Voting Gameplay

### 1.1 Game Room Creation & Joining

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| VG-001 | Create room with preset | 1. Click room preset (Quick/Standard/Strategic/High Stakes)<br>2. Verify room settings | Room created with preset values displayed | |
| VG-002 | Create custom room | 1. Set custom buy-in amount<br>2. Set custom timer duration<br>3. Create room | Room created with custom settings | |
| VG-003 | Join existing room | 1. Player 2 joins room created by Player 1<br>2. Verify player list updates | Both players visible in room, pot reflects buy-ins | |
| VG-004 | Multiple players join | 1. 5+ players join same room<br>2. Verify pot calculation | Pot = sum of all buy-ins, all players listed | |
| VG-005 | Room auto-start on ready | 1. All players click "Ready"<br>2. Verify game starts | Timer begins, voting interface enabled | |

### 1.2 Voting Mechanics

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| VG-010 | Set vote color (Red) | 1. During active round, click Red<br>2. Submit vote | Vote registered, visual confirmation shown | |
| VG-011 | Set vote color (Blue) | 1. During active round, click Blue<br>2. Submit vote | Vote registered, visual confirmation shown | |
| VG-012 | Change vote before timer ends | 1. Set vote to Red<br>2. Change to Blue before timer ends | Final vote is Blue, correctly tallied | |
| VG-013 | Vote split (2+ votes) | 1. Acquire 2+ votes via trading<br>2. Split votes (1 Red, 1 Blue) | Both votes registered, UI shows split | |
| VG-014 | Timer countdown | 1. Start game<br>2. Monitor timer | Timer counts down accurately, votes locked at 0:00 | |
| VG-015 | Minority wins | 1. 3 players: 2 Red, 1 Blue<br>2. End round | Blue voter survives, Red voters eliminated | |
| VG-016 | Majority eliminated | 1. Complete vote with clear majority<br>2. Verify elimination | Majority voters see elimination modal, removed from game | |

### 1.3 Vote Trading

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| VG-020 | List vote for sale | 1. Set price in Vote Market<br>2. List vote for sale | Vote appears in marketplace | |
| VG-021 | Buy listed vote | 1. Player 1 lists vote for $5<br>2. Player 2 purchases | Buyer gains vote, seller loses vote, wallet balances updated | |
| VG-022 | Cancel vote listing | 1. List vote for sale<br>2. Cancel listing | Vote removed from marketplace, returned to player | |
| VG-023 | Insufficient funds purchase | 1. Try to buy vote exceeding wallet balance | Error toast displayed, purchase blocked | |
| VG-024 | Multiple vote ownership | 1. Buy 2 additional votes<br>2. Verify vote count | Player shows 3 votes total, can split votes | |
| VG-025 | Counter offer | 1. Player lists vote at $10<br>2. Buyer offers $8 | Counter offer system works, negotiation possible | |

### 1.4 Guarantee System

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| VG-030 | Create public guarantee | 1. Create guarantee to vote Red for $3<br>2. List as public | Guarantee visible to all players in market | |
| VG-031 | Create private guarantee | 1. Create guarantee to vote Blue for $5<br>2. List as private | Guarantee visible only to specific player | |
| VG-032 | Purchase guarantee | 1. Buy public guarantee<br>2. Verify transaction | Buyer pays, guarantee contract active | |
| VG-033 | Honor guarantee | 1. Sell guarantee to vote Red<br>2. Actually vote Red | Guarantee marked as "Honored", trust maintained | |
| VG-034 | Break guarantee (bluff) | 1. Sell guarantee to vote Red<br>2. Actually vote Blue | Guarantee marked as "Broken", visible to all | |
| VG-035 | Guarantee tracking | 1. Complete multiple guarantees<br>2. Check history | All guarantee outcomes tracked correctly | |

### 1.5 Wallet & Bank Management

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| VG-040 | Initial wallet balance | 1. Join game<br>2. Check wallet display | Wallet shows starting balance minus buy-in | |
| VG-041 | Bank transfer (to bank) | 1. Transfer from wallet to bank<br>2. Verify balances | Bank increases, wallet decreases | |
| VG-042 | Bank transfer (to wallet) | 1. Transfer from bank to wallet<br>2. Verify balances | Wallet increases, bank decreases | |
| VG-043 | Transaction history | 1. Complete several trades<br>2. View transaction list | All transactions logged with timestamps | |
| VG-044 | Pot display | 1. Verify pot calculation<br>2. After trades | Pot shows correct total of buy-ins | |

### 1.6 Round Progression & Elimination

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| VG-050 | Multi-round gameplay | 1. Complete Round 1<br>2. Survivors continue to Round 2 | Round counter increments, votes reset | |
| VG-051 | Elimination modal | 1. Get eliminated<br>2. View modal | Clear message about elimination, option to spectate | |
| VG-052 | Vote retention after round | 1. Survive with 3 votes<br>2. Start Round 2 | All 3 votes carry forward | |
| VG-053 | Two players remaining | 1. Reach 2 survivors<br>2. End game | Game ends, pot split between winners | |
| VG-054 | Single winner | 1. Play until 1 survivor<br>2. End game | Winner takes entire pot | |
| VG-055 | Pot distribution | 1. Complete game with winners<br>2. Verify winnings | Pot distributed correctly to winner(s) | |

### 1.7 Tie Handling

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| VG-060 | 50/50 tie | 1. 4 players: 2 Red, 2 Blue<br>2. End round | No eliminations, game continues | |
| VG-061 | Tie with vote splitting | 1. Player with 2 votes splits<br>2. Creates tie | Tie handled correctly | |
| VG-062 | Tie pot split | 1. Tie in final round<br>2. Verify distribution | Pot split proportional to vote count | |

---

## Priority 2: Chat Functionality

### 2.1 Game Chat (Room Chat)

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| CH-001 | Send message | 1. Type message<br>2. Press Enter or click Send | Message appears in chat for all players | |
| CH-002 | Receive message | 1. Another player sends message<br>2. Verify delivery | Message appears in real-time | |
| CH-003 | Message timestamps | 1. Send several messages<br>2. Check timestamps | Correct time displayed for each message | |
| CH-004 | Sender identification | 1. Multiple players chat<br>2. Verify names | Each message shows correct sender name | |
| CH-005 | Empty message prevention | 1. Try to send empty message<br>2. Try to send whitespace only | Send button disabled, no empty messages | |
| CH-006 | Chat auto-scroll | 1. Send 20+ messages<br>2. Verify scroll behavior | Chat auto-scrolls to newest message | |
| CH-007 | Chat minimize/expand | 1. Click minimize button<br>2. Click expand button | Chat panel toggles correctly | |
| CH-008 | System messages | 1. Player joins/leaves room<br>2. Game events occur | System messages displayed distinctly | |
| CH-009 | Long message handling | 1. Send 500+ character message<br>2. Verify display | Message wraps properly, fully visible | |
| CH-010 | Special characters | 1. Send message with emojis, symbols<br>2. Verify rendering | All characters display correctly | |
| CH-011 | Chat history on join | 1. Join room with existing messages<br>2. Scroll chat | Previous messages visible | |
| CH-012 | Shift+Enter new line | 1. Type message<br>2. Press Shift+Enter<br>3. Continue typing | Multi-line message supported | |

### 2.2 Chat Permissions

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| CH-020 | Muted player | 1. Mute a player<br>2. They try to send message | Error toast shown, message blocked | |
| CH-021 | Unmute player | 1. Unmute previously muted player<br>2. They send message | Message goes through | |

---

## Priority 3: Social Features

### 3.1 Friend System

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| SO-001 | Send friend request | 1. Navigate to Social panel<br>2. Find user, send request | Request sent, pending status shown | |
| SO-002 | Accept friend request | 1. Receive friend request<br>2. Click Accept | Both users now friends, request cleared | |
| SO-003 | Reject friend request | 1. Receive friend request<br>2. Click Reject | Request removed, not friends | |
| SO-004 | Cancel sent request | 1. Send friend request<br>2. Cancel before accepted | Request cancelled, removed from pending | |
| SO-005 | Friends list display | 1. Add multiple friends<br>2. View Friends tab | All friends listed with online status | |
| SO-006 | Remove friend | 1. Click Remove on friend<br>2. Confirm action | Friend removed from both lists | |
| SO-007 | Pending requests badge | 1. Have pending requests<br>2. Check Requests tab | Badge shows count of pending requests | |
| SO-008 | Duplicate request prevention | 1. Send request to someone<br>2. Try to send again | Error or already pending message | |

### 3.2 Direct Messages

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| SO-020 | Start conversation | 1. Click "Message" on friend<br>2. Verify DM opens | DM panel opens with friend selected | |
| SO-021 | Send DM | 1. Type message in DM<br>2. Send | Message delivered, shows in conversation | |
| SO-022 | Receive DM | 1. Friend sends you message<br>2. Check Messages tab | Notification badge, message visible | |
| SO-023 | Multiple conversations | 1. DM multiple friends<br>2. Switch between chats | Separate conversation histories maintained | |
| SO-024 | Unread message count | 1. Receive DMs while in different tab<br>2. Check badge | Accurate unread count shown | |
| SO-025 | Mark messages as read | 1. Open conversation with unread<br>2. Verify status | Messages marked read, badge clears | |
| SO-026 | DM to non-friend | 1. Try to DM someone not on friends list<br>2. Verify behavior | Blocked or requires friend first | |

### 3.3 Block System

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| SO-030 | Block user | 1. Go to Blocked tab<br>2. Block a user | User added to blocked list | |
| SO-031 | Unblock user | 1. View blocked list<br>2. Unblock user | User removed from blocked list | |
| SO-032 | Blocked user DM | 1. Block someone<br>2. They try to DM you | Messages not delivered | |
| SO-033 | Block removes friendship | 1. Block a friend<br>2. Check Friends list | Friendship automatically removed | |
| SO-034 | Block clears pending requests | 1. Block user with pending request<br>2. Check requests | Request automatically cancelled | |

---

## Priority 4: Game Management & UI

### 4.1 Room Presets

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| UI-001 | Quick Game preset | 1. Select Quick Game | 2-min timer, $10 buy-in | |
| UI-002 | Standard Game preset | 1. Select Standard | 5-min timer, $25 buy-in | |
| UI-003 | Strategic Game preset | 1. Select Strategic | 10-min timer, $50 buy-in | |
| UI-004 | High Stakes preset | 1. Select High Stakes | 15-min timer, $100 buy-in | |

### 4.2 UI Components

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| UI-010 | Vote cards display | 1. View voting interface<br>2. Verify vote cards | Vote cards draggable, color-coded | |
| UI-011 | Drop zones highlight | 1. Drag vote card<br>2. Hover over drop zone | Drop zone highlights, visual feedback | |
| UI-012 | Player list updates | 1. Players join/leave<br>2. Monitor list | Real-time updates to player list | |
| UI-013 | Toast notifications | 1. Trigger various actions<br>2. Verify toasts | Appropriate toasts for success/error | |
| UI-014 | Modal dialogs | 1. Trigger modals (elimination, bank transfer)<br>2. Verify display | Modals open/close correctly, keyboard accessible | |
| UI-015 | Round timer visibility | 1. During active round<br>2. Verify timer | Timer prominently displayed, updates every second | |

### 4.3 Ready System

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| UI-020 | Toggle ready | 1. Click Ready button<br>2. Click again to unready | Ready status toggles, visible to all | |
| UI-021 | Ready count display | 1. Multiple players ready up<br>2. Verify counter | Shows "X/Y players ready" | |
| UI-022 | Game starts when all ready | 1. All players click Ready<br>2. Verify game start | Game begins automatically | |

### 4.4 Game Replay

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| UI-030 | View round history | 1. Complete multiple rounds<br>2. Open Round History | All rounds listed with votes/outcomes | |
| UI-031 | Replay viewer | 1. Open Replay Viewer<br>2. Navigate through events | Can replay game events chronologically | |

---

## Priority 5: Leaderboard & Profiles

### 5.1 Leaderboards

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| LB-001 | All-time leaderboard | 1. Navigate to Leaderboard<br>2. Select All-Time | Shows top players by total winnings | |
| LB-002 | Season leaderboard | 1. Select Season filter<br>2. Verify rankings | Shows current season rankings | |
| LB-003 | Weekly leaderboard | 1. Select Weekly filter<br>2. Verify rankings | Shows current week rankings | |
| LB-004 | Player ranking update | 1. Win a game<br>2. Check leaderboard | Your ranking updated | |

### 5.2 Player Profiles

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| PR-001 | View own profile | 1. Navigate to Profile<br>2. View stats | Shows games played, wins, earnings | |
| PR-002 | View other player profile | 1. Click on player name<br>2. View their profile | Shows public stats | |
| PR-003 | Change display name | 1. Edit name in profile<br>2. Save changes | Name updates across app | |
| PR-004 | Achievements display | 1. View profile achievements<br>2. Verify earned badges | Correct achievements shown | |

---

## Priority 6: Edge Cases & Error Handling

### 6.1 Connection Issues

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| EC-001 | Disconnect during game | 1. Disconnect network mid-game<br>2. Reconnect | Game state preserved, can resume | |
| EC-002 | Disconnect during vote | 1. Disconnect with vote pending<br>2. Timer ends | Vote handled (default or last set) | |
| EC-003 | Server restart | 1. Restart SpacetimeDB<br>2. Reload client | Reconnects, state restored | |

### 6.2 Invalid Actions

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| EC-010 | Sell more votes than owned | 1. Own 1 vote<br>2. Try to list 2 | Error prevented, appropriate message | |
| EC-011 | Buy from self | 1. List vote for sale<br>2. Try to buy own listing | Prevented or appropriately handled | |
| EC-012 | Negative price | 1. Try to set negative price<br>2. Submit | Input validation prevents negative | |
| EC-013 | Trade with eliminated player | 1. Player gets eliminated<br>2. Try to trade with them | Trade blocked, listings removed | |

### 6.3 Concurrent Actions

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| EC-020 | Simultaneous purchase | 1. Two players try to buy same vote<br>2. At exact same time | One succeeds, one gets error | |
| EC-021 | Vote change at timer 0 | 1. Change vote at exact moment timer ends<br>2. Verify which vote counted | Consistent behavior, clear cutoff | |
| EC-022 | Rapid repeated actions | 1. Click buy button rapidly 10 times<br>2. Verify result | Only one transaction processed | |

---

## Priority 7: Performance & Load Testing

### 7.1 Player Load

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| PF-001 | 10 player game | 1. 10 tabs join same room<br>2. Complete full game | Game runs smoothly, all updates real-time | |
| PF-002 | 20 player game | 1. 20 tabs join same room<br>2. Trade and vote | No significant lag or sync issues | |
| PF-003 | Multiple concurrent rooms | 1. Create 5 separate rooms<br>2. 3 players each | Rooms isolated, no cross-contamination | |

### 7.2 Message Load

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| PF-010 | 100 chat messages | 1. Send 100 messages rapidly<br>2. Verify all delivered | All messages appear, scroll works | |
| PF-011 | Long game session | 1. Play for 30+ minutes<br>2. Multiple rounds | No memory leaks, performance stable | |

### 7.3 Real-time Sync

| Test ID | Test Case | Steps | Expected Result | Pass/Fail |
|---------|-----------|-------|-----------------|-----------|
| PF-020 | Vote sync latency | 1. Player sets vote<br>2. Measure time until others see | Under 200ms latency | |
| PF-021 | Trade sync | 1. Complete trade<br>2. Verify balances sync | Instant balance updates | |
| PF-022 | Chat sync | 1. Send message<br>2. Measure delivery time | Under 100ms delivery | |

---

## Bug Reporting Template

When reporting bugs, use the following format:

```markdown
## Bug Report

**Bug ID**: [AUTO-GENERATED]
**Title**: Brief, descriptive title

**Priority**: Critical / High / Medium / Low
**Severity**: Blocker / Major / Minor / Cosmetic

**Test Case Reference**: [Test ID if applicable]

**Environment**:
- Browser: [Chrome 120 / Firefox 122 / Safari 17 / Edge 120]
- OS: [Windows 11 / macOS 14 / Linux]
- Players in game: [Number]
- SpacetimeDB version: [Version]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**:
What should happen

**Actual Behavior**:
What actually happens

**Screenshots/Videos**:
[Attach if applicable]

**Console Errors**:
[Copy any relevant console errors]

**Additional Context**:
[Any other relevant information]
```

---

## Sign-Off Checklist

Before marking a test cycle complete:

- [ ] All Priority 1 (Core Voting) tests executed
- [ ] All Priority 2 (Chat) tests executed
- [ ] All Priority 3 (Social) tests executed
- [ ] All Critical/High priority bugs addressed
- [ ] Regression testing on fixed bugs
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari, Edge)
- [ ] Test results documented
- [ ] Bug reports filed with complete information

---

**Document Version**: 1.0
**Created**: January 11, 2026
**Author**: QA Team
