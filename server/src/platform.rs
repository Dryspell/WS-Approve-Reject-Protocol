use spacetimedb::{reducer, ReducerContext};
use super::*;

// ============================================================================
// Phase G: Vote Mechanics Polish (SideBet table defined in lib.rs)
// ============================================================================

#[reducer]
pub fn place_side_bet(
    ctx: &ReducerContext,
    room_id: i32,
    bet_type: String,
    bet_target: String,
    amount: f64,
) -> Result<(), String> {
    let bettor_id = ctx.sender().to_hex().to_string();
    let room = ctx.db.game_room().id().find(room_id).ok_or("Room not found")?;
    
    // Must be eliminated or spectating
    if room.member_ids.contains(&bettor_id) && !room.eliminated_players.contains(&bettor_id) {
        return Err("Only eliminated or spectating players can place side bets".to_string());
    }

    if amount <= 0.0 { return Err("Bet amount must be positive".to_string()); }

    let mut user = ctx.db.user().identity().find(ctx.sender()).ok_or("User not found")?;
    if user.wallet_balance < amount { return Err("Insufficient funds".to_string()); }
    user.wallet_balance -= amount;
    ctx.db.user().identity().update(user);

    // Bet amount goes into the pot (zero-sum backed economics)
    if let Some(mut r) = ctx.db.game_room().id().find(room_id) {
        r.pot_size += amount;
        ctx.db.game_room().id().update(r);
    }

    let multiplier = match bet_type.as_str() {
        "color_wins" => 1.8,
        "player_eliminated" => 2.5,
        _ => return Err("Invalid bet type".to_string()),
    };

    ctx.db.side_bet().insert(SideBet {
        id: 0, room_id,
        round_number: room.current_round,
        bettor_id, bet_type, bet_target,
        amount, payout_multiplier: multiplier,
        status: "pending".to_string(),
        created_at: ctx.timestamp,
    });

    Ok(())
}

#[reducer]
pub fn vote_to_start_round(
    ctx: &ReducerContext,
    room_id: i32,
) -> Result<(), String> {
    // Same logic as vote_end_round but semantically for starting a round vote
    vote_end_round(ctx, room_id)
}

// Spawn a new laborer (acquires a new vote slot)
#[reducer]
pub fn spawn_laborer(
    ctx: &ReducerContext,
    room_id: i32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let room = ctx.db.game_room().id().find(room_id).ok_or("Room not found")?;
    if !room.member_ids.contains(&caller_id) {
        return Err("You are not in this room".to_string());
    }

    // Server-determined cost based on buy-in amount (prevents client manipulation)
    let cost = room.buyin_amount;

    let mut user = ctx.db.user().identity().find(ctx.sender()).ok_or("User not found")?;
    if user.wallet_balance < cost { return Err("Insufficient funds".to_string()); }
    user.wallet_balance -= cost;
    ctx.db.user().identity().update(user);

    let fee = cost * TRANSACTION_FEE_RATE;
    if let Some(mut r) = ctx.db.game_room().id().find(room_id) {
        r.pot_size += cost - fee; // net cost goes to pot
        ctx.db.game_room().id().update(r);
    }

    let new_vote = ctx.db.vote().insert(Vote {
        id: 0, room_id,
        round_number: room.current_round,
        player_id: caller_id.clone(),
        original_owner: caller_id.clone(),
        color: None,
        is_for_sale: false, sale_price: None,
        timestamp: ctx.timestamp,
    });

    let new_unit = ctx.db.unit().insert(Unit {
        id: 0, room_id,
        owner_id: caller_id,
        unit_type: "minion".to_string(),
        position: Vector2 { x: ctx.rng().gen::<f32>() * 80.0 + 10.0, y: ctx.rng().gen::<f32>() * 80.0 + 10.0 },
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
        unit_id: new_unit.id,
        health: 100, max_health: 100,
        attack: 10, defense: 5, speed: 3,
        gather_rate: 5, craft_rate: 3,
    });
    ctx.db.unit_inventory().insert(UnitInventory {
        unit_id: new_unit.id,
        wood: 0, stone: 0, metal_ore: 0, coal: 0, gems: 0,
        fiber: 0, hide: 0, sand: 0, food: 0,
        wooden_pole: 0, lumber: 0, cut_stone: 0, metal_ingot: 0,
        cloth: 0, rope: 0, leather: 0, glass: 0,
        max_capacity: 100,
    });

    Ok(())
}

// ============================================================================
// Phase H: Multi-Timeframe Server Hierarchy (ServerNode table defined in lib.rs)
// ============================================================================

#[reducer]
pub fn create_server_node(
    ctx: &ReducerContext,
    name: String,
    server_type: String,
    parent_id: Option<i32>,
    trading_period_seconds: i64,
) -> Result<(), String> {
    if let Some(pid) = parent_id {
        let parent = ctx.db.server_node().id().find(pid).ok_or("Parent server not found")?;
        if parent.status == "terminated" {
            return Err("Cannot create child of terminated server".to_string());
        }
    }

    ctx.db.server_node().insert(ServerNode {
        id: 0, name, server_type,
        parent_id,
        trading_period_seconds,
        status: "active".to_string(),
        linked_room_id: None,
        created_at: ctx.timestamp,
    });
    Ok(())
}

