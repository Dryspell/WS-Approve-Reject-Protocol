use spacetimedb::{reducer, ReducerContext};
use super::*;

// ============================================================================
// TEST UTILITIES - For E2E test isolation
// ============================================================================

/// Reset test data — clears game rooms and ready states for test isolation.
/// This should only be used in test environments, not production.
///
/// # Arguments
/// * `confirmation` - Must be "RESET_TEST_DATA" to prevent accidental calls
#[reducer]
pub fn reset_test_data(ctx: &ReducerContext, confirmation: String) -> Result<(), String> {
    if confirmation != "RESET_TEST_DATA" {
        return Err("Invalid confirmation string. Pass 'RESET_TEST_DATA' to confirm.".to_string());
    }

    log::warn!("🧹 Resetting test data - clearing game rooms and ready states");

    let room_ids: Vec<i32> = ctx.db.game_room().iter().map(|r| r.id).collect();
    let room_count = room_ids.len();
    for room_id in room_ids {
        ctx.db.game_room().id().delete(room_id);
    }

    let ready_state_ids: Vec<String> = ctx.db.ready_state().iter().map(|r| r.room_id.clone()).collect();
    let ready_count = ready_state_ids.len();
    for room_id in ready_state_ids {
        ctx.db.ready_state().room_id().delete(room_id);
    }

    let game_chat_ids: Vec<String> = ctx.db.chat_room().iter()
        .filter(|r| r.id.starts_with("game_"))
        .map(|r| r.id.clone())
        .collect();
    let chat_count = game_chat_ids.len();
    for chat_id in game_chat_ids {
        ctx.db.chat_room().id().delete(chat_id.clone());
        let perm_ids: Vec<i32> = ctx.db.chat_permission().iter()
            .filter(|p| p.room_id == chat_id)
            .map(|p| p.id)
            .collect();
        for perm_id in perm_ids {
            ctx.db.chat_permission().id().delete(perm_id);
        }
    }

    let vote_ids: Vec<i32> = ctx.db.vote().iter().map(|v| v.id).collect();
    let vote_count = vote_ids.len();
    for vote_id in vote_ids {
        ctx.db.vote().id().delete(vote_id);
    }

    let guarantee_ids: Vec<i32> = ctx.db.guarantee().iter().map(|g| g.id).collect();
    for guarantee_id in guarantee_ids {
        ctx.db.guarantee().id().delete(guarantee_id);
    }

    let trade_offer_ids: Vec<i32> = ctx.db.trade_offer().iter().map(|o| o.id).collect();
    for offer_id in trade_offer_ids {
        ctx.db.trade_offer().id().delete(offer_id);
    }

    let unit_ids: Vec<i32> = ctx.db.unit().iter().map(|u| u.id).collect();
    for unit_id in unit_ids {
        ctx.db.unit().id().delete(unit_id);
    }

    let pos_ids: Vec<i32> = ctx.db.player_position().iter().map(|p| p.id).collect();
    let pos_count = pos_ids.len();
    for pos_id in pos_ids {
        ctx.db.player_position().id().delete(pos_id);
    }

    let erv_ids: Vec<i32> = ctx.db.end_round_vote().iter().map(|e| e.id).collect();
    for erv_id in erv_ids {
        ctx.db.end_round_vote().id().delete(erv_id);
    }

    let equip_ids: Vec<i32> = ctx.db.equipment().iter().map(|e| e.id).collect();
    for eid in equip_ids { ctx.db.equipment().id().delete(eid); }

    let arena_ids: Vec<i32> = ctx.db.battle_arena().iter().map(|a| a.id).collect();
    for aid in arena_ids { ctx.db.battle_arena().id().delete(aid); }

    let bu_ids: Vec<i32> = ctx.db.battle_unit().iter().map(|b| b.id).collect();
    for bid in bu_ids { ctx.db.battle_unit().id().delete(bid); }

    let gen_ids: Vec<i32> = ctx.db.laborer_genetics().iter().map(|g| g.unit_id).collect();
    for gid in gen_ids { ctx.db.laborer_genetics().unit_id().delete(gid); }

    let sb_ids: Vec<i32> = ctx.db.side_bet().iter().map(|s| s.id).collect();
    for sid in sb_ids { ctx.db.side_bet().id().delete(sid); }

    let sn_ids: Vec<i32> = ctx.db.server_node().iter().map(|s| s.id).collect();
    for sid in sn_ids { ctx.db.server_node().id().delete(sid); }

    let pc_ids: Vec<String> = ctx.db.player_currency().iter().map(|p| p.player_id.clone()).collect();
    for pid in pc_ids { ctx.db.player_currency().player_id().delete(pid); }

    let t_ids: Vec<i32> = ctx.db.tournament().iter().map(|t| t.id).collect();
    for tid in t_ids { ctx.db.tournament().id().delete(tid); }

    let spec_ids: Vec<i32> = ctx.db.spectator().iter().map(|s| s.id).collect();
    for sid in spec_ids { ctx.db.spectator().id().delete(sid); }

    let stats_ids: Vec<i32> = ctx.db.unit_stats().iter().map(|s| s.unit_id).collect();
    for sid in stats_ids { ctx.db.unit_stats().unit_id().delete(sid); }

    let inv_ids: Vec<i32> = ctx.db.unit_inventory().iter().map(|i| i.unit_id).collect();
    for iid in inv_ids { ctx.db.unit_inventory().unit_id().delete(iid); }

    let tq_ids: Vec<i32> = ctx.db.unit_task_queue().iter().map(|t| t.id).collect();
    for tid in tq_ids { ctx.db.unit_task_queue().id().delete(tid); }

    let res_ids: Vec<String> = ctx.db.resource().iter().map(|r| r.id.clone()).collect();
    for rid in res_ids { ctx.db.resource().id().delete(rid); }

    let tx_ids: Vec<i32> = ctx.db.transaction().iter().map(|t| t.id).collect();
    for tid in tx_ids { ctx.db.transaction().id().delete(tid); }

    let gp_ids: Vec<i32> = ctx.db.guarantee_purchase().iter().map(|g| g.id).collect();
    for gid in gp_ids { ctx.db.guarantee_purchase().id().delete(gid); }

    let rt_ids: Vec<u64> = ctx.db.round_timer_entry().iter().map(|r| r.scheduled_id).collect();
    for rid in rt_ids { ctx.db.round_timer_entry().scheduled_id().delete(rid); }

    log::info!("✅ Test data reset complete: {} rooms, {} ready states, {} chat rooms, {} votes, {} positions deleted",
        room_count, ready_count, chat_count, vote_count, pos_count);

    Ok(())
}
