# The Vote Exchange

## Table of Contents
- [The Vote Exchange](#the-vote-exchange)
  - [Table of Contents](#table-of-contents)
  - [The Vote Exchange: In Context](#the-vote-exchange-in-context)
  - [The Vote Exchange: Inspiration and References](#the-vote-exchange-inspiration-and-references)
  - [The Vote Exchange: Gameplay](#the-vote-exchange-gameplay)
    - [Players](#players)
    - [Outline of Gameplay](#outline-of-gameplay)
    - [Examples of Gameplay](#examples-of-gameplay)
      - [Game 1](#game-1)
      - [Game 2](#game-2)
      - [Game 3](#game-3)
      - [Game 4](#game-4)
      - [Game 5](#game-5)
  - [The Vote Exchange: Side Notes](#the-vote-exchange-side-notes)
    - [Big Players vs Little Players](#big-players-vs-little-players)
  - [The Vote Exchange: Continued Context](#the-vote-exchange-continued-context)
  - [The Vote Exchange: Modifiable Settings](#the-vote-exchange-modifiable-settings)
    - [General Settings](#general-settings)
    - [Money Flows](#money-flows)
  - [The Vote Exchange: Collaboration](#the-vote-exchange-collaboration)

For detailed mathematical analysis, see [mathematical-analysis.md](./mathematical-analysis.md)
For monetization and SaaS details, see [monetization.md](./monetization.md)
For legal considerations, see [legal-considerations.md](./legal-considerations.md)

## The Vote Exchange: In Context

The Vote Exchange is a market based game in which players trade votes that are submitted at the end of a time frame. When referring to just the voting aspect of the game, one could call it The Minority Game which has been researched to some degree in the fields of mathematical game theory. We may use The Minority Game and The Vote Exchange two interchangeably in this document, so reader beware that Minority Game refers to absence of trade.

In context with THE GRAND SCHEME, in order to participate in ANY market in the game (for labor or resources as well as votes), players must participate in some instance of The Vote Exchange at that moment (instances are currently thought to be tiered by length of time-frames). In essence, the market that enables players to trade resources is parallel yet connected to the market in which players trade votes and the market for RESOURCES only exists as long as the market for VOTES does. When the gameplay for one instance of The Vote Exchange terminates, its local resource market closes and all local resources must either be destroyed or relocated.

## The Vote Exchange: Inspiration and References

## The Vote Exchange: Gameplay

For this section, we only discuss the trading of VOTES on the market and not RESOURCES. One must imagine that RESOURCES can also be traded on this market simultaneously.

### Players

- 3 to Unlimited

### Outline of Gameplay

A binary choice (red or blue, yes or no, etc…) is presented to players. Within the given time (say 5 minutes), players negotiate between each other to buy or sell their voting ticket or they may buy or sell guarantees to vote in a specified way according to their agreement. At the end of the allotted time, players vote and the vote is tallied. All players who voted in the majority are eliminated and a new voting round begins with the remaining players. Players who had multiple voting tickets in the minority (through the purchasing of other players' tickets) retain those tickets for the following round. The game ends when there are only one or two players remaining in which case the winners take the pot. A tie in any round terminates the game and players split the pot proportionate to their number of votes they voted that round.

### Examples of Gameplay

Here we provide examples of Gameplay and commentary. Note that all games given are supposed to be simple and rise in order of complexity. The potentials of this market are entirely too difficult to enumerate their possibilities in writing, but such difficulty to enumerate should be familiar to those of us who have ever read debug logs. For reference, please see the identically numbered games in the slides presentation Minority Game-Play.

#### Game 1

Game 1 is what you might see in the literature regarding any similar games such as "The El Farol Bar Problem" and "The Minority Game" in that there is no trading involved. See [El Farol Bar Problem](https://en.wikipedia.org/wiki/El_Farol_Bar_problem). For an amazing rendition, please read The Liar Game manga.

Ten players buy in for $1.00 each making a $10.00 pot. The players are: Alice, Bob, Charles, Dennis, Elizabeth, Francis, George, Harriet, Irene, James. No players wish to negotiate and simply vote at the end of the time. The vote goes 7 Red to 3 Blue with Alice, Elizabeth and Francis voting Blue. They remain for the next round while the rest are eliminated. None wish to negotiate again and the vote goes 1 Red to 2 Blue with Francis voting Red. Francis wins the $10.00 pot.

#### Game 2

Game 2 is a basic demonstration of trades and showcasing the motivation to buy another's vote.

Ten players buy in for $1.00 each making a $10.00 pot. The players are the same. James lists his vote for sale for $1.50. Alice counters his offer at $1.40 and James accepts. George makes a buy request for $1.25 and a sale listing for $1.75. No one accepts either offer and no one else wishes to negotiate. The vote is again 7 Red to 3 Blue with Alice splitting her two votes, guaranteeing her in the minority while the other two Blue voters are again Elizabeth and Francis; all other players are eliminated.

During the next round, Alice lists her vote for sale for $3.00, Francis lists her vote for sale for $1.50 and Elizabeth quickly takes Francis's offer. Having done so, Elizabeth now has two votes and Alice only one while Francis has left the game with $1.50, a $0.50 profit. With only two players remaining, there is no negotiation to be had and Elizabeth splits her votes guaranteeing herself in the minority and Alice in the majority. Elizabeth takes the $10.00 pot for a $7.50 profit and Alice ends with a $2.40 loss.

#### Game 3

Game 3 is a demonstration of the possibilities of complex gameplay without the implementation of GUARANTEES. Again, please see the above referenced slides or draw a picture yourself otherwise this is impossible to follow.

Ten players buy in for $1.00 each making a $10.00 pot. The players are the same. Five players list their votes for $1.25. Alice purchases two; Bob, Charles and Dennis each purchase one. Elizabeth is the only other remaining player. The vote is as follows:

| Red | Blue |
|-----|------|
| Alice | Alice |
| Alice | |
| Bob | Bob |
| Charles | Charles |
| Dennis | Dennis |
| | Elizabeth |

Alice, Bob, Charles and Dennis move on to the next round. Alice lists her vote for $3.00 and a buy request for $2.00. Bob lists his vote for $2.50. Dennis sells his vote to Alice for $2.00 and she removes her initial sale listing. Seeing this, Bob relists his vote for $5.00. Charles now lists his vote for $4.00. Alice lists both votes for $3.50. Charles buys both of Alice's votes and removes his sale listing. Now that Charles has 3 votes, the final tally could go either of two ways (without loss of generality):

Scenario 1:

| Red | Blue |
|-----|------|
| Charles | Charles |
| Charles | |
| Charles | |
| Bob | |

Scenario 2:

| Red | Blue |
|-----|------|
| Charles | Charles |
| Charles | |
| | Bob |

Since Bob effectively votes randomly, we consider the two scenarios. For the first, the vote is tied and the pot is split with Charles getting three portions of $2.50 each and Bob getting one. In the second scenario, Charles is the winner of the $10.00 pot.

In summary:

- Alice has purchased the buy-in and two votes for $1.25 each and sold two votes for $3.50 each, netting $3.50 profit
- Bob made a buy-in and a purchase for $1.25 so nets a $2.25 loss
- Charles made the buy in, a purchase for $1.25, and two purchase of $3.50, netting $0.75 profit from the $10.00 pot
- The five starting players to sell their votes for $1.25, make a $0.25 profit each

#### Game 4

Game 4 is an introduction to the idea of guarantees and how they function in the marketplace. Readers should understand guarantees as transactions of market information. A promise that an individual will vote Red is probabilistic knowledge of the outcome of the final vote. That this is probabilistic knowledge leads to inevitabilities of bluffs and double-bluffs.

Ten players buy in for a $1.00 each for a $10.00 pot. The players are the same. Bob offers a private guarantee to vote Red for $0.70. Charles offers a private guarantee to vote Red for $0.60. Dennis offers a public guarantee to vote Blue for $0.90. Alice takes Bob and Charles's offers. Elizabeth takes up their offers as well (Once a person's Public guarantee vote offer is filled then offer is removed from the market, not for Private guarantees). Francis buys Dennis's Blue guarantee. Harriet sells her vote to George for $1.25. The time limit ends and the vote goes as follows:

| Red | Blue |
|-----|------|
| Bob | Alice |
| Charles | Elizabeth |
| Francis | Dennis |
| | George |
| | George |
| | Irene |
| | James |

Bob, Charles, Francis and George move onto the next round. Bob lists his vote for sale for $2.00. Charles offers a private guarantee to vote red for $1.00. George buys Charles's guarantee. Francis buys Bob's vote. The vote is as follows:

| Red | Blue |
|-----|------|
| Charles | George |
| Francis | Francis |

The vote is tied. The players split the pot with Francis getting two portions of $2.50 each. In summary:

- Alice made a buy in of $1.00 and purchased two guarantees, one for $0.60 and one for $0.70 so nets a $2.30 loss
- Bob has bought in for $1.00, sold two guarantees for $0.70 each and his vote in the second round for $2.00 for a gain of $2.40
- Charles also bought in for $1.00 and sold two guarantees for $0.60 each, and one guarantee for $1.00. He also got a $2.50 portion of the pot making a $3.70 net profit
- Dennis nets a $0.10 loss on his buy-in and guarantee sale
- Elizabeth played the same as Alice for a $2.30 loss
- Francis made a buy-in, purchased a blue guarantee for $0.90 and Bob's vote for $2.00. She also won two portions of a $10.00 pot split four ways for a $5.00 gain, resulting in a $1.10 profit
- George made the buy-in and a vote purchase for $1.25 and won a portion of the pot for a net $0.25 gain
- Harriet made a $1.25 vote sale for $0.25 in profit
- Irene and James lost only their initial buy-in

#### Game 5

One-hundred players buy in for $20.00 each making a $2000 pot. At the start of the round, the players actions are as follows:

- Players #62 to #100 list private blue guarantees for $6.50
- Players #32 to #61 list private red guarantees for $6.50
- Players #26 to #31 list their votes for sale for $25.00
- Players #20 to #25 list a public blue guarantee for $10.00
- Players #13 to #19 list a public red guarantee for $10.00

I don't know what else to write for game 5. It's too complicated. You can imagine what happens next. More and more trades.

## The Vote Exchange: Side Notes

Players can set votes in advance and those colors will only be revealed at the end of the time frame. This should be obvious but needs to be written somewhere.

Throughout the games above, the reader should take note that the players were using additional money not contributed during the buy-in to play the game competitively. In each trade that occurred, the buyer used money from their WALLET that they brought with them to the game. This is important as it means the sticker price isn't the final price. Some may consider this deceptive if not well informed. We also make a distinction here between a buyer's WALLET (the money they have brought with them but not yet spent) vs. a buyer's BANK ACCOUNT (a separate internal saved currency location/value).

### Big Players vs Little Players

## The Vote Exchange: Continued Context

As a whole, this is an outline of the essence of the Vote Exchange. There is potential for much much more, however, this is the core of the project and working with polish and thoughts of modular expansion is essential. We are very interested in implementing cryptocurrency technology into this exchange and are open to exploring any ideas. Please contact the authors for any thoughts or ideas as always.

As a stand-alone, the Vote Exchange itself is a viable product given that:

1. Buy-ins are done with real-world currency and
2. that it is possible to cash out.

Without these two stipulations, we are uncertain if the product can gain traction in the flooded marketplace without the additional MMO/Colony-Builder and/or GACHA-style mechanics that we have explored (we lean towards MMO/Colony-Builder ethically and pragmatically). That being said, we believe that it can be possible for the Vote Exchange to be a product that sits alongside the MMO/Colony-Builder aspects of the game so that more serious betting players can focus on The Vote Exchange while others can enjoy both. The additional benefit of the MMO/Colony-Builder is the natural market structure that arises from these resource gathering style games. For more, please refer to further sections below which describe the MMO/Colony-Builder gameplay.

While the core gameplay loop of The Vote Exchange is fresh in the reader's mind, we wish to speak of the "variables" that can be modified for an individual game of The Vote Exchange.

## The Vote Exchange: Modifiable Settings

### General Settings

- Number of votes per player. Should this be able to vary per player on initialization of the game?
- Time limits per round. This may be referred to as the Cycle Length, Time Frame, or Trading Period Length in this document.
- Limits on additional cash, i.e. the maximum size of a player's local WALLET, that can be used to purchase other's votes in the market. There are unique situations that can occur in the game in which despite already being "in the red" i.e. losing money in net, the optimal decision is actually to make a smart purchase i.e. spend more money in order to not lose as much. This is counterintuitive but valid given some exploration not written here. Limits on cash to spend must be kept with this in mind, however, it is intuitive that the limit of cash to spend should be no more than one could possibly earn during that game but unclear if that is enough to minimize the amount one could possibly lose.
- Number of players per game.
- The voting trigger does not have to be a timer but having time as the ultimate authority is a good solution. Another proposed solution is to have voting occur when a super majority wants the voting to occur i.e. a vote on voting. In the meantime players would continue to trade and play the MMO/Colony-Builder/Resource Marketplace. See sections regarding "The Eternal Format".

### Money Flows

The minority game allows for a wide variety of options for distributions of money during the game. We list some here:

- **Initial Buy-In**: The starting pot may be generated from an initial buy in to the game.
- **Post-Elimination Buy-In**: Eliminated players may buy back into the game after having been eliminated or selling their initial ticket. This rebuy cost must be substantially higher than the initial buy in so as to be fair.
- A percentage of player transactions may be contributed to the pot to incentivize more trading. The company may or may not match transaction contributions to the pot. This also allows for games without an initial buy-in (and thus no initial pot) to be created while still incentivizing player transactions during the game for a growing pot.
- **Side-bets** on voting outcomes and distributions. There is no reason not to implement this.
- Distribution of the pot may occur to only finalists or may be done at the end of each round. For example, at the end of a round, half the pot may be distributed to the remaining players while the other half remains in the pot. A setup like this allows options for "continuous" games in which the game never terminates but a portion of the pot is distributed each round to remaining players and eliminated players or new players may buy into a game in progress. In this case, a re-buyin may not have to be as substantial.

## The Vote Exchange: Collaboration