#[reducer]
pub fn transfer_laborer_to_parent(
    ctx: &ReducerContext,
    unit_id: i32,
    _parent_server_id: i32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let unit = ctx.db.unit().id().find(unit_id).ok_or("Unit not found")?;
    if unit.owner_id != caller_id {
        return Err("You don't own this unit".to_string());
    }

    // Void the vote for this laborer (per design: vote is voided on upward transfer)
    if let Some(vid) = unit.vote_id {
        ctx.db.vote().id().delete(vid);
    }

    // Return equipped items to owner's pool before deletion
    let unit_equips: Vec<Equipment> = ctx.db.equipment().iter()
        .filter(|e| e.equipped_to_unit_id == Some(unit_id)).collect();
    for mut eq in unit_equips { eq.equipped_to_unit_id = None; ctx.db.equipment().id().update(eq); }

    ctx.db.unit_inventory().unit_id().delete(unit_id);
    ctx.db.unit_stats().unit_id().delete(unit_id);
    ctx.db.laborer_genetics().unit_id().delete(unit_id);
    ctx.db.unit().id().delete(unit_id);

    Ok(())
}

// ============================================================================
// Phase I: Dual Currency (MT + MBLS)
// ============================================================================

// Note: wallet_balance on User serves as mt_balance.
// We add mbls_balance tracking via a separate table to avoid breaking changes.
// (PlayerCurrency table defined in lib.rs)

#[reducer]
pub fn convert_mt_to_mbls(
    ctx: &ReducerContext,
    amount: f64,
) -> Result<(), String> {
    if amount <= 0.0 { return Err("Amount must be positive".to_string()); }

    // Server-determined exchange rate (prevents client manipulation)
    let exchange_rate: f64 = 100.0; // 1 MBLS = 100 MT

    let caller_id = ctx.sender().to_hex().to_string();
    let mut user = ctx.db.user().identity().find(ctx.sender()).ok_or("User not found")?;
    if user.wallet_balance < amount {
        return Err("Insufficient MT balance".to_string());
    }

    user.wallet_balance -= amount;
    ctx.db.user().identity().update(user.clone());

    let mbls_amount = amount / exchange_rate;

    if let Some(mut pc) = ctx.db.player_currency().player_id().find(&caller_id) {
        pc.mt_balance = user.wallet_balance; // sync with actual balance
        pc.mbls_balance += mbls_amount;
        ctx.db.player_currency().player_id().update(pc);
    } else {
        ctx.db.player_currency().insert(PlayerCurrency {
            player_id: caller_id,
            mt_balance: user.wallet_balance,
            mbls_balance: mbls_amount,
        });
    }

    Ok(())
}

// ============================================================================
// Phase J: Platform Features (Tournament, Spectator tables defined in lib.rs)
// ============================================================================

#[reducer]
pub fn create_tournament(
    ctx: &ReducerContext,
    name: String,
    entry_fee: f64,
    max_participants: i32,
    bracket_type: String,
) -> Result<(), String> {
    ctx.db.tournament().insert(Tournament {
        id: 0, name,
        entry_fee,
        prize_pool: 0.0,
        max_participants,
        current_round: 0,
        status: "registration".to_string(),
        bracket_type,
        room_ids: vec![],
        participant_ids: vec![],
        created_at: ctx.timestamp,
    });
    Ok(())
}

#[reducer]
pub fn join_tournament(
    ctx: &ReducerContext,
    tournament_id: i32,
) -> Result<(), String> {
    let player_id = ctx.sender().to_hex().to_string();
    let mut tournament = ctx.db.tournament().id().find(tournament_id)
        .ok_or("Tournament not found")?;
    
    if tournament.status != "registration" {
        return Err("Tournament registration is closed".to_string());
    }
    if tournament.participant_ids.len() >= tournament.max_participants as usize {
        return Err("Tournament is full".to_string());
    }
    if tournament.participant_ids.contains(&player_id) {
        return Err("Already registered".to_string());
    }

    let mut user = ctx.db.user().identity().find(ctx.sender()).ok_or("User not found")?;
    if user.wallet_balance < tournament.entry_fee {
        return Err("Insufficient funds for entry fee".to_string());
    }
    user.wallet_balance -= tournament.entry_fee;
    ctx.db.user().identity().update(user);

    tournament.prize_pool += tournament.entry_fee;
    tournament.participant_ids.push(player_id);
    ctx.db.tournament().id().update(tournament);

    Ok(())
}

// Spectator tracking (Spectator table defined in lib.rs)

#[reducer]
pub fn spectate_room(
    ctx: &ReducerContext,
    room_id: i32,
) -> Result<(), String> {
    let user_id = ctx.sender().to_hex().to_string();
    let _room = ctx.db.game_room().id().find(room_id).ok_or("Room not found")?;

    let already = ctx.db.spectator().iter()
        .any(|s| s.room_id == room_id && s.user_id == user_id);
    if already { return Err("Already spectating".to_string()); }

    ctx.db.spectator().insert(Spectator {
        id: 0, room_id, user_id,
        joined_at: ctx.timestamp,
    });
    Ok(())
}

#[reducer]
pub fn stop_spectating(
    ctx: &ReducerContext,
    room_id: i32,
) -> Result<(), String> {
    let user_id = ctx.sender().to_hex().to_string();
    let spec = ctx.db.spectator().iter()
        .find(|s| s.room_id == room_id && s.user_id == user_id)
        .ok_or("Not spectating")?;
    ctx.db.spectator().id().delete(spec.id);
    Ok(())
}

