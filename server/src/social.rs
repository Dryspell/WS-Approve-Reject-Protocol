use spacetimedb::{reducer, ReducerContext, Identity};
use super::*;

// ============================================================================
// Social System: Friends & Direct Messaging Reducers
// ============================================================================

/// Helper function to get sorted identities for consistent friendship/conversation keys
fn get_sorted_identities(a: Identity, b: Identity) -> (Identity, Identity) {
    let a_hex = a.to_hex().to_string();
    let b_hex = b.to_hex().to_string();
    if a_hex < b_hex {
        (a, b)
    } else {
        (b, a)
    }
}

/// Helper to generate a conversation ID from two user identities
fn get_conversation_id(user1: &Identity, user2: &Identity) -> String {
    let (sorted1, sorted2) = get_sorted_identities(*user1, *user2);
    format!("dm_{}_{}", sorted1.to_hex(), sorted2.to_hex())
}

/// Check if a user is blocked by another user
fn is_blocked(ctx: &ReducerContext, blocker: Identity, blocked: Identity) -> bool {
    ctx.db.blocked_user().iter()
        .any(|b| b.blocker == blocker && b.blocked == blocked)
}

/// Check if two users are friends
fn are_friends(ctx: &ReducerContext, user1: Identity, user2: Identity) -> bool {
    let (sorted1, sorted2) = get_sorted_identities(user1, user2);
    ctx.db.friendship().iter()
        .any(|f| f.user1 == sorted1 && f.user2 == sorted2)
}

/// Send a friend request to another user
#[reducer]
pub fn send_friend_request(ctx: &ReducerContext, to_user: Identity) -> Result<(), String> {
    let from_user = ctx.sender();
    
    // Can't send request to yourself
    if from_user == to_user {
        return Err("Cannot send friend request to yourself".to_string());
    }
    
    // Check if target user exists
    if ctx.db.user().identity().find(to_user).is_none() {
        return Err("User not found".to_string());
    }
    
    // Check if already friends
    if are_friends(ctx, from_user, to_user) {
        return Err("Already friends with this user".to_string());
    }
    
    // Check if blocked by target user
    if is_blocked(ctx, to_user, from_user) {
        return Err("Cannot send friend request to this user".to_string());
    }
    
    // Check if you blocked the target user
    if is_blocked(ctx, from_user, to_user) {
        return Err("You have blocked this user. Unblock them first.".to_string());
    }
    
    // Check for existing pending request (either direction)
    let existing_request = ctx.db.friend_request().iter()
        .find(|r| r.status == "pending" && 
            ((r.from_user == from_user && r.to_user == to_user) ||
             (r.from_user == to_user && r.to_user == from_user)));
    
    if existing_request.is_some() {
        return Err("A pending friend request already exists".to_string());
    }
    
    // Create the friend request
    ctx.db.friend_request().insert(FriendRequest {
        id: 0, // auto-increment
        from_user,
        to_user,
        status: "pending".to_string(),
        created_at: ctx.timestamp,
    });
    
    log::info!("Friend request sent from {:?} to {:?}", from_user, to_user);
    Ok(())
}

/// Accept a friend request
#[reducer]
pub fn accept_friend_request(ctx: &ReducerContext, request_id: i32) -> Result<(), String> {
    let request = ctx.db.friend_request().id().find(request_id)
        .ok_or("Friend request not found")?;
    
    // Only the recipient can accept
    if request.to_user != ctx.sender() {
        return Err("You can only accept requests sent to you".to_string());
    }
    
    // Must be pending
    if request.status != "pending" {
        return Err("Request is no longer pending".to_string());
    }
    
    // Update request status
    let mut updated_request = request.clone();
    updated_request.status = "accepted".to_string();
    ctx.db.friend_request().id().update(updated_request);
    
    // Create friendship record with sorted identities
    let (user1, user2) = get_sorted_identities(request.from_user, request.to_user);
    ctx.db.friendship().insert(Friendship {
        id: 0, // auto-increment
        user1,
        user2,
        created_at: ctx.timestamp,
    });
    
    log::info!("Friend request {} accepted. Friendship created between {:?} and {:?}", 
        request_id, user1, user2);
    Ok(())
}

/// Reject a friend request
#[reducer]
pub fn reject_friend_request(ctx: &ReducerContext, request_id: i32) -> Result<(), String> {
    let request = ctx.db.friend_request().id().find(request_id)
        .ok_or("Friend request not found")?;
    
    // Only the recipient can reject
    if request.to_user != ctx.sender() {
        return Err("You can only reject requests sent to you".to_string());
    }
    
    // Must be pending
    if request.status != "pending" {
        return Err("Request is no longer pending".to_string());
    }
    
    // Update request status
    let mut updated_request = request.clone();
    updated_request.status = "rejected".to_string();
    ctx.db.friend_request().id().update(updated_request);
    
    log::info!("Friend request {} rejected", request_id);
    Ok(())
}

/// Cancel an outgoing friend request
#[reducer]
pub fn cancel_friend_request(ctx: &ReducerContext, request_id: i32) -> Result<(), String> {
    let request = ctx.db.friend_request().id().find(request_id)
        .ok_or("Friend request not found")?;
    
    // Only the sender can cancel
    if request.from_user != ctx.sender() {
        return Err("You can only cancel requests you sent".to_string());
    }
    
    // Must be pending
    if request.status != "pending" {
        return Err("Request is no longer pending".to_string());
    }
    
    // Delete the request
    ctx.db.friend_request().id().delete(request_id);
    
    log::info!("Friend request {} cancelled", request_id);
    Ok(())
}

