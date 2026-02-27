#![allow(unused)]

#[macro_use]
use spacetimedb::{reducer, table, Identity, ReducerContext, Table, Timestamp, rand, SpacetimeType, CaseConversionPolicy};
use rand::Rng;


#[spacetimedb::settings]
const CASE_CONVERSION_POLICY: CaseConversionPolicy = CaseConversionPolicy::None;

// Game-related types
#[derive(SpacetimeType, Clone, Debug)]
pub struct Vector2 {
    x: f32,
    y: f32,
}

// Chat-related types
#[table(accessor = chat_room, public)]
#[derive(Clone, Debug)]
pub struct ChatRoom {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub creator_id: String,
}

#[table(accessor = chat_message, public)]
#[derive(Clone, Debug)]
pub struct ChatMessage {
    #[primary_key]
    pub id: String,
    pub room_id: String,
    pub sender: Identity,
    pub text: String,
    pub timestamp: Timestamp,
    pub round_number: Option<i32>,
}

#[table(accessor = chat_permission, public)]
#[derive(Clone, Debug)]
pub struct ChatPermission {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub room_id: String,
    pub user_id: Identity,
    pub permission: String, // "read" | "write"
}

// Social system: Friends & Direct Messaging
#[table(accessor = friend_request, public)]
#[derive(Clone, Debug)]
pub struct FriendRequest {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub from_user: Identity,
    pub to_user: Identity,
    pub status: String, // "pending" | "accepted" | "rejected"
    pub created_at: Timestamp,
}

#[table(accessor = friendship, public)]
#[derive(Clone, Debug)]
pub struct Friendship {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub user1: Identity, // lexicographically smaller
    pub user2: Identity, // lexicographically larger
    pub created_at: Timestamp,
}

#[table(accessor = direct_message_conversation, public)]
#[derive(Clone, Debug)]
pub struct DirectMessageConversation {
    #[primary_key]
    pub id: String, // "dm_{user1_hex}_{user2_hex}"
    pub user1: Identity,
    pub user2: Identity,
    pub last_message_at: i64,
    pub created_at: i64,
}

#[table(accessor = direct_message, public)]
#[derive(Clone, Debug)]
pub struct DirectMessage {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub conversation_id: String,
    pub sender: Identity,
    pub text: String,
    pub timestamp: Timestamp,
    pub is_read: bool,
}

#[table(accessor = blocked_user, public)]
#[derive(Clone, Debug)]
pub struct BlockedUser {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub blocker: Identity,
    pub blocked: Identity,
    pub created_at: Timestamp,
}

// Game tables
#[table(accessor = user, public)]
#[derive(Clone)]
pub struct User {
    #[primary_key]
    identity: Identity,
    name: Option<String>,
    online: bool,
    // Vote Exchange: Wallet system
    wallet_balance: f64,      // Money available for trading
    bank_account: f64,        // Saved currency (long-term)
    total_profit_loss: f64,   // Lifetime profit/loss tracking
}

#[table(accessor = message, public)]
pub struct Message {
    sender: Identity,
    sent: Timestamp,
    text: String,
}

#[table(accessor = game_room, public)]
#[derive(Clone)]
pub struct GameRoom {
    #[primary_key]
    #[auto_inc]
    id: i32,
    name: String,
    member_ids: Vec<String>,
    ticket_ids: Vec<String>,
    offer_ids: Vec<String>,
    start_time: Option<i64>,
    current_round: i32,
    // Vote Exchange: Game settings
    buyin_amount: f64,
    pot_size: f64,
    round_duration: i32,
    game_status: String,
    eliminated_players: Vec<String>,
    // Per-room configuration
    votes_per_player: i32,
    min_players: i32,
    max_players: Option<i32>,
    allow_rebuy: bool,
    allow_midgame_join: bool,
    combat_enabled: bool,
}

#[table(accessor = unit, public)]
#[derive(Clone)]
pub struct Unit {
    #[primary_key]
    #[auto_inc]
    id: i32,
    room_id: i32,
    owner_id: String,
    unit_type: String, // "minion" | "target" | "structure" | "storage"
    position: Vector2,
    dimensions: Vector2,
    fill_style: String,
    task_type: Option<String>, // "gather" | "craft" | "upgrade" | "transfer"
    target_id: Option<String>,
    // New voting-related fields
    vote_color: Option<String>, // "red" | "blue"
    vote_guarantee: Option<String>, // "red" | "blue" | null
    vote_price: Option<i32>, // Price in MT if unit is for sale
    vote_owner: Option<String>, // Owner of the vote if different from unit owner
    // Link to the Vote table: each minion unit IS a vote
    vote_id: Option<i32>,
    // New storage-related fields
    storage_capacity: Option<i32>,
    is_storage: bool,
    // Building-related fields (Phase B)
    building_type: Option<String>,     // "extraction_wood" | "refinery_forge" | "manufacturing_armorer" | etc.
    construction_progress: Option<i32>,
    construction_max: Option<i32>,
    assigned_unit_id: Option<i32>,     // unit currently working at this building
    building_recipe: Option<String>,   // what this building produces
    tax_rate: Option<f32>,
    contributors: Vec<String>,
}

#[table(accessor = game_event, public)]
pub struct GameEvent {
    #[primary_key]
    id: String,
    room_id: String,
    event_type: String, // "combat" | "resource" | "craft" | "upgrade"
    source_id: String,
    target_id: String,
    value: i32,
    timestamp: i64,
}

#[table(accessor = ready_state, public)]
pub struct ReadyState {
    #[primary_key]
    room_id: String,
    ready_user_ids: Vec<String>,
    round: i32,
}

#[table(accessor = end_round_vote, public)]
pub struct EndRoundVote {
    #[primary_key]
    #[auto_inc]
    id: i32,
    room_id: i32,
    user_id: String,
    round: i32,
}

// Player avatar positions (lobby + in-game, per room for multi-room support)
#[table(accessor = player_position, public)]
#[derive(Clone, Debug)]
pub struct PlayerPosition {
    #[primary_key]
    #[auto_inc]
    id: i32,
    identity: Identity,
    room_id: i32,
    x: f32,
    z: f32,
    rotation_y: f32,
    is_moving: bool,
}

// Game resource types
#[table(accessor = resource, public)]
#[derive(Clone, Debug)]
pub struct Resource {
    #[primary_key]
    id: String,
    room_id: i32,
    resource_type: String, // "wood" | "stone" | "gold"
    position: Vector2,
    amount: i32,
    max_amount: i32,
    regeneration_rate: i32, // Amount regenerated per tick
    regeneration_timer: i32, // Ticks until next regeneration
    depletion_threshold: i32, // Amount at which resource is considered depleted
}

#[table(accessor = unit_stats, public)]
pub struct UnitStats {
    #[primary_key]
    unit_id: i32,
    health: i32,
    max_health: i32,
    attack: i32,
    defense: i32,
    speed: i32,
    gather_rate: i32,
    craft_rate: i32,
    // Per-skill XP and level (max level 5 for each)
    woodcutting_xp: i32,
    woodcutting_level: i32,
    mining_xp: i32,
    mining_level: i32,
    foraging_xp: i32,
    foraging_level: i32,
    crafting_xp: i32,
    crafting_level: i32,
}

#[table(accessor = unit_inventory, public)]
#[derive(Clone)]
pub struct UnitInventory {
    #[primary_key]
    unit_id: i32,
    // Primary Resources
    wood: i32,
    stone: i32,
    metal_ore: i32,
    coal: i32,
    gems: i32,
    fiber: i32,
    hide: i32,
    sand: i32,
    food: i32,
    // Secondary Resources
    wooden_pole: i32,
    lumber: i32,
    cut_stone: i32,
    metal_ingot: i32,
    cloth: i32,
    rope: i32,
    leather: i32,
    glass: i32,
    max_capacity: i32, // Maximum capacity for this unit's inventory
}

// Reducers
#[reducer]
pub fn set_name(ctx: &ReducerContext, name: String) -> Result<(), String> {
    let name = validate_name(name)?;
    if let Some(user) = ctx.db.user().identity().find(ctx.sender()) {
        ctx.db.user().identity().update(User {
            name: Some(name),
            ..user
        });
        Ok(())
    } else {
        Err("Cannot set name for unknown user".to_string())
    }
}

#[reducer]
pub fn send_message(ctx: &ReducerContext, text: String) -> Result<(), String> {
    let text = validate_message(text)?;
    log::info!("{}", text);
    ctx.db.message().insert(Message {
        sender: ctx.sender(),
        text,
        sent: ctx.timestamp,
    });
    Ok(())
}

#[reducer]
pub fn create_room(
    ctx: &ReducerContext,
    _room_id: String,
    name: String,
    creator_id: String,
    buyin_amount: f64,
    votes_per_player: i32,
    min_players: i32,
    max_players: i32,
    allow_rebuy: bool,
    allow_midgame_join: bool,
    combat_enabled: bool,
) -> Result<(), String> {
    let effective_votes = if votes_per_player > 0 { votes_per_player } else { STARTING_VOTES_PER_PLAYER as i32 };
    let effective_min = if min_players > 0 { min_players } else { MIN_PLAYERS_TO_START as i32 };
    let effective_max = if max_players > 0 { Some(max_players) } else { None };

    let room = GameRoom {
        id: 0,
        name,
        member_ids: vec![creator_id.clone()],
        ticket_ids: vec![],
        offer_ids: vec![],
        start_time: None,
        current_round: 0,
        buyin_amount,
        pot_size: 0.0,
        round_duration: DEFAULT_ROUND_DURATION,
        game_status: "lobby".to_string(),
        eliminated_players: vec![],
        votes_per_player: effective_votes,
        min_players: effective_min,
        max_players: effective_max,
        allow_rebuy,
        allow_midgame_join,
        combat_enabled,
    };
    
    // Insert returns the row with the auto-generated ID
    let inserted_room = ctx.db.game_room().insert(room);

    // Create corresponding chat room for game
    let chat_room_id = format!("game_{}", inserted_room.id);
    ctx.db.chat_room().insert(ChatRoom {
        id: chat_room_id.clone(),
        name: format!("Game Chat: {}", inserted_room.name),
        created_at: ctx.timestamp.to_micros_since_unix_epoch(),
        creator_id: ctx.sender().to_hex().to_string(),
    });

    // Give creator chat permissions
    if let Some(creator_identity) = ctx.db.user().iter().find(|u| u.identity.to_hex().to_string() == creator_id) {
        ctx.db.chat_permission().insert(ChatPermission {
            id: 0,
            room_id: chat_room_id.clone(),
            user_id: creator_identity.identity,
            permission: "write".to_string(),
        });
    }

    // Use the actual room ID (as string) for ReadyState
    let ready_state = ReadyState {
        room_id: inserted_room.id.to_string(),
        ready_user_ids: vec![],
        round: 0,
    };
    ctx.db.ready_state().insert(ready_state);

    Ok(())
}

#[reducer]
pub fn join_room(ctx: &ReducerContext, room_id: i32, user_id: String) -> Result<(), String> {
    if let Some(mut room) = ctx.db.game_room().id().find(room_id) {
        if room.game_status == "active" && !room.allow_midgame_join {
            return Err("This room does not allow joining a game in progress".to_string());
        }
        if let Some(max) = room.max_players {
            if room.member_ids.len() as i32 >= max {
                return Err(format!("Room is full ({}/{} players)", room.member_ids.len(), max));
            }
        }
        if !room.member_ids.contains(&user_id) {
            room.member_ids.push(user_id.clone());
            ctx.db.game_room().id().update(room);

            // Give chat permissions to new member (if not already granted)
            let chat_room_id = format!("game_{}", room_id);
            if let Some(user_identity) = ctx.db.user().iter().find(|u| u.identity.to_hex().to_string() == user_id) {
                // Check if permission already exists to avoid duplicate key error
                let existing_permission = ctx.db.chat_permission().iter()
                    .find(|p| p.room_id == chat_room_id && p.user_id == user_identity.identity);
                
                if existing_permission.is_none() {
                    ctx.db.chat_permission().insert(ChatPermission {
                        id: 0,
                        room_id: chat_room_id,
                        user_id: user_identity.identity,
                        permission: "write".to_string(),
                    });
                }
            }
        }
    }
    Ok(())
}

/// Minimum number of players required to start a game
const MIN_PLAYERS_TO_START: usize = 3;

/// Starting wallet balance for new users
const STARTING_WALLET: f64 = 100.0;

/// Default round duration in seconds
const DEFAULT_ROUND_DURATION: i32 = 300;

/// Re-buy cost multiplier (times the original buy-in)
const REBUY_MULTIPLIER: f64 = 3.0;

