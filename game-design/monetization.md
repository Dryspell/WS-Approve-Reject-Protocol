# Nashfall: Monetization and SaaS

> **Document Status**: This is a **vision and aspirational planning document**. The vast majority of the revenue streams, SaaS features, and cryptocurrency mechanics described here are **not yet implemented**. The current game uses play-money only (no real USD backing, no blockchain, no cash-out). Only the following are currently live:
> - Transaction fees (1% on trades, added to pot)
> - Tournament entry structure (table exists; UI wired)
> - Side-betting system (SideBet table, SideBetPanel)
> - Dual in-game currency (MT + MBLS balances, play-money only)
>
> This document is maintained as a roadmap for future monetization phases. Do not treat it as a requirements document for current development.

---

## Table of Contents

- [Nashfall: Monetization and SaaS](#nashfall-monetization-and-saas)
  - [Table of Contents](#table-of-contents)
  - [Core Monetization Strategy](#core-monetization-strategy)
    - [Revenue Streams](#revenue-streams)
  - [SaaS Platform Model](#saas-platform-model)
    - [Core Concept](#core-concept)
    - [Platform Integration](#platform-integration)
    - [Target Platforms](#target-platforms)
    - [Benefits](#benefits)
  - [Currency Systems](#currency-systems)
    - [Overview](#overview)
    - [Currency Exchange](#currency-exchange)
    - [Benefits](#benefits-1)
  - [Implementation Considerations](#implementation-considerations)
    - [Technical Requirements](#technical-requirements)
    - [Future Development](#future-development)
  - [Monetization Platform](#monetization-platform)
  - [SaaS Cloud Model](#saas-cloud-model)
    - [Generalizing the SaaS model](#generalizing-the-saas-model)
  - [In-Game Currency System](#in-game-currency-system)
    - [Overview of In-Game Currencies](#overview-of-in-game-currencies)
    - [The Vote Exchange Protocol Currency System](#the-vote-exchange-currency-system)
      - [Currency Exchange and Market Dynamics](#currency-exchange-and-market-dynamics)
      - [Benefits of the Dual Currency System](#benefits-of-the-dual-currency-system)
      - [Technical Considerations](#technical-considerations)
  - [Pricing Strategy](#pricing-strategy)
    - [Game Access](#game-access)
    - [Transaction Fees](#transaction-fees)
    - [Currency Exchange](#currency-exchange-1)
  - [Market Analysis](#market-analysis)
    - [Target Market Size](#target-market-size)
    - [Competition Analysis](#competition-analysis)
    - [Growth Projections](#growth-projections)
  - [Technical Implementation](#technical-implementation)
    - [Blockchain Architecture](#blockchain-architecture)
    - [Platform Infrastructure](#platform-infrastructure)
  - [Risk Analysis](#risk-analysis)
    - [Technical Risks](#technical-risks)
    - [Market Risks](#market-risks)
    - [Mitigation Strategies](#mitigation-strategies)
  - [Legal and Regulatory Compliance](#legal-and-regulatory-compliance)
    - [Gambling Regulations](#gambling-regulations)
    - [Cryptocurrency Regulations](#cryptocurrency-regulations)
    - [Platform-Specific Requirements](#platform-specific-requirements)

For the core gameplay rules and examples, see [rules.md](./rules.md).

## Core Monetization Strategy

### Revenue Streams

Vall Street can monetize through multiple channels:

1. **Direct Game Revenue**
   - Initial game purchase
   - In-game currency purchases
   - Cash-out fees
   - New game entry fees
   - Re-buy fees

2. **Content and Customization**
   - Skins and cosmetics
   - Premium features
   - Custom game modes

3. **Competitive Features**
   - Tournament entry fees
   - Side-betting platform
   - Last Man Standing rewards

4. **Transaction Fees**
   - Standard 1% fee on most transactions
   - Variable fees for premium services
   - Exchange rate spreads

## SaaS Platform Model

### Core Concept

Nashfall can be implemented as a modular system with two main components:

1. Voting/Polling System
2. Trading/Marketplace System

### Platform Integration

- Chat-based interface
- API integration capabilities
- Custom currency support
- Real-time updates

### Target Platforms

- Live streaming services (Twitch, YouTube, Facebook)
- Social media platforms (Twitter, Instagram)
- Chat services (Discord, Slack)
- Game platforms (Unity, custom games)

### Benefits

1. **Revenue Generation**
   - Subscription-based access
   - Platform-specific customization
   - Premium features

2. **Market Protection**
   - Reduced copy-catting
   - Cloud-based computation
   - Enhanced security

3. **Growth Opportunities**
   - Free advertising through platform use
   - Cross-platform integration
   - Cryptocurrency integration

## Currency Systems

### Overview

The game implements a dual-currency system:

1. **Empty Marbles (MT)**
   - Primary stable currency
   - Fixed USD exchange rate
   - Direct purchase from Vall Street
   - Used for basic game functions

2. **Marbles (MBLS)**
   - Secondary cryptocurrency
   - Market-driven value
   - Earned through gameplay
   - Tradeable on exchanges

### Currency Exchange

- MT to MBLS conversion through gameplay
- Market-driven exchange rates
- Player-to-player trading
- Public exchange integration

### Benefits

1. **Player Advantages**
   - Real-world value potential
   - Risk-free entry option
   - Premium feature access

2. **Market Stability**
   - Price stability through MT
   - Value discovery through MBLS
   - Natural deflationary pressure

## Implementation Considerations

### Technical Requirements

1. **Blockchain Integration**
   - Proof of History implementation
   - Smart contract development
   - Secure exchange mechanisms

2. **Platform Development**
   - API architecture
   - Cloud infrastructure
   - Security protocols

3. **Legal Compliance**
   - Financial regulations
   - Gambling laws
   - Cryptocurrency regulations

### Future Development

1. **Platform Expansion**
   - Additional platform integrations
   - New feature development
   - Enhanced security measures

2. **Market Growth**
   - Exchange partnerships
   - Platform partnerships
   - Community development

3. **Technical Innovation**
   - Advanced blockchain features
   - Improved security measures
   - Enhanced user experience

## Monetization Platform

For context with In-Game Currency, see the relevant section of this document.
For The Vote Exchange Protocol as a concept, it is easy to license or write a platform with an API and subscription model for any specified token. For more on this model, see the section "The Vote Exchange Protocol: SaaS Model".

For The Vote Exchange Protocol as a stand-alone, there are many places in which [the company] Vall Street can monetize the game; there are additional ones in the context of THE GRAND SCHEME. We list some here:

- On Initial purchase of the game
- On purchase of In-Game Currency
- On Cash-out
- On Skins
- On entry of new game
- On reward of the pot for Last Man Standing
- On Side-bets
- On Re-buyin

It is easy to imagine Vall Street taking a 1% (or more) scrape off many of these examples.

## SaaS Cloud Model

At its core, The Vote Exchange Protocol is a relatively simple game with lots of modularity and potential variation. We see that such a system could be enjoyable and desirable not only in our dedicated game concept (the MMO/Colony-Builder aspects of this document), but truly in any system that already has CHAT functionality and/or a POINT system. While these systems are often present in other games, we expect the most desire to implement the Vote Exchange Protocol would come from users of live-streaming services such as Facebook, Youtube, Twitter, Instagram, Snapchat and Twitch as well as dedicated chat services such as Discord and Slack.

In this model, a company owner or channel owner would pay for subscription access to our platform which would allow the construction of Vote Exchange Protocol games whose interface would be through chat commands or API commands. One should compare this to the product "Stream Boss" where viewers play a similar game. Other similar products are Twitch's creation of a betting system in which viewers can bet Channel Points on some future outcome of the stream (say the Streamer beating the level). Those who pay for our subscription access would be able to charge their viewers or users for game entry and take a percentage cut of entry, just as we would as well.

The benefits of this model are many-fold:

1. This presents additional opportunities for revenue streams
2. This reduces copy-catting. It becomes less beneficial for a copy-cat to copy our product when they can simply have all the computations run on our product without investing in development costs.
3. Additional (free)advertising of our product.
4. We can use our own product.
5. Better integration with cryptocurrencies

With a model like this created, we are effectively doing all computation on the cloud, thus with proper infrastructure in place, it is likely we too will send much game computation to the server. An additional hope/expectation is that this architecture will add security to the overall dynamics.

### Generalizing the SaaS model

In making The Vote Exchange Protocol into a cloud model, we see The Vote Exchange Protocol as a complex iteration and integration of two simpler products: A vote/polling system and a trading/marketplace system. We look here to offer both parent systems as products as well as our own particular Vote Exchange Protocol system. That is, for live streaming and chat services, we hope to sell subscription based vote/polling services and trading/marketplace services that integrate via a generic chat system, again referencing and leveraging services like Discord, Twitch, Youtube, Facebook, Twitter and Slack.

To be clear, a customer of our cloud subscription model would be paying for a game room with voting and marketplace structures and customizable currencies all integrable with the common live streaming and chat services of the day.

Further, we may be able to integrate our subscription features into the indie games sphere through either a dedicated unity asset package api connection or a general api structure.

In context, we need to consider more the trading and marketplace structure, because while we see this system as viable for trading of virtual commodities, for trading of real tangible items, this does not seem like an appropriate target market. We desire to integrate with any currencies or points local to the platform, say Twitch's bits.

Proof of History and Smart Contract cryptographic ideas (see Solana) sound interesting in the context of the SaaS model. Refer to sections in this document relating to cryptocurrency.

## In-Game Currency System

### Overview of In-Game Currencies

In-game currencies (IGC) have become a standard feature in modern games, typically falling into two overlapping categories:

1. **Virtual/Rewarded IGC**: Earned through gameplay and time investment
2. **Real-valued IGC**: Purchased with real-world money

Most games today implement both types, with real-valued IGC often used for cosmetic items rather than competitive advantages to avoid "pay-to-win" criticism. Notable exceptions that allow bidirectional exchange between currencies include Albion Online, EVE Online, and Second Life.

### The Vote Exchange Protocol Currency System

Nashfall implements two primary currencies:

1. **Empty Marbles (MT)**:
   - Vall Street's internal token
   - Fixed exchange rate to USD (effectively a "stablecoin")
   - Can be purchased directly from Vall Street
   - Used for basic game participation

2. **Marbles (MBLS)**:
   - Traditional cryptocurrency with market-driven value
   - Generated through gameplay (upgrading MT to MBLS)
   - Tradeable on public exchanges
   - Can be exchanged with other players for MT

#### Currency Exchange and Market Dynamics

- Players can upgrade MT to MBLS through successful gameplay in The Vote Exchange Protocol
- Exchange rates between MT and MBLS are determined by:
  - Difficulty of upgrading MT to MBLS
  - Market liquidity
  - Supply and demand
- Players can "cash out" by converting resources to MBLS and selling on public exchanges
- Players can "circumvent" MT purchases by buying MBLS directly from other players

#### Benefits of the Dual Currency System

1. **Player Incentives**:
   - Players can earn real-world value through gameplay
   - New players can test the game without financial commitment
   - Dedicated players can potentially earn premium features through gameplay

2. **Market Stability**:
   - MT provides price stability for basic game functions
   - MBLS allows for market-driven value discovery
   - Natural deflationary pressure through gameplay rewards

3. **Cryptocurrency Integration**:
   - MBLS mining tied to gameplay and Proof of History algorithms
   - Intrinsic value backed by game functionality
   - Potential for public trading on cryptocurrency exchanges

#### Technical Considerations

The implementation of MBLS as a cryptocurrency requires:

- Integration with blockchain technology
- Development of Proof of History algorithms
- Secure exchange mechanisms
- Compliance with relevant financial regulations

Note: The cryptocurrency aspects of MBLS are subject to technical feasibility and legal considerations. Further development and expert consultation are required to implement these features.

## Pricing Strategy

### Game Access

1. **Base Game**
   - Initial purchase: $19.99
   - Free-to-play version with limited features
   - Premium subscription: $9.99/month

2. **SaaS Platform**
   - Basic tier: $49.99/month
   - Professional tier: $149.99/month
   - Enterprise tier: Custom pricing

### Transaction Fees

1. **Standard Fees**
   - Game entry: 1%
   - Currency exchange: 0.5%
   - Marketplace transactions: 1%
   - Cash-out: 2%

2. **Premium Services**
   - Custom game modes: 2%
   - Tournament hosting: 3%
   - API access: $0.001 per call

### Currency Exchange

1. **MT Purchase**
   - Direct purchase: No fee
   - Player-to-player: 1%
   - Bulk discounts: 5-20%

2. **MBLS Transactions**
   - Mining rewards: No fee
   - Exchange listing: 0.1%
   - Trading fees: 0.25%

## Market Analysis

### Target Market Size

1. **Gaming Market**
   - Global gaming market: $200B+
   - Strategy games: $15B
   - Social gaming: $25B
   - Cryptocurrency gaming: $5B

2. **Platform Integration**
   - Twitch: 140M monthly users
   - Discord: 150M monthly users
   - YouTube Gaming: 100M monthly users
   - Total addressable market: ~400M users

### Competition Analysis

1. **Direct Competitors**
   - Stream Boss
   - Twitch Predictions
   - Discord Polls
   - Market share: <5% combined

2. **Indirect Competitors**
   - Traditional betting platforms
   - Social gaming platforms
   - Cryptocurrency exchanges
   - Market share: ~20% combined

### Growth Projections

1. **Year 1**
   - User base: 100,000
   - Revenue: $2M
   - Platform integrations: 3

2. **Year 3**
   - User base: 1M
   - Revenue: $20M
   - Platform integrations: 10

3. **Year 5**
   - User base: 5M
   - Revenue: $100M
   - Platform integrations: 20

## Technical Implementation

### Blockchain Architecture

1. **Proof of History**
   - Solana-based implementation
   - Transaction speed: 65,000 TPS
   - Block time: 400ms
   - Energy efficiency: 0.00051 kWh per transaction

2. **Smart Contracts**
   - Automated market making
   - Decentralized exchange
   - Voting verification
   - Reward distribution

3. **Security Measures**
   - Multi-signature wallets
   - Cold storage for reserves
   - Regular security audits
   - Insurance coverage

### Platform Infrastructure

1. **Server Architecture**
   - Cloud-based deployment
   - Auto-scaling capabilities
   - Load balancing
   - Geographic distribution

2. **API Design**
   - RESTful endpoints
   - WebSocket support
   - Rate limiting
   - Documentation

3. **Data Management**
   - Real-time analytics
   - User behavior tracking
   - Market data analysis
   - Performance metrics

## Risk Analysis

### Technical Risks

1. **Blockchain**
   - Network congestion
   - Smart contract vulnerabilities
   - Forking risks
   - Implementation complexity

2. **Platform**
   - Scalability issues
   - Integration challenges
   - Performance bottlenecks
   - Security breaches

### Market Risks

1. **Competition**
   - New entrants
   - Platform changes
   - Market saturation
   - Technology shifts

2. **Regulatory**
   - Changing laws
   - Regional restrictions
   - Compliance costs
   - Legal challenges

### Mitigation Strategies

1. **Technical**
   - Regular updates
   - Security audits
   - Backup systems
   - Monitoring tools

2. **Market**
   - Diversification
   - Platform partnerships
   - Community building
   - Agile development

## Legal and Regulatory Compliance

### Gambling Regulations

1. **Jurisdictional Requirements**
   - US: State-by-state compliance
   - EU: GDPR and gambling laws
   - Asia: Regional restrictions
   - Global: KYC/AML requirements

2. **Implementation**
   - Age verification
   - Geographic restrictions
   - Transaction limits
   - Reporting systems

### Cryptocurrency Regulations

1. **Compliance Requirements**
   - SEC regulations
   - CFTC oversight
   - International standards
   - Tax reporting

2. **Implementation**
   - Regulatory reporting
   - Transaction monitoring
   - User verification
   - Documentation

### Platform-Specific Requirements

1. **Streaming Platforms**
   - Terms of service
   - API usage
   - Content guidelines
   - Revenue sharing

2. **Chat Services**
   - Privacy policies
   - Data handling
   - User agreements
   - Security standards
