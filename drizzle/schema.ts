import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";

export const Users = sqliteTable("users", {
  id: text("id").primaryKey().notNull(),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull().default(Date.now()),
  lastLogin: integer("last_login"),
  isActive: integer("is_active").notNull().default(1),
});

export const Sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull().references(() => Users.id),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull().default(Date.now()),
  lastActivity: integer("last_activity").notNull().default(Date.now()),
});

export const GameRooms = sqliteTable("game_rooms", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  startTime: integer("start_time"),
  createdAt: integer("created_at").notNull().default(Date.now()),
});

export const GameRoomMembers = sqliteTable("game_room_members", {
  roomId: text("room_id").notNull().references(() => GameRooms.id),
  userId: text("user_id").notNull(),
  joinedAt: integer("joined_at").notNull().default(Date.now()),
});

export const GameRounds = sqliteTable("game_rounds", {
  id: text("id").primaryKey().notNull(),
  roomId: text("room_id").notNull().references(() => GameRooms.id),
  roundNumber: integer("round_number").notNull(),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time"),
  createdAt: integer("created_at").notNull().default(Date.now()),
});

export const Tickets = sqliteTable("tickets", {
  id: text("id").primaryKey().notNull(),
  roomId: text("room_id").notNull().references(() => GameRooms.id),
  owner: text("owner").notNull(),
  color: integer("color"),
  createdAt: integer("created_at").notNull().default(Date.now()),
  updatedAt: integer("updated_at"),
});

export const RoundReadyStates = sqliteTable("round_ready_states", {
  roomId: text("room_id").notNull().references(() => GameRooms.id),
  userId: text("user_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  readyAt: integer("ready_at").notNull().default(Date.now()),
});

// Chat-related tables
export const ChatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey().notNull(),
  roomId: text("room_id").notNull().references(() => GameRooms.id),
  senderId: text("sender_id").notNull(),
  message: text("message").notNull(),
  timestamp: integer("timestamp").notNull(),
  roundNumber: integer("round_number"), // Optional: to associate messages with specific game rounds
});

export const ChatPermissions = sqliteTable("chat_permissions", {
  roomId: text("room_id").notNull().references(() => GameRooms.id),
  userId: text("user_id").notNull(),
  permission: text("permission").notNull(), // e.g., "read", "write", "admin"
  grantedAt: integer("granted_at").notNull().default(Date.now()),
});