/// Percentage of re-buy that goes to the pot (rest is house fee)
const REBUY_POT_PERCENTAGE: f64 = 0.8;

/// Transaction fee rate (percentage taken from trades, added to pot)
const TRANSACTION_FEE_RATE: f64 = 0.01;

/// Win condition: game ends when this many or fewer players remain
const WIN_CONDITION_REMAINING: usize = 2;

/// Number of votes each player starts with
const STARTING_VOTES_PER_PLAYER: usize = 5;

#[reducer]
pub fn toggle_ready(ctx: &ReducerContext, room_id: i32, user_id: String) -> Result<(), String> {
    if let Some(mut ready_state) = ctx.db.ready_state().room_id().find(room_id.to_string()) {
        let ready_user_ids = ready_state.ready_user_ids.clone();
        if let Some(index) = ready_user_ids
            .iter()
            .position(|id| id == &user_id)
        {
            ready_state.ready_user_ids.remove(index);
        } else {
            ready_state.ready_user_ids.push(user_id);
        }
        let ready_count = ready_state.ready_user_ids.len();
        ctx.db.ready_state().room_id().update(ready_state);

        if let Some(room) = ctx.db.game_room().id().find(room_id) {
            let member_count = room.member_ids.len();
            let min_required = room.min_players as usize;
            if ready_count == member_count && member_count >= min_required {
                start_game(ctx, room_id)?;
            }
        }
    }
    Ok(())
}

#[reducer]
pub fn start_game(ctx: &ReducerContext, room_id: i32) -> Result<(), String> {
    if let Some(mut room) = ctx.db.game_room().id().find(room_id) {
        let room_clone = room.clone();
        
        // Vote Exchange: Collect buy-ins and create pot
        let mut pot = 0.0;
        for member_id in &room.member_ids {
            if let Some(user) = ctx.db.user().iter().find(|u| u.identity.to_hex().to_string() == *member_id) {
                let mut updated_user = user.clone();
                
                // Check if user has enough money
                if updated_user.wallet_balance < room.buyin_amount {
                    return Err(format!("Player {} has insufficient funds", member_id));
                }
                
                // Deduct buy-in
                updated_user.wallet_balance -= room.buyin_amount;
                ctx.db.user().identity().update(updated_user);
                
                pot += room.buyin_amount;
                
                for _ in 0..room_clone.votes_per_player {
                    ctx.db.vote().insert(Vote {
                        id: 0,
                        room_id,
                        round_number: 1,
                        player_id: member_id.clone(),
                        original_owner: member_id.clone(),
                        color: None,
                        is_for_sale: false,
                        sale_price: None,
                        timestamp: ctx.timestamp,
                    });
                }
            }
        }
        
        room.pot_size = pot;
        room.start_time = Some(ctx.timestamp.to_micros_since_unix_epoch() / 1000 + 5000); // 5 second countdown (millis)
        room.current_round = 1;
        room.game_status = "active".to_string();
        let round_duration = room.round_duration;
        ctx.db.game_room().id().update(room);

        // Create initial units (for colony builder extension)
        create_initial_units(ctx, &room_clone)?;

        // Schedule the first round timer: countdown (5s) + round duration
        let first_round_micros = ctx.timestamp.to_micros_since_unix_epoch()
            + 5_000_000i64  // 5-second countdown
            + (round_duration as i64 * 1_000_000);
        ctx.db.round_timer_entry().insert(RoundTimerEntry {
            scheduled_id: 0,
            scheduled_at: spacetimedb::ScheduleAt::Time(
                spacetimedb::Timestamp::from_micros_since_unix_epoch(first_round_micros),
            ),
            room_id,
        });
    }
    Ok(())
}

fn create_initial_units(ctx: &ReducerContext, room: &GameRoom) -> Result<(), String> {
    // Laborer-Vote Unification: each minion unit IS a vote.
    // Gather all votes just created for this room so we can link them.
    let all_votes: Vec<Vote> = ctx.db.vote().iter()
        .filter(|v| v.room_id == room.id && v.round_number == 1)
        .collect();

    for member_id in &room.member_ids {
        let member_votes: Vec<&Vote> = all_votes.iter()
            .filter(|v| v.player_id == *member_id)
            .collect();

        for (i, vote) in member_votes.iter().enumerate() {
            let spread = 8.0;
            let base_x = ctx.rng().gen::<f32>() * 80.0 + 10.0;
            let base_y = ctx.rng().gen::<f32>() * 80.0 + 10.0;
            let unit = Unit {
                id: 0,
                room_id: room.id,
                owner_id: member_id.clone(),
                unit_type: "minion".to_string(),
                position: Vector2 {
                    x: base_x + (i as f32) * spread,
                    y: base_y,
                },
                dimensions: Vector2 { x: 20.0, y: 20.0 },
                fill_style: format!("#{:06x}", ctx.rng().gen::<u32>() % 16777215),
                task_type: None,
                target_id: None,
                vote_color: None,
                vote_guarantee: None,
                vote_price: None,
                vote_owner: None,
                vote_id: Some(vote.id),
                storage_capacity: None,
                is_storage: false,
                building_type: None,
                construction_progress: None,
                construction_max: None,
                assigned_unit_id: None,
                building_recipe: None,
                tax_rate: None,
                contributors: vec![],
            };
            let inserted_unit = ctx.db.unit().insert(unit);

            ctx.db.unit_stats().insert(UnitStats {
                unit_id: inserted_unit.id,
                health: 100,
                max_health: 100,
                attack: 10,
                defense: 5,
                speed: 3,
                gather_rate: 5,
                craft_rate: 3,
                woodcutting_xp: 0, woodcutting_level: 1,
                mining_xp: 0, mining_level: 1,
                foraging_xp: 0, foraging_level: 1,
                crafting_xp: 0, crafting_level: 1,
            });

            ctx.db.unit_inventory().insert(UnitInventory {
                unit_id: inserted_unit.id,
                wood: 0, stone: 0, metal_ore: 0, coal: 0, gems: 0,
                fiber: 0, hide: 0, sand: 0, food: 0,
                wooden_pole: 0, lumber: 0, cut_stone: 0, metal_ingot: 0,
                cloth: 0, rope: 0, leather: 0, glass: 0,
                max_capacity: 100,
            });

            ctx.db.laborer_genetics().insert(LaborerGenetics {
                unit_id: inserted_unit.id,
                combat_iv: 15,
                gathering_iv: 15,
                crafting_iv: 15,
                speed_iv: 15,
                health_iv: 15,
                stamina_iv: 15,
                generation: 0,
                parent_a_id: None,
                parent_b_id: None,
            });
        }
    }

    // Create initial resources
    let resource_types = [
        "wood", "stone", "metal_ore", "coal", "gems", 
        "fiber", "hide", "sand", "food"
    ];
    for _ in 0..10 { // Create 10 resources of each type
        for resource_type in resource_types.iter() {
            let resource = Resource {
                id: format!("resource_{}_{}", resource_type, ctx.rng().gen::<u32>()),
                room_id: room.id,
                resource_type: resource_type.to_string(),
                position: Vector2 {
                    x: (ctx.rng().gen::<f32>() * 100.0) as f32,
                    y: (ctx.rng().gen::<f32>() * 100.0) as f32,
                },
                amount: 100,
                max_amount: 100,
                regeneration_rate: 5,
                regeneration_timer: 0,
                depletion_threshold: 20,
            };
            ctx.db.resource().insert(resource);
        }
    }

    Ok(())
}

#[derive(SpacetimeType, Clone, Debug)]
pub struct Position {
    x: f32,
    y: f32,
}

#[reducer]
pub fn move_unit(
    ctx: &ReducerContext,
    unit_id: i32,
    target_position: Vector2,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    if let Some(mut unit) = ctx.db.unit().id().find(unit_id) {
        if unit.owner_id != caller_id {
            return Err("You don't own this unit".to_string());
        }
        if let Some(stats) = ctx.db.unit_stats().unit_id().find(unit_id) {
            let dx = target_position.x - unit.position.x;
            let dy = target_position.y - unit.position.y;
            let distance = (dx * dx + dy * dy).sqrt();
            
            // Move unit based on its speed
            if distance <= stats.speed as f32 {
                unit.position = target_position;
                ctx.db.unit().id().update(unit);
            } else {
                // Move partially towards target
                let ratio = stats.speed as f32 / distance;
                unit.position = Vector2 {
                    x: unit.position.x + dx * ratio,
                    y: unit.position.y + dy * ratio,
                };
                ctx.db.unit().id().update(unit);
            }
        }
    }
    Ok(())
}

#[reducer]
pub fn update_player_position(
    ctx: &ReducerContext,
    room_id: i32,
    x: f32,
    z: f32,
    rotation_y: f32,
    is_moving: bool,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();

    if let Some(room) = ctx.db.game_room().id().find(room_id) {
        if !room.member_ids.contains(&caller_id) {
            return Err("You are not in this room".to_string());
        }
    } else {
        return Err("Room not found".to_string());
    }

    // Upsert: find existing row for (identity, room_id) or insert new
    let existing: Option<PlayerPosition> = ctx.db.player_position().iter()
        .find(|p| p.identity == ctx.sender() && p.room_id == room_id);

    if let Some(mut pos) = existing {
        pos.x = x;
        pos.z = z;
        pos.rotation_y = rotation_y;
        pos.is_moving = is_moving;
        ctx.db.player_position().id().update(pos);
    } else {
        ctx.db.player_position().insert(PlayerPosition {
            id: 0,
            identity: ctx.sender(),
            room_id,
            x,
            z,
            rotation_y,
            is_moving,
        });
    }

    Ok(())
}

#[reducer]
pub fn set_unit_task(
    ctx: &ReducerContext,
    unit_id: i32,
    task_type: String,
    target_id: String,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    if let Some(mut unit) = ctx.db.unit().id().find(unit_id) {
        if unit.owner_id != caller_id {
            return Err("You don't own this unit".to_string());
        }
        unit.task_type = Some(task_type);
        unit.target_id = Some(target_id);
        ctx.db.unit().id().update(unit);
    }
    Ok(())
}

#[reducer]
pub fn create_game_event(
    ctx: &ReducerContext,
    room_id: String,
    event_type: String,
    source_id: String,
    target_id: String,
    value: i32,
) -> Result<(), String> {
    let event = GameEvent {
        id: format!("event_{}_{}", ctx.timestamp.to_micros_since_unix_epoch(), ctx.rng().gen::<u32>()),
        room_id,
        event_type,
        source_id,
        target_id,
        value,
        timestamp: ctx.timestamp.to_micros_since_unix_epoch() / 1000,
    };
    ctx.db.game_event().insert(event);
    Ok(())
}

// Award XP for a specific skill to a unit, triggering level-up at thresholds (max level 5).
// Stat bonuses per level-up: woodcutting→gather_rate, mining→attack, foraging→speed, crafting→craft_rate
fn award_skill_xp(ctx: &ReducerContext, unit_id: i32, skill: &str, xp_amount: i32) {
    let Some(mut stats) = ctx.db.unit_stats().unit_id().find(unit_id) else { return };
    let thresholds = [100, 300, 700, 1500]; // XP needed to reach levels 2-5
    let max_level = 5;

    let (xp_field, level_field) = match skill {
        "woodcutting" => (stats.woodcutting_xp, stats.woodcutting_level),
        "mining"      => (stats.mining_xp,      stats.mining_level),
        "foraging"    => (stats.foraging_xp,     stats.foraging_level),
        "crafting"    => (stats.crafting_xp,     stats.crafting_level),
        _ => return,
    };

    if level_field >= max_level { return; } // already maxed

    let new_xp = xp_field + xp_amount;
    let threshold = thresholds.get((level_field - 1) as usize).copied().unwrap_or(i32::MAX);

    let leveled_up = new_xp >= threshold && level_field < max_level;
    let new_level = if leveled_up { (level_field + 1).min(max_level) } else { level_field };

    match skill {
        "woodcutting" => {
            stats.woodcutting_xp = new_xp;
            stats.woodcutting_level = new_level;
            if leveled_up { stats.gather_rate += 2; }
        }
        "mining" => {
            stats.mining_xp = new_xp;
            stats.mining_level = new_level;
            if leveled_up { stats.attack += 2; }
        }
        "foraging" => {
            stats.foraging_xp = new_xp;
            stats.foraging_level = new_level;
            if leveled_up { stats.speed += 2; }
        }
        "crafting" => {
            stats.crafting_xp = new_xp;
            stats.crafting_level = new_level;
            if leveled_up { stats.craft_rate += 2; }
        }
        _ => {}
    }

    let room_id_str = ctx.db.unit().id().find(unit_id)
        .map(|u| u.room_id.to_string())
        .unwrap_or_default();

    ctx.db.unit_stats().unit_id().update(stats);

    if leveled_up {
        let _ = create_game_event(
            ctx,
            room_id_str,
            "level_up".to_string(),
            unit_id.to_string(),
            skill.to_string(),
            new_level,
        );
    }
}

