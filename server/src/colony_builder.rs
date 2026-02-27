use spacetimedb::{reducer, table, ReducerContext, Timestamp, SpacetimeType};
use super::*;

// ============================================================================
// Phase B: Functional Buildings
// ============================================================================

#[reducer]
pub fn construct_building(
    ctx: &ReducerContext,
    room_id: i32,
    position: Vector2,
    building_type: String,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let room = ctx.db.game_room().id().find(room_id).ok_or("Room not found")?;
    if !room.member_ids.contains(&caller_id) {
        return Err("You are not a member of this room".to_string());
    }

    let (construction_max, unit_type_str) = match building_type.as_str() {
        "extraction_wood" | "extraction_mine" | "extraction_quarry"
        | "extraction_hunter" | "extraction_farm" => (50, "structure"),
        "refinery_carpenter" | "refinery_forge" | "refinery_mason"
        | "refinery_weaver" | "refinery_tanner" | "refinery_kitchen"
        | "refinery_glass_furnace" => (80, "structure"),
        "manufacturing_armorer" | "manufacturing_weaponsmith"
        | "manufacturing_toolsmith" | "manufacturing_tailor"
        | "manufacturing_glass_blower" | "manufacturing_infuser" => (120, "structure"),
        "housing_dormitory" | "housing_player" => (60, "structure"),
        "farm_food" => (40, "structure"),
        "breeding" => (100, "structure"),
        _ => return Err("Invalid building type".to_string()),
    };

    let building = ctx.db.unit().insert(Unit {
        id: 0, room_id,
        owner_id: caller_id.clone(),
        unit_type: unit_type_str.to_string(),
        position,
        dimensions: Vector2 { x: 50.0, y: 50.0 },
        fill_style: "#6b4423".to_string(),
        task_type: None, target_id: None,
        vote_color: None, vote_guarantee: None,
        vote_price: None, vote_owner: None, vote_id: None,
        storage_capacity: Some(200),
        is_storage: false,
        building_type: Some(building_type),
        construction_progress: Some(0),
        construction_max: Some(construction_max),
        assigned_unit_id: None,
        building_recipe: None,
        tax_rate: Some(0.0),
        contributors: vec![caller_id],
    });

    ctx.db.unit_inventory().insert(UnitInventory {
        unit_id: building.id,
        wood: 0, stone: 0, metal_ore: 0, coal: 0, gems: 0,
        fiber: 0, hide: 0, sand: 0, food: 0,
        wooden_pole: 0, lumber: 0, cut_stone: 0, metal_ingot: 0,
        cloth: 0, rope: 0, leather: 0, glass: 0,
        max_capacity: 200,
    });

    Ok(())
}

#[reducer]
pub fn contribute_to_building(
    ctx: &ReducerContext,
    building_id: i32,
    resource_type: String,
    amount: i32,
    source_unit_id: i32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let source_unit = ctx.db.unit().id().find(source_unit_id).ok_or("Source unit not found")?;
    if source_unit.owner_id != caller_id {
        return Err("You don't own this unit".to_string());
    }

    let mut building = ctx.db.unit().id().find(building_id).ok_or("Building not found")?;
    if building.building_type.is_none() {
        return Err("Not a building".to_string());
    }
    let progress = building.construction_progress.unwrap_or(0);
    let max_progress = building.construction_max.unwrap_or(100);
    if progress >= max_progress {
        return Err("Building already complete".to_string());
    }

    let mut source_inv = ctx.db.unit_inventory().unit_id().find(source_unit_id)
        .ok_or("Source inventory not found")?;

    let available = match resource_type.as_str() {
        "wood" => source_inv.wood, "stone" => source_inv.stone,
        "metal_ore" => source_inv.metal_ore, _ => return Err("Invalid resource".to_string()),
    };
    if available < amount { return Err("Not enough resources".to_string()); }

    match resource_type.as_str() {
        "wood" => source_inv.wood -= amount,
        "stone" => source_inv.stone -= amount,
        "metal_ore" => source_inv.metal_ore -= amount,
        _ => {}
    }
    ctx.db.unit_inventory().unit_id().update(source_inv);

    building.construction_progress = Some((progress + amount).min(max_progress));
    if !building.contributors.contains(&caller_id) {
        building.contributors.push(caller_id);
    }
    ctx.db.unit().id().update(building);

    Ok(())
}

