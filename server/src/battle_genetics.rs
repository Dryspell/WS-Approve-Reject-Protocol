use spacetimedb::{reducer, ReducerContext};
use super::*;
use std::collections::{BTreeMap, HashSet};

const HEX_RADIUS: i32 = 4;
const GROUP_RING: i32 = 3;
const AXIAL_DIRS: [(i32, i32); 6] = [
    (1, 0),
    (1, -1),
    (0, -1),
    (-1, 0),
    (-1, 1),
    (0, 1),
];

fn hex_dist(aq: i32, ar: i32, bq: i32, br: i32) -> i32 {
    ((aq - bq).abs() + (aq + ar - bq - br).abs() + (ar - br).abs()) / 2
}

fn in_board(q: i32, r: i32) -> bool {
    hex_dist(0, 0, q, r) <= HEX_RADIUS
}

fn hexes_on_ring(radius: i32) -> Vec<(i32, i32)> {
    if radius <= 0 {
        return vec![(0, 0)];
    }
    let mut hexes = Vec::new();
    let mut q = -radius;
    let mut r = radius;
    for (dq, dr) in AXIAL_DIRS {
        for _ in 0..radius {
            hexes.push((q, r));
            q += dq;
            r += dr;
        }
    }
    hexes
}

fn group_centers(group_count: usize) -> Vec<(i32, i32)> {
    if group_count == 0 {
        return Vec::new();
    }
    if group_count == 1 {
        return vec![(0, 0)];
    }
    let ring = hexes_on_ring(GROUP_RING);
    (0..group_count)
        .map(|i| {
            let idx = (i * ring.len() + group_count / 2) / group_count % ring.len();
            ring[idx]
        })
        .collect()
}

fn cluster_cells(origin: (i32, i32), count: usize, taken: &HashSet<(i32, i32)>) -> Vec<(i32, i32)> {
    let mut cells = Vec::new();
    let mut used = taken.clone();
    let mut radius = 0;
    while cells.len() < count && radius <= HEX_RADIUS {
        let ring = if radius == 0 {
            vec![origin]
        } else {
            hexes_on_ring(radius)
                .into_iter()
                .map(|(q, r)| (origin.0 + q, origin.1 + r))
                .collect()
        };
        for cell in ring {
            if !in_board(cell.0, cell.1) || used.contains(&cell) {
                continue;
            }
            used.insert(cell);
            cells.push(cell);
            if cells.len() >= count {
                break;
            }
        }
        radius += 1;
    }
    cells
}

fn step_toward(
    q: i32,
    r: i32,
    tq: i32,
    tr: i32,
    occupied: &HashSet<(i32, i32)>,
) -> Option<(i32, i32)> {
    let current = hex_dist(q, r, tq, tr);
    let mut best = None;
    let mut best_dist = current;
    for (dq, dr) in AXIAL_DIRS {
        let nq = q + dq;
        let nr = r + dr;
        if !in_board(nq, nr) || occupied.contains(&(nq, nr)) {
            continue;
        }
        let next = hex_dist(nq, nr, tq, tr);
        if next < best_dist {
            best_dist = next;
            best = Some((nq, nr));
        }
    }
    best
}

fn cell_of(unit: &BattleUnit) -> (i32, i32) {
    (unit.position_x as i32, unit.position_y as i32)
}

fn insert_combatant(
    ctx: &ReducerContext,
    arena_id: i32,
    unit: &Unit,
    stats: &UnitStats,
    team: &str,
    col: i32,
    row: i32,
) {
    let x = col as f32;
    let y = row as f32;
    ctx.db.battle_unit().insert(BattleUnit {
        id: 0,
        arena_id,
        source_unit_id: unit.id,
        owner_id: unit.owner_id.clone(),
        team: team.to_string(),
        current_health: stats.health,
        max_health: stats.max_health,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        is_alive: true,
        position_x: x,
        position_y: y,
        spawn_x: x,
        spawn_y: y,
    });
}

fn occupied_cells(ctx: &ReducerContext, arena_id: i32, except_id: i32) -> HashSet<(i32, i32)> {
    ctx.db.battle_unit().iter()
        .filter(|u| u.arena_id == arena_id && u.is_alive && u.id != except_id)
        .map(|u| cell_of(&u))
        .collect()
}