#[reducer]
pub fn gather_resource(
    ctx: &ReducerContext,
    unit_id: i32,
    resource_id: String,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    if let Some(unit) = ctx.db.unit().id().find(unit_id) {
        if unit.owner_id != caller_id {
            return Err("You don't own this unit".to_string());
        }
        if let Some(resource) = ctx.db.resource().id().find(&resource_id) {
            if let Some(stats) = ctx.db.unit_stats().unit_id().find(unit_id) {
                if let Some(mut inventory) = ctx.db.unit_inventory().unit_id().find(unit_id) {
                    // Calculate distance between unit and resource
                    let dx = resource.position.x - unit.position.x;
                    let dy = resource.position.y - unit.position.y;
                    let distance = (dx * dx + dy * dy).sqrt();
                    
                    if distance <= 30.0 { // Gathering range
                        let gather_amount = stats.gather_rate.min(resource.amount);
                        let skill = match resource.resource_type.as_str() {
                            "wood" => { inventory.wood += gather_amount; "woodcutting" }
                            "stone" => { inventory.stone += gather_amount; "mining" }
                            "metal_ore" => { inventory.metal_ore += gather_amount; "mining" }
                            "coal" => { inventory.coal += gather_amount; "mining" }
                            "gems" => { inventory.gems += gather_amount; "mining" }
                            "sand" => { inventory.sand += gather_amount; "mining" }
                            "fiber" => { inventory.fiber += gather_amount; "foraging" }
                            "hide" => { inventory.hide += gather_amount; "foraging" }
                            "food" => { inventory.food += gather_amount; "foraging" }
                            _ => return Err("Invalid resource type".to_string()),
                        };
                        
                        // Update resource amount
                        let mut updated_resource = resource.clone();
                        updated_resource.amount -= gather_amount;
                        if updated_resource.amount <= 0 {
                            ctx.db.resource().id().delete(&resource_id);
                        } else {
                            ctx.db.resource().id().update(updated_resource);
                        }
                        
                        // Update inventory
                        ctx.db.unit_inventory().unit_id().update(inventory);
                        
                        // Award per-skill XP for this gather action
                        award_skill_xp(ctx, unit_id, skill, gather_amount);

                        // Create resource gathering event
                        create_game_event(
                            ctx,
                            unit.room_id.to_string(),
                            "resource".to_string(),
                            unit_id.to_string(),
                            resource_id,
                            gather_amount,
                        )?;
                    }
                }
            }
        }
    }
    Ok(())
}

#[reducer]
pub fn upgrade_unit(
    ctx: &ReducerContext,
    unit_id: i32,
    upgrade_type: String,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    if let Some(unit) = ctx.db.unit().id().find(unit_id) {
        if unit.owner_id != caller_id {
            return Err("You don't own this unit".to_string());
        }
    } else {
        return Err("Unit not found".to_string());
    }
    if let Some(mut stats) = ctx.db.unit_stats().unit_id().find(unit_id) {
        if let Some(inventory) = ctx.db.unit_inventory().unit_id().find(unit_id) {
            // Check if unit has enough resources for upgrade
            let (cost_wood, cost_stone, cost_metal_ore, cost_coal, cost_gems) = match upgrade_type.as_str() {
                "health" => (10, 5, 2, 2, 1),
                "attack" => (5, 10, 3, 3, 2),
                "defense" => (5, 5, 5, 5, 5),
                "speed" => (3, 3, 10, 10, 10),
                "gather" => (2, 2, 2, 2, 2),
                "craft" => (2, 2, 2, 2, 2),
                _ => return Err("Invalid upgrade type".to_string()),
            };
            
            if inventory.wood >= cost_wood && inventory.stone >= cost_stone && inventory.metal_ore >= cost_metal_ore && inventory.coal >= cost_coal && inventory.gems >= cost_gems {
                // Apply upgrade
                match upgrade_type.as_str() {
                    "health" => {
                        stats.max_health += 10;
                        stats.health += 10;
                    },
                    "attack" => stats.attack += 2,
                    "defense" => stats.defense += 2,
                    "speed" => stats.speed += 1,
                    "gather" => stats.gather_rate += 1,
                    "craft" => stats.craft_rate += 1,
                    _ => return Err("Invalid upgrade type".to_string()),
                }
                
                // Update stats
                ctx.db.unit_stats().unit_id().update(stats);
                
                // Deduct resources
                let mut updated_inventory = inventory.clone();
                updated_inventory.wood -= cost_wood;
                updated_inventory.stone -= cost_stone;
                updated_inventory.metal_ore -= cost_metal_ore;
                updated_inventory.coal -= cost_coal;
                updated_inventory.gems -= cost_gems;
                ctx.db.unit_inventory().unit_id().update(updated_inventory);
                
                // Create upgrade event
                if let Some(unit) = ctx.db.unit().id().find(unit_id) {
                    create_game_event(
                        ctx,
                        unit.room_id.to_string(),
                        "upgrade".to_string(),
                        unit_id.to_string(),
                        upgrade_type,
                        1,
                    )?;
                }
            } else {
                return Err("Not enough resources for upgrade".to_string());
            }
        }
    }
    Ok(())
}

// Helper functions
fn validate_name(name: String) -> Result<String, String> {
    if name.is_empty() {
        Err("Names must not be empty".to_string())
    } else {
        Ok(name)
    }
}

fn validate_message(text: String) -> Result<String, String> {
    if text.is_empty() {
        Err("Messages must not be empty".to_string())
    } else {
        Ok(text)
    }
}

// Client connection handlers
#[reducer(client_connected)]
pub fn client_connected(ctx: &ReducerContext) {
    if let Some(user) = ctx.db.user().identity().find(ctx.sender()) {
        ctx.db.user().identity().update(User {
            online: true,
            ..user
        });
    } else {
        ctx.db.user().insert(User {
            name: None,
            identity: ctx.sender(),
            online: true,
            wallet_balance: STARTING_WALLET,
            bank_account: 0.0,
            total_profit_loss: 0.0,
        });
    }
}

#[reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    if let Some(user) = ctx.db.user().identity().find(ctx.sender()) {
        ctx.db.user().identity().update(User {
            online: false,
            ..user
        });
    } else {
        log::warn!(
            "Disconnect event for unknown user with identity {:?}",
            ctx.sender()
        );
    }

    // Clean up all player positions on disconnect
    let positions: Vec<PlayerPosition> = ctx.db.player_position().iter()
        .filter(|p| p.identity == ctx.sender())
        .collect();
    for pos in positions {
        ctx.db.player_position().id().delete(pos.id);
    }
}

// Chat-related reducers
#[reducer]
pub fn create_chat_room(ctx: &ReducerContext, name: String) -> Result<(), String> {
    log::info!("ðŸŽ¯ create_chat_room CALLED! Name: {}, Sender: {:?}", name, ctx.sender());
    
    let room_id = format!("room_{}", ctx.timestamp.to_micros_since_unix_epoch());
    log::info!("ðŸ“¦ Generated room_id: {}", room_id);
    
    ctx.db.chat_room().insert(ChatRoom {
        id: room_id.clone(),
        name: name.clone(),
        created_at: ctx.timestamp.to_micros_since_unix_epoch(),
        creator_id: ctx.sender().to_hex().to_string(),
    });
    log::info!("âœ… Inserted chat_room: {} ({})", name, room_id);

    // Give creator full permissions
    ctx.db.chat_permission().insert(ChatPermission {
        id: 0,
        room_id: room_id.clone(),
        user_id: ctx.sender(),
        permission: "write".to_string(),
    });
    log::info!("ðŸ” Inserted chat_permission for user {:?}", ctx.sender());

    log::info!("ðŸŽ‰ create_chat_room COMPLETED successfully!");
    Ok(())
}

#[reducer]
pub fn send_chat_message(
    ctx: &ReducerContext,
    room_id: String,
    text: String,
    round_number: Option<i32>,
) -> Result<(), String> {
    // Check if user has permission to send messages
    let permissions = ctx.db.chat_permission().iter()
        .filter(|p| p.room_id == room_id && p.user_id == ctx.sender())
        .collect::<Vec<_>>();
    
    if permissions.is_empty() || permissions[0].permission != "write" {
        return Err("No permission to send messages".to_string());
    }

    // Create and insert the message
    let message_id = format!("msg_{}", ctx.timestamp.to_micros_since_unix_epoch());
    ctx.db.chat_message().insert(ChatMessage {
        id: message_id,
        room_id,
        sender: ctx.sender(),
        text,
        timestamp: ctx.timestamp,
        round_number,
    });

    Ok(())
}

#[reducer]
pub fn set_chat_permission(
    ctx: &ReducerContext,
    room_id: String,
    user_id: Identity,
    permission: String,
) -> Result<(), String> {
    // Only room creator can set permissions
    if let Some(room) = ctx.db.chat_room().id().find(&room_id) {
        if room.creator_id != ctx.sender().to_hex().to_string() {
            return Err("Only room creator can set permissions".to_string());
        }

        let existing = ctx.db.chat_permission().iter()
            .find(|p| p.room_id == room_id && p.user_id == user_id);
        if let Some(mut perm) = existing {
            perm.permission = permission;
            ctx.db.chat_permission().id().update(perm);
        } else {
            ctx.db.chat_permission().insert(ChatPermission {
                id: 0,
                room_id,
                user_id,
                permission,
            });
        }

        Ok(())
    } else {
        Err("Room not found".to_string())
    }
}

// Vote Exchange: Vote tracking with ownership
#[table(accessor = vote, public)]
#[derive(Clone)]
pub struct Vote {
    #[primary_key]
    #[auto_inc]
    id: i32,
    room_id: i32,
    round_number: i32,
    player_id: String,        // Current owner of this vote
    original_owner: String,   // Who started with this vote
    color: Option<String>,    // "red" | "blue" | null (not yet set)
    is_for_sale: bool,        // Whether this vote is listed for sale
    sale_price: Option<f64>,  // Price if listed for sale
    timestamp: Timestamp,
}

// Vote Exchange: Transaction tracking
#[table(accessor = transaction, public)]
pub struct Transaction {
    #[primary_key]
    #[auto_inc]
    id: i32,
    room_id: i32,
    from_player: String,
    to_player: String,
    transaction_type: String, // "vote_sale" | "guarantee_purchase" | "pot_distribution"
    amount: f64,
    vote_id: Option<i32>,     // If this was a vote sale
    guarantee_id: Option<i32>, // If this was a guarantee purchase
    timestamp: Timestamp,
}

// Vote Exchange: Guarantee system (per-vote, server-enforced)
#[table(accessor = guarantee, public)]
pub struct Guarantee {
    #[primary_key]
    #[auto_inc]
    id: i32,
    room_id: i32,
    round_number: i32,
    vote_id: i32,             // The specific vote this guarantee covers
    seller_id: String,
    color: String,            // "red" | "blue" - the color the vote will be locked to
    price: f64,
    guarantee_type: String,   // "public" (one buyer) | "private" (multiple buyers)
    is_active: bool,          // false if cancelled or fulfilled (for public)
    created_at: Timestamp,
}

// Vote Exchange: Guarantee purchases
#[table(accessor = guarantee_purchase, public)]
pub struct GuaranteePurchase {
    #[primary_key]
    #[auto_inc]
    id: i32,
    guarantee_id: i32,
    buyer_id: String,
    price_paid: f64,
    timestamp: Timestamp,
}

#[reducer]
pub fn set_unit_vote_color(
    ctx: &ReducerContext,
    unit_id: i32,
    color: String,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    if let Some(mut unit) = ctx.db.unit().id().find(unit_id) {
        if unit.owner_id != caller_id {
            return Err("You don't own this unit".to_string());
        }
        if color != "red" && color != "blue" {
            return Err("Invalid vote color".to_string());
        }
        unit.vote_color = Some(color);
        ctx.db.unit().id().update(unit);
    }
    Ok(())
}