#[reducer]
pub fn assign_unit_to_building(
    ctx: &ReducerContext,
    unit_id: i32,
    building_id: i32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let unit = ctx.db.unit().id().find(unit_id).ok_or("Unit not found")?;
    if unit.owner_id != caller_id {
        return Err("You don't own this unit".to_string());
    }

    let mut building = ctx.db.unit().id().find(building_id).ok_or("Building not found")?;
    if building.building_type.is_none() {
        return Err("Not a building".to_string());
    }
    let progress = building.construction_progress.unwrap_or(0);
    let max_progress = building.construction_max.unwrap_or(100);
    if progress < max_progress {
        return Err("Building not yet complete".to_string());
    }

    building.assigned_unit_id = Some(unit_id);
    ctx.db.unit().id().update(building);

    let mut updated_unit = unit.clone();
    updated_unit.task_type = Some("work_building".to_string());
    updated_unit.target_id = Some(building_id.to_string());
    ctx.db.unit().id().update(updated_unit);

    Ok(())
}

#[reducer]
pub fn set_building_tax(
    ctx: &ReducerContext,
    building_id: i32,
    tax_rate: f32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let mut building = ctx.db.unit().id().find(building_id).ok_or("Building not found")?;
    if !building.contributors.contains(&caller_id) {
        return Err("Only contributors can set tax".to_string());
    }
    if tax_rate < 0.0 || tax_rate > 0.5 {
        return Err("Tax rate must be between 0 and 50%".to_string());
    }
    building.tax_rate = Some(tax_rate);
    ctx.db.unit().id().update(building);
    Ok(())
}

// ============================================================================
// Phase D: Equipment System (Equipment table defined in lib.rs)
// ============================================================================

#[reducer]
pub fn craft_equipment(
    ctx: &ReducerContext,
    room_id: i32,
    building_id: i32,
    equipment_type: String,
    material: String,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let building = ctx.db.unit().id().find(building_id).ok_or("Building not found")?;
    
    let btype = building.building_type.as_deref().unwrap_or("");
    let valid = match equipment_type.as_str() {
        "weapon" => btype == "manufacturing_weaponsmith",
        "helmet" | "body" | "shield" => btype == "manufacturing_armorer",
        "tool" => btype == "manufacturing_toolsmith",
        "clothes" => btype == "manufacturing_tailor",
        _ => false,
    };
    if !valid { return Err("Wrong building type for this equipment".to_string()); }

    let slot = match equipment_type.as_str() {
        "weapon" => "main_hand", "shield" => "off_hand",
        "helmet" => "head", "body" => "body",
        "tool" => "main_hand", "clothes" => "body",
        _ => "main_hand",
    };

    let tier = match material.as_str() {
        "iron" => 1, "steel" => 2, "mithril" => 3,
        "adamantite" => 4, "titanite" => 5,
        _ => 1,
    };

    // Consume resources from building inventory (tiered costs)
    let mut bldg_inv = ctx.db.unit_inventory().unit_id().find(building_id)
        .ok_or("Building inventory not found")?;
    match tier {
        1 => { // iron: 5 metal_ingot
            if bldg_inv.metal_ingot < 5 { return Err("Need 5 metal ingots".to_string()); }
            bldg_inv.metal_ingot -= 5;
        }
        2 => { // steel: 10 metal_ingot + 3 coal
            if bldg_inv.metal_ingot < 10 || bldg_inv.coal < 3 {
                return Err("Need 10 metal ingots + 3 coal".to_string());
            }
            bldg_inv.metal_ingot -= 10; bldg_inv.coal -= 3;
        }
        3 => { // mithril: 15 metal_ingot + 5 gems
            if bldg_inv.metal_ingot < 15 || bldg_inv.gems < 5 {
                return Err("Need 15 metal ingots + 5 gems".to_string());
            }
            bldg_inv.metal_ingot -= 15; bldg_inv.gems -= 5;
        }
        4 => { // adamantite: 20 metal_ingot + 10 gems + 5 cut_stone
            if bldg_inv.metal_ingot < 20 || bldg_inv.gems < 10 || bldg_inv.cut_stone < 5 {
                return Err("Need 20 metal ingots + 10 gems + 5 cut stone".to_string());
            }
            bldg_inv.metal_ingot -= 20; bldg_inv.gems -= 10; bldg_inv.cut_stone -= 5;
        }
        _ => { // titanite (tier 5): 30 metal_ingot + 15 gems + 10 cut_stone
            if bldg_inv.metal_ingot < 30 || bldg_inv.gems < 15 || bldg_inv.cut_stone < 10 {
                return Err("Need 30 metal ingots + 15 gems + 10 cut stone".to_string());
            }
            bldg_inv.metal_ingot -= 30; bldg_inv.gems -= 15; bldg_inv.cut_stone -= 10;
        }
    }
    ctx.db.unit_inventory().unit_id().update(bldg_inv);

    // Award crafting XP to the unit assigned to this building, if any
    if let Some(assigned_id) = building.assigned_unit_id {
        award_skill_xp(ctx, assigned_id, "crafting", tier * 10);
    }

    let stat_base = tier * 3;
    ctx.db.equipment().insert(Equipment {
        id: 0, room_id,
        owner_id: caller_id,
        equipped_to_unit_id: None,
        equipment_type: equipment_type.clone(),
        slot: slot.to_string(),
        item_name: format!("{} {} {}", material, equipment_type, "Mk I"),
        tier, material,
        enchantment: None,
        quality: "normal".to_string(),
        surface: "polished".to_string(),
        attack_bonus: if equipment_type == "weapon" { stat_base * 2 } else { 0 },
        defense_bonus: if equipment_type == "shield" || equipment_type == "body" || equipment_type == "helmet" { stat_base * 2 } else { 0 },
        speed_bonus: 0,
        health_bonus: if equipment_type == "body" { stat_base } else { 0 },
        durability: 100 + tier * 20,
        max_durability: 100 + tier * 20,
    });

    Ok(())
}

