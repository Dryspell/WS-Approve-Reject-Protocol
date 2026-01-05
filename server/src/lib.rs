#![allow(unused)]

#[macro_use]
use spacetimedb::{reducer, table, Identity, ReducerContext, Table, Timestamp, rand, SpacetimeType};
use rand::Rng;

// Game-related types
#[derive(SpacetimeType, Clone, Debug)]
pub struct Vector2 {
    x: f32,
    y: f32,
}

// Chat-related types
#[table(name = chat_room, public)]
#[derive(Clone, Debug)]
pub struct ChatRoom {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub created_at: i64,
}

#[table(name = chat_message, public)]
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

#[table(name = chat_permission, public)]
#[derive(Clone, Debug)]
pub struct ChatPermission {
    #[primary_key]
    pub room_id: String,
    pub user_id: Identity,
    pub permission: String, // "read" | "write"
}

// Game tables
#[table(name = user, public)]
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

#[table(name = message, public)]
pub struct Message {
    sender: Identity,
    sent: Timestamp,
    text: String,
}

#[table(name = game_room, public)]
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
    buyin_amount: f64,        // Initial buy-in per player
    pot_size: f64,            // Current pot (sum of buy-ins + fees)
    round_duration: i32,      // Duration in seconds (e.g., 300 = 5 minutes)
    game_status: String,      // "lobby" | "active" | "completed"
    eliminated_players: Vec<String>, // Players eliminated in previous rounds
}

#[table(name = unit, public)]
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
    // New storage-related fields
    storage_capacity: Option<i32>, // Storage capacity for storage buildings
    is_storage: bool, // Whether this unit is a storage building
}

#[table(name = game_event, public)]
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

#[table(name = ready_state, public)]
pub struct ReadyState {
    #[primary_key]
    room_id: String,
    ready_user_ids: Vec<String>,
    round: i32,
}

// Game resource types
#[table(name = resource, public)]
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

#[table(name = unit_stats, public)]
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
}

#[table(name = unit_inventory, public)]
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
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
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
        sender: ctx.sender,
        text,
        sent: ctx.timestamp,
    });
    Ok(())
}

#[reducer]
pub fn create_room(
    ctx: &ReducerContext,
    _room_id: String, // Unused - we use auto-generated ID instead
    name: String,
    creator_id: String,
    buyin_amount: f64, // Vote Exchange: buy-in amount
) -> Result<(), String> {
    let room = GameRoom {
        id: 0, // Will be auto-incremented
        name,
        member_ids: vec![creator_id],
        ticket_ids: vec![],
        offer_ids: vec![],
        start_time: None,
        current_round: 0,
        // Vote Exchange fields
        buyin_amount,
        pot_size: 0.0, // Will be set when game starts
        round_duration: 300, // 5 minutes default
        game_status: "lobby".to_string(),
        eliminated_players: vec![],
    };
    
    // Insert returns the row with the auto-generated ID
    let inserted_room = ctx.db.game_room().insert(room);

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
        if !room.member_ids.contains(&user_id) {
            room.member_ids.push(user_id);
            ctx.db.game_room().id().update(room);
        }
    }
    Ok(())
}

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

        // Check if all users are ready
        if let Some(room) = ctx.db.game_room().id().find(room_id) {
            if ready_count == room.member_ids.len() {
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
            if let Some(user) = ctx.db.user().iter().find(|u| u.identity.to_string() == *member_id) {
                let mut updated_user = user.clone();
                
                // Check if user has enough money
                if updated_user.wallet_balance < room.buyin_amount {
                    return Err(format!("Player {} has insufficient funds", member_id));
                }
                
                // Deduct buy-in
                updated_user.wallet_balance -= room.buyin_amount;
                ctx.db.user().identity().update(updated_user);
                
                pot += room.buyin_amount;
                
                // Create initial vote for this player
                ctx.db.vote().insert(Vote {
                    id: 0,
                    room_id,
                    round_number: 1,
                    player_id: member_id.clone(),
                    original_owner: member_id.clone(),
                    color: None, // Not set yet
                    timestamp: ctx.timestamp,
                });
            }
        }
        
        room.pot_size = pot;
        room.start_time = Some(ctx.timestamp.to_micros_since_unix_epoch() * 1000 + 5000); // 5 second countdown
        room.current_round = 1;
        room.game_status = "active".to_string();
        ctx.db.game_room().id().update(room);

        // Create initial units (for colony builder extension)
        create_initial_units(ctx, &room_clone)?;
    }
    Ok(())
}

