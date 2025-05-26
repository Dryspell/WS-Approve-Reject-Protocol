# The Vote Exchange: Mathematical Analysis

## Table of Contents

- [The Vote Exchange: Mathematical Analysis](#the-vote-exchange-mathematical-analysis)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Expected Value Analysis](#expected-value-analysis)
    - [Base Scenario](#base-scenario)
      - [No Guarantees](#no-guarantees)
    - [Single Guarantee Analysis](#single-guarantee-analysis)
      - [Probability Distribution](#probability-distribution)
      - [Expected Values](#expected-values)
    - [Double Guarantee Analysis](#double-guarantee-analysis)
      - [Probability Distribution](#probability-distribution-1)
      - [Expected Values](#expected-values-1)
    - [Comparative Analysis](#comparative-analysis)
  - [Strategic Implications](#strategic-implications)
    - [Guarantee Trading](#guarantee-trading)
    - [Vote Splitting](#vote-splitting)
      - [Single Vote Purchase](#single-vote-purchase)
      - [Anticipated Double Guarantee](#anticipated-double-guarantee)
    - [All-or-Nothing Strategy](#all-or-nothing-strategy)
      - [No Other Multiple Red Votes](#no-other-multiple-red-votes)
      - [With Other Multiple Red Votes](#with-other-multiple-red-votes)
  - [Implementation Considerations](#implementation-considerations)
  - [Appendix: Detailed Calculations](#appendix-detailed-calculations)
    - [Single Guarantee Calculations](#single-guarantee-calculations)
    - [Double Guarantee Calculations](#double-guarantee-calculations)
    - [Bob's Response Calculations](#bobs-response-calculations)
    - [Vote Splitting Calculations](#vote-splitting-calculations)
    - [All-or-Nothing Calculations](#all-or-nothing-calculations)

For the core gameplay rules and examples, see [rules.md](./rules.md).

## Introduction

This document provides mathematical analysis of The Vote Exchange game mechanics. The calculations use Bernoulli Distributions to model probabilities and expected values. Note that all calculations subtract $1.00 to account for the initial buy-in.

**Important Note**: These calculations are provided as a reference for understanding game mechanics. The actual implementation may vary, and players should not rely solely on these calculations for strategy.

## Expected Value Analysis

### Base Scenario

Consider a game with 9 players and a $1.00 buy-in.

#### No Guarantees

Expected value: $-0.0039
Lower bound: $-0.1826

### Single Guarantee Analysis

When Alice purchases a blue guarantee from Bob:

#### Probability Distribution

- 0-3 Red votes: Win with varying payouts
- 4-7 Red votes: Lose $1.00

#### Expected Values

- Total expected value: $0.4238
- Lower bound: $0.125

### Double Guarantee Analysis

When Alice purchases two blue guarantees:

#### Probability Distribution

- 0-3 Red votes: Win with varying payouts
- 4-6 Red votes: Lose $1.00

#### Expected Values

- Total expected value: $0.96875
- Lower bound: $0.4765

### Comparative Analysis

| Strategy | Expected Value | Lower Bound |
|----------|---------------|-------------|
| No guarantee | $-0.0039 | $-0.1826 |
| One guarantee | $0.4238 | $0.125 |
| Two guarantees | $0.96875 | $0.4765 |

Value of guarantees:

- First guarantee: $0.4277 (lower bound: $0.3076)
- Second guarantee: $0.54495 (lower bound: $0.3515)

## Strategic Implications

### Guarantee Trading

When Alice buys a Blue guarantee from Bob:

1. Bob can safely assume Alice will vote Red
2. Bob earns from the transaction while Alice spends
3. The transaction is cooperative, benefiting both parties
4. Bob's expected value after Alice's purchase: $-0.121

### Vote Splitting

#### Single Vote Purchase

Expected value: $1.84765

#### Anticipated Double Guarantee

Expected value: $1.625

### All-or-Nothing Strategy

#### No Other Multiple Red Votes

Expected value: $1.039

#### With Other Multiple Red Votes

Expected value: $0.3008

## Implementation Considerations

1. **Player Information**
   - How much mathematical information should be provided to players?
   - Should expected values be displayed in-game?
   - How to present probabilities without overwhelming players?

2. **Strategic Depth**
   - High variance in outcomes
   - Multiple valid strategies
   - Risk vs. reward tradeoffs
   - Importance of player interaction

3. **Balance Considerations**
   - Guarantee pricing
   - Vote splitting mechanics
   - Risk/reward ratios
   - Player interaction incentives

4. **Future Analysis Needed**
   - Larger player counts
   - Multiple round analysis
   - Market dynamics
   - Player behavior patterns

## Appendix: Detailed Calculations

### Single Guarantee Calculations

The value of a vote the next round will be at least $9.00/4 - $1.00 = $1.25 since there will be at most 4 people remaining.

Alice votes Red, Bob Votes blue, so without any other interaction, Alice wins as follows:

- 7C3 *(.5)^7, achieving the value $9.00/4 - $1.00 = $1.25 since 4 remain
- 7C2 *(.5)^7, achieving the value $9.00/3 - $1.00 = $2.00 since 3 remain
- 7C1 *(.5)^7, achieving the value $9.00/2 - $1.00 = $3.50
- 7C0 *(.5)^7, achieving $9.00/1 - $1.00 = $8.00

Alice loses if 4,5,6 or 7 of them choose Red, losing the $1.00 buyin.
She thus loses with 50% = (7C4 + 7C5+7C6 + 7C7)*(.5^7) probability.

Thus the expected value of this outcome is:
((7Choose0)*8 + (7choose1)*3.5 + (7choose2)*2+ (7choose3)*1.25 + (7choose4)*-1 +  (7choose5)*-1 +  (7choose6)*-1 +  (7choose7)*-1)*(.5^7)
= 217/512 = $0.4238

A lower bound is (0.5*$1.25)+(0.5*-$1.00) = $0.125

### Double Guarantee Calculations

When Alice purchases two blue guarantees:
((6Choose0)*8 + (6choose1)*3.5 + (6choose2)*2 + (6choose3)*1.25 + (6choose4)*-1 +  (6choose5)*-1 +  (6choose6)*-1)*(.5^6)
= 31/32 = $0.96875

Alice wins with 21/32 probability and loses with 11/32 probability,
giving a lower bound of $1.25*(21/32) - $1.00*11/32 = 61/128 = $0.4765

### Bob's Response Calculations

If Alice buys a second Blue guarantee, Bob's expected value becomes:
((6Choose0)*-1 + (6choose1)*-1 + (6choose2)*-1+ (6choose3)*-1 + (6choose4)*1.25 +  (6choose5)*2 +  (6choose6)*3.5)*(.5^6)
= -31/256 = $-0.121

with a lower bound of:
((6Choose0)*-1 + (6choose1)*-1 + (6choose2)*-1+ (6choose3)*-1 + (6choose4)*1.25 + (6choose5)*1.25 + (6choose6)*1.25)*(.5^6)
= -29/128 = $-0.2265

If Bob buys a Red guarantee in response:
((5Choose0)*3.5 + (5choose1)*2 + (5choose2)*1.25+ (5choose3)*-1 + (5choose4)*-1 + (5choose5)*-1)*(.5^5)
= 5/16 = $0.3125

### Vote Splitting Calculations

If Bob purchases another vote and splits:
((6Choose0)*3.5 + (6choose1)*2 + (6choose2)*1.25+ (6choose3)*1.25 + (6choose4)*2 +  (6choose5)*3.5 +  (6choose6)*8)*(.5^6)
= 473/256 = $1.84765

With anticipated double guarantee:
((5Choose0)*3.5 + (5choose1)*2 + (5choose2)*1.25+ (5choose3)*1.25 + (5choose4)*2 + (5choose5)*3.5)*(.5^5)
= 13/8 = $1.625

### All-or-Nothing Calculations

No other multiple Red votes:
((7Choose0)*8 + (7choose1)*8 + (7choose2)*8 + (7choose3)*-1 + (7choose4)*-1 + (7choose5)*-1 + (7choose6)*-1 + (7choose7)*-1)*(.5^7)
= 133/128 = 1.039

With other multiple Red votes:
((7Choose0)*8 + (7choose1)*8 + (7choose2)*3.5 + (7choose3)*-1 + (7choose4)*-1 + (7choose5)*-1 + (7choose6)*-1 + (7choose7)*-1)*(.5^7)
= 77/256 = 0.3008