#[reducer]
pub fn equip_item(
    ctx: &ReducerContext,
    equipment_id: i32,
    unit_id: i32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let mut item = ctx.db.equipment().id().find(equipment_id).ok_or("Equipment not found")?;
    if item.owner_id != caller_id { return Err("You don't own this equipment".to_string()); }

    let unit = ctx.db.unit().id().find(unit_id).ok_or("Unit not found")?;
    if unit.owner_id != caller_id { return Err("You don't own this unit".to_string()); }

    let existing: Vec<Equipment> = ctx.db.equipment().iter()
        .filter(|e| e.equipped_to_unit_id == Some(unit_id) && e.slot == item.slot)
        .collect();
    for mut old in existing {
        old.equipped_to_unit_id = None;
        ctx.db.equipment().id().update(old);
    }

    item.equipped_to_unit_id = Some(unit_id);
    ctx.db.equipment().id().update(item);

    recalculate_unit_stats(ctx, unit_id);
    Ok(())
}

#[reducer]
pub fn unequip_item(
    ctx: &ReducerContext,
    equipment_id: i32,
) -> Result<(), String> {
    let caller_id = ctx.sender().to_hex().to_string();
    let mut item = ctx.db.equipment().id().find(equipment_id).ok_or("Equipment not found")?;
    if item.owner_id != caller_id { return Err("You don't own this equipment".to_string()); }
    let unit_id = item.equipped_to_unit_id;
    item.equipped_to_unit_id = None;
    ctx.db.equipment().id().update(item);

    if let Some(uid) = unit_id {
        recalculate_unit_stats(ctx, uid);
    }
    Ok(())
}

fn recalculate_unit_stats(ctx: &ReducerContext, unit_id: i32) {
    let genetics = ctx.db.laborer_genetics().unit_id().find(unit_id);
    let (base_combat, base_gather, base_craft, base_speed, base_health) = match &genetics {
        Some(g) => (g.combat_iv, g.gathering_iv, g.crafting_iv, g.speed_iv, g.health_iv),
        None => (15, 15, 15, 15, 15), // defaults for units without genetics
    };

    let equipped: Vec<Equipment> = ctx.db.equipment().iter()
        .filter(|e| e.equipped_to_unit_id == Some(unit_id))
        .collect();
    let eq_atk: i32 = equipped.iter().map(|e| e.attack_bonus).sum();
    let eq_def: i32 = equipped.iter().map(|e| e.defense_bonus).sum();
    let eq_spd: i32 = equipped.iter().map(|e| e.speed_bonus).sum();
    let eq_hp: i32 = equipped.iter().map(|e| e.health_bonus).sum();

    if let Some(mut stats) = ctx.db.unit_stats().unit_id().find(unit_id) {
        stats.max_health = 80 + base_health * 2 + eq_hp;
        stats.health = stats.health.min(stats.max_health);
        stats.attack = 5 + base_combat + eq_atk;
        stats.defense = 3 + base_combat / 2 + eq_def;
        stats.speed = 2 + base_speed / 4 + eq_spd;
        stats.gather_rate = 3 + base_gather / 3;
        stats.craft_rate = 2 + base_craft / 3;
        ctx.db.unit_stats().unit_id().update(stats);
    }
}

// ============================================================================