fn closest_enemy(attacker: &BattleUnit, enemies: &[BattleUnit]) -> Option<BattleUnit> {
    let (ax, ay) = cell_of(attacker);
    enemies.iter()
        .min_by_key(|enemy| {
            let (bx, by) = cell_of(enemy);
            (hex_dist(ax, ay, bx, by), enemy.id)
        })
        .cloned()
}

fn record_action(
    ctx: &ReducerContext,
    arena_id: i32,
    seq: i32,
    actor: &BattleUnit,
    target: &BattleUnit,
    action: i32,
    damage: i32,
    killed: bool,
    dest: (i32, i32),
) {
    ctx.db.battle_combat_event().insert(BattleCombatEvent {
        id: 0,
        arena_id,
        seq,
        attacker_id: actor.id,
        target_id: target.id,
        attacker_source_unit_id: actor.source_unit_id,
        target_source_unit_id: target.source_unit_id,
        damage,
        target_killed: killed,
        action,
        dest_x: dest.0,
        dest_y: dest.1,
    });
}

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
    if !room.combat_enabled {
        return Err("Combat is disabled for this room".to_string());
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
        next_actor_index: 0,
        winner_team: None,
        created_at: ctx.timestamp,
    });

    let mut taken: HashSet<(i32, i32)> = HashSet::new();
    let centers = group_centers(2);
    for (unit_ids, team, center) in [
        (&red_unit_ids, "red", centers[0]),
        (&blue_unit_ids, "blue", centers[1]),
    ] {
        let slots = cluster_cells(center, unit_ids.len(), &taken);
        for slot in &slots {
            taken.insert(*slot);
        }
        for (i, uid) in unit_ids.iter().enumerate() {
            let unit = ctx.db.unit().id().find(*uid)
                .ok_or(format!("Unit {} not found", uid))?;
            if unit.room_id != room_id {
                return Err(format!("Unit {} is not in this room", uid));
            }
            let stats = ctx.db.unit_stats().unit_id().find(*uid)
                .ok_or(format!("Stats for unit {} not found", uid))?;
            let (q, r) = slots.get(i).copied().unwrap_or(center);
            insert_combatant(ctx, arena.id, &unit, &stats, team, q, r);
        }
    }

    Ok(())
}

pub(crate) fn insert_majority_arena(
    ctx: &ReducerContext,
    room_id: i32,
    unit_ids: Vec<i32>,
) -> Result<i32, String> {
    let mut by_owner: BTreeMap<String, Vec<Unit>> = BTreeMap::new();
    for uid in unit_ids {
        let unit = ctx.db.unit().id().find(uid).ok_or(format!("Unit {} not found", uid))?;
        by_owner.entry(unit.owner_id.clone()).or_default().push(unit);
    }
    if by_owner.len() < 2 {
        return Err("Need majority minions from at least two players".to_string());
    }

    let room = ctx.db.game_room().id().find(room_id).ok_or("Room not found")?;
    let arena = ctx.db.battle_arena().insert(BattleArena {
        id: 0,
        room_id,
        round_number: room.current_round,
        status: "in_progress".to_string(),
        turn_number: 0,
        next_actor_index: 0,
        winner_team: None,
        created_at: ctx.timestamp,
    });

    let owners: Vec<String> = by_owner.keys().cloned().collect();
    let centers = group_centers(owners.len());
    let mut taken: HashSet<(i32, i32)> = HashSet::new();
    for (i, owner) in owners.iter().enumerate() {
        let mut units = by_owner.get(owner).cloned().unwrap_or_default();
        units.sort_by_key(|u| u.id);
        let slots = cluster_cells(centers[i], units.len(), &taken);
        for slot in &slots {
            taken.insert(*slot);
        }
        for (unit, slot) in units.iter().zip(slots.into_iter()) {
            let stats = ctx.db.unit_stats().unit_id().find(unit.id)
                .ok_or(format!("Stats for unit {} not found", unit.id))?;
            insert_combatant(ctx, arena.id, unit, &stats, owner, slot.0, slot.1);
        }
    }

    Ok(arena.id)
}

const MAX_SWINGS: i32 = 300;

fn living_teams(units: &[BattleUnit]) -> HashSet<String> {
    units.iter().map(|u| u.team.clone()).collect()
}

