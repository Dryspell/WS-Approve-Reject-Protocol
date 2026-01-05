# Vote Exchange Quick Start Guide

## What You Just Built

You've completed the full-stack implementation of **The Vote Exchange**, a multiplayer game where players trade votes in a minority-wins elimination system.

## 🎮 How to Play

### 1. Start the Game

```bash
# Terminal 1: Start SpacetimeDB
pnpm spacetime:start

# Terminal 2: Start the dev server
pnpm dev
```

### 2. Create a Game Room

1. Navigate to `/vote` in your browser
2. Click "Create Room"
3. Set a buy-in amount (e.g., $10)
4. Wait for other players to join

### 3. Gameplay Loop

Each round (default: 5 minutes):

#### Phase 1: Trading & Strategy (First 4 minutes)
- **Your Vote**: You start with 1 vote
- **Vote Market**: Buy/sell votes from other players
  - Go to "Votes" tab in the market panel
  - List your vote for sale, or buy others
- **Guarantees**: Purchase promises about vote colors
  - Go to "Guarantees" tab
  - Buy public (one buyer) or private (multiple buyers) guarantees
  - Sellers can bluff! Buyer beware.

#### Phase 2: Voting (Last 1 minute)
- **Set Colors**: Drag your votes to Red or Blue zones
- **Strategy Tips**:
  - If you have 2+ votes, split them to guarantee minority
  - Trade to accumulate votes for better odds
  - Watch what others are doing (but they can change!)

#### Phase 3: Resolution (Automatic)
- System tallies votes
- **Majority voters**: Eliminated ☠️
- **Minority voters**: Survive and advance ✅
- If 1-2 players remain: **Game Over** - Winner(s) split the pot! 💰

### 4. Win Conditions

- **Solo Victory**: Be the last player standing - take full pot
- **Dual Victory**: Two players remaining - split pot equally
- **Elimination**: Vote with majority - lose everything

## 🎯 Key Strategies

### The Split Strategy
- **With 2 votes**: Put 1 red, 1 blue → Guaranteed minority!
- **With 3 votes**: Put 2-1 split → Guaranteed minority!
- *Risk*: Everyone doing this = coin flip on which color wins

### The Bluff
- Sell a guarantee saying you'll vote red
- Then vote blue
- Buyer loses money, you keep it

### The Accumulator
- Buy votes early and cheap
- Accumulate 4-5 votes
- Split them to guarantee survival
- Win by outlasting everyone

### The Market Maker
- Don't vote, just trade
- Buy low, sell high
- Make profit on trading alone
- Use splitting strategy to survive

## 📱 UI Components

### Main Screen
- **Top Bar**: Pot size, Round timer, Your wallet
- **Left Panel**: Player list (active/eliminated)
- **Center**: Your votes (drag to red/blue zones)
- **Right Panel**: Market (votes, guarantees, history)

### Vote Colors
- **🔴 Red**: Your red votes
- **🔵 Blue**: Your blue votes
- **⚪ Unset**: Not yet colored (drag to set)

### Market Tabs
1. **Votes**: Buy/sell voting tickets
2. **Mine**: List your votes for sale
3. **Guarantees**: Buy/sell promises
4. **History**: Recent transactions

## 🐛 Testing Locally

### Multi-Player Testing
1. Open multiple browser windows/tabs
2. Each will get a unique identity
3. All join the same room
4. Start game when all ready

### What to Test
- [ ] Vote drag-and-drop to red/blue
- [ ] Listing vote for sale
- [ ] Buying vote from market
- [ ] Creating guarantee (public/private)
- [ ] Purchasing guarantee
- [ ] Round timer countdown
- [ ] Elimination mechanics
- [ ] Pot distribution
- [ ] Wallet balance updates

## 🚀 Architecture

### Frontend (SolidJS)
- **VotingInterface**: Main game screen
- **VoteCard**: Draggable vote components
- **WalletDisplay**: Balance and P/L tracking
- **PlayerList**: Active/eliminated players
- **VoteMarketPanel**: Trading interface
- **GuaranteeMarket**: Guarantee marketplace

### Backend (SpacetimeDB/Rust)
- **Tables**: User, Vote, GameRoom, Guarantee, Transaction
- **Reducers**: 
  - `set_vote_color`: Set vote red/blue
  - `set_vote_for_sale`: List vote
  - `transfer_vote_ownership`: Buy vote
  - `create_guarantee`: Sell guarantee
  - `purchase_guarantee`: Buy guarantee
  - `process_round_votes`: End round (auto)

### Real-time Sync
- All state changes broadcast instantly
- No polling - pure event-driven
- SpacetimeDB handles all synchronization

## 🔧 Configuration

### Game Settings (GameRoom)
- `buyin_amount`: Entry fee (default: $10)
- `round_duration`: Round length in seconds (default: 300 = 5 min)
- `pot_size`: Total pot (calculated from buy-ins)

### User Wallet
- `wallet_balance`: Current spendable money
- `bank_account`: Saved/withdrawn funds (future feature)
- `total_profit_loss`: Lifetime earnings

## 📚 Documentation

- **[VOTE_EXCHANGE_UI_IMPLEMENTATION.md](./VOTE_EXCHANGE_UI_IMPLEMENTATION.md)**: Full UI component docs
- **[VOTE_EXCHANGE_IMPLEMENTATION.md](./VOTE_EXCHANGE_IMPLEMENTATION.md)**: Backend implementation
- **[game-design/rules.md](./game-design/rules.md)**: Complete game rules
- **[roadmap.md](./roadmap.md)**: Development roadmap

## 🎓 Learn More

### SolidJS
- Reactive primitives: `createSignal`, `createEffect`
- Real-time updates without re-renders
- Fast, efficient UI updates

### SpacetimeDB
- Real-time multiplayer database
- Rust server, TypeScript client
- Automatic state synchronization
- No REST APIs needed

### Solid-UI
- ShadCN components ported to Solid
- Beautiful, accessible components
- Fully customizable with Tailwind

## ⚠️ Known Issues

- Mobile drag-and-drop needs touch event support
- Round history component created but not integrated
- Guarantee fulfillment penalties not in UI yet
- No tutorial/onboarding flow yet

## 🎉 What's Next?

1. **Test with friends**: Get feedback on gameplay
2. **Balance tuning**: Adjust buy-ins, round times
3. **Add sound effects**: Make it feel alive
4. **Animations**: Smooth transitions
5. **Mobile support**: Touch-friendly drag-and-drop
6. **Leaderboards**: Track top players
7. **Achievements**: Reward strategies

---

**Ready to play?** Start both servers and navigate to `/vote`!

Questions? Check the docs or ask in issues.

