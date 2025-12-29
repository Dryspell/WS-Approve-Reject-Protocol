# Chat Permissions Feature

## Overview

The chat system now includes visual indicators and controls for user permissions in chat rooms. Users can have either "read" or "write" permissions, and the UI clearly shows when a user only has read-only access.

## Permission Types

Based on the server schema in `server/src/lib.rs`:

```rust
pub struct ChatPermission {
    pub room_id: String,
    pub user_id: Identity,
    pub permission: String, // "read" | "write"
}
```

- **"write"** - User can send messages and read messages
- **"read"** - User can only read messages, cannot send

## Features Added

### 1. Permission Check Memo

```typescript
const canSendMessages = createMemo(() => {
  const currentRoomId = currentRoom();
  const userIdentity = identity();
  if (!currentRoomId || !userIdentity) return false;

  const userPermission = allPermissions().find(
    perm => perm.roomId === currentRoomId && perm.userId.isEqual(userIdentity)
  );

  // User needs "write" permission to send messages
  return userPermission?.permission === "write";
});
```

This memo reactively checks if the current user has write permissions in the current room.

### 2. Visual Indicators

#### A. In Room List (Lobby)
Shows a "Read-Only" badge next to rooms where the user doesn't have write access:

```
┌─────────────────────────────────┐
│ 📁 Test Room          Read-Only │
│ Created: 12/29/2025             │
└─────────────────────────────────┘
```

#### B. In Chat Room Header
When in a read-only room, shows a warning banner at the top:

```
┌────────────────────────────────────────┐
│ 🔒 Read-Only                           │
│ You don't have permission to send      │
│ messages in this room                  │
└────────────────────────────────────────┘
```

### 3. Disabled Message Input

When user doesn't have write permission:
- Message input is disabled
- Placeholder text changes to: "You don't have permission to send messages"
- Send button is disabled
- Pressing Enter does nothing

### 4. Permission Validation

Added a permission check in the `sendMessage` function as a safety measure:

```typescript
const sendMessage = async (roomId: string, message: string) => {
  // ... connection checks ...
  
  // Check permissions before sending
  if (!canSendMessages()) {
    showToast({
      title: "Permission Denied",
      description: "You don't have permission to send messages in this room",
      variant: "error",
    });
    return;
  }
  
  // ... send message ...
};
```

This prevents sending messages even if someone bypasses the UI controls.

## User Experience

### Scenario 1: User Has Write Permission
1. User sees room in list (no badge)
2. User enters room
3. Can type and send messages normally
4. Input and Send button are enabled

### Scenario 2: User Has Read Permission Only
1. User sees room in list with "Read-Only" badge
2. User enters room
3. Sees warning banner: "You don't have permission to send messages"
4. Message input is disabled with helpful placeholder
5. Send button is disabled
6. Can read all messages but cannot send

### Scenario 3: User Has No Permission
1. User might see room in list (if it's public)
2. If they somehow enter, they have read-only or no access
3. Same UX as read-only user

## Implementation Details

### Permission Lookup

```typescript
// Find user's permission for a specific room
const userPermission = allPermissions().find(
  perm => perm.roomId === currentRoomId && perm.userId.isEqual(userIdentity)
);

// Check if they can write
const canWrite = userPermission?.permission === "write";
```

### Using Identity.isEqual()

**Important:** Always use `.isEqual()` to compare Identity objects, not `===`:

```typescript
// ✅ CORRECT
perm.userId.isEqual(userIdentity)

// ❌ WRONG
perm.userId === userIdentity
```

Identity objects have an `isEqual()` method for proper comparison.

### Reactive Updates

The permission system is fully reactive:
- If permissions change (via reducer call), `allPermissions()` signal updates
- `canSendMessages()` memo automatically re-runs
- UI automatically updates to reflect new permissions
- No manual state management needed!

## Server-Side Permission Enforcement

The server also validates permissions in the `send_chat_message` reducer:

```rust
pub fn send_chat_message(
    ctx: &ReducerContext,
    room_id: String,
    text: String,
    round_number: Option<i32>,
) -> Result<(), String> {
    // Check if user has permission to send messages
    let permissions = ctx.db.chat_permission().iter()
        .filter(|p| &p.room_id == &room_id && p.user_id == ctx.sender)
        .collect::<Vec<_>>();

    if permissions.is_empty() {
        return Err(format!(
            "User {:?} does not have permission to access room {}",
            ctx.sender, room_id
        ));
    }

    // Check for write permission
    let can_write = permissions.iter().any(|p| p.permission == "write");
    if !can_write {
        return Err(format!(
            "User {:?} only has read permission for room {}",
            ctx.sender, room_id
        ));
    }

    // ... insert message ...
}
```

This ensures security even if client-side checks are bypassed.

## Future Enhancements

### 1. More Permission Types
Could add:
- "admin" - Can manage room settings
- "moderator" - Can delete messages
- "banned" - Cannot access room at all

### 2. Permission Management UI
Add UI to:
- Invite users to rooms
- Change user permissions
- Remove users from rooms

### 3. Room Privacy Levels
- Public rooms (anyone can read)
- Private rooms (invitation only)
- Secret rooms (not listed)

### 4. Temporary Permissions
- Time-limited access
- Expire permissions after certain period

## Testing

### Test Case 1: Create Room
```
1. Create a new room
2. You should automatically get "write" permission
3. No "Read-Only" badge should appear
4. You should be able to send messages
```

### Test Case 2: View Read-Only Room
```
1. Have another user create a room
2. Have them give you "read" permission
3. You should see "Read-Only" badge in list
4. When you enter, warning banner appears
5. Message input is disabled
```

### Test Case 3: Permission Change
```
1. Start in a read-only room
2. Have room owner change your permission to "write"
3. Warning banner should disappear
4. Message input should enable
5. No page refresh needed (reactive!)
```

## Code Locations

- **Permission check memo**: `SpacetimeChat.tsx` line ~108-120
- **Room list badges**: `SpacetimeChat.tsx` line ~320-340
- **Warning banner**: `SpacetimeChat.tsx` line ~375-385
- **Message input disabled**: `SpacetimeChat.tsx` line ~400-415
- **Permission validation**: `SpacetimeChat.tsx` line ~130-140
- **Server validation**: `server/src/lib.rs` line ~629-650

## Best Practices

1. **Always check permissions reactively** - Use memos, not one-time checks
2. **Show clear visual feedback** - Users should know why they can't do something
3. **Disable inputs, don't hide them** - Users should see what they're missing
4. **Validate on server** - Never trust client-side checks alone
5. **Use helpful error messages** - "Permission Denied" is better than "Error"

## Accessibility

The permission indicators are:
- ✅ Color-coded (warning colors)
- ✅ Text-labeled ("Read-Only")
- ✅ Announced by screen readers (via proper ARIA)
- ✅ Keyboard navigable
- ✅ High contrast (border + background + badge)

## Related Files

- `src/components/Chat/SpacetimeChat.tsx` - Main component with permission UI
- `server/src/lib.rs` - Server-side permission validation
- `src/module_bindings/chat_permission_type.ts` - ChatPermission type definition
- `src/components/ui/badge.tsx` - Badge component used for indicators

## Summary

The permission system provides:
- ✅ Clear visual feedback
- ✅ Preventive UI controls
- ✅ Server-side validation
- ✅ Reactive updates
- ✅ Good user experience
- ✅ Accessibility support

Users always know their permission level and why they can or can't send messages!