fn create_initial_units(ctx: &ReducerContext, room: &GameRoom) -> Result<(), String> {
    // Create units
    for member_id in &room.member_ids {
        let unit = Unit {
            id: 0, // Will be auto-incremented
            room_id: room.id,
            owner_id: member_id.clone(),
            unit_type: "minion".to_string(),
            position: Vector2 {
                x: (ctx.rng().gen::<f32>() * 100.0) as f32,
                y: (ctx.rng().gen::<f32>() * 100.0) as f32,
            },
            dimensions: Vector2 { x: 20.0, y: 20.0 },
            fill_style: format!("#{:06x}", ctx.rng().gen::<u32>() % 16777215),
            task_type: None,
            target_id: None,
            vote_color: None,
            vote_guarantee: None,
            vote_price: None,
            vote_owner: None,
            storage_capacity: None,
            is_storage: false,
        };
        let inserted_unit = ctx.db.unit().insert(unit);

        // Create inventory for unit
        let inventory = UnitInventory {
            unit_id: inserted_unit.id,
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
            max_capacity: 100, // Default inventory capacity for units
        };
        ctx.db.unit_inventory().insert(inventory);
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
    if let Some(mut unit) = ctx.db.unit().id().find(unit_id) {
        // Get unit stats for movement speed
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
pub fn set_unit_task(
    ctx: &ReducerContext,
    unit_id: i32,
    task_type: String,
    target_id: String,
) -> Result<(), String> {
    if let Some(mut unit) = ctx.db.unit().id().find(unit_id) {
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
        timestamp: ctx.timestamp.to_micros_since_unix_epoch() * 1000,
    };
    ctx.db.game_event().insert(event);
    Ok(())
}

#[reducer]
pub fn gather_resource(
    ctx: &ReducerContext,
    unit_id: i32,
    resource_id: String,
) -> Result<(), String> {
    if let Some(unit) = ctx.db.unit().id().find(unit_id) {
        if let Some(resource) = ctx.db.resource().id().find(&resource_id) {
            if let Some(stats) = ctx.db.unit_stats().unit_id().find(unit_id) {
                if let Some(mut inventory) = ctx.db.unit_inventory().unit_id().find(unit_id) {
                    // Calculate distance between unit and resource
                    let dx = resource.position.x - unit.position.x;
                    let dy = resource.position.y - unit.position.y;
                    let distance = (dx * dx + dy * dy).sqrt();
                    
                    if distance <= 30.0 { // Gathering range
                        let gather_amount = stats.gather_rate.min(resource.amount);
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
                            _ => return Err("Invalid resource type".to_string()),
                        }
                        
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
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        ctx.db.user().identity().update(User {
            online: true,
            ..user
        });
    } else {
        ctx.db.user().insert(User {
            name: None,
            identity: ctx.sender,
            online: true,
            wallet_balance: 100.0,    // Starting wallet
            bank_account: 0.0,
            total_profit_loss: 0.0,
        });
    }
}

#[reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        ctx.db.user().identity().update(User {
            online: false,
            ..user
        });
    } else {
        log::warn!(
            "Disconnect event for unknown user with identity {:?}",
            ctx.sender
        );
    }
}

// Chat-related reducers
#[reducer]
pub fn create_chat_room(ctx: &ReducerContext, name: String) -> Result<(), String> {
    log::info!("🎯 create_chat_room CALLED! Name: {}, Sender: {:?}", name, ctx.sender);
    
    let room_id = format!("room_{}", ctx.timestamp.to_micros_since_unix_epoch());
    log::info!("📦 Generated room_id: {}", room_id);
    
    ctx.db.chat_room().insert(ChatRoom {
        id: room_id.clone(),
        name: name.clone(),
        created_at: ctx.timestamp.to_micros_since_unix_epoch(),
    });
    log::info!("✅ Inserted chat_room: {} ({})", name, room_id);

    // Give creator full permissions
    ctx.db.chat_permission().insert(ChatPermission {
        room_id: room_id.clone(),
        user_id: ctx.sender,
        permission: "write".to_string(),
    });
    log::info!("🔐 Inserted chat_permission for user {:?}", ctx.sender);

    log::info!("🎉 create_chat_room COMPLETED successfully!");
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
        .filter(|p| p.room_id == room_id && p.user_id == ctx.sender)
        .collect::<Vec<_>>();
    
    if permissions.is_empty() || permissions[0].permission != "write" {
        return Err("No permission to send messages".to_string());
    }

    // Create and insert the message
    let message_id = format!("msg_{}", ctx.timestamp.to_micros_since_unix_epoch());
    ctx.db.chat_message().insert(ChatMessage {
        id: message_id,
        room_id,
        sender: ctx.sender,
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
        if room.created_at != ctx.timestamp.to_micros_since_unix_epoch() {
            return Err("Only room creator can set permissions".to_string());
        }

        ctx.db.chat_permission().insert(ChatPermission {
            room_id,
            user_id,
            permission,
        });

        Ok(())
    } else {
        Err("Room not found".to_string())
    }
}

// Vote Exchange: Vote tracking with ownership
#[table(name = vote, public)]
pub struct Vote {
    #[primary_key]
    #[auto_inc]
    id: i32,
    room_id: i32,
    round_number: i32,
    player_id: String,        // Current owner of this vote
    original_owner: String,   // Who started with this vote
    color: Option<String>,    // "red" | "blue" | null (not yet set)
    timestamp: Timestamp,
}

// Vote Exchange: Transaction tracking
#[table(name = transaction, public)]
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

// Vote Exchange: Guarantee system
#[table(name = guarantee, public)]
pub struct Guarantee {
    #[primary_key]
    #[auto_inc]
    id: i32,
    room_id: i32,
    round_number: i32,
    seller_id: String,
    color: String,            // "red" | "blue" - promised vote color
    price: f64,
    guarantee_type: String,   // "public" (one buyer) | "private" (multiple buyers)
    is_active: bool,          // false if cancelled or fulfilled (for public)
    created_at: Timestamp,
}

// Vote Exchange: Guarantee purchases
#[table(name = guarantee_purchase, public)]
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
    if let Some(mut unit) = ctx.db.unit().id().find(unit_id) {
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
    if let Some(mut unit) = ctx.db.unit().id().find(unit_id) {
        if unit.vote_price.is_none() {
            return Err("Unit vote is not for sale".to_string());
        }
        if unit.vote_price.unwrap() != price {
            return Err("Price mismatch".to_string());
        }
        
        // Clone values before moving
        let owner_id = unit.owner_id.clone();
        let room_id = unit.room_id;
        let buyer_id = buyer_id.clone();
        
        // Transfer vote ownership
        unit.vote_owner = Some(buyer_id.clone());
        unit.vote_price = None;
        ctx.db.unit().id().update(unit);
        
        // Create trade event
        create_game_event(
            ctx,
            room_id.to_string(),
            "vote_trade".to_string(),
            owner_id,
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
    // Get the vote
    if let Some(mut vote) = ctx.db.vote().id().find(vote_id) {
        let seller_id = vote.player_id.clone();
        let room_id = vote.room_id;
        
        // Get buyer and seller
        let buyer = ctx.db.user().iter()
            .find(|u| u.identity.to_string() == buyer_id)
            .ok_or("Buyer not found")?;
        let seller = ctx.db.user().iter()
            .find(|u| u.identity.to_string() == seller_id)
            .ok_or("Seller not found")?;
        
        // Check buyer has enough money
        if buyer.wallet_balance < price {
            return Err("Insufficient funds".to_string());
        }
        
        // Transfer money
        let mut updated_buyer = buyer.clone();
        updated_buyer.wallet_balance -= price;
        ctx.db.user().identity().update(updated_buyer);
        
        let mut updated_seller = seller.clone();
        updated_seller.wallet_balance += price;
        ctx.db.user().identity().update(updated_seller);
        
        // Transfer vote ownership
        vote.player_id = buyer_id.clone();
        ctx.db.vote().id().update(vote);
        
        // Record transaction
        ctx.db.transaction().insert(Transaction {
            id: 0,
            room_id,
            from_player: seller_id,
            to_player: buyer_id,
            transaction_type: "vote_sale".to_string(),
            amount: price,
            vote_id: Some(vote_id),
            guarantee_id: None,
            timestamp: ctx.timestamp,
        });
        
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
    color: String,
    price: f64,
    guarantee_type: String,
) -> Result<(), String> {
    // Validate color
    if color != "red" && color != "blue" {
        return Err("Invalid color".to_string());
    }
    
    // Validate guarantee type
    if guarantee_type != "public" && guarantee_type != "private" {
        return Err("Invalid guarantee type".to_string());
    }
    
    ctx.db.guarantee().insert(Guarantee {
        id: 0,
        room_id,
        round_number,
        seller_id: ctx.sender.to_string(),
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
        
        let buyer_id = ctx.sender.to_string();
        let seller_id = guarantee.seller_id.clone();
        let price = guarantee.price;
        let room_id = guarantee.room_id;
        
        // Get buyer and seller
        let buyer = ctx.db.user().iter()
            .find(|u| u.identity.to_string() == buyer_id)
            .ok_or("Buyer not found")?;
        let seller = ctx.db.user().iter()
            .find(|u| u.identity.to_string() == seller_id)
            .ok_or("Seller not found")?;
        
        // Check buyer has enough money
        if buyer.wallet_balance < price {
            return Err("Insufficient funds".to_string());
        }
        
        // Transfer money
        let mut updated_buyer = buyer.clone();
        updated_buyer.wallet_balance -= price;
        ctx.db.user().identity().update(updated_buyer);
        
        let mut updated_seller = seller.clone();
        updated_seller.wallet_balance += price;
        ctx.db.user().identity().update(updated_seller);
        
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
        // Check if sender owns this vote
        if vote.player_id != ctx.sender.to_string() {
            return Err("You don't own this vote".to_string());
        }
        
        vote.color = Some(color);
        ctx.db.vote().id().update(vote);
        Ok(())
    } else {
        Err("Vote not found".to_string())
    }
}

// Vote Exchange: Process round votes and eliminate majority
#[reducer]
pub fn process_round_votes(
    ctx: &ReducerContext,
    room_id: i32,
    round_number: i32,
) -> Result<(), String> {
    // Get all votes for this room and round
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
                        if let Some(user) = ctx.db.user().iter().find(|u| u.identity.to_string() == *player_id) {
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
    
    // Eliminate majority voters
    if let Some(mut room) = ctx.db.game_room().id().find(room_id) {
        for player_id in &majority_voters {
            if !room.eliminated_players.contains(player_id) {
                room.eliminated_players.push(player_id.clone());
            }
        }
        
        // Check win condition: 1-2 players remaining
        let remaining_players: Vec<_> = room.member_ids.iter()
            .filter(|id| !room.eliminated_players.contains(id))
            .collect();
        
        if remaining_players.len() <= 2 {
            // Game over - distribute pot to winners
            room.game_status = "completed".to_string();
            
            let pot_per_winner = room.pot_size / remaining_players.len() as f64;
            for player_id in remaining_players {
                if let Some(user) = ctx.db.user().iter().find(|u| u.identity.to_string() == *player_id) {
                    let mut updated_user = user.clone();
                    updated_user.wallet_balance += pot_per_winner;
                    updated_user.total_profit_loss += pot_per_winner - room.buyin_amount;
                    ctx.db.user().identity().update(updated_user);
                    
                    // Record pot distribution
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
            // Continue to next round
            room.current_round += 1;
        }
        
        ctx.db.game_room().id().update(room);
    }
    
    Ok(())
}

#[table(name = game_tick_timer, scheduled(game_tick))]
pub struct GameTickTimer {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    scheduled_at: spacetimedb::ScheduleAt,
}

#[table(name = unit_task_queue, public)]
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
                // Regenerate resource
                resource.amount = (resource.amount + resource.regeneration_rate).min(resource.max_amount);
            }
            ctx.db.resource().id().update(resource);
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
    // Create storage building unit
    let storage = Unit {
        id: 0, // Will be auto-incremented
        room_id,
        owner_id: ctx.sender.to_string(),
        unit_type: "storage".to_string(),
        position,
        dimensions: Vector2 { x: 40.0, y: 40.0 }, // Larger than regular units
        fill_style: "#808080".to_string(), // Gray color for storage
        task_type: None,
        target_id: None,
        vote_color: None,
        vote_guarantee: None,
        vote_price: None,
        vote_owner: None,
        storage_capacity: Some(capacity),
        is_storage: true,
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
    // Get source and target inventories
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