#[reducer]
pub fn trade_unit_vote(
    ctx: &ReducerContext,
    unit_id: i32,
    buyer_id: String,
    price: i32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    if let Some(mut unit) = ctx.db.unit().id().find(unit_id) {
        if unit.owner_id != caller_id {
            return Err("You don't own this unit".to_string());
        }
        if unit.vote_price.is_none() {
            return Err("Unit vote is not for sale".to_string());
        }
        if unit.vote_price.unwrap() != price {
            return Err("Price mismatch".to_string());
        }
        
        let seller_id = unit.owner_id.clone();
        let room_id = unit.room_id;
        let buyer_id = buyer_id.clone();
        let price_f64 = price as f64;
        
        // Financial transfer
        let buyer = ctx.db.user().iter()
            .find(|u| u.identity.to_hex().to_string() == buyer_id)
            .ok_or("Buyer not found")?;
        if buyer.wallet_balance < price_f64 {
            return Err("Buyer has insufficient funds".to_string());
        }
        let fee = price_f64 * TRANSACTION_FEE_RATE;
        let mut updated_buyer = buyer.clone();
        updated_buyer.wallet_balance -= price_f64;
        ctx.db.user().identity().update(updated_buyer);

        let seller = ctx.db.user().iter()
            .find(|u| u.identity.to_hex().to_string() == seller_id)
            .ok_or("Seller not found")?;
        let mut updated_seller = seller.clone();
        updated_seller.wallet_balance += price_f64 - fee;
        ctx.db.user().identity().update(updated_seller);

        if fee > 0.0 {
            if let Some(mut r) = ctx.db.game_room().id().find(room_id) {
                r.pot_size += fee;
                ctx.db.game_room().id().update(r);
            }
        }
        
        // Transfer vote ownership on unit
        unit.vote_owner = Some(buyer_id.clone());
        unit.owner_id = buyer_id.clone();
        unit.vote_price = None;
        ctx.db.unit().id().update(unit);
        
        create_game_event(
            ctx,
            room_id.to_string(),
            "vote_trade".to_string(),
            seller_id,
            buyer_id,
            price,
        )?;
    }
    Ok(())
}

// Vote Exchange: Transfer vote ownership (buy/sell votes)
#[reducer]
pub fn transfer_vote_ownership(
    ctx: &ReducerContext,
    vote_id: i32,
    buyer_id: String,
    price: f64,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();

    if let Some(mut vote) = ctx.db.vote().id().find(vote_id) {
        let seller_id = vote.player_id.clone();
        let room_id = vote.room_id;

        // Authorization: caller must be the vote owner (seller)
        if seller_id != caller_id {
            return Err("Only the vote owner can transfer it".to_string());
        }
        
        let buyer = ctx.db.user().iter()
            .find(|u| u.identity.to_hex().to_string() == buyer_id)
            .ok_or("Buyer not found")?;
        let seller = ctx.db.user().iter()
            .find(|u| u.identity.to_hex().to_string() == seller_id)
            .ok_or("Seller not found")?;
        
        // Check buyer has enough money
        if buyer.wallet_balance < price {
            return Err("Insufficient funds".to_string());
        }
        
        // Calculate transaction fee
        let fee = price * TRANSACTION_FEE_RATE;
        let seller_receives = price - fee;
        
        // Transfer money (buyer pays full price, seller receives price minus fee)
        let mut updated_buyer = buyer.clone();
        updated_buyer.wallet_balance -= price;
        ctx.db.user().identity().update(updated_buyer);
        
        let mut updated_seller = seller.clone();
        updated_seller.wallet_balance += seller_receives;
        ctx.db.user().identity().update(updated_seller);
        
        // Add fee to pot
        if fee > 0.0 {
            if let Some(mut room) = ctx.db.game_room().id().find(room_id) {
                room.pot_size += fee;
                ctx.db.game_room().id().update(room);
            }
        }
        
        // Transfer vote ownership and remove from sale
        let transferring_vote_id = vote.id;
        vote.player_id = buyer_id.clone();
        vote.is_for_sale = false;
        vote.sale_price = None;
        ctx.db.vote().id().update(vote);
        
        // Laborer-Vote Unification: also transfer the linked unit
        if let Some(mut linked_unit) = ctx.db.unit().iter()
            .find(|u| u.vote_id == Some(transferring_vote_id)) {
            linked_unit.owner_id = buyer_id.clone();
            linked_unit.vote_owner = Some(buyer_id.clone());
            ctx.db.unit().id().update(linked_unit);
        }
        
        // Record transaction
        ctx.db.transaction().insert(Transaction {
            id: 0,
            room_id,
            from_player: seller_id,
            to_player: buyer_id.clone(),
            transaction_type: "vote_sale".to_string(),
            amount: price,
            vote_id: Some(vote_id),
            guarantee_id: None,
            timestamp: ctx.timestamp,
        });

        // Mark matching TradeOffer as accepted so both UIs stay in sync
        let matching: Vec<TradeOffer> = ctx.db.trade_offer().iter()
            .filter(|o| o.vote_id == Some(vote_id) && o.status == "open")
            .collect();
        for mut offer in matching {
            offer.status = "accepted".to_string();
            offer.accepted_by = Some(buyer_id.clone());
            ctx.db.trade_offer().id().update(offer);
        }
        
        Ok(())
    } else {
        Err("Vote not found".to_string())
    }
}

// Vote Exchange: Set a vote for sale
#[reducer]
pub fn set_vote_for_sale(
    ctx: &ReducerContext,
    vote_id: i32,
    price: f64,
) -> Result<(), String> {
    if let Some(mut vote) = ctx.db.vote().id().find(vote_id) {
        let caller_id = ctx.sender().to_hex().to_string();
        if vote.player_id != caller_id {
            return Err("You don't own this vote".to_string());
        }
        
        if price <= 0.0 {
            return Err("Price must be greater than 0".to_string());
        }
        
        vote.is_for_sale = true;
        vote.sale_price = Some(price);
        let room_id = vote.room_id;
        ctx.db.vote().id().update(vote);

        // Cancel any existing open TradeOffer for this vote, then create a fresh one
        let existing: Vec<TradeOffer> = ctx.db.trade_offer().iter()
            .filter(|o| o.vote_id == Some(vote_id) && o.from_player == caller_id && o.status == "open")
            .collect();
        for mut old in existing { old.status = "cancelled".to_string(); ctx.db.trade_offer().id().update(old); }

        let round_number = ctx.db.game_room().id().find(room_id).map(|r| r.current_round).unwrap_or(0);
        ctx.db.trade_offer().insert(TradeOffer {
            id: 0,
            room_id,
            round_number,
            from_player: caller_id,
            offer_type: "sell_vote".to_string(),
            vote_id: Some(vote_id),
            price,
            status: "open".to_string(),
            accepted_by: None,
            created_at: ctx.timestamp,
        });
        
        Ok(())
    } else {
        Err("Vote not found".to_string())
    }
}

// Vote Exchange: Remove a vote from sale
#[reducer]
pub fn remove_vote_from_sale(
    ctx: &ReducerContext,
    vote_id: i32,
) -> Result<(), String> {
    if let Some(mut vote) = ctx.db.vote().id().find(vote_id) {
        let caller_id = ctx.sender().to_hex().to_string();
        if vote.player_id != caller_id {
            return Err("You don't own this vote".to_string());
        }
        
        vote.is_for_sale = false;
        vote.sale_price = None;
        ctx.db.vote().id().update(vote);

        // Cancel any matching open TradeOffers
        let matching: Vec<TradeOffer> = ctx.db.trade_offer().iter()
            .filter(|o| o.vote_id == Some(vote_id) && o.from_player == caller_id && o.status == "open")
            .collect();
        for mut offer in matching { offer.status = "cancelled".to_string(); ctx.db.trade_offer().id().update(offer); }
        
        Ok(())
    } else {
        Err("Vote not found".to_string())
    }
}

// Vote Exchange: Create a guarantee
#[reducer]
pub fn create_guarantee(
    ctx: &ReducerContext,
    room_id: i32,
    round_number: i32,
    vote_id: i32,
    color: String,
    price: f64,
    guarantee_type: String,
) -> Result<(), String> {
    let seller_id = ctx.sender().to_hex().to_string();
    
    if color != "red" && color != "blue" {
        return Err("Invalid color".to_string());
    }
    
    if guarantee_type != "public" && guarantee_type != "private" {
        return Err("Invalid guarantee type".to_string());
    }
    
    if price <= 0.0 {
        return Err("Price must be greater than 0".to_string());
    }
    
    // Validate the seller owns this vote
    let vote = ctx.db.vote().id().find(vote_id)
        .ok_or("Vote not found")?;
    if vote.player_id != seller_id {
        return Err("You don't own this vote".to_string());
    }
    if vote.room_id != room_id {
        return Err("Vote is not in this room".to_string());
    }
    
    // Prevent duplicate: only one active guarantee per vote
    let existing = ctx.db.guarantee().iter()
        .any(|g| g.vote_id == vote_id && g.is_active);
    if existing {
        return Err("This vote already has an active guarantee".to_string());
    }
    
    ctx.db.guarantee().insert(Guarantee {
        id: 0,
        room_id,
        round_number,
        vote_id,
        seller_id,
        color,
        price,
        guarantee_type,
        is_active: true,
        created_at: ctx.timestamp,
    });
    
    Ok(())
}

// Vote Exchange: Purchase a guarantee
#[reducer]
pub fn purchase_guarantee(
    ctx: &ReducerContext,
    guarantee_id: i32,
) -> Result<(), String> {
    if let Some(mut guarantee) = ctx.db.guarantee().id().find(guarantee_id) {
        if !guarantee.is_active {
            return Err("Guarantee no longer active".to_string());
        }
        
        let buyer_id = ctx.sender().to_hex().to_string();
        let seller_id = guarantee.seller_id.clone();
        let price = guarantee.price;
        let room_id = guarantee.room_id;
        
        // Can't buy your own guarantee
        if buyer_id == seller_id {
            return Err("Cannot purchase your own guarantee".to_string());
        }
        
        // Prevent duplicate purchase: same buyer can't buy the same guarantee twice
        let already_purchased = ctx.db.guarantee_purchase().iter()
            .any(|p| p.guarantee_id == guarantee_id && p.buyer_id == buyer_id);
        if already_purchased {
            return Err("You have already purchased this guarantee".to_string());
        }
        
        // Get buyer and seller
        let buyer = ctx.db.user().iter()
            .find(|u| u.identity.to_hex().to_string() == buyer_id)
            .ok_or("Buyer not found")?;
        let seller = ctx.db.user().iter()
            .find(|u| u.identity.to_hex().to_string() == seller_id)
            .ok_or("Seller not found")?;
        
        // Check buyer has enough money
        if buyer.wallet_balance < price {
            return Err("Insufficient funds".to_string());
        }
        
        // Calculate fee
        let fee = price * TRANSACTION_FEE_RATE;
        let seller_receives = price - fee;
        
        // Transfer money (buyer pays full, seller receives minus fee)
        let mut updated_buyer = buyer.clone();
        updated_buyer.wallet_balance -= price;
        ctx.db.user().identity().update(updated_buyer);
        
        let mut updated_seller = seller.clone();
        updated_seller.wallet_balance += seller_receives;
        ctx.db.user().identity().update(updated_seller);
        
        // Fee goes to pot
        if fee > 0.0 {
            if let Some(mut room) = ctx.db.game_room().id().find(room_id) {
                room.pot_size += fee;
                ctx.db.game_room().id().update(room);
            }
        }
        
        // If public guarantee, mark as inactive (only one buyer)
        if guarantee.guarantee_type == "public" {
            guarantee.is_active = false;
            ctx.db.guarantee().id().update(guarantee);
        }
        
        // Record purchase
        ctx.db.guarantee_purchase().insert(GuaranteePurchase {
            id: 0,
            guarantee_id,
            buyer_id: buyer_id.clone(),
            price_paid: price,
            timestamp: ctx.timestamp,
        });
        
        // Record transaction
        ctx.db.transaction().insert(Transaction {
            id: 0,
            room_id,
            from_player: buyer_id,
            to_player: seller_id,
            transaction_type: "guarantee_purchase".to_string(),
            amount: price,
            vote_id: None,
            guarantee_id: Some(guarantee_id),
            timestamp: ctx.timestamp,
        });
        
        Ok(())
    } else {
        Err("Guarantee not found".to_string())
    }
}

