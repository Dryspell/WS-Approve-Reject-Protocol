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
- [ ] Add integration tests for SpacetimeDB operations
- [ ] E2E tests for critical user flows

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
- **Testing**: 50% 🟡
- **Mobile Support**: 0% 🔴 (Current Sprint)

---

**Last Updated**: January 11, 2026
