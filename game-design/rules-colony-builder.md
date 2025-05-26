# The Vote Exchange: MMO/Colony-Builder

## Table of Contents

- [The Vote Exchange: MMO/Colony-Builder](#the-vote-exchange-mmocolony-builder)
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
  - [Integration with The Vote Exchange](#integration-with-the-vote-exchange)
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
For core Vote Exchange mechanics, see [rules.md](./rules.md)

## Introduction

The MMO/Colony-Builder is an extension of The Vote Exchange that adds resource management, colony building, and laborer management mechanics. This document focuses on these additional features while maintaining integration with the core Vote Exchange mechanics.

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

## Integration with The Vote Exchange

As mentioned in "The Vote Exchange: In Context", in order to participate in any market, even resource and labour markets, the player must participate in The Vote Exchange. The way we currently consider this connection is the idea that the laborers themselves are the voters as assigned by their Player Lord. If a player has 10 laborers, then the player has 10 votes. They can color their laborers with red or blue clothing (skin) according to their designated vote. Those laborers that vote in the majority must be either eliminated or pseudo eliminated.

### Simple Approach

If a laborer votes in the majority, the laborer is eliminated. All resources on the body are destroyed.

### Complex Approach

Instead of immediate elimination, we turn the vote from The Vote Exchange into an entry into an automated team death-match. For every laborer an individual player has that votes in the majority, those laborers join together as a team in a death-match against other such teams from the opposing players. Last team standing can return to the game as laborers for their Player Lord and work and vote again.

## Resource Market

It is currently our intention for all trades to be paired against one of our two currencies, namely Empty Marbles (MT). We consider MT to be our primary and pass-through currency through which resources on the market can be traded. The intention with MT is to allow for negotiation of real-world currency to in-game resources as an unlimited resource with fixed exchange rates to real-world currency.

## Multi-TimeFrame Extension

### Game Server Tree

The game servers are arranged in a tiered tree structure based on trading period lengths. Each time-frame represents a game server in which the length of the trading period for one cycle of the instance of The Vote Exchange on that server is equal to that node's name.

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

Aggressive players can start in faster-paced servers (e.g., "Expedition" with 1-minute trading period) and focus on The Vote Exchange mechanics.

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

- Primary resources
- Secondary resources
- Tertiary products

### Player Level Up & Experience

- Skill progression
- Efficiency improvements
- New abilities

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

- Separate location on local map
- Majority-voting laborers teleported here
- Team-based combat
- Automated fighting
- Deterministic outcomes

### Combat Mechanics

- Equipment durability
- Body part targeting
- Support, Tank, DPS roles
- Team coordination

## Laborer System

### Genetics and Lineage

- Individual Values (IVs)
- Stat inheritance
- Breeding mechanics
- Market value based on stats

### Stats

- Combat effectiveness
- Resource gathering efficiency
- Crafting proficiency
- Movement speed

## Automation

### Bots

- Player-controlled bots
- Autonomous laborer control
- Market participation
- Combat assistance

### Player Automation

- Resource extraction
- Market trading
- Building management
- Combat strategy
