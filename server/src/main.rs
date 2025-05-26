use spacetimedb::{spacetimedb, ReducerContext, Timestamp};
use std::time::{SystemTime, UNIX_EPOCH};

#[spacetimedb(table)]
pub struct ChatRoom {
    #[primarykey]
    pub id: String,
    pub name: String,
    pub created_at: u64,
}

#[spacetimedb(table)]
pub struct ChatMessage {
    #[primarykey]
    pub id: String,
    pub room_id: String,
    pub sender_id: String,
    pub message: String,
    pub timestamp: u64,
    pub round_number: Option<u32>,
}

#[spacetimedb(table)]
pub struct ChatPermission {
    #[primarykey]
    pub room_id: String,
    pub user_id: String,
    pub permission: String, // "read" | "write"
}

fn get_current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

#[spacetimedb(reducer)]
pub fn create_room(ctx: ReducerContext, name: String) -> Result<String, String> {
    let room_id = format!("room_{}", get_current_timestamp());
    
    ChatRoom::insert(ChatRoom {
        id: room_id.clone(),
        name,
        created_at: get_current_timestamp(),
    });

    // Give creator full permissions
    ChatPermission::insert(ChatPermission {
        room_id: room_id.clone(),
        user_id: ctx.sender,
        permission: "write".to_string(),
    });

    Ok(room_id)
}

#[spacetimedb(reducer)]
pub fn send_message(
    ctx: ReducerContext,
    room_id: String,
    message: String,
    round_number: Option<u32>,
) -> Result<String, String> {
    // Check if user has permission to send messages
    let permission = ChatPermission::filter_by_room_id_and_user_id(&room_id, &ctx.sender)
        .first()
        .ok_or("No permission to send messages")?;

    if permission.permission != "write" {
        return Err("No permission to send messages".to_string());
    }

    // Create and insert the message
    let message_id = format!("msg_{}", get_current_timestamp());
    ChatMessage::insert(ChatMessage {
        id: message_id.clone(),
        room_id,
        sender_id: ctx.sender,
        message,
        timestamp: get_current_timestamp(),
        round_number,
    });

    Ok(message_id)
}

#[spacetimedb(reducer)]
pub fn set_permission(
    ctx: ReducerContext,
    room_id: String,
    user_id: String,
    permission: String,
) -> Result<(), String> {
    // Only room creator can set permissions
    let room = ChatRoom::filter_by_id(&room_id)
        .first()
        .ok_or("Room not found")?;

    if room.created_at != get_current_timestamp() {
        return Err("Only room creator can set permissions".to_string());
    }

    ChatPermission::insert(ChatPermission {
        room_id,
        user_id,
        permission,
    });

    Ok(())
}

#[spacetimedb(query)]
pub fn get_messages(room_id: String, limit: Option<u32>) -> Vec<ChatMessage> {
    let mut query = ChatMessage::filter_by_room_id(&room_id);
    if let Some(limit) = limit {
        query = query.limit(limit);
    }
    query.collect()
}

#[spacetimedb(query)]
pub fn get_room(room_id: String) -> Option<ChatRoom> {
    ChatRoom::filter_by_id(&room_id).first()
}

#[spacetimedb(query)]
pub fn get_user_permissions(user_id: String) -> Vec<ChatPermission> {
    ChatPermission::filter_by_user_id(&user_id).collect()
} 