/// Remove a friend
#[reducer]
pub fn remove_friend(ctx: &ReducerContext, friend_id: Identity) -> Result<(), String> {
    let (user1, user2) = get_sorted_identities(ctx.sender(), friend_id);
    
    // Find the friendship
    let friendship = ctx.db.friendship().iter()
        .find(|f| f.user1 == user1 && f.user2 == user2)
        .ok_or("Friendship not found")?;
    
    // Delete the friendship
    ctx.db.friendship().id().delete(friendship.id);
    
    log::info!("Friendship removed between {:?} and {:?}", user1, user2);
    Ok(())
}

/// Send a direct message to a friend
#[reducer]
pub fn send_direct_message(ctx: &ReducerContext, to_user: Identity, text: String) -> Result<(), String> {
    let from_user = ctx.sender();
    
    // Validate message
    if text.trim().is_empty() {
        return Err("Message cannot be empty".to_string());
    }
    
    // Can't message yourself
    if from_user == to_user {
        return Err("Cannot send message to yourself".to_string());
    }
    
    // Check if blocked
    if is_blocked(ctx, to_user, from_user) {
        return Err("Cannot send message to this user".to_string());
    }
    
    // Check if friends (required for DMs)
    if !are_friends(ctx, from_user, to_user) {
        return Err("You must be friends to send direct messages".to_string());
    }
    
    let conversation_id = get_conversation_id(&from_user, &to_user);
    let (user1, user2) = get_sorted_identities(from_user, to_user);
    let now = ctx.timestamp.to_micros_since_unix_epoch();
    
    // Get or create conversation
    if ctx.db.direct_message_conversation().id().find(&conversation_id).is_none() {
        ctx.db.direct_message_conversation().insert(DirectMessageConversation {
            id: conversation_id.clone(),
            user1,
            user2,
            last_message_at: now,
            created_at: now,
        });
    } else {
        // Update last_message_at
        if let Some(mut conv) = ctx.db.direct_message_conversation().id().find(&conversation_id) {
            conv.last_message_at = now;
            ctx.db.direct_message_conversation().id().update(conv);
        }
    }
    
    // Insert the message
    ctx.db.direct_message().insert(DirectMessage {
        id: 0, // auto-increment
        conversation_id: conversation_id.clone(),
        sender: from_user,
        text,
        timestamp: ctx.timestamp,
        is_read: false,
    });
    
    log::info!("Direct message sent in conversation {}", conversation_id);
    Ok(())
}

/// Mark all messages in a conversation as read (for the current user)
#[reducer]
pub fn mark_messages_read(ctx: &ReducerContext, conversation_id: String) -> Result<(), String> {
    let current_user = ctx.sender();
    
    // Verify conversation exists and user is a participant
    let conversation = ctx.db.direct_message_conversation().id().find(&conversation_id)
        .ok_or("Conversation not found")?;
    
    if conversation.user1 != current_user && conversation.user2 != current_user {
        return Err("You are not a participant in this conversation".to_string());
    }
    
    // Mark all unread messages from the other user as read
    let messages_to_update: Vec<_> = ctx.db.direct_message().iter()
        .filter(|m| m.conversation_id == conversation_id && 
                    m.sender != current_user && 
                    !m.is_read)
        .collect();
    
    for message in messages_to_update {
        let mut updated_message = message.clone();
        updated_message.is_read = true;
        ctx.db.direct_message().id().update(updated_message);
    }
    
    log::info!("Marked messages as read in conversation {}", conversation_id);
    Ok(())
}

/// Block a user
#[reducer]
pub fn block_user(ctx: &ReducerContext, user_id: Identity) -> Result<(), String> {
    let blocker = ctx.sender();
    
    // Can't block yourself
    if blocker == user_id {
        return Err("Cannot block yourself".to_string());
    }
    
    // Check if already blocked
    if is_blocked(ctx, blocker, user_id) {
        return Err("User is already blocked".to_string());
    }
    
    // Remove any existing friendship
    let (user1, user2) = get_sorted_identities(blocker, user_id);
    if let Some(friendship) = ctx.db.friendship().iter()
        .find(|f| f.user1 == user1 && f.user2 == user2) {
        ctx.db.friendship().id().delete(friendship.id);
        log::info!("Removed friendship as part of blocking");
    }
    
    // Cancel any pending friend requests between the users
    let pending_requests: Vec<_> = ctx.db.friend_request().iter()
        .filter(|r| r.status == "pending" &&
            ((r.from_user == blocker && r.to_user == user_id) ||
             (r.from_user == user_id && r.to_user == blocker)))
        .collect();
    
    for request in pending_requests {
        ctx.db.friend_request().id().delete(request.id);
        log::info!("Removed pending friend request {} as part of blocking", request.id);
    }
    
    // Create block record
    ctx.db.blocked_user().insert(BlockedUser {
        id: 0, // auto-increment
        blocker,
        blocked: user_id,
        created_at: ctx.timestamp,
    });
    
    log::info!("User {:?} blocked {:?}", blocker, user_id);
    Ok(())
}

/// Unblock a user
#[reducer]
pub fn unblock_user(ctx: &ReducerContext, user_id: Identity) -> Result<(), String> {
    let blocker = ctx.sender();
    
    // Find the block record
    let block = ctx.db.blocked_user().iter()
        .find(|b| b.blocker == blocker && b.blocked == user_id)
        .ok_or("User is not blocked")?;
    
    // Delete the block record
    ctx.db.blocked_user().id().delete(block.id);
    
    log::info!("User {:?} unblocked {:?}", blocker, user_id);
    Ok(())
}

// ============================================================================
