# Nashfall — The Vote Exchange Protocol: MMO/Colony-Builder

## Table of Contents

- [The Vote Exchange Protocol: MMO/Colony-Builder](#the-vote-exchange-mmocolony-builder)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Inspiration and References](#inspiration-and-references)
    - [Reference Games](#reference-games)
      - [MMOs](#mmos)
      - [Colony-Builders](#colony-builders)
      - [RPGs and Survival Games](#rpgs-and-survival-games)
      - [Market Games](#market-games)
      - [Mobile Colony Battlers](#mobile-colony-battlers)
      - [Battle Royale Games](#battle-royale-games)
  - [Pros \& Cons](#pros--cons)
    - [Pros](#pros)
    - [Cons](#cons)
      - [Pros to Removing Main Player Character](#pros-to-removing-main-player-character)
      - [Cons to Removing Main Player Character](#cons-to-removing-main-player-character)
  - [Gameplay](#gameplay)
    - [Core Mechanics](#core-mechanics)
  - [Integration with The Vote Exchange Protocol](#integration-with-the-vote-exchange)
    - [Simple Approach](#simple-approach)
    - [Complex Approach](#complex-approach)
  - [Resource Market](#resource-market)
  - [Multi-TimeFrame Extension](#multi-timeframe-extension)
    - [Game Server Tree](#game-server-tree)
    - [Moving Down the Tree](#moving-down-the-tree)
    - [Moving Up the Tree](#moving-up-the-tree)
    - [Tick-Rate Considerations](#tick-rate-considerations)
  - [New Player Experience](#new-player-experience)
    - [Bottom-Up Approach](#bottom-up-approach)
  - [Game Termination](#game-termination)
    - [Rules for Intermediary Games](#rules-for-intermediary-games)
  - [The Eternal Format](#the-eternal-format)
  - [Game Setting and Style](#game-setting-and-style)
    - [Setting](#setting)
    - [Art Style](#art-style)
    - [Story](#story)
  - [Core Gameplay Systems](#core-gameplay-systems)
    - [Multiplayer \& Chat](#multiplayer--chat)
    - [Marketplace](#marketplace)
    - [Skins and Cosmetics](#skins-and-cosmetics)
    - [Main Player Character](#main-player-character)
    - [Resource Gathering](#resource-gathering)
    - [Player Level Up \& Experience](#player-level-up--experience)
    - [Stats](#stats)
    - [Crafting](#crafting)
    - [Equipment](#equipment)
    - [Colony Building](#colony-building)
  - [Resources and Crafting](#resources-and-crafting)
    - [Item Modifiers](#item-modifiers)
    - [Primary Resources](#primary-resources)
    - [Secondary Resources](#secondary-resources)
    - [Tertiary Products](#tertiary-products)
  - [Equipment System](#equipment-system)
    - [Item Modifiers](#item-modifiers-1)
    - [Equipment Types](#equipment-types)
    - [Weapons](#weapons)
  - [Buildings and Workshops](#buildings-and-workshops)
    - [Storage](#storage)
    - [Dormitories / Housing](#dormitories--housing)
    - [Farms](#farms)
    - [Extraction Sites](#extraction-sites)
    - [Refineries](#refineries)
    - [Manufacturing](#manufacturing)
    - [Other](#other)
  - [Combat System](#combat-system)
    - [Battle Arena](#battle-arena)
    - [Combat Mechanics](#combat-mechanics)
  - [Laborer System](#laborer-system)
    - [Genetics and Lineage](#genetics-and-lineage)
    - [Stats](#stats-1)
  - [Automation](#automation)
    - [Bots](#bots)
    - [Player Automation](#player-automation)

For shared systems including currencies, markets, and multi-timeframe mechanics, see [shared-systems.md](./shared-systems.md)
For core Vote Exchange Protocol mechanics, see [rules.md](./rules.md)

## Introduction

The MMO/Colony-Builder is an extension of The Vote Exchange Protocol that adds resource management, colony building, and laborer management mechanics. This document focuses on these additional features while maintaining integration with the core Vote Exchange Protocol mechanics.

**Live expedition loop (August 2026).** What `/vote` actually plays: each minion is a vote; **3 actions** per round; harvest wood/stone/ore; found **one camp** (3 wood + 2 stone); refine 2 raw → 1 processed; craft-and-equip hatchet / spear / vest; send-home or survive to the **roster** (gear stays on the veteran); majority minions fight on a hex board. Guest Game Over can copy a recovery code or bind a username + passphrase.

**Parked in this document.** The 16-building catalog, `game_tick` workshops, genetics breeding, housing/tax, parent-server tree, and Eternal Format are the long-game design. They are not on the live HUD. Implementation truth: [docs/STATUS.md](../docs/STATUS.md).

## Inspiration and References

The games market has long been filled with MMOs and Colony-Builders with all of them building and iterating on similar and novel ideas. See [Construction and Management Simulation](https://en.wikipedia.org/wiki/Construction_and_management_simulation). Their intersection is an extension of RPG ideas going back to Dungeons and Dragons and beyond.

### Reference Games

#### MMOs

- World of Warcraft
- RuneScape
- Albion Online
- Guild Wars 2

#### Colony-Builders

- Dwarf Fortress
- Factorio
- Mindustry
- Rimworld
- Space Haven
- Songs of Syx
- Industries of Titan

#### RPGs and Survival Games

- Escape from Tarkov
- Terraria
- Minecraft
- Project Zomboid
- ARK
- Elder Scrolls series
- 7 Days to Die

#### Market Games

- Albion Online
- Second Life
- EVE Online

#### Mobile Colony Battlers

- Clash of Clans

#### Battle Royale Games

- Player Unknown's Battlegrounds
- Fortnite
- ARK: Survival of the Fittest

## Pros & Cons

### Pros

- Familiar gameplay loops (Gather -> Build -> Grow)
- Addictive growth mechanics
- Established player base
- Simple top-down 2D graphics
- Idle combat
- Complex market dynamics
- Management simulation
- Modability

### Cons

- Additional complexity
- Learning curve
- Possible removal of main player character

#### Pros to Removing Main Player Character

- Simpler gameplay

#### Cons to Removing Main Player Character

- Loss of opportunities to monetize cosmetics
- Loss of connection of player with main character

## Gameplay

As it stands, the idea of the MMO/Colony-Builder gameplay is to have the player character act as a Lord over a group of laborers.

### Core Mechanics

- Players assign laborers to tasks such as harvesting resources
- Build buildings for harvesting or refining resources into higher tier items
- Most buildings will be publicly accessible in the multiplayer context
- Private buildings include storage areas, sleeping areas for laborers
- Groups of players can work together to build refineries and extraction workshops
- Players who contribute to building construction can tax those who did not
- Players can equip their units with player-specific items
- Laborers have their own specific items
- Combat is separated into PvE and PvP categories
- Laborers and players may gain experience and level up for efficiency rewards

## Integration with The Vote Exchange Protocol

As mentioned in "The Vote Exchange Protocol: In Context", in order to participate in any market, even resource and labour markets, the player must participate in The Vote Exchange Protocol. The way we currently consider this connection is the idea that the laborers themselves are the voters as assigned by their Player Lord. If a player has 10 laborers, then the player has 10 votes. They can color their laborers with red or blue clothing (skin) according to their designated vote. Those laborers that vote in the majority must be either eliminated or pseudo eliminated.

### Simple Approach

If a laborer votes in the majority, the laborer is eliminated. All resources on the body are destroyed.

### Complex Approach

Instead of immediate elimination, we turn the vote from The Vote Exchange Protocol into an entry into an automated team death-match. For every laborer an individual player has that votes in the majority, those laborers join together as a team in a death-match against other such teams from the opposing players. Last team standing can return to the game as laborers for their Player Lord and work and vote again.

## Resource Market

It is currently our intention for all trades to be paired against one of our two currencies, namely Empty Marbles (MT). We consider MT to be our primary and pass-through currency through which resources on the market can be traded. The intention with MT is to allow for negotiation of real-world currency to in-game resources as an unlimited resource with fixed exchange rates to real-world currency.

## Multi-TimeFrame Extension

### Game Server Tree

The game servers are arranged in a tiered tree structure based on trading period lengths. Each time-frame represents a game server in which the length of the trading period for one cycle of the instance of The Vote Exchange Protocol on that server is equal to that node's name.

### Moving Down the Tree

Players can move resources between servers, taking advantage of different trading periods. When moving down the tree, players must join a new game rather than an in-progress one.

### Moving Up the Tree

Players can command laborers to return to a parent server, carrying specified resources. This voids the vote for that laborer but allows for resource preservation.

### Tick-Rate Considerations

Tick-rates vary between servers to maintain appropriate gameplay pacing and resource management.

## New Player Experience

****### Top-Down Approach
New players start in longer time-frame servers (e.g., "City" with 1-month trading period) and gradually move to faster-paced servers.

### Bottom-Up Approach

Aggressive players can start in faster-paced servers (e.g., "Expedition" with 1-minute trading period) and focus on The Vote Exchange Protocol mechanics.

## Game Termination

### Rules for Intermediary Games

- Quicker paced games cannot exist without a parent game
- If a parent game terminates, all children must terminate
- New games cannot last longer than the remaining duration of the parent
- Parent game end time must be predictable
- Children games must know if they can play another round before parent termination

## The Eternal Format

The Eternal Format is the ultimate parent server with unique mechanics:

- Voting triggered by super-majority desire
- No running from votes
- Half of pot rewarded to minority, half remains
- Transaction fees contribute to the pot
- Vall Street reserves right to fulfill/cancel orders

## Game Setting and Style

### Setting

Medieval fantasy setting with potential for space-western expansion.

### Art Style

- Top-down 2D pixel art
- Grid-based sprite tile-maps
- Non-grid-based player movement
- Grid-based laborer movement with diagonal movement enabled

### Story

Time Shadows have overwhelmed reality. Humanity survives in Time Shards maintained by Essence from Battle Arena sacrifices.

## Core Gameplay Systems

### Multiplayer & Chat

- Real-time communication
- Trade negotiations
- Resource coordination

### Marketplace

- Resource trading
- Laborer trading
- Equipment trading

### Skins and Cosmetics

- Character customization
- Building aesthetics
- Laborer appearance

### Main Player Character

- Unique equipment slots
- Specialized abilities
- Leadership role

### Resource Gathering

Laborers gather primary resources from nodes scattered across the map. Each resource type is tied to a specific skill:

| Resource | Skill | Biome Zone (server default spawn) |
|----------|-------|-----------------------------------|
| Wood | Woodcutting | Forest (NW corner) |
| Fiber | Farming | Forest (NW corner) |
| Food | Hunting / Farming | Forest NW, Plains SE |
| Stone | Quarrying | Quarry (NE corner) |
| Sand | Quarrying | Quarry (NE corner) |
| Coal | Mining | Quarry NE, Mine SW |
| Metal Ore | Mining | Mine (SW corner) |
| Gems | Quarrying | Mine (SW corner), sparse Center |
| Hide | Hunting | Plains (SE corner) |

Resource nodes have an `amount` value that depletes on harvest and regenerates over time (`regeneration_rate`, `regeneration_timer`). Laborers assigned to a depleted node will automatically seek the next nearest available node of the same type.

Secondary and tertiary resources are produced through the building refinement pipeline (see **Buildings and Workshops**).

### Player Level Up & Experience

Experience and leveling are tracked **per skill**, not as a single total level. Each skill levels independently from 1 to 5. Higher skill levels increase the speed, yield, or effectiveness of the corresponding action.

#### Skill Definitions

| Skill | Triggered By | Primary Effect |
|-------|-------------|----------------|
| Woodcutting | Harvesting wood nodes | Faster chop speed, higher yield per gather |
| Mining | Harvesting metal ore nodes | Faster mine speed, higher yield per gather |
| Quarrying | Harvesting stone and gem nodes | Faster quarry speed, higher yield per gather |
| Hunting | Harvesting hide and food nodes | Faster hunt speed, higher yield per gather |
| Farming | Harvesting fiber and food (farm) nodes | Faster farming speed, higher yield per gather |
| Crafting | Crafting equipment and refined materials | Reduced material cost per tier, faster craft time |
| Combat | Participating in Battle Arena rounds | Increased base attack/defense in future battles |

#### Level Thresholds

Each skill has 5 levels. XP is awarded per successful gather or craft action. Approximate thresholds:

| Level | XP Required (cumulative) |
|-------|--------------------------|
| 1 | 0 (starting) |
| 2 | 100 |
| 3 | 300 |
| 4 | 700 |
| 5 | 1500 (max) |

XP is not transferable between skills. Laborers retain their skill levels across rounds within the same game.

### Stats

- Health
- Attack
- Defense
- Movement Speed
- Initiative
- Agility
- Attack Speed
- Critical Strike Chance
- Crit Strike Multiplier
- Intelligence
- Mana
- Stamina
- Footing
- Weapon Power
- Armor Power
- Happiness
- Discomfort

### Crafting

- Resource refinement
- Item creation
- Building construction

### Equipment

- Weapons
- Armor
- Tools
- Accessories

### Colony Building

- Collaborative construction
- Public buildings
- Private buildings
- Resource management

## Resources and Crafting

### Item Modifiers

Three tiers of enchantment:

- Magic
- Unique
- Legendary

### Primary Resources

- Wood
- Stone
- Metal Ore (Iron, Copper, Silver, Gold, Titanite)
- Coal
- Gems
- Fiber
- Hide
- Sand
- Food/Rations

### Secondary Resources

- Wooden Pole
- Lumber
- Cut Stone
- Metal Ingot
- Cloth
- Rope/String
- Leather
- Glass

### Tertiary Products

- Armor
- Weapons
- Tools
- Clothes
- Empty Marbles (MT)
- Essence Marbles (MBLS)

## Equipment System

### Item Modifiers

- Tier (1-5, 400 IP per tier)
- Material
- Enchantment (400 IP per Enchantment)
- Quality (Poor to Excellent)
- Surface (Rusted to Exalted)
- Structure Modifier (Spiked, Jeweled)

### Equipment Types

- Helmet
- Shoulders
- Body
- Hands
- Rings (2x)
- Amulet
- Belt
- Pants
- Shoes
- Charms/Spiritwards

### Weapons

- Dagger
- Hand-to-hand
- Bow
- Crossbow
- Throwing Knives
- Staff
- Wand
- Polearm
- Scepter
- Sword (1H, 2H)
- Axe (1H, 2H)
- Shield
- Tome
- Spellshield

## Buildings and Workshops

### Storage

- Resource storage
- Item storage

### Dormitories / Housing

- Laborer housing
- Player housing

### Farms

- Food production
- Resource cultivation

### Extraction Sites

- Wood Cutting
- Mining
- Quarry
- Hunter's Lodge
- Farms/Fiber Picking

### Refineries

- Carpenter
- Forge
- Mason
- Weaver
- Tanner
- Kitchen
- Glass Furnace

### Manufacturing

- Armorer
- Weaponsmith
- Toolsmith
- Tailor
- Glass Blower
- Infuser

### Other

- Laborer Breeding Buildings

## Combat System

### Battle Arena

The Battle Arena is a separate combat zone on the local map. When a voting round resolves, all laborers who voted in the **majority** are teleported to the Battle Arena to fight for their survival.

- **Entry**: Majority-voting laborers are automatically transferred at vote resolution; minority laborers remain safe
- **Teams**: Laborers from different players are grouped into opposing teams based on their original vote color
- **Automated (Auto-Chess)**: All combat is fully automated — no player input during the battle
- **Turn-based resolution**: Each turn, units attack based on Initiative order; stats (Attack, Defense, HP) and equipped items determine outcomes
- **Deterministic**: Given the same stats and equipment, the same team wins every time (no hidden RNG)
- **Survivors return**: Laborers who survive the Battle Arena return to their player lord and can vote again in subsequent rounds
- **Losers are eliminated**: Laborers who fall in the Arena are permanently removed from the game; their inventory is dropped

### `combat_enabled` Room Flag

Room creation includes a **Combat** toggle. When disabled:

- Majority-voting laborers are **eliminated immediately** without entering the Battle Arena
- This is the default development and early-playtesting mode
- It allows testing of the voting and economy loop without the complexity of combat outcomes

When enabled (production gameplay):
- The full Battle Arena flow runs as described above

### Minion Evacuation

Before the voting window closes, players may choose to **evacuate** a laborer from the game:

- A laborer can be evacuated if it has **not** been assigned as a vote and has **not** been promised as a guarantee to another player
- The evacuate action is available from the Unit Context Panel
- Evacuated laborers leave the battlefield with their full inventory intact
- This allows a player to save their highest-skill or best-equipped laborers from potential death in a round where the outcome looks unfavorable
- Reducer: `evacuate_unit`

### Combat Mechanics

- **Initiative**: Determines attack order each turn; derived from Agility + equipment bonuses
- **Attack resolution**: Attacker rolls against Defender's Defense; net damage applied to HP
- **Equipment durability**: Items take durability damage during combat; destroyed items are lost
- **Roles (emergent)**: High-Defense units act as tanks; high-Attack units as DPS; no explicit role assignment
- **Team coordination**: All friendly units on a team share the same target selection logic (focus weakest enemy)

## Laborer System

### Genetics and Lineage

Each laborer is born with a set of **Individual Values (IVs)** that determine their base stat potential:

- **6 IVs**: One per primary stat (Strength, Agility, Defense, Intelligence, Stamina, Footing)
- **Stat inheritance**: Offspring inherit a weighted blend of parent IVs with a small random mutation
- **Breeding**: Requires a Laborer Breeding Building; consumes rations; offspring start at level 1 in all skills
- **Market value**: High-IV laborers command premium prices in the resource and labor markets

### Evacuation

Before the voting window closes, any laborer that has **not** been designated as a vote and has **not** been sold or promised as a guarantee can be evacuated from the current game:

- Use the **Withdraw** action in the Unit Context Panel
- Evacuated laborers leave with their full equipment and inventory
- They return to the player's roster and are available in the next game instance
- Strategic use: Save your highest-skill laborers from rounds where a majority loss looks likely

### Stats

| Stat | Combat Use | Gathering Use | Crafting Use |
|------|-----------|---------------|--------------|
| Strength | Base attack damage | Carry weight, yield bonus | Tool speed |
| Agility | Initiative, dodge chance | Movement speed | Craft speed |
| Defense | Damage reduction | N/A | N/A |
| Intelligence | Spell power (future) | N/A | Recipe discovery |
| Stamina | Max HP | Endurance (less fatigue) | Work duration |
| Footing | Stability, knockback resist | Terrain penalty reduction | N/A |

Stats are affected by equipped items (recalculated on equip/unequip via `recalculate_unit_stats`) and by per-skill level (applied as a multiplier at the point of action).

## Automation

### Bots

The game ships with a TypeScript bot simulation runner (`scripts/bot-runner.ts`) that creates fully autonomous AI players. Bots are designed to mirror what a competent human player would do across all game systems.

#### Bot Behaviors

| Behavior | Description |
|----------|-------------|
| **Wandering** | Bots move their avatar around the colony map, picking new random targets every 20 ticks and calling `updatePlayerPosition` every 5 ticks |
| **Ready-up** | Bots set their ready status when enough players are present |
| **Voting** | Bots assign vote colors based on simple majority analysis |
| **Laborer spawning** | Bots call `spawnLaborer` when their laborer count is below `votesPerPlayer`; rate-limited to avoid wallet exhaustion |
| **Resource harvesting** | Each laborer is assigned to the nearest available resource node; bots call `moveUnit` each tick and `gatherResource` when within range; targets rotate when depleted |
| **Market activity** | ~15% chance per tick to list a vote for sale or buy an underpriced vote from the market; `marketCooldown` prevents spam |
| **Side bets** | Eliminated bots place a side bet on the predicted majority color (10% of wallet balance); one bet per game |
| **Chat** | Bots send occasional chat messages; these render as speech bubbles above their 3D avatars in the viewport |

#### Starting a Bot Simulation

```bash
pnpm bots
```

This starts multiple bot instances, each connecting as a separate player identity. Bots reset all state (laborer assignments, market flags, cooldowns) at the start of each new game.

### Player Automation

Players can configure automation for their own laborers without being fully absent:

- **Harvesting assignment**: Assign a laborer to a resource node from the Unit Context Panel; the laborer will pathfind and gather autonomously until the node is depleted or the assignment is cancelled
- **Task queue**: Laborers accept queued tasks (move, gather) processed by `game_tick`; craft and upgrade tasks are planned but not yet tick-processed
- **Evacuation**: Players can manually trigger evacuation for unvoted, un-promised laborers before vote resolution
