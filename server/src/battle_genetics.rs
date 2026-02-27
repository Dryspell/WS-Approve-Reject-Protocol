use spacetimedb::{reducer, ReducerContext};
use super::*;

// ============================================================================
// Phase E: Battle Arena (BattleArena, BattleUnit tables defined in lib.rs)
// ============================================================================

#[reducer]
pub fn create_battle_arena(
    ctx: &ReducerContext,
    room_id: i32,
    red_unit_ids: Vec<i32>,
    blue_unit_ids: Vec<i32>,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let room = ctx.db.game_room().id().find(room_id).ok_or("Room not found")?;
    if !room.member_ids.contains(&caller_id) {
        return Err("You are not in this room".to_string());
    }
    if red_unit_ids.is_empty() || blue_unit_ids.is_empty() {
        return Err("Both teams need at least one unit".to_string());
    }

    let arena = ctx.db.battle_arena().insert(BattleArena {
        id: 0,
        room_id,
        round_number: room.current_round,
        status: "in_progress".to_string(),
        turn_number: 0,
        winner_team: None,
        created_at: ctx.timestamp,
    });

    // Snapshot each unit into BattleUnit with effective stats (base + equipment)
    for (unit_ids, team) in [(&red_unit_ids, "red"), (&blue_unit_ids, "blue")] {
        for (i, uid) in unit_ids.iter().enumerate() {
            let unit = ctx.db.unit().id().find(*uid)
                .ok_or(format!("Unit {} not found", uid))?;
            if unit.room_id != room_id {
                return Err(format!("Unit {} is not in this room", uid));
            }
            let stats = ctx.db.unit_stats().unit_id().find(*uid)
                .ok_or(format!("Stats for unit {} not found", uid))?;

            ctx.db.battle_unit().insert(BattleUnit {
                id: 0,
                arena_id: arena.id,
                source_unit_id: *uid,
                owner_id: unit.owner_id.clone(),
                team: team.to_string(),
                current_health: stats.health,
                max_health: stats.max_health,
                attack: stats.attack,
                defense: stats.defense,
                speed: stats.speed,
                is_alive: true,
                position_x: if team == "red" { 20.0 } else { 80.0 },
                position_y: 30.0 + (i as f32) * 15.0,
            });
        }
    }

    Ok(())
}

#[reducer]
pub fn process_battle_turn(
    ctx: &ReducerContext,
    arena_id: i32,
) -> Result<(), String> {
    let mut arena = ctx.db.battle_arena().id().find(arena_id)
        .ok_or("Arena not found")?;
    if arena.status != "in_progress" {
        return Err("Battle is not in progress".to_string());
    }

    let alive_units: Vec<BattleUnit> = ctx.db.battle_unit().iter()
        .filter(|u| u.arena_id == arena_id && u.is_alive)
        .collect();

    let red_alive: Vec<&BattleUnit> = alive_units.iter().filter(|u| u.team == "red").collect();
    let blue_alive: Vec<&BattleUnit> = alive_units.iter().filter(|u| u.team == "blue").collect();

    if red_alive.is_empty() || blue_alive.is_empty() {
        arena.status = "completed".to_string();
        arena.winner_team = if red_alive.is_empty() { Some("blue".to_string()) } else { Some("red".to_string()) };
        ctx.db.battle_arena().id().update(arena);
        return Ok(());
    }

    // Sort by speed for initiative order
    let mut turn_order_ids: Vec<(i32, i32)> = alive_units.iter().map(|u| (u.id, u.speed)).collect();
    turn_order_ids.sort_by(|a, b| b.1.cmp(&a.1));

    for (attacker_id, _) in &turn_order_ids {
        // Re-read attacker from DB each iteration to reflect kills from earlier in this turn
        let attacker = match ctx.db.battle_unit().id().find(*attacker_id) {
            Some(a) if a.is_alive => a,
            _ => continue,
        };

        let enemies: Vec<BattleUnit> = ctx.db.battle_unit().iter()
            .filter(|u| u.arena_id == arena_id && u.is_alive && u.team != attacker.team)
            .collect();
        if enemies.is_empty() { break; }

        let target_idx = ctx.rng().gen::<usize>() % enemies.len();
        let target = &enemies[target_idx];

        let damage = (attacker.attack as f32 * (1.0 - target.defense as f32 / (target.defense as f32 + 100.0))) as i32;
        let damage = damage.max(1);

        let mut updated_target = target.clone();
        updated_target.current_health -= damage;

        // Degrade attacker's weapon durability on every attack
        let attacker_equip: Vec<Equipment> = ctx.db.equipment().iter()
            .filter(|e| e.equipped_to_unit_id == Some(attacker.source_unit_id) && e.slot == "main_hand")
            .collect();
        for mut eq in attacker_equip {
            eq.durability = (eq.durability - 1).max(0);
            ctx.db.equipment().id().update(eq);
        }

        if updated_target.current_health <= 0 {
            updated_target.is_alive = false;
            updated_target.current_health = 0;
        }
        ctx.db.battle_unit().id().update(updated_target);
    }

    arena.turn_number += 1;

    // Check if battle ended
    let red_remaining = ctx.db.battle_unit().iter()
        .filter(|u| u.arena_id == arena_id && u.is_alive && u.team == "red").count();
    let blue_remaining = ctx.db.battle_unit().iter()
        .filter(|u| u.arena_id == arena_id && u.is_alive && u.team == "blue").count();

    if red_remaining == 0 || blue_remaining == 0 {
        arena.status = "completed".to_string();
        arena.winner_team = if red_remaining == 0 { Some("blue".to_string()) } else { Some("red".to_string()) };
    }

    ctx.db.battle_arena().id().update(arena);
    Ok(())
}