// Vote Exchange: Set your vote color
#[reducer]
pub fn set_vote_color(
    ctx: &ReducerContext,
    vote_id: i32,
    color: String,
) -> Result<(), String> {
    if color != "red" && color != "blue" {
        return Err("Invalid color".to_string());
    }
    
    if let Some(mut vote) = ctx.db.vote().id().find(vote_id) {
        let caller_id = ctx.sender().to_hex().to_string();
        if vote.player_id != caller_id {
            return Err("You don't own this vote".to_string());
        }
        
        // Enforce guarantee: if this vote has a purchased guarantee, lock the color
        let guarantee_for_vote = ctx.db.guarantee().iter()
            .find(|g| g.vote_id == vote_id && g.is_active);
        
        if let Some(g) = guarantee_for_vote {
            let has_purchases = ctx.db.guarantee_purchase().iter()
                .any(|p| p.guarantee_id == g.id);
            if has_purchases && color != g.color {
                return Err(format!("This vote is locked to {} by a guarantee", g.color));
            }
        }
        
        vote.color = Some(color.clone());
        let vote_id_val = vote.id;
        ctx.db.vote().id().update(vote);
        
        // Sync the linked unit's vote_color
        if let Some(mut linked_unit) = ctx.db.unit().iter()
            .find(|u| u.vote_id == Some(vote_id_val)) {
            linked_unit.vote_color = Some(color);
            ctx.db.unit().id().update(linked_unit);
        }
        
        Ok(())
    } else {
        Err("Vote not found".to_string())
    }
}

// Vote Exchange: Public reducer â€” thin wrapper with idempotency guard.
// Clients may call this but server-side scheduling (process_round_scheduled) is the primary trigger.
#[reducer]
pub fn process_round_votes(
    ctx: &ReducerContext,
    room_id: i32,
) -> Result<(), String> {
    let room = ctx.db.game_room().id().find(room_id).ok_or("Room not found")?;
    if room.game_status != "active" {
        return Ok(());
    }
    do_process_round(ctx, room_id)
}

// Vote Exchange: Server-side round processing â€” called by RoundTimerEntry scheduler.
fn do_process_round(
    ctx: &ReducerContext,
    room_id: i32,
) -> Result<(), String> {
    // Derive round number from authoritative room state
    let room_state = ctx.db.game_room().id().find(room_id).ok_or("Room not found")?;
    if room_state.game_status != "active" {
        return Ok(());
    }
    let round_number = room_state.current_round;

    // Enforce purchased guarantees before tallying: lock any vote that has a
    // purchased guarantee to its guaranteed color (safety net for voters who
    // didn't explicitly set color or tried to circumvent the lock)
    let round_guarantees: Vec<Guarantee> = ctx.db.guarantee().iter()
        .filter(|g| g.room_id == room_id && g.round_number == round_number)
        .collect();
    
    for guarantee in &round_guarantees {
        let has_purchases = ctx.db.guarantee_purchase().iter()
            .any(|p| p.guarantee_id == guarantee.id);
        if has_purchases {
            if let Some(mut vote) = ctx.db.vote().id().find(guarantee.vote_id) {
                if vote.color.as_deref() != Some(guarantee.color.as_str()) {
                    vote.color = Some(guarantee.color.clone());
                    ctx.db.vote().id().update(vote);
                }
            }
        }
    }
    
    // Get all votes for this room and round (re-read after enforcement)
    let votes = ctx.db.vote().iter()
        .filter(|v| v.room_id == room_id && v.round_number == round_number)
        .collect::<Vec<_>>();
    
    // Count votes by color
    let mut red_votes = 0;
    let mut blue_votes = 0;
    let mut red_voters = Vec::new();
    let mut blue_voters = Vec::new();
    
    for vote in &votes {
        if let Some(color) = &vote.color {
            match color.as_str() {
                "red" => {
                    red_votes += 1;
                    if !red_voters.contains(&vote.player_id) {
                        red_voters.push(vote.player_id.clone());
                    }
                },
                "blue" => {
                    blue_votes += 1;
                    if !blue_voters.contains(&vote.player_id) {
                        blue_voters.push(vote.player_id.clone());
                    }
                },
                _ => continue,
            }
        }
    }
    
    // Handle tie - game ends, split pot
    if red_votes == blue_votes {
        if let Some(mut room) = ctx.db.game_room().id().find(room_id) {
            room.game_status = "completed".to_string();
            ctx.db.game_room().id().update(room.clone());
            
            // Split pot proportionally by vote count
            let total_votes = red_votes + blue_votes;
            if total_votes > 0 {
                let pot_per_vote = room.pot_size / total_votes as f64;
                
                // Distribute to all players based on their vote count
                for vote in &votes {
                    if let Some(color) = &vote.color {
                        let player_id = &vote.player_id;
                        if let Some(user) = ctx.db.user().iter().find(|u| u.identity.to_hex().to_string() == *player_id) {
                            let mut updated_user = user.clone();
                            updated_user.wallet_balance += pot_per_vote;
                            ctx.db.user().identity().update(updated_user);
                        }
                    }
                }
            }
        }
        return Ok(());
    }
    
    // Determine minority and majority
    let (minority_voters, majority_voters) = if red_votes < blue_votes {
        (red_voters, blue_voters)
    } else {
        (blue_voters, red_voters)
    };
    
    // Laborer-Vote Unification: destroy majority-voting units (their laborers die)
    let majority_color = if red_votes > blue_votes { "red" } else { "blue" };
    let majority_vote_ids: Vec<i32> = votes.iter()
        .filter(|v| v.color.as_deref() == Some(majority_color))
        .map(|v| v.id)
        .collect();
    
    for vote_id_to_kill in &majority_vote_ids {
        let linked_units: Vec<Unit> = ctx.db.unit().iter()
            .filter(|u| u.vote_id == Some(*vote_id_to_kill))
            .collect();
        for unit in linked_units {
            // Return equipped items to owner's pool before deletion
            let unit_equips: Vec<Equipment> = ctx.db.equipment().iter()
                .filter(|e| e.equipped_to_unit_id == Some(unit.id)).collect();
            for mut eq in unit_equips { eq.equipped_to_unit_id = None; ctx.db.equipment().id().update(eq); }
            ctx.db.unit_inventory().unit_id().delete(unit.id);
            ctx.db.unit_stats().unit_id().delete(unit.id);
            ctx.db.laborer_genetics().unit_id().delete(unit.id);
            ctx.db.unit().id().delete(unit.id);
        }
    }

    // Eliminate majority voters (player-level)
    if let Some(mut room) = ctx.db.game_room().id().find(room_id) {
        for player_id in &majority_voters {
            // Only eliminate if ALL their votes were majority (they have no remaining votes)
            let remaining_votes = ctx.db.vote().iter()
                .filter(|v| v.room_id == room_id && v.round_number == round_number 
                    && v.player_id == *player_id && v.color.as_deref() != Some(majority_color))
                .count();
            if remaining_votes == 0 && !room.eliminated_players.contains(player_id) {
                room.eliminated_players.push(player_id.clone());
            }
        }
        
        // Check win condition: 1-2 players remaining
        let remaining_players: Vec<_> = room.member_ids.iter()
            .filter(|id| !room.eliminated_players.contains(id))
            .collect();
        
        // Resolve side bets for this round regardless of game outcome
        let round_bets: Vec<SideBet> = ctx.db.side_bet().iter()
            .filter(|s| s.room_id == room_id && s.round_number == round_number && s.status == "pending")
            .collect();
        let minority_color_str = if red_votes < blue_votes { "red" } else { "blue" };
        for mut bet in round_bets {
            let won = match bet.bet_type.as_str() {
                "color_wins" => bet.bet_target == minority_color_str,
                "player_eliminated" => room.eliminated_players.contains(&bet.bet_target),
                _ => false,
            };
            if won {
                bet.status = "won".to_string();
                let payout = bet.amount * bet.payout_multiplier;
                // Payout comes from the pot (capped at available pot)
                let actual_payout = if let Some(mut r) = ctx.db.game_room().id().find(room_id) {
                    let capped = payout.min(r.pot_size);
                    r.pot_size -= capped;
                    ctx.db.game_room().id().update(r);
                    capped
                } else { 0.0 };
                if actual_payout > 0.0 {
                    if let Some(user) = ctx.db.user().iter()
                        .find(|u| u.identity.to_hex().to_string() == bet.bettor_id) {
                        let mut uu = user.clone();
                        uu.wallet_balance += actual_payout;
                        ctx.db.user().identity().update(uu);
                    }
                }
            } else {
                bet.status = "lost".to_string();
                // Lost bet amount already in pot from place_side_bet
            }
            ctx.db.side_bet().id().update(bet);
        }

        if remaining_players.is_empty() {
            // No players left â€” mark complete without distributing pot
            room.game_status = "completed".to_string();
        } else if remaining_players.len() <= WIN_CONDITION_REMAINING {
            room.game_status = "completed".to_string();
            
            let pot_per_winner = room.pot_size / remaining_players.len() as f64;
            for player_id in remaining_players {
                if let Some(user) = ctx.db.user().iter().find(|u| u.identity.to_hex().to_string() == *player_id) {
                    let mut updated_user = user.clone();
                    updated_user.wallet_balance += pot_per_winner;
                    updated_user.total_profit_loss += pot_per_winner - room.buyin_amount;
                    ctx.db.user().identity().update(updated_user);
                    
                    ctx.db.transaction().insert(Transaction {
                        id: 0,
                        room_id,
                        from_player: "pot".to_string(),
                        to_player: player_id.clone(),
                        transaction_type: "pot_distribution".to_string(),
                        amount: pot_per_winner,
                        vote_id: None,
                        guarantee_id: None,
                        timestamp: ctx.timestamp,
                    });
                }
            }
        } else {
            // Advance to next round: update surviving votes and reset their colors
            let next_round = room.current_round + 1;
            room.current_round = next_round;

            let surviving_votes: Vec<Vote> = ctx.db.vote().iter()
                .filter(|v| v.room_id == room_id && v.round_number == round_number
                    && v.color.as_deref() != Some(majority_color))
                .collect();
            for sv in surviving_votes {
                let mut updated = sv.clone();
                updated.round_number = next_round;
                updated.color = None;
                ctx.db.vote().id().update(updated);
            }

            let surviving_units: Vec<Unit> = ctx.db.unit().iter()
                .filter(|u| u.room_id == room_id && u.vote_id.is_some()
                    && u.vote_color.as_deref() != Some(majority_color))
                .collect();
            for mut su in surviving_units {
                su.vote_color = None;
                ctx.db.unit().id().update(su);
            }

            // Schedule next round timer (server-owned round cadence)
            let fire_at_micros = ctx.timestamp.to_micros_since_unix_epoch()
                + (room.round_duration as i64 * 1_000_000);
            ctx.db.round_timer_entry().insert(RoundTimerEntry {
                scheduled_id: 0,
                scheduled_at: spacetimedb::ScheduleAt::Time(
                    spacetimedb::Timestamp::from_micros_since_unix_epoch(fire_at_micros),
                ),
                room_id,
            });
        }
        
        ctx.db.game_room().id().update(room);
    }
    
    Ok(())
}

#[reducer]
pub fn vote_end_round(
    ctx: &ReducerContext,
    room_id: i32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();

    let room = ctx.db.game_room().id().find(room_id)
        .ok_or("Room not found")?;

    if room.game_status != "active" {
        return Err("Game is not active".to_string());
    }
    if !room.member_ids.contains(&caller_id) {
        return Err("You are not in this room".to_string());
    }
    if room.eliminated_players.contains(&caller_id) {
        return Err("You have been eliminated".to_string());
    }

    let current_round = room.current_round;

    let already_voted = ctx.db.end_round_vote().iter()
        .any(|v| v.room_id == room_id && v.user_id == caller_id && v.round == current_round);
    if already_voted {
        return Err("You have already voted to end this round".to_string());
    }

    ctx.db.end_round_vote().insert(EndRoundVote {
        id: 0,
        room_id,
        user_id: caller_id,
        round: current_round,
    });

    let vote_count = ctx.db.end_round_vote().iter()
        .filter(|v| v.room_id == room_id && v.round == current_round)
        .count();

    let active_players = room.member_ids.iter()
        .filter(|id| !room.eliminated_players.contains(id))
        .count();

    if vote_count >= active_players {
        // Clean up the end-round votes for this round
        let votes_to_delete: Vec<i32> = ctx.db.end_round_vote().iter()
            .filter(|v| v.room_id == room_id && v.round == current_round)
            .map(|v| v.id)
            .collect();
        for vid in votes_to_delete {
            ctx.db.end_round_vote().id().delete(vid);
        }
        do_process_round(ctx, room_id)?;
    }

    Ok(())
}

#[table(accessor = game_tick_timer, scheduled(game_tick))]
pub struct GameTickTimer {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    scheduled_at: spacetimedb::ScheduleAt,
}

// Server-owned round timer: inserted by start_game and re-inserted after each round advance.
// When it fires, process_round_scheduled derives the round from the room's current_round.
#[table(accessor = round_timer_entry, scheduled(process_round_scheduled))]
#[derive(Clone)]
pub struct RoundTimerEntry {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    scheduled_at: spacetimedb::ScheduleAt,
    pub room_id: i32,
}

#[reducer]
pub fn process_round_scheduled(ctx: &ReducerContext, timer: RoundTimerEntry) -> Result<(), String> {
    do_process_round(ctx, timer.room_id)
}

