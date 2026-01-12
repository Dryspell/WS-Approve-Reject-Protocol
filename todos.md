# Project TODOs

> **Status**: 95% Feature Complete! ✅ All core Vote Exchange mechanics implemented.
> 
> **Current Sprint**: Sprint 8 - Mobile Optimization 📱
>
> See [docs/development-history.md](./docs/development-history.md) for completed sprint summaries.

---

## 🎯 Current Sprint: Sprint 8 - Mobile Optimization

### High Priority - Mobile First

- [ ] **Responsive Layout Overhaul**
  - [ ] Adapt 3-column game layout for mobile (stacked/tabbed)
  - [ ] Collapsible panels with smooth animations
  - [ ] Touch-friendly spacing (min 44x44px tap targets)
  - [ ] Landscape and portrait support

- [ ] **Mobile Navigation**
  - [ ] Bottom navigation bar for main sections
  - [ ] Swipeable tabs for market/chat/replay
  - [ ] Back button handling (browser history)

- [ ] **Touch Interactions**
  - [ ] Touch-optimized drag-and-drop for votes
  - [ ] Long-press context menus
  - [ ] Swipe to dismiss modals

- [ ] **PWA Setup**
  - [ ] Create manifest.json
  - [ ] Configure service worker
  - [ ] Add offline support
  - [ ] Install prompt/banner
  - [ ] App icons (various sizes)

- [ ] **Performance Optimization**
  - [ ] Lazy load heavy components
  - [ ] Virtual scrolling for long lists
  - [ ] Bundle size reduction (code splitting)

### Medium Priority - Cross-Device Testing

- [ ] **Browser Testing**
  - [ ] iOS Safari
  - [ ] Android Chrome
  - [ ] Firefox Mobile

- [ ] **Device Testing**
  - [ ] iPhone (various models)
  - [ ] Android phones (various sizes)
  - [ ] Tablets

---

## 🧪 Testing & Validation

> **See [docs/qa-testing-outline.md](./docs/qa-testing-outline.md) for comprehensive QA testing scenarios**

- [ ] **Multi-player Testing**
  - [ ] Game 1 scenario: 10 players, no trading
  - [ ] Game 2 scenario: Vote trading between players
  - [ ] Game 3 scenario: Multiple votes, vote splitting
  - [ ] Game 4 scenario: Guarantee system with bluffing

- [ ] **Edge Cases**
  - [ ] Tie handling (50/50 split)
  - [ ] Simultaneous vote trading
  - [ ] Disconnection/reconnection

---

## 🔧 Technical Debt

### Performance
- [ ] Canvas optimization for large unit counts (100+ units)
- [ ] SpacetimeDB subscription optimization

### Testing
- [x] E2E tests for critical user flows (Playwright setup complete)
- [x] Multi-user testing support via `?multiuser=true` URL parameter
- [x] Room creation & joining tests passing
- [x] Multi-player identity isolation verified
- [x] Toast notifications & form UI tests passing
- [x] **FIXED**: Ready system toggle was using wrong user ID (cuid2 vs SpacetimeDB identity)
- [x] Add `data-testid` attributes for reliable test selectors (connection-status, ready-button, vote-red, vote-blue, round-timer, wallet-balance, chat-input, send-button, chat-messages)
- [x] **FIXED**: Server join_room reducer - prevent duplicate ChatPermission insertions
- [x] **FIXED**: VoteBox handleJoinRoom - always set currentRoom for tab navigation
- [x] Single-player ready flow tests passing
- [x] **FIXED**: Multi-player E2E test improvements:
  - [x] Add database reset before test runs (`pnpm test:reset-db` + `reset_test_data` reducer)
  - [x] Add minimum player count (3) before game can auto-start (`MIN_PLAYERS_TO_START` constant)
  - [x] Unique SpacetimeDB identities per browser context (via MultiPlayerHelper + `?multiuser=true`)
  - [x] All ready tests passing (8/8)
- [ ] Add integration tests for SpacetimeDB operations
- [ ] Expand E2E test coverage for voting mechanics
- [ ] Add E2E tests for vote trading and guarantees

### Error Handling
- [ ] Wrap all reducer calls in try-catch
- [ ] Add retry logic for transient errors

---

## 🔒 Security & Production (Before Public Launch)

- [ ] **SpacetimeDB Security**
  - [ ] Review reducers for access control
  - [ ] Add rate limiting
  - [ ] Add input validation

- [ ] **Production Readiness**
  - [ ] Test backup restoration
  - [ ] Set up monitoring
  - [ ] Load test with concurrent players
  - [ ] Create deployment checklist

---

## 📝 Documentation

- [ ] Add JSDoc comments to exported functions
- [ ] Create in-game tutorial
- [ ] Add tooltips for UI elements

---

## 📊 Progress Summary

### Completed Sprints
- ✅ Sprint 1: UI Modernization
- ✅ Sprint 2: Visual Polish
- ✅ Sprint 3: Core Vote Exchange (Server)
- ✅ Sprint 4: Game Flow Automation
- ✅ Sprint 5: Polish & Developer Tools
- ✅ Sprint 6: Social & Engagement Features
- ✅ Sprint 7: Feature Completion
- ✅ Sprint 8.1: Friends & Private Messaging System
  - Friend requests (send/accept/reject/cancel)
  - Friendship management
  - Direct message conversations
  - User blocking functionality
  - Social panel UI with tabs

### Current Status
- **Backend**: 100% ✅
- **UI**: 100% ✅
- **Polish**: 100% ✅
- **Social Features**: 100% ✅ (Friends, DMs, Blocking)
- **Testing**: 90% 🟢 (All ready tests passing, multi-player tests fixed, database reset working)
- **Mobile Support**: 0% 🔴 (Current Sprint)

---

**Last Updated**: January 12, 2026