// ============================================================================
// Phase F: Laborer Genetics and Breeding (LaborerGenetics table defined in lib.rs)
// ============================================================================

#[reducer]
pub fn breed_laborers(
    ctx: &ReducerContext,
    room_id: i32,
    parent_a_id: i32,
    parent_b_id: i32,
    breeding_building_id: i32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    if parent_a_id == parent_b_id {
        return Err("Cannot breed a unit with itself".to_string());
    }
    let parent_a = ctx.db.unit().id().find(parent_a_id).ok_or("Parent A not found")?;
    let parent_b = ctx.db.unit().id().find(parent_b_id).ok_or("Parent B not found")?;
    if parent_a.owner_id != caller_id || parent_b.owner_id != caller_id {
        return Err("You must own both parents".to_string());
    }
    if parent_a.room_id != room_id || parent_b.room_id != room_id {
        return Err("Both parents must be in the same room".to_string());
    }

    let building = ctx.db.unit().id().find(breeding_building_id).ok_or("Building not found")?;
    if building.building_type.as_deref() != Some("breeding") {
        return Err("Must use a breeding building".to_string());
    }

    // Check food cost
    let mut bldg_inv = ctx.db.unit_inventory().unit_id().find(breeding_building_id)
        .ok_or("Building inventory not found")?;
    if bldg_inv.food < 20 {
        return Err("Breeding requires 20 food".to_string());
    }
    bldg_inv.food -= 20;
    ctx.db.unit_inventory().unit_id().update(bldg_inv);

    let gen_a = ctx.db.laborer_genetics().unit_id().find(parent_a_id);
    let gen_b = ctx.db.laborer_genetics().unit_id().find(parent_b_id);

    let inherit = |a_val: i32, b_val: i32| -> i32 {
        let base = if ctx.rng().gen::<bool>() { a_val } else { b_val };
        let mutation = ctx.rng().gen_range(-2..=2_i32);
        (base + mutation).clamp(0, 31)
    };

    let (a_combat, a_gather, a_craft, a_speed, a_health, a_stam) = match &gen_a {
        Some(g) => (g.combat_iv, g.gathering_iv, g.crafting_iv, g.speed_iv, g.health_iv, g.stamina_iv),
        None => (15, 15, 15, 15, 15, 15),
    };
    let (b_combat, b_gather, b_craft, b_speed, b_health, b_stam) = match &gen_b {
        Some(g) => (g.combat_iv, g.gathering_iv, g.crafting_iv, g.speed_iv, g.health_iv, g.stamina_iv),
        None => (15, 15, 15, 15, 15, 15),
    };

    let gen_a_val = gen_a.as_ref().map(|g| g.generation).unwrap_or(0);
    let gen_b_val = gen_b.as_ref().map(|g| g.generation).unwrap_or(0);

    // Create the offspring unit (no vote linked -- must be acquired separately)
    let offspring = ctx.db.unit().insert(Unit {
        id: 0, room_id,
        owner_id: caller_id.clone(),
        unit_type: "minion".to_string(),
        position: parent_a.position.clone(),
        dimensions: Vector2 { x: 20.0, y: 20.0 },
        fill_style: "#ffcc00".to_string(),
        task_type: None, target_id: None,
        vote_color: None, vote_guarantee: None,
        vote_price: None, vote_owner: None, vote_id: None,
        storage_capacity: None, is_storage: false,
        building_type: None, construction_progress: None,
        construction_max: None, assigned_unit_id: None,
        building_recipe: None, tax_rate: None, contributors: vec![],
    });

    // Pre-compute all child IVs once to avoid double-roll divergence
    let child_combat = inherit(a_combat, b_combat);
    let child_gather = inherit(a_gather, b_gather);
    let child_craft = inherit(a_craft, b_craft);
    let child_speed = inherit(a_speed, b_speed);
    let child_health = inherit(a_health, b_health);
    let child_stam = inherit(a_stam, b_stam);

    ctx.db.unit_stats().insert(UnitStats {
        unit_id: offspring.id,
        health: 80 + child_health * 2,
        max_health: 80 + child_health * 2,
        attack: 5 + child_combat,
        defense: 3 + child_combat / 2,
        speed: 2 + child_speed / 4,
        gather_rate: 3 + child_gather / 3,
        craft_rate: 2 + child_craft / 3,
    });

    ctx.db.unit_inventory().insert(UnitInventory {
        unit_id: offspring.id,
        wood: 0, stone: 0, metal_ore: 0, coal: 0, gems: 0,
        fiber: 0, hide: 0, sand: 0, food: 0,
        wooden_pole: 0, lumber: 0, cut_stone: 0, metal_ingot: 0,
        cloth: 0, rope: 0, leather: 0, glass: 0,
        max_capacity: 80,
    });

    ctx.db.laborer_genetics().insert(LaborerGenetics {
        unit_id: offspring.id,
        generation: gen_a_val.max(gen_b_val) + 1,
        parent_a_id: Some(parent_a_id),
        parent_b_id: Some(parent_b_id),
        combat_iv: child_combat,
        gathering_iv: child_gather,
        crafting_iv: child_craft,
        speed_iv: child_speed,
        health_iv: child_health,
        stamina_iv: child_stam,
    });

    Ok(())
}

// ============================================================================
// Phase G: Vote Mechanics Polish
