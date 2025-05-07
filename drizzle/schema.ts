import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";

export const Users = sqliteTable("users", {
  id: integer("id").primaryKey().unique().notNull(),
  username: text("username").notNull().default(""),
  password: text("password").notNull().default(""),
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
  number: integer("number").notNull(),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  createdAt: integer("created_at").notNull().default(Date.now()),
});

export const Tickets = sqliteTable("tickets", {
  id: text("id").primaryKey().notNull(),
  roomId: text("room_id").notNull().references(() => GameRooms.id),
  ownerId: text("owner_id").notNull(),
  color: integer("color").notNull().default(0), // Using integer for enum
  createdAt: integer("created_at").notNull().default(Date.now()),
  updatedAt: integer("updated_at").notNull().default(Date.now()),
});

export const RoundReadyStates = sqliteTable("round_ready_states", {
  roomId: text("room_id").notNull().references(() => GameRooms.id),
  roundNumber: integer("round_number").notNull(),
  userId: text("user_id").notNull(),
  readyAt: integer("ready_at").notNull().default(Date.now()),
});