#[table(accessor = unit_task_queue, public)]
#[derive(Clone)]
pub struct UnitTaskQueue {
    #[primary_key]
    #[auto_inc]
    id: i32,
    unit_id: i32,
    task_type: String, // "move" | "gather" | "craft" | "upgrade"
    target_id: String,
    status: String, // "pending" | "in_progress" | "completed" | "failed"
    created_at: Timestamp,
    started_at: Option<Timestamp>,
    completed_at: Option<Timestamp>,
}

#[reducer]
pub fn queue_unit_task(
    ctx: &ReducerContext,
    unit_id: i32,
    task_type: String,
    target_id: String,
) -> Result<(), String> {
    // Validate task type
    if !["move", "gather", "craft", "upgrade"].contains(&task_type.as_str()) {
        return Err("Invalid task type".to_string());
    }

    // Create new task in queue
    ctx.db.unit_task_queue().insert(UnitTaskQueue {
        id: 0, // Will be auto-incremented
        unit_id,
        task_type,
        target_id,
        status: "pending".to_string(),
        created_at: ctx.timestamp,
        started_at: None,
        completed_at: None,
    });

    Ok(())
}

#[reducer]
pub fn cancel_unit_task(
    ctx: &ReducerContext,
    task_id: i32,
) -> Result<(), String> {
    if let Some(mut task) = ctx.db.unit_task_queue().id().find(task_id) {
        if task.status == "pending" {
            task.status = "failed".to_string();
            task.completed_at = Some(ctx.timestamp);
            ctx.db.unit_task_queue().id().update(task);
        }
    }
    Ok(())
}

// Vote Exchange: Bank account management
#[reducer]
pub fn transfer_to_bank(ctx: &ReducerContext, amount: f64) -> Result<(), String> {
    if let Some(mut user) = ctx.db.user().identity().find(ctx.sender()) {
        if amount <= 0.0 {
            return Err("Amount must be positive".to_string());
        }
        
        if user.wallet_balance < amount {
            return Err("Insufficient wallet balance".to_string());
        }
        
        user.wallet_balance -= amount;
        user.bank_account += amount;
        ctx.db.user().identity().update(user);
        
        Ok(())
    } else {
        Err("User not found".to_string())
    }
}

#[reducer]
pub fn withdraw_from_bank(ctx: &ReducerContext, amount: f64) -> Result<(), String> {
    if let Some(mut user) = ctx.db.user().identity().find(ctx.sender()) {
        if amount <= 0.0 {
            return Err("Amount must be positive".to_string());
        }
        
        if user.bank_account < amount {
            return Err("Insufficient bank balance".to_string());
        }
        
        user.bank_account -= amount;
        user.wallet_balance += amount;
        ctx.db.user().identity().update(user);
        
        Ok(())
    } else {
        Err("User not found".to_string())
    }
}

// Vote Exchange: Post-elimination re-buy
#[reducer]
pub fn rebuy_into_game(ctx: &ReducerContext, room_id: i32) -> Result<(), String> {
    let player_id = ctx.sender().to_hex().to_string();
    
    if let Some(mut room) = ctx.db.game_room().id().find(room_id) {
        if room.game_status != "active" {
            return Err("Game is not active".to_string());
        }
        if !room.allow_rebuy {
            return Err("Re-buy is not allowed in this room".to_string());
        }
        if !room.eliminated_players.contains(&player_id) {
            return Err("You are not eliminated".to_string());
        }
        
        let rebuy_cost = room.buyin_amount * REBUY_MULTIPLIER;
        let current_round = room.current_round;
        
        if let Some(mut user) = ctx.db.user().identity().find(ctx.sender()) {
            if user.wallet_balance < rebuy_cost {
                return Err(format!("Insufficient funds. Re-buy costs ${:.2}", rebuy_cost));
            }
            
            // Deduct re-buy cost
            user.wallet_balance -= rebuy_cost;
            user.total_profit_loss -= rebuy_cost;
            ctx.db.user().identity().update(user);
            
            // Remove from eliminated players
            room.eliminated_players.retain(|p| p != &player_id);
            
            room.pot_size += rebuy_cost * REBUY_POT_PERCENTAGE;
            
            ctx.db.game_room().id().update(room);
            
            // Give player a new vote
            let new_vote = ctx.db.vote().insert(Vote {
                id: 0,
                room_id,
                round_number: current_round,
                player_id: player_id.clone(),
                original_owner: player_id.clone(),
                color: None,
                is_for_sale: false,
                sale_price: None,
                timestamp: ctx.timestamp,
            });
            
            // Laborer-Vote Unification: create a linked unit for the new vote
            let rebuy_unit = ctx.db.unit().insert(Unit {
                id: 0,
                room_id,
                owner_id: player_id.clone(),
                unit_type: "minion".to_string(),
                position: Vector2 {
                    x: ctx.rng().gen::<f32>() * 80.0 + 10.0,
                    y: ctx.rng().gen::<f32>() * 80.0 + 10.0,
                },
                dimensions: Vector2 { x: 20.0, y: 20.0 },
                fill_style: "#aaaaaa".to_string(),
                task_type: None, target_id: None,
                vote_color: None, vote_guarantee: None,
                vote_price: None, vote_owner: None,
                vote_id: Some(new_vote.id),
                storage_capacity: None, is_storage: false,
                building_type: None, construction_progress: None,
                construction_max: None, assigned_unit_id: None,
                building_recipe: None, tax_rate: None, contributors: vec![],
            });
            ctx.db.unit_stats().insert(UnitStats {
                unit_id: rebuy_unit.id,
                health: 100, max_health: 100, attack: 10, defense: 5,
                speed: 3, gather_rate: 5, craft_rate: 3,
                woodcutting_xp: 0, woodcutting_level: 1,
                mining_xp: 0, mining_level: 1,
                foraging_xp: 0, foraging_level: 1,
                crafting_xp: 0, crafting_level: 1,
            });
            ctx.db.unit_inventory().insert(UnitInventory {
                unit_id: rebuy_unit.id,
                wood: 0, stone: 0, metal_ore: 0, coal: 0, gems: 0,
                fiber: 0, hide: 0, sand: 0, food: 0,
                wooden_pole: 0, lumber: 0, cut_stone: 0, metal_ingot: 0,
                cloth: 0, rope: 0, leather: 0, glass: 0,
                max_capacity: 100,
            });
            
            // Record transaction
            ctx.db.transaction().insert(Transaction {
                id: 0,
                room_id,
                from_player: player_id.clone(),
                to_player: "pot".to_string(),
                transaction_type: "rebuy".to_string(),
                amount: rebuy_cost,
                vote_id: None,
                guarantee_id: None,
                timestamp: ctx.timestamp,
            });
            
            Ok(())
        } else {
            Err("User not found".to_string())
        }
    } else {
        Err("Room not found".to_string())
    }
}

#[reducer]
pub fn leave_room(ctx: &ReducerContext, room_id: i32) -> Result<(), String> {
    let player_id = ctx.sender().to_hex().to_string();
    
    if let Some(mut room) = ctx.db.game_room().id().find(room_id) {
        if !room.member_ids.contains(&player_id) {
            return Err("You are not in this room".to_string());
        }
        
        // Remove player from member list
        room.member_ids.retain(|id| id != &player_id);
        
        // If game is active, eliminate them and void their votes
        if room.game_status == "active" {
            if !room.eliminated_players.contains(&player_id) {
                room.eliminated_players.push(player_id.clone());
            }
            
            // Void all their votes (remove from sale and unset color)
            let player_votes: Vec<Vote> = ctx.db.vote().iter()
                .filter(|v| v.room_id == room_id && v.player_id == player_id)
                .collect();
            
            for vote in player_votes {
                ctx.db.vote().id().delete(vote.id);
            }
            
            // Cancel any active guarantees they created
            let player_guarantees: Vec<Guarantee> = ctx.db.guarantee().iter()
                .filter(|g| g.room_id == room_id && g.seller_id == player_id && g.is_active)
                .collect();
            
            for mut guarantee in player_guarantees {
                guarantee.is_active = false;
                ctx.db.guarantee().id().update(guarantee);
            }
            
            // Check if game should end (1 or fewer active players)
            let remaining: Vec<_> = room.member_ids.iter()
                .filter(|id| !room.eliminated_players.contains(id))
                .cloned()
                .collect();
            
            if remaining.len() <= 1 {
                room.game_status = "completed".to_string();
                
                // Distribute pot to remaining player(s)
                if !remaining.is_empty() {
                    let pot_per_winner = room.pot_size / remaining.len() as f64;
                    for winner_id in &remaining {
                        if let Some(user) = ctx.db.user().iter().find(|u| u.identity.to_hex().to_string() == *winner_id) {
                            let mut updated_user = user.clone();
                            updated_user.wallet_balance += pot_per_winner;
                            updated_user.total_profit_loss += pot_per_winner - room.buyin_amount;
                            ctx.db.user().identity().update(updated_user);
                            
                            ctx.db.transaction().insert(Transaction {
                                id: 0,
                                room_id,
                                from_player: "pot".to_string(),
                                to_player: winner_id.clone(),
                                transaction_type: "pot_distribution".to_string(),
                                amount: pot_per_winner,
                                vote_id: None,
                                guarantee_id: None,
                                timestamp: ctx.timestamp,
                            });
                        }
                    }
                }
            }
        }
        
        // Cancel open trade offers from this player
        let player_offers: Vec<TradeOffer> = ctx.db.trade_offer().iter()
            .filter(|o| o.room_id == room_id && o.from_player == player_id && o.status == "open")
            .collect();
        for mut offer in player_offers {
            offer.status = "cancelled".to_string();
            ctx.db.trade_offer().id().update(offer);
        }

        // Remove chat permissions for the room's chat
        let chat_room_id = format!("game_{}", room_id);
        let perms: Vec<ChatPermission> = ctx.db.chat_permission().iter()
            .filter(|p| p.room_id == chat_room_id && p.user_id == ctx.sender())
            .collect();
        for perm in perms {
            ctx.db.chat_permission().id().delete(perm.id);
        }

        // Clean up player position for this room
        let positions: Vec<PlayerPosition> = ctx.db.player_position().iter()
            .filter(|p| p.identity == ctx.sender() && p.room_id == room_id)
            .collect();
        for pos in positions {
            ctx.db.player_position().id().delete(pos.id);
        }

        // Clean up player's units from this room
        let player_units: Vec<Unit> = ctx.db.unit().iter()
            .filter(|u| u.room_id == room_id && u.owner_id == player_id)
            .collect();
        for unit in &player_units {
            let unit_equips: Vec<Equipment> = ctx.db.equipment().iter()
                .filter(|e| e.equipped_to_unit_id == Some(unit.id)).collect();
            for mut eq in unit_equips { eq.equipped_to_unit_id = None; ctx.db.equipment().id().update(eq); }
            ctx.db.unit_inventory().unit_id().delete(unit.id);
            ctx.db.unit_stats().unit_id().delete(unit.id);
            ctx.db.laborer_genetics().unit_id().delete(unit.id);
            ctx.db.unit().id().delete(unit.id);
        }

        // If lobby is now empty, clean up
        if room.member_ids.is_empty() {
            room.game_status = "completed".to_string();
        }
        
        ctx.db.game_room().id().update(room);
        Ok(())
    } else {
        Err("Room not found".to_string())
    }
}

// Vote Exchange: Trade offer system
#[table(accessor = trade_offer, public)]
#[derive(Clone)]
pub struct TradeOffer {
    #[primary_key]
    #[auto_inc]
    id: i32,
    room_id: i32,
    round_number: i32,
    from_player: String,
    offer_type: String,       // "sell_vote" | "buy_vote"
    vote_id: Option<i32>,     // The specific vote being offered (for sell offers)
    price: f64,
    status: String,           // "open" | "accepted" | "declined" | "cancelled"
    accepted_by: Option<String>,
    created_at: Timestamp,
}

