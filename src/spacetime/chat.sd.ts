// Chat system schema for SpacetimeDB

table ChatRoom {
  id: string
  name: string
  createdAt: number
}

table ChatMessage {
  id: string
  roomId: string
  senderId: string
  message: string
  timestamp: number
  roundNumber?: number
}

table ChatPermission {
  roomId: string
  userId: string
  permission: string // "read" | "write"
}

// Reducers
reducer createRoom(name: string) {
  const roomId = createId();
  ChatRoom.insert({
    id: roomId,
    name,
    createdAt: Date.now()
  });
  return roomId;
}

reducer sendMessage(roomId: string, message: string, roundNumber?: number) {
  // Check if user has permission to send messages
  const permission = ChatPermission.query()
    .where(roomId == roomId && userId == ctx.sender)
    .first();
  
  if (!permission || permission.permission != "write") {
    throw new Error("No permission to send messages");
  }

  // Create and insert the message
  const messageId = createId();
  ChatMessage.insert({
    id: messageId,
    roomId,
    senderId: ctx.sender,
    message,
    timestamp: Date.now(),
    roundNumber
  });

  return messageId;
}

reducer setPermission(roomId: string, userId: string, permission: string) {
  // Only room creators can set permissions
  const room = ChatRoom.query()
    .where(id == roomId)
    .first();
  
  if (!room || room.createdBy != ctx.sender) {
    throw new Error("No permission to set permissions");
  }

  ChatPermission.insert({
    roomId,
    userId,
    permission
  });
}

// Subscriptions
subscription onNewMessage(roomId: string) {
  ChatMessage.query()
    .where(roomId == roomId)
    .orderBy(timestamp.desc())
    .limit(50);
}

subscription onRoomUpdate(roomId: string) {
  ChatRoom.query()
    .where(id == roomId)
    .first();
}

subscription onPermissionUpdate(roomId: string) {
  ChatPermission.query()
    .where(roomId == roomId);
} 