fn complete_arena(ctx: &ReducerContext, mut arena: BattleArena, living: &[BattleUnit]) -> Result<bool, String> {
    arena.status = "completed".to_string();
    arena.winner_team = living.iter().min_by_key(|u| u.id).map(|u| u.team.clone());
    let arena_id = arena.id;
    ctx.db.battle_arena().id().update(arena);
    try_finish_majority_melee(ctx, arena_id)?;
    Ok(true)
}

pub(crate) fn run_battle_turn(ctx: &ReducerContext, arena_id: i32) -> Result<bool, String> {
    let mut arena = ctx.db.battle_arena().id().find(arena_id)
        .ok_or("Arena not found")?;
    if arena.status != "in_progress" {
        return Ok(true);
    }

    let mut alive_units: Vec<BattleUnit> = ctx.db.battle_unit().iter()
        .filter(|u| u.arena_id == arena_id && u.is_alive)
        .collect();
    alive_units.sort_by(|a, b| b.speed.cmp(&a.speed).then(a.id.cmp(&b.id)));

    if living_teams(&alive_units).len() <= 1 || arena.turn_number >= MAX_SWINGS {
        return complete_arena(ctx, arena, &alive_units);
    }

    let actor_idx = (arena.next_actor_index.rem_euclid(alive_units.len() as i32)) as usize;
    let attacker = alive_units[actor_idx].clone();

    let enemies: Vec<BattleUnit> = alive_units.iter()
        .filter(|u| u.team != attacker.team)
        .cloned()
        .collect();
    if enemies.is_empty() {
        return complete_arena(ctx, arena, &alive_units);
    }

    let target = closest_enemy(&attacker, &enemies).ok_or("No enemy in range search")?;
    let (ax, ay) = cell_of(&attacker);
    let (tx, ty) = cell_of(&target);
    let seq = arena.turn_number + 1;
    let mut killed = false;

    if hex_dist(ax, ay, tx, ty) <= 1 {
        let damage = (attacker.attack as f32 * (1.0 - target.defense as f32 / (target.defense as f32 + 100.0))) as i32;
        let damage = damage.max(1);

        let mut updated_target = ctx.db.battle_unit().id().find(target.id)
            .ok_or("Target not found")?;
        updated_target.current_health -= damage;
        killed = updated_target.current_health <= 0;
        if killed {
            updated_target.is_alive = false;
            updated_target.current_health = 0;
        }
        ctx.db.battle_unit().id().update(updated_target);

        let attacker_equip: Vec<Equipment> = ctx.db.equipment().iter()
            .filter(|e| e.equipped_to_unit_id == Some(attacker.source_unit_id) && e.slot == "main_hand")
            .collect();
        for mut eq in attacker_equip {
            eq.durability = (eq.durability - 1).max(0);
            ctx.db.equipment().id().update(eq);
        }

        record_action(ctx, arena_id, seq, &attacker, &target, 0, damage, killed, (ax, ay));
    } else if let Some((nx, ny)) = step_toward(ax, ay, tx, ty, &occupied_cells(ctx, arena_id, attacker.id)) {
        if let Some(mut mover) = ctx.db.battle_unit().id().find(attacker.id) {
            mover.position_x = nx as f32;
            mover.position_y = ny as f32;
            ctx.db.battle_unit().id().update(mover);
        }
        record_action(ctx, arena_id, seq, &attacker, &target, 1, 0, false, (nx, ny));
    } else {
        record_action(ctx, arena_id, seq, &attacker, &target, 2, 0, false, (ax, ay));
    }

    arena.turn_number = seq;
    arena.next_actor_index = (actor_idx as i32 + 1) % (alive_units.len() as i32).max(1);

    let remaining: Vec<BattleUnit> = ctx.db.battle_unit().iter()
        .filter(|u| u.arena_id == arena_id && u.is_alive)
        .collect();
    if living_teams(&remaining).len() <= 1 || arena.turn_number >= MAX_SWINGS {
        return complete_arena(ctx, arena, &remaining);
    }

    ctx.db.battle_arena().id().update(arena);
    Ok(false)
}

#[reducer]
pub fn process_battle_turn(
    ctx: &ReducerContext,
    arena_id: i32,
) -> Result<(), String> {
    run_battle_turn(ctx, arena_id)?;
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
        woodcutting_xp: 0, woodcutting_level: 1,
        mining_xp: 0, mining_level: 1,
        foraging_xp: 0, foraging_level: 1,
        crafting_xp: 0, crafting_level: 1,
        actions_remaining: ACTIONS_PER_ROUND,
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