#[reducer]
pub fn create_trade_offer(
    ctx: &ReducerContext,
    room_id: i32,
    round_number: i32,
    offer_type: String,
    vote_id: Option<i32>,
    price: f64,
) -> Result<(), String> {
    let player_id = ctx.sender().to_hex().to_string();
    
    if offer_type != "sell_vote" && offer_type != "buy_vote" {
        return Err("Invalid offer type".to_string());
    }
    
    if price <= 0.0 {
        return Err("Price must be greater than 0".to_string());
    }
    
    // For sell offers, verify the player owns the vote
    if offer_type == "sell_vote" {
        if let Some(vid) = vote_id {
            let vote = ctx.db.vote().id().find(vid)
                .ok_or("Vote not found")?;
            if vote.player_id != player_id {
                return Err("You don't own this vote".to_string());
            }
        } else {
            return Err("Sell offers must specify a vote".to_string());
        }
    }
    
    // For buy offers, verify the player has enough funds
    if offer_type == "buy_vote" {
        let user = ctx.db.user().identity().find(ctx.sender())
            .ok_or("User not found")?;
        if user.wallet_balance < price {
            return Err("Insufficient funds".to_string());
        }
    }
    
    ctx.db.trade_offer().insert(TradeOffer {
        id: 0,
        room_id,
        round_number,
        from_player: player_id,
        offer_type,
        vote_id,
        price,
        status: "open".to_string(),
        accepted_by: None,
        created_at: ctx.timestamp,
    });
    
    Ok(())
}

#[reducer]
pub fn accept_trade_offer(
    ctx: &ReducerContext,
    offer_id: i32,
) -> Result<(), String> {
    let accepter_id = ctx.sender().to_hex().to_string();
    
    let mut offer = ctx.db.trade_offer().id().find(offer_id)
        .ok_or("Trade offer not found")?;
    
    if offer.status != "open" {
        return Err("This offer is no longer available".to_string());
    }
    
    if offer.from_player == accepter_id {
        return Err("Cannot accept your own offer".to_string());
    }
    
    let price = offer.price;
    let room_id = offer.room_id;
    
    if offer.offer_type == "sell_vote" {
        // Seller is offering a vote -> accepter is buying
        let vote_id = offer.vote_id.ok_or("No vote specified in offer")?;
        
        // Verify buyer has funds
        let buyer = ctx.db.user().iter()
            .find(|u| u.identity.to_hex().to_string() == accepter_id)
            .ok_or("Buyer not found")?;
        if buyer.wallet_balance < price {
            return Err("Insufficient funds".to_string());
        }
        
        // Verify seller still owns the vote
        let mut vote = ctx.db.vote().id().find(vote_id)
            .ok_or("Vote no longer exists")?;
        if vote.player_id != offer.from_player {
            return Err("Seller no longer owns this vote".to_string());
        }
        
        let fee = price * TRANSACTION_FEE_RATE;
        let seller_receives = price - fee;
        
        let mut updated_buyer = buyer.clone();
        updated_buyer.wallet_balance -= price;
        ctx.db.user().identity().update(updated_buyer);
        
        let seller = ctx.db.user().iter()
            .find(|u| u.identity.to_hex().to_string() == offer.from_player)
            .ok_or("Seller not found")?;
        let mut updated_seller = seller.clone();
        updated_seller.wallet_balance += seller_receives;
        ctx.db.user().identity().update(updated_seller);
        
        if fee > 0.0 {
            if let Some(mut room) = ctx.db.game_room().id().find(room_id) {
                room.pot_size += fee;
                ctx.db.game_room().id().update(room);
            }
        }
        
        // Transfer vote ownership
        let transferring_vote_id = vote.id;
        vote.player_id = accepter_id.clone();
        vote.is_for_sale = false;
        vote.sale_price = None;
        ctx.db.vote().id().update(vote);

        // Sync linked unit ownership (laborer-vote unification)
        if let Some(mut linked_unit) = ctx.db.unit().iter()
            .find(|u| u.vote_id == Some(transferring_vote_id)) {
            linked_unit.owner_id = accepter_id.clone();
            linked_unit.vote_owner = Some(accepter_id.clone());
            ctx.db.unit().id().update(linked_unit);
        }
        
        ctx.db.transaction().insert(Transaction {
            id: 0,
            room_id,
            from_player: offer.from_player.clone(),
            to_player: accepter_id.clone(),
            transaction_type: "vote_sale".to_string(),
            amount: price,
            vote_id: Some(vote_id),
            guarantee_id: None,
            timestamp: ctx.timestamp,
        });
    } else {
        // Buyer is offering to buy a vote -> accepter is selling
        // Accepter needs to have a vote to sell. Find any vote they own in this room.
        let seller_vote = ctx.db.vote().iter()
            .find(|v| v.room_id == room_id && v.player_id == accepter_id)
            .ok_or("You don't have a vote to sell")?;
        let vote_id = seller_vote.id;
        
        // Verify buyer still has funds
        let buyer = ctx.db.user().iter()
            .find(|u| u.identity.to_hex().to_string() == offer.from_player)
            .ok_or("Buyer not found")?;
        if buyer.wallet_balance < price {
            return Err("Buyer no longer has sufficient funds".to_string());
        }
        
        let fee = price * TRANSACTION_FEE_RATE;
        let seller_receives = price - fee;
        
        let mut updated_buyer = buyer.clone();
        updated_buyer.wallet_balance -= price;
        ctx.db.user().identity().update(updated_buyer);
        
        let seller = ctx.db.user().iter()
            .find(|u| u.identity.to_hex().to_string() == accepter_id)
            .ok_or("Seller not found")?;
        let mut updated_seller = seller.clone();
        updated_seller.wallet_balance += seller_receives;
        ctx.db.user().identity().update(updated_seller);
        
        if fee > 0.0 {
            if let Some(mut room) = ctx.db.game_room().id().find(room_id) {
                room.pot_size += fee;
                ctx.db.game_room().id().update(room);
            }
        }
        
        // Transfer vote ownership
        let mut updated_vote = seller_vote.clone();
        updated_vote.player_id = offer.from_player.clone();
        updated_vote.is_for_sale = false;
        updated_vote.sale_price = None;
        ctx.db.vote().id().update(updated_vote);

        // Sync linked unit ownership (laborer-vote unification)
        if let Some(mut linked_unit) = ctx.db.unit().iter()
            .find(|u| u.vote_id == Some(vote_id)) {
            linked_unit.owner_id = offer.from_player.clone();
            linked_unit.vote_owner = Some(offer.from_player.clone());
            ctx.db.unit().id().update(linked_unit);
        }
        
        ctx.db.transaction().insert(Transaction {
            id: 0,
            room_id,
            from_player: accepter_id.clone(),
            to_player: offer.from_player.clone(),
            transaction_type: "vote_sale".to_string(),
            amount: price,
            vote_id: Some(vote_id),
            guarantee_id: None,
            timestamp: ctx.timestamp,
        });
    }
    
    offer.status = "accepted".to_string();
    offer.accepted_by = Some(accepter_id);
    let offer_vote_id = offer.vote_id;
    ctx.db.trade_offer().id().update(offer);
    
    if let Some(vote_id) = offer_vote_id {
        let related_offers: Vec<TradeOffer> = ctx.db.trade_offer().iter()
            .filter(|o| o.vote_id == Some(vote_id) && o.status == "open" && o.id != offer_id)
            .collect();
        for mut related in related_offers {
            related.status = "cancelled".to_string();
            ctx.db.trade_offer().id().update(related);
        }
    }
    
    Ok(())
}

#[reducer]
pub fn cancel_trade_offer(
    ctx: &ReducerContext,
    offer_id: i32,
) -> Result<(), String> {
    let player_id = ctx.sender().to_hex().to_string();
    
    let mut offer = ctx.db.trade_offer().id().find(offer_id)
        .ok_or("Trade offer not found")?;
    
    if offer.from_player != player_id {
        return Err("You can only cancel your own offers".to_string());
    }
    
    if offer.status != "open" {
        return Err("Offer is no longer open".to_string());
    }
    
    offer.status = "cancelled".to_string();
    ctx.db.trade_offer().id().update(offer);
    
    Ok(())
}

#[reducer]
pub fn game_tick(ctx: &ReducerContext, _timer: GameTickTimer) -> Result<(), String> {
    // Get all units
    let units = ctx.db.unit().iter().collect::<Vec<_>>();
    
    // Process each unit
    for unit in units {
        // Get the next pending task for this unit
        if let Some(task) = ctx.db.unit_task_queue().iter()
            .filter(|t| t.unit_id == unit.id && t.status == "pending")
            .next() 
        {
            // Clone task before using it
            let task_type = task.task_type.clone();
            let target_id = task.target_id.clone();
            
            // Start the task
            let mut updated_task = task.clone();
            updated_task.status = "in_progress".to_string();
            updated_task.started_at = Some(ctx.timestamp);
            ctx.db.unit_task_queue().id().update(updated_task);

            // Update unit's current task
            let mut updated_unit = unit.clone();
            updated_unit.task_type = Some(task_type.clone());
            updated_unit.target_id = Some(target_id.clone());
            ctx.db.unit().id().update(updated_unit);

            // Process the task
            match task_type.as_str() {
                "move" => {
                    if let Some(target_unit) = ctx.db.unit().id().find(target_id.parse::<i32>().unwrap_or(0)) {
                        let dx = target_unit.position.x - unit.position.x;
                        let dy = target_unit.position.y - unit.position.y;
                        let distance = (dx * dx + dy * dy).sqrt();
                        
                        if distance <= 1.0 {
                            // Task completed
                            let mut completed_task = task.clone();
                            completed_task.status = "completed".to_string();
                            completed_task.completed_at = Some(ctx.timestamp);
                            ctx.db.unit_task_queue().id().update(completed_task);
                            
                            // Clear unit's current task
                            let mut cleared_unit = unit.clone();
                            cleared_unit.task_type = None;
                            cleared_unit.target_id = None;
                            ctx.db.unit().id().update(cleared_unit);
                        } else {
                            // Move unit towards target
                            let speed = 2.0;
                            let ratio = speed / distance;
                            let mut moved_unit = unit.clone();
                            moved_unit.position = Vector2 {
                                x: unit.position.x + dx * ratio,
                                y: unit.position.y + dy * ratio,
                            };
                            ctx.db.unit().id().update(moved_unit);
                        }
                    }
                },
                "gather" => {
                    if let Some(mut resource) = ctx.db.resource().id().find(&target_id) {
                        let dx = resource.position.x - unit.position.x;
                        let dy = resource.position.y - unit.position.y;
                        let distance = (dx * dx + dy * dy).sqrt();
                        
                        if distance <= 30.0 {
                            // Process gathering
                            if let Some(mut inventory) = ctx.db.unit_inventory().unit_id().find(unit.id) {
                                let gather_amount = 5;
                                
                                // Check if resource has enough amount
                                if resource.amount >= gather_amount {
                                    match resource.resource_type.as_str() {
                                        "wood" => inventory.wood += gather_amount,
                                        "stone" => inventory.stone += gather_amount,
                                        "metal_ore" => inventory.metal_ore += gather_amount,
                                        "coal" => inventory.coal += gather_amount,
                                        "gems" => inventory.gems += gather_amount,
                                        "fiber" => inventory.fiber += gather_amount,
                                        "hide" => inventory.hide += gather_amount,
                                        "sand" => inventory.sand += gather_amount,
                                        "food" => inventory.food += gather_amount,
                                        _ => continue,
                                    }
                                    ctx.db.unit_inventory().unit_id().update(inventory);
                                    
                                    // Update resource amount
                                    resource.amount -= gather_amount;
                                    
                                    // If resource is depleted, start regeneration timer
                                    if resource.amount <= resource.depletion_threshold {
                                        resource.regeneration_timer = 10; // 10 ticks until regeneration starts
                                    }
                                    
                                    ctx.db.resource().id().update(resource);
                                    
                                    // Task completed
                                    let mut completed_task = task.clone();
                                    completed_task.status = "completed".to_string();
                                    completed_task.completed_at = Some(ctx.timestamp);
                                    ctx.db.unit_task_queue().id().update(completed_task);
                                    
                                    // Clear unit's current task
                                    let mut cleared_unit = unit.clone();
                                    cleared_unit.task_type = None;
                                    cleared_unit.target_id = None;
                                    ctx.db.unit().id().update(cleared_unit);
                                }
                            }
                        } else {
                            // Move towards resource
                            let speed = 2.0;
                            let ratio = speed / distance;
                            let mut moved_unit = unit.clone();
                            moved_unit.position = Vector2 {
                                x: unit.position.x + dx * ratio,
                                y: unit.position.y + dy * ratio,
                            };
                            ctx.db.unit().id().update(moved_unit);
                        }
                    }
                },
                _ => continue,
            }
        }
    }
    
    // Process resource regeneration
    let resources = ctx.db.resource().iter().collect::<Vec<_>>();
    for mut resource in resources {
        if resource.amount < resource.max_amount {
            if resource.regeneration_timer > 0 {
                resource.regeneration_timer -= 1;
            } else {
                resource.amount = (resource.amount + resource.regeneration_rate).min(resource.max_amount);
            }
            ctx.db.resource().id().update(resource);
        }
    }

    // Phase C: Process building production (refinery/manufacturing)
    let buildings: Vec<Unit> = ctx.db.unit().iter()
        .filter(|u| u.building_type.is_some() && u.assigned_unit_id.is_some()
            && u.construction_progress >= u.construction_max)
        .collect();

    for building in buildings {
        let btype = building.building_type.as_deref().unwrap_or("");
        if let Some(mut bldg_inv) = ctx.db.unit_inventory().unit_id().find(building.id) {
            match btype {
                "refinery_carpenter" => {
                    if bldg_inv.wood >= 5 {
                        bldg_inv.wood -= 5;
                        bldg_inv.lumber += 2;
                        ctx.db.unit_inventory().unit_id().update(bldg_inv);
                    }
                }
                "refinery_forge" => {
                    if bldg_inv.metal_ore >= 5 && bldg_inv.coal >= 2 {
                        bldg_inv.metal_ore -= 5;
                        bldg_inv.coal -= 2;
                        bldg_inv.metal_ingot += 2;
                        ctx.db.unit_inventory().unit_id().update(bldg_inv);
                    }
                }
                "refinery_mason" => {
                    if bldg_inv.stone >= 5 {
                        bldg_inv.stone -= 5;
                        bldg_inv.cut_stone += 2;
                        ctx.db.unit_inventory().unit_id().update(bldg_inv);
                    }
                }
                "refinery_weaver" => {
                    if bldg_inv.fiber >= 5 {
                        bldg_inv.fiber -= 5;
                        bldg_inv.cloth += 2;
                        ctx.db.unit_inventory().unit_id().update(bldg_inv);
                    }
                }
                "refinery_tanner" => {
                    if bldg_inv.hide >= 5 {
                        bldg_inv.hide -= 5;
                        bldg_inv.leather += 2;
                        ctx.db.unit_inventory().unit_id().update(bldg_inv);
                    }
                }
                "refinery_glass_furnace" => {
                    if bldg_inv.sand >= 5 && bldg_inv.coal >= 1 {
                        bldg_inv.sand -= 5;
                        bldg_inv.coal -= 1;
                        bldg_inv.glass += 2;
                        ctx.db.unit_inventory().unit_id().update(bldg_inv);
                    }
                }
                "refinery_kitchen" => {
                    // Consumes raw food + coal to produce cooked food (stored as hide field, repurposed as "rations")
                    // Net: 3 food + 1 coal -> 5 rations. Uses hide field for cooked output to avoid infinite loop.
                    if bldg_inv.food >= 3 && bldg_inv.coal >= 1 {
                        bldg_inv.food -= 3;
                        bldg_inv.coal -= 1;
                        bldg_inv.hide += 5; // "rations" stored in hide slot
                        ctx.db.unit_inventory().unit_id().update(bldg_inv);
                    }
                }
                "extraction_wood" => {
                    bldg_inv.wood += 3;
                    ctx.db.unit_inventory().unit_id().update(bldg_inv);
                }
                "extraction_mine" => {
                    bldg_inv.metal_ore += 2;
                    bldg_inv.coal += 1;
                    ctx.db.unit_inventory().unit_id().update(bldg_inv);
                }
                "extraction_quarry" => {
                    bldg_inv.stone += 3;
                    ctx.db.unit_inventory().unit_id().update(bldg_inv);
                }
                "extraction_hunter" => {
                    bldg_inv.hide += 2;
                    bldg_inv.food += 1;
                    ctx.db.unit_inventory().unit_id().update(bldg_inv);
                }
                "extraction_farm" => {
                    bldg_inv.food += 3;
                    bldg_inv.fiber += 1;
                    ctx.db.unit_inventory().unit_id().update(bldg_inv);
                }
                "farm_food" => {
                    bldg_inv.food += 4;
                    ctx.db.unit_inventory().unit_id().update(bldg_inv);
                }
                _ => {}
            }
        }
    }
    
    Ok(())
}

#[reducer]
pub fn create_storage_building(
    ctx: &ReducerContext,
    room_id: i32,
    position: Vector2,
    capacity: i32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let room = ctx.db.game_room().id().find(room_id)
        .ok_or("Room not found")?;
    if !room.member_ids.contains(&caller_id) {
        return Err("You are not a member of this room".to_string());
    }
    let storage = Unit {
        id: 0,
        room_id,
        owner_id: ctx.sender().to_hex().to_string(),
        unit_type: "storage".to_string(),
        position,
        dimensions: Vector2 { x: 40.0, y: 40.0 },
        fill_style: "#808080".to_string(),
        task_type: None, target_id: None,
        vote_color: None, vote_guarantee: None,
        vote_price: None, vote_owner: None,
        vote_id: None,
        storage_capacity: Some(capacity),
        is_storage: true,
        building_type: Some("storage".to_string()),
        construction_progress: Some(100),
        construction_max: Some(100),
        assigned_unit_id: None,
        building_recipe: None,
        tax_rate: None,
        contributors: vec![ctx.sender().to_hex().to_string()],
    };
    let inserted_storage = ctx.db.unit().insert(storage);

    // Create inventory for storage
    let inventory = UnitInventory {
        unit_id: inserted_storage.id,
        // Primary Resources
        wood: 0,
        stone: 0,
        metal_ore: 0,
        coal: 0,
        gems: 0,
        fiber: 0,
        hide: 0,
        sand: 0,
        food: 0,
        // Secondary Resources
        wooden_pole: 0,
        lumber: 0,
        cut_stone: 0,
        metal_ingot: 0,
        cloth: 0,
        rope: 0,
        leather: 0,
        glass: 0,
        max_capacity: capacity,
    };
    ctx.db.unit_inventory().insert(inventory);

    Ok(())
}

#[reducer]
pub fn transfer_resources(
    ctx: &ReducerContext,
    source_id: i32,
    target_id: i32,
    resource_type: String,
    amount: i32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let source_unit = ctx.db.unit().id().find(source_id)
        .ok_or("Source unit not found")?;
    if source_unit.owner_id != caller_id {
        return Err("You don't own the source unit".to_string());
    }
    if let (Some(mut source_inv), Some(mut target_inv)) = (
        ctx.db.unit_inventory().unit_id().find(source_id),
        ctx.db.unit_inventory().unit_id().find(target_id)
    ) {
        // Check if source has enough resources
        let source_amount = match resource_type.as_str() {
            "wood" => source_inv.wood,
            "stone" => source_inv.stone,
            "metal_ore" => source_inv.metal_ore,
            "coal" => source_inv.coal,
            "gems" => source_inv.gems,
            "fiber" => source_inv.fiber,
            "hide" => source_inv.hide,
            "sand" => source_inv.sand,
            "food" => source_inv.food,
            _ => return Err("Invalid resource type".to_string()),
        };

        if source_amount < amount {
            return Err("Not enough resources".to_string());
        }

        // Check if target has enough capacity
        let target_amount = match resource_type.as_str() {
            "wood" => target_inv.wood,
            "stone" => target_inv.stone,
            "metal_ore" => target_inv.metal_ore,
            "coal" => target_inv.coal,
            "gems" => target_inv.gems,
            "fiber" => target_inv.fiber,
            "hide" => target_inv.hide,
            "sand" => target_inv.sand,
            "food" => target_inv.food,
            _ => return Err("Invalid resource type".to_string()),
        };

        if target_amount + amount > target_inv.max_capacity {
            return Err("Target inventory full".to_string());
        }

        // Transfer resources
        match resource_type.as_str() {
            "wood" => {
                source_inv.wood -= amount;
                target_inv.wood += amount;
            },
            "stone" => {
                source_inv.stone -= amount;
                target_inv.stone += amount;
            },
            "metal_ore" => {
                source_inv.metal_ore -= amount;
                target_inv.metal_ore += amount;
            },
            "coal" => {
                source_inv.coal -= amount;
                target_inv.coal += amount;
            },
            "gems" => {
                source_inv.gems -= amount;
                target_inv.gems += amount;
            },
            "fiber" => {
                source_inv.fiber -= amount;
                target_inv.fiber += amount;
            },
            "hide" => {
                source_inv.hide -= amount;
                target_inv.hide += amount;
            },
            "sand" => {
                source_inv.sand -= amount;
                target_inv.sand += amount;
            },
            "food" => {
                source_inv.food -= amount;
                target_inv.food += amount;
            },
            _ => return Err("Invalid resource type".to_string()),
        }

        // Update inventories
        ctx.db.unit_inventory().unit_id().update(source_inv);
        ctx.db.unit_inventory().unit_id().update(target_inv);

        // Create transfer event
        create_game_event(
            ctx,
            source_id.to_string(),
            "transfer".to_string(),
            source_id.to_string(),
            target_id.to_string(),
            amount,
        )?;

        Ok(())
    } else {
        Err("Source or target inventory not found".to_string())
    }
}


// ============================================================================
// Additional Tables (used by submodule reducers, defined here so accessor
// traits are in scope everywhere via super::*)
// ============================================================================

// Phase D: Equipment System
#[table(accessor = equipment, public)]
#[derive(Clone)]
pub struct Equipment {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub room_id: i32,
    pub owner_id: String,
    pub equipped_to_unit_id: Option<i32>,
    pub equipment_type: String,
    pub slot: String,
    pub item_name: String,
    pub tier: i32,
    pub material: String,
    pub enchantment: Option<String>,
    pub quality: String,
    pub surface: String,
    pub attack_bonus: i32,
    pub defense_bonus: i32,
    pub speed_bonus: i32,
    pub health_bonus: i32,
    pub durability: i32,
    pub max_durability: i32,
}

// Phase E: Battle Arena
#[table(accessor = battle_arena, public)]
#[derive(Clone)]
pub struct BattleArena {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub room_id: i32,
    pub round_number: i32,
    pub status: String,
    pub turn_number: i32,
    pub winner_team: Option<String>,
    pub created_at: Timestamp,
}

#[table(accessor = battle_unit, public)]
#[derive(Clone)]
pub struct BattleUnit {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub arena_id: i32,
    pub source_unit_id: i32,
    pub owner_id: String,
    pub team: String,
    pub current_health: i32,
    pub max_health: i32,
    pub attack: i32,
    pub defense: i32,
    pub speed: i32,
    pub is_alive: bool,
    pub position_x: f32,
    pub position_y: f32,
}

// Phase F: Laborer Genetics and Breeding
#[table(accessor = laborer_genetics, public)]
#[derive(Clone)]
pub struct LaborerGenetics {
    #[primary_key]
    pub unit_id: i32,
    pub generation: i32,
    pub parent_a_id: Option<i32>,
    pub parent_b_id: Option<i32>,
    pub combat_iv: i32,
    pub gathering_iv: i32,
    pub crafting_iv: i32,
    pub speed_iv: i32,
    pub health_iv: i32,
    pub stamina_iv: i32,
}

// Phase G: Vote Mechanics Polish
#[table(accessor = side_bet, public)]
#[derive(Clone)]
pub struct SideBet {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub room_id: i32,
    pub round_number: i32,
    pub bettor_id: String,
    pub bet_type: String,
    pub bet_target: String,
    pub amount: f64,
    pub payout_multiplier: f64,
    pub status: String,
    pub created_at: Timestamp,
}

// Phase H: Multi-Timeframe Server Hierarchy
#[table(accessor = server_node, public)]
#[derive(Clone)]
pub struct ServerNode {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub name: String,
    pub server_type: String,
    pub parent_id: Option<i32>,
    pub trading_period_seconds: i64,
    pub status: String,
    pub linked_room_id: Option<i32>,
    pub created_at: Timestamp,
}

// Phase I: Dual Currency (MT + MBLS)
#[table(accessor = player_currency, public)]
#[derive(Clone)]
pub struct PlayerCurrency {
    #[primary_key]
    pub player_id: String,
    pub mt_balance: f64,
    pub mbls_balance: f64,
}

// Phase J: Platform Features
#[table(accessor = tournament, public)]
#[derive(Clone)]
pub struct Tournament {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub name: String,
    pub entry_fee: f64,
    pub prize_pool: f64,
    pub max_participants: i32,
    pub current_round: i32,
    pub status: String,
    pub bracket_type: String,
    pub room_ids: Vec<i32>,
    pub participant_ids: Vec<String>,
    pub created_at: Timestamp,
}

#[table(accessor = spectator, public)]
#[derive(Clone)]
pub struct Spectator {
    #[primary_key]
    #[auto_inc]
    pub id: i32,
    pub room_id: i32,
    pub user_id: String,
    pub joined_at: Timestamp,
}

// ============================================================================
// Module Declarations
// Reducers are organized into domain-specific submodules; all table
// definitions live in this file so accessor traits are always in scope.
// ============================================================================

pub mod social;
pub mod colony_builder;
pub mod battle_genetics;
pub mod platform;
pub mod test_utils